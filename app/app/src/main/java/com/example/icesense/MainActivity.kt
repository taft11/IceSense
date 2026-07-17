package com.example.icesense

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
import com.example.icesense.model.Delivery
import com.example.icesense.ui.screens.DeliveryListScreen
import com.example.icesense.ui.screens.LoginScreen
import com.example.icesense.ui.theme.IceSenseTheme

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
    var currentScreen by remember { mutableStateOf("login") }
    
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
                "login" -> LoginScreen(onLoginSuccess = { currentScreen = "list" })
                "list" -> DeliveryListScreen(
                    deliveries = deliveries,
                    onConfirm = { id, proofUri ->
                        deliveries = deliveries.map {
                            if (it.id == id) it.copy(isConfirmed = true, proofImageUri = proofUri) else it
                        }
                    }
                )
            }
        }
    }
}
