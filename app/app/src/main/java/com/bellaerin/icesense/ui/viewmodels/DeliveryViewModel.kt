package com.bellaerin.icesense.ui.viewmodels

import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import com.bellaerin.icesense.model.Delivery
import com.bellaerin.icesense.model.User
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class DeliveryViewModel : ViewModel() {
    private val auth = FirebaseAuth.getInstance()
    private val firestore = FirebaseFirestore.getInstance()
    private var ordersListenerRegistration: ListenerRegistration? = null

    var currentScreen by mutableStateOf("splash")
    var currentUserProfile by mutableStateOf<User?>(null)
    var deliveries by mutableStateOf(listOf<Delivery>())
    var isLoadingDeliveries by mutableStateOf(false)

    fun initAuthCheck() {
        val user = auth.currentUser
        if (user != null) {
            fetchUserProfile(user.uid, user.email ?: "")
        } else {
            currentScreen = "login"
        }
    }

    fun fetchUserProfile(uid: String, email: String) {
        firestore.collection("users").document(uid)
            .get().addOnSuccessListener { document ->
                val role = document.getString("role") ?: ""
                val name = document.getString("name") ?: "Driver"
                val contactNumber = document.getString("contactNumber") ?: ""
                currentUserProfile = User(uid, email, role, name, contactNumber)
                if (role == "driver") {
                    currentScreen = "list"
                    listenToDeliveries()
                } else {
                    auth.signOut()
                    currentScreen = "login"
                }
            }.addOnFailureListener {
                auth.signOut()
                currentScreen = "login"
            }
    }

    private fun listenToDeliveries() {
        val currentDriverId = auth.currentUser?.uid ?: return
        ordersListenerRegistration?.remove()
        isLoadingDeliveries = true

        // Listen to all orders to act as a system-wide cleanup for overdue items
        ordersListenerRegistration = firestore.collection("orders")
            .addSnapshotListener { snapshot, error ->
                isLoadingDeliveries = false
                if (error != null) {
                    Log.e("IceSense", "Error listening to orders", error)
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val orderDocs = snapshot.documents
                    
                    val calTodayStart = Calendar.getInstance().apply {
                        set(Calendar.HOUR_OF_DAY, 0)
                        set(Calendar.MINUTE, 0)
                        set(Calendar.SECOND, 0)
                        set(Calendar.MILLISECOND, 0)
                    }
                    val todayStartMs = calTodayStart.timeInMillis

                    orderDocs.forEach { doc ->
                        val status = doc.getString("status") ?: ""
                        val isConfirmed = doc.getBoolean("isConfirmed") ?: false
                        
                        val deliveryDate: Long? = when (val rawDate = doc.get("deliveryDate")) {
                            is Timestamp -> rawDate.toDate().time
                            is Number -> rawDate.toLong()
                            is String -> {
                                rawDate.toLongOrNull() ?: try {
                                    SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).parse(rawDate)?.time
                                } catch (e: Exception) { null }
                            }
                            else -> null
                        } ?: when (val rawCreated = doc.get("createdAt")) {
                            is Timestamp -> rawCreated.toDate().time
                            is Number -> rawCreated.toLong()
                            else -> null
                        }

                        // System-wide auto-fail logic: Any unconfirmed, non-failed order past its delivery date becomes Failed
                        if (!isConfirmed && status != "Failed" && deliveryDate != null && deliveryDate < todayStartMs) {
                            firestore.collection("orders").document(doc.id)
                                .update("status", "Failed")
                        }
                    }

                    // For the Driver App UI, only show orders assigned to THIS driver that are not failed
                    val filteredDocs = orderDocs.filter { 
                        val assignedId = it.getString("assignedDriverId") ?: ""
                        val status = it.getString("status") ?: ""
                        assignedId == currentDriverId && status != "Failed"
                    }

                    if (filteredDocs.isEmpty()) {
                        deliveries = emptyList()
                        return@addSnapshotListener
                    }

                    val newDeliveriesMap = mutableMapOf<String, Delivery>()
                    var fetchedCount = 0

                    filteredDocs.forEach { doc ->
                        val userId = doc.getString("userId")
                        val proofImageUrl = doc.getString("proofImageUrl")
                        val status = doc.getString("status") ?: ""
                        val deliveryTimeSlot = doc.getString("deliveryTimeSlot")
                        val deliveredAt = doc.getTimestamp("deliveredAt")?.toDate()?.time
                        
                        val deliveryDate: Long? = when (val rawDate = doc.get("deliveryDate")) {
                            is Timestamp -> rawDate.toDate().time
                            is Number -> rawDate.toLong()
                            is String -> {
                                rawDate.toLongOrNull() ?: try {
                                    SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).parse(rawDate)?.time
                                } catch (e: Exception) { null }
                            }
                            else -> null
                        } ?: when (val rawCreated = doc.get("createdAt")) {
                            is Timestamp -> rawCreated.toDate().time
                            is Number -> rawCreated.toLong()
                            else -> null
                        }

                        if (userId != null) {
                            firestore.collection("users").document(userId)
                                .get().addOnSuccessListener { userDoc ->
                                    val firstName = userDoc.getString("firstName") ?: ""
                                    val lastName = userDoc.getString("lastName") ?: ""
                                    val customerName = "$firstName $lastName".trim().ifEmpty { "Customer" }
                                    val phoneNumber = userDoc.getString("phoneNumber")
                                    val contactNumber = userDoc.getString("contactNumber") ?: doc.getString("contactNumber")

                                    val defaultAddressId = userDoc.getString("defaultAddressId")
                                    @Suppress("UNCHECKED_CAST")
                                    val addresses = userDoc["addresses"] as? List<Map<String, Any>>
                                    val addr = addresses?.find { it["id"] == defaultAddressId } ?: addresses?.firstOrNull()
                                    
                                    val street = (addr?.get("street") as? String) ?: ""
                                    val city = addr?.get("city") as? String ?: ""
                                    val state = addr?.get("state") as? String ?: ""
                                    val fullAddress = listOf(street, city, state).filter { it.isNotBlank() }.joinToString(", ")
                                    
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
                                        proofImageUrl = proofImageUrl,
                                        deliverySlot = deliveryTimeSlot,
                                        phoneNumber = phoneNumber,
                                        contactNumber = contactNumber,
                                        deliveredAt = deliveredAt,
                                        deliveryDate = deliveryDate,
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

    fun startDelivery(orderId: String, onSuccess: () -> Unit = {}, onFailure: (Exception) -> Unit = {}) {
        firestore.collection("orders").document(orderId)
            .update("status", "Attempting")
            .addOnSuccessListener { onSuccess() }
            .addOnFailureListener { onFailure(it) }
    }

    override fun onCleared() {
        super.onCleared()
        ordersRegistrationRemove()
    }

    fun ordersRegistrationRemove() {
        ordersListenerRegistration?.remove()
    }

    fun logout() {
        auth.signOut()
        currentUserProfile = null
        currentScreen = "login"
        ordersRegistrationRemove()
        deliveries = emptyList()
    }
}
