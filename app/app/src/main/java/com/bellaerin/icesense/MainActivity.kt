package com.bellaerin.icesense

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import android.widget.Toast
import androidx.activity.viewModels
import androidx.core.content.edit
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import com.bellaerin.icesense.ui.components.BellaErinLogo
import com.bellaerin.icesense.ui.screens.AboutUsScreen
import com.bellaerin.icesense.ui.screens.DeliveryListScreen
import com.bellaerin.icesense.ui.screens.EditProfileScreen
import com.bellaerin.icesense.ui.screens.LoginScreen
import com.bellaerin.icesense.ui.theme.IceSenseTheme
import com.bellaerin.icesense.ui.viewmodels.DeliveryViewModel
import com.bellaerin.icesense.utils.uploadProofImage
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import kotlinx.coroutines.launch
import java.util.Calendar

class MainActivity : ComponentActivity() {
    private val viewModel: DeliveryViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Enable Local Offline Storage Caching & Resiliency
        try {
            val firestore = FirebaseFirestore.getInstance()
            val settings = FirebaseFirestoreSettings.Builder()
                .setPersistenceEnabled(true)
                .build()
            firestore.firestoreSettings = settings
        } catch (e: Exception) {
            // Already initialized settings (or fallback gracefully)
        }

        viewModel.initAuthCheck()

        setContent {
            val context = LocalContext.current
            val prefs = remember { context.getSharedPreferences("theme_prefs", MODE_PRIVATE) }
            val systemTheme = isSystemInDarkTheme()
            var isDarkMode by remember { 
                mutableStateOf(prefs.getBoolean("is_dark_mode", systemTheme)) 
            }

            IceSenseTheme(darkTheme = isDarkMode) {
                DeliveryApp(
                    viewModel = viewModel,
                    isDarkMode = isDarkMode
                ) {
                    isDarkMode = !isDarkMode
                    prefs.edit { putBoolean("is_dark_mode", isDarkMode) }
                }
            }
        }
    }
}

@Composable
fun DeliveryApp(
    viewModel: DeliveryViewModel,
    isDarkMode: Boolean,
    onThemeToggle: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val firestore = remember { FirebaseFirestore.getInstance() }
    val context = LocalContext.current
    var isUploading by remember { mutableStateOf(value = false) }

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = viewModel.currentScreen != "login" && viewModel.currentScreen != "splash",
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
                        text = viewModel.currentUserProfile?.name ?: "Driver",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = viewModel.currentUserProfile?.email ?: "",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                    )
                    viewModel.currentUserProfile?.contactNumber?.let {
                        if (it.isNotBlank()) {
                            Text(
                                text = it,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.5f)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Navigation Items
                NavigationDrawerItem(
                    label = { Text("Home") },
                    selected = viewModel.currentScreen == "list",
                    onClick = {
                        viewModel.currentScreen = "list"
                        scope.launch { drawerState.close() }
                    },
                    icon = { Icon(Icons.Default.Home, contentDescription = null) },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )

                NavigationDrawerItem(
                    label = { Text("Edit Profile") },
                    selected = viewModel.currentScreen == "edit_profile",
                    onClick = {
                        viewModel.currentScreen = "edit_profile"
                        scope.launch { drawerState.close() }
                    },
                    icon = { Icon(Icons.Default.Person, contentDescription = null) },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )

                NavigationDrawerItem(
                    label = { Text("About Us") },
                    selected = viewModel.currentScreen == "about",
                    onClick = {
                        viewModel.currentScreen = "about"
                        scope.launch { drawerState.close() }
                    },
                    icon = { Icon(Icons.Default.Info, contentDescription = null) },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )

                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp, horizontal = 16.dp))

                NavigationDrawerItem(
                    label = { Text(if (isDarkMode) "Dark Mode" else "Light Mode") },
                    selected = false,
                    onClick = onThemeToggle,
                    icon = { 
                        Icon(
                            imageVector = if (isDarkMode) Icons.Default.DarkMode else Icons.Default.LightMode, 
                            contentDescription = null
                        ) 
                    },
                    badge = {
                        Switch(
                            checked = isDarkMode,
                            onCheckedChange = { onThemeToggle() },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = MaterialTheme.colorScheme.primary,
                                checkedTrackColor = MaterialTheme.colorScheme.primaryContainer,
                            )
                        )
                    },
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
                            viewModel.logout()
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
                when (viewModel.currentScreen) {
                    "splash" -> {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    }
                    "login" -> LoginScreen {
                        FirebaseAuth.getInstance().currentUser?.let { user ->
                            viewModel.fetchUserProfile(user.uid, user.email ?: "")
                        }
                    }
                    "list" -> DeliveryListScreen(
                        deliveries = viewModel.deliveries,
                        isLoading = viewModel.isLoadingDeliveries,
                        onConfirm = { id, proofUri ->
                            if (proofUri != null) {
                                scope.launch {
                                    isUploading = true
                                    val downloadUrl = uploadProofImage(id, proofUri.toUri())
                                    if (downloadUrl != null) {
                                        firestore.collection("orders").document(id)
                                            .update(
                                                "isConfirmed", true,
                                                "proofImageUrl", downloadUrl,
                                                "status", "Delivered",
                                                "deliveredAt", FieldValue.serverTimestamp(),
                                                "proofImageUri", FieldValue.delete()
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
                                firestore.collection("orders").document(id)
                                    .update(
                                        "isConfirmed", true,
                                        "status", "Delivered",
                                        "deliveredAt", FieldValue.serverTimestamp()
                                    )
                            }
                        },
                        onRescheduleTomorrow = { id ->
                            val calendar = Calendar.getInstance()
                            calendar.add(Calendar.DAY_OF_YEAR, 1)
                            firestore.collection("orders").document(id)
                                .update("deliveryDate", Timestamp(calendar.time))
                                .addOnSuccessListener {
                                    Toast.makeText(context, "Rescheduled to tomorrow!", Toast.LENGTH_SHORT).show()
                                }
                                .addOnFailureListener {
                                    Toast.makeText(context, "Failed to reschedule", Toast.LENGTH_SHORT).show()
                                }
                        },
                        onStartDelivery = { id ->
                            viewModel.startDelivery(id, 
                                onSuccess = {
                                    Toast.makeText(context, "Delivery started!", Toast.LENGTH_SHORT).show()
                                },
                                onFailure = {
                                    Toast.makeText(context, "Failed to start delivery", Toast.LENGTH_SHORT).show()
                                }
                            )
                        }
                    ) {
                        scope.launch { drawerState.open() }
                    }
                    "edit_profile" -> EditProfileScreen(
                        uid = viewModel.currentUserProfile?.uid ?: "",
                        currentName = viewModel.currentUserProfile?.name ?: "",
                        currentContactNumber = viewModel.currentUserProfile?.contactNumber ?: "",
                        userEmail = viewModel.currentUserProfile?.email ?: "",
                        onProfileUpdated = { newName, newContact ->
                            viewModel.currentUserProfile = viewModel.currentUserProfile?.copy(name = newName, contactNumber = newContact)
                        },
                        onBack = { viewModel.currentScreen = "list" }
                    )
                    "about" -> AboutUsScreen(
                        onBack = { viewModel.currentScreen = "list" }
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
