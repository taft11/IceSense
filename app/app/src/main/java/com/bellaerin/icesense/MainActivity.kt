package com.bellaerin.icesense

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bellaerin.icesense.model.Delivery
import com.bellaerin.icesense.model.User
import com.bellaerin.icesense.ui.components.BellaErinLogo
import com.bellaerin.icesense.ui.screens.AboutUsScreen
import com.bellaerin.icesense.ui.screens.DeliveryListScreen
import com.bellaerin.icesense.ui.screens.EditProfileScreen
import com.bellaerin.icesense.ui.screens.LoginScreen
import com.bellaerin.icesense.ui.theme.IceSenseTheme
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
            val listener = firestore.collection("orders")
                .addSnapshotListener { snapshot, error ->
                    if (error != null) return@addSnapshotListener
                    if (snapshot != null) {
                        deliveries = snapshot.documents.map { doc ->
                            Delivery(
                                id = doc.id,
                                customerName = doc.getString("customerName") ?: "Unknown",
                                address = doc.getString("address") ?: "No Address",
                                latitude = doc.getDouble("latitude") ?: 0.0,
                                longitude = doc.getDouble("longitude") ?: 0.0,
                                isConfirmed = doc.getBoolean("isConfirmed") ?: false,
                                proofImageUri = doc.getString("proofImageUri")
                            )
                        }
                    }
                }
            // In a real app, you'd want to dispose this listener
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
                            firestore.collection("orders").document(id)
                                .update(
                                    "isConfirmed", true,
                                    "proofImageUri", proofUri
                                )
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
    }
}
