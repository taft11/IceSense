package com.bellaerin.icesense.utils

import android.net.Uri
import com.google.firebase.storage.FirebaseStorage
import kotlinx.coroutines.tasks.await

/**
 * Uploads an image to Firebase Storage and returns the download URL.
 * Path: proofs/{orderId}.jpg
 */
suspend fun uploadProofImage(orderId: String, imageUri: Uri): String? {
    return try {
        val storageRef = FirebaseStorage.getInstance().reference
        val proofRef = storageRef.child("proofs/$orderId.jpg")
        
        // Upload file
        proofRef.putFile(imageUri).await()
        
        // Get download URL
        val downloadUrl = proofRef.downloadUrl.await()
        downloadUrl.toString()
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}
