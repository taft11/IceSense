package com.bellaerin.icesense

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.net.toUri
import com.bellaerin.icesense.model.Delivery
import com.bellaerin.icesense.model.User
import com.bellaerin.icesense.ui.components.BellaErinLogo
import com.bellaerin.icesense.ui.screens.AboutUsScreen
import com.bellaerin.icesense.ui.screens.DeliveryListScreen
import com.bellaerin.icesense.ui.screens.EditProfileScreen
import com.bellaerin.icesense.ui.screens.LoginScreen
import com.bellaerin.icesense.ui.theme.IceSenseTheme
import com.bellaerin.icesense.utils.uploadProofImage
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            IceSenseTheme {
                DeliveryApp()
            }
        }
    }
}

@Composable
fun DeliveryApp() {
    val auth = remember { FirebaseAuth.getInstance() }
    var currentScreen by remember { mutableStateOf("splash") }
    var currentUserProfile by remember { mutableStateOf<User?>(null) }
    val scope = rememberCoroutineScope()
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val firestore = remember { FirebaseFirestore.getInstance() }
    val context = LocalContext.current
    var isUploading by remember { mutableStateOf(false) }

    fun fetchUserProfile(uid: String, email: String) {
        firestore.collection("users").document(uid)
            .get().addOnSuccessListener { document ->
                val role = document.getString("role") ?: ""
                val name = document.getString("name") ?: "Driver"
                currentUserProfile = User(uid, email, role, name)
                if (role == "driver") {
                    currentScreen = "list"
                } else {
                    auth.signOut()
                    currentScreen = "login"
                }
            }.addOnFailureListener {
                auth.signOut()
                currentScreen = "login"
            }
    }

    // Check role if user is already logged in
    LaunchedEffect(Unit) {
        val user = auth.currentUser
        if (user != null) {
            fetchUserProfile(user.uid, user.email ?: "")
        } else {
            currentScreen = "login"
        }
    }
    
    // Real-time deliveries from Firestore
    var deliveries by remember { mutableStateOf(listOf<Delivery>()) }

    LaunchedEffect(currentScreen) {
        if (currentScreen == "list" || currentScreen == "splash") {
            firestore.collection("orders")
                .addSnapshotListener { snapshot, error ->
                    if (error != null) return@addSnapshotListener
                    if (snapshot != null) {
                        val orderDocs = snapshot.documents
                        if (orderDocs.isEmpty()) {
                            deliveries = emptyList()
                            return@addSnapshotListener
                        }

                        // Show orders only when they are "Processing" or already "Delivered"
                        // AND they are assigned to the current driver
                        val visibleStatuses = listOf("Processing", "Delivered")
                        val currentDriverId = auth.currentUser?.uid

                        val filteredDocs = orderDocs.filter { 
                            val status = it.getString("status") ?: ""
                            val assignedDriverId = it.getString("assignedDriverId")
                            
                            status in visibleStatuses && assignedDriverId == currentDriverId
                        }

                        if (filteredDocs.isEmpty()) {
                            deliveries = emptyList()
                            return@addSnapshotListener
                        }

                        val newDeliveriesMap = mutableMapOf<String, Delivery>()
                        var fetchedCount = 0

                        filteredDocs.forEach { doc ->
                            val userId = doc.getString("userId")
                            val proofImageUri = doc.getString("proofImageUri")
                            val status = doc.getString("status") ?: ""

                            if (userId != null) {
                                firestore.collection("users").document(userId)
                                    .get().addOnSuccessListener { userDoc ->
                                        val firstName = userDoc.getString("firstName") ?: ""
                                        val lastName = userDoc.getString("lastName") ?: ""
                                        val customerName = "$firstName $lastName".trim().ifEmpty { "Customer" }
                                        
                                        val defaultAddressId = userDoc.getString("defaultAddressId")
                                        val addresses = userDoc.get("addresses") as? List<Map<String, Any>>
                                        val addr = addresses?.find { it["id"] == defaultAddressId }
                                        
                                        val street = addr?.get("street") as? String ?: ""
                                        val city = addr?.get("city") as? String ?: ""
                                        val state = addr?.get("state") as? String ?: ""
                                        val fullAddress = listOf(street, city, state)
                                            .filter { it.isNotBlank() }
                                            .joinToString(", ")
                                        
                                        val lat = when(val l = addr?.get("latitude")) {
                                            is Double -> l
                                            is Number -> l.toDouble()
                                            else -> 0.0
                                        }
                                        val lng = when(val l = addr?.get("longitude")) {
                                            is Double -> l
                                            is Number -> l.toDouble()
                                            else -> 0.0
                                        }

                                        newDeliveriesMap[doc.id] = Delivery(
                                            id = doc.id,
                                            customerName = customerName,
                                            address = fullAddress.ifEmpty { "No Address" },
                                            latitude = lat,
                                            longitude = lng,
                                            status = status,
                                            isConfirmed = status == "Delivered",
                                            proofImageUri = proofImageUri
                                        )

                                        fetchedCount++
                                        if (fetchedCount == filteredDocs.size) {
                                            deliveries = filteredDocs.mapNotNull { newDeliveriesMap[it.id] }
                                        }
                                    }.addOnFailureListener {
                                        fetchedCount++
                                        if (fetchedCount == filteredDocs.size) {
                                            deliveries = filteredDocs.mapNotNull { newDeliveriesMap[it.id] }
                                        }
                                    }
                            } else {
                                fetchedCount++
                                if (fetchedCount == filteredDocs.size) {
                                    deliveries = filteredDocs.mapNotNull { newDeliveriesMap[it.id] }
                                }
                            }
                        }
                    }
                }
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = currentScreen != "login" && currentScreen != "splash",
        drawerContent = {
            ModalDrawerSheet {
                // Drawer Header
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.primaryContainer)
                        .padding(24.dp)
                ) {
                    BellaErinLogo(iconSize = 64.dp, showText = false)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = currentUserProfile?.name ?: "Driver",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = currentUserProfile?.email ?: "",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Navigation Items
                NavigationDrawerItem(
                    label = { Text("Home") },
                    selected = currentScreen == "list",
                    onClick = {
                        currentScreen = "list"
                        scope.launch { drawerState.close() }
                    },
                    icon = { Icon(Icons.Default.Home, contentDescription = null) },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )

                NavigationDrawerItem(
                    label = { Text("Edit Profile") },
                    selected = currentScreen == "edit_profile",
                    onClick = {
                        currentScreen = "edit_profile"
                        scope.launch { drawerState.close() }
                    },
                    icon = { Icon(Icons.Default.Person, contentDescription = null) },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )

                NavigationDrawerItem(
                    label = { Text("About Us") },
                    selected = currentScreen == "about",
                    onClick = {
                        currentScreen = "about"
                        scope.launch { drawerState.close() }
                    },
                    icon = { Icon(Icons.Default.Info, contentDescription = null) },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )

                Spacer(modifier = Modifier.weight(1f))

                // Logout Item
                NavigationDrawerItem(
                    label = { Text("Logout", color = MaterialTheme.colorScheme.error) },
                    selected = false,
                    onClick = {
                        scope.launch {
                            drawerState.close()
                            auth.signOut()
                            currentUserProfile = null
                            currentScreen = "login"
                        }
                    },
                    icon = { 
                        Icon(
                            Icons.AutoMirrored.Filled.Logout, 
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error
                        ) 
                    },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )
                Spacer(modifier = Modifier.height(12.dp))
            }
        }
    ) {
        Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
            Box(modifier = Modifier.padding(innerPadding)) {
                when (currentScreen) {
                    "splash" -> {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    }
                    "login" -> LoginScreen(onLoginSuccess = { 
                        val user = auth.currentUser
                        if (user != null) {
                            fetchUserProfile(user.uid, user.email ?: "")
                        }
                    })
                    "list" -> DeliveryListScreen(
                        deliveries = deliveries,
                        onConfirm = { id, proofUri ->
                            if (proofUri != null) {
                                scope.launch {
                                    isUploading = true
                                    val downloadUrl = uploadProofImage(id, proofUri.toUri())
                                    if (downloadUrl != null) {
                                        firestore.collection("orders").document(id)
                                            .update(
                                                "isConfirmed", true,
                                                "proofImageUri", downloadUrl,
                                                "status", "Delivered"
                                            ).addOnCompleteListener {
                                                isUploading = false
                                                if (it.isSuccessful) {
                                                    Toast.makeText(context, "Delivery confirmed!", Toast.LENGTH_SHORT).show()
                                                } else {
                                                    Toast.makeText(context, "Firestore update failed", Toast.LENGTH_SHORT).show()
                                                }
                                            }
                                    } else {
                                        isUploading = false
                                        Toast.makeText(context, "Image upload failed", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            } else {
                                // No photo confirm (if allowed)
                                firestore.collection("orders").document(id)
                                    .update(
                                        "isConfirmed", true,
                                        "status", "Delivered"
                                    )
                            }
                        },
                        onOpenMenu = {
                            scope.launch { drawerState.open() }
                        }
                    )
                    "edit_profile" -> EditProfileScreen(
                        uid = currentUserProfile?.uid ?: "",
                        currentName = currentUserProfile?.name ?: "",
                        userEmail = currentUserProfile?.email ?: "",
                        onProfileUpdated = { newName ->
                            currentUserProfile = currentUserProfile?.copy(name = newName)
                        },
                        onBack = { currentScreen = "list" }
                    )
                    "about" -> AboutUsScreen(
                        onBack = { currentScreen = "list" }
                    )
                }
            }
        }
        
        if (isUploading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.5f))
                    .clickable(enabled = false) {},
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    CircularProgressIndicator(color = Color.White)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Uploading proof...", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
