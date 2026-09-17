package com.bellaerin.icesense.ui.screens

import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.google.firebase.firestore.FirebaseFirestore

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(
    uid: String,
    currentName: String,
    currentContactNumber: String,
    userEmail: String,
    onProfileUpdated: (String, String) -> Unit,
    onBack: () -> Unit
) {
    var name by remember { mutableStateOf(currentName) }
    var contactNumber by remember { mutableStateOf(currentContactNumber) }
    var isSaving by remember { mutableStateOf(false) }
    val context = LocalContext.current
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Profile") },
                navigationIcon = {
                    IconButton(onClick = onBack, enabled = !isSaving) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                Icons.Default.Person,
                contentDescription = null,
                modifier = Modifier.size(100.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Full Name") },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isSaving
            )
            
            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = contactNumber,
                onValueChange = { contactNumber = it },
                label = { Text("Contact Number") },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isSaving
            )

            Spacer(modifier = Modifier.height(16.dp))
            
            OutlinedTextField(
                value = userEmail,
                onValueChange = { },
                label = { Text("Email Address") },
                modifier = Modifier.fillMaxWidth(),
                enabled = false
            )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Button(
                onClick = {
                    if (name.isBlank()) {
                        Toast.makeText(context, "Name cannot be empty", Toast.LENGTH_SHORT).show()
                        return@Button
                    }
                    isSaving = true
                    val firestore = FirebaseFirestore.getInstance()
                    val updates = mapOf(
                        "name" to name,
                        "contactNumber" to contactNumber
                    )
                    firestore.collection("users").document(uid)
                        .update(updates)
                        .addOnSuccessListener {
                            isSaving = false
                            onProfileUpdated(name, contactNumber)
                            Toast.makeText(context, "Profile updated", Toast.LENGTH_SHORT).show()
                            onBack()
                        }
                        .addOnFailureListener { e ->
                            isSaving = false
                            Toast.makeText(context, "Update failed: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                        }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isSaving
            ) {
                if (isSaving) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                } else {
                    Text("Save Changes")
                }
            }
        }
    }
}
