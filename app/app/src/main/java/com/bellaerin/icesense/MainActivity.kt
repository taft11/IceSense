package com.bellaerin.icesense

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.bellaerin.icesense.model.Delivery
import com.bellaerin.icesense.ui.screens.DeliveryListScreen
import com.bellaerin.icesense.ui.screens.LoginScreen
import com.bellaerin.icesense.ui.theme.IceSenseTheme
import com.google.firebase.auth.FirebaseAuth

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
    
    // Check role if user is already logged in
    LaunchedEffect(Unit) {
        val user = auth.currentUser
        if (user != null) {
            val firestore = com.google.firebase.firestore.FirebaseFirestore.getInstance()
            firestore.collection("users").document(user.uid)
                .get().addOnSuccessListener { document ->
                    val role = document.getString("role")
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
        } else {
            currentScreen = "login"
        }
    }
    
    // Sample delivery data updated to Philippines (Metro Manila / QC)
    var deliveries by remember {
        mutableStateOf(
            listOf(
                Delivery(1, "Juan Dela Cruz", "Commonwealth Ave, Quezon City", 14.6507, 121.0509),
                Delivery(2, "Maria Clara", "Ayala Avenue, Makati City", 14.5547, 121.0244),
                Delivery(3, "Jose Rizal", "Bonifacio Global City, Taguig", 14.5486, 121.0475),
                Delivery(4, "Catriona Gray", "Katipunan Ave, Quezon City", 14.6394, 121.0775)
            )
        )
    }

    Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            when (currentScreen) {
                "splash" -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                        androidx.compose.material3.CircularProgressIndicator()
                    }
                }
                "login" -> LoginScreen(onLoginSuccess = { currentScreen = "list" })
                "list" -> DeliveryListScreen(
                    deliveries = deliveries,
                    onConfirm = { id, proofUri ->
                        deliveries = deliveries.map {
                            if (it.id == id) it.copy(isConfirmed = true, proofImageUri = proofUri) else it
                        }
                    },
                    onLogout = {
                        auth.signOut()
                        currentScreen = "login"
                    }
                )
            }
        }
    }
}
