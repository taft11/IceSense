package com.bellaerin.icesense.model

data class Delivery(
    val id: String,
    val customerName: String,
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val status: String = "pending",
    val isConfirmed: Boolean = false,
    val proofImageUrl: String? = null,
    val deliverySlot: String? = null,
    val phoneNumber: String? = null,
    val contactNumber: String? = null
)