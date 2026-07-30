package com.bellaerin.icesense.model

data class Delivery(
    val id: String,
    val customerName: String,
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val status: String = "pending",
    val isConfirmed: Boolean = false,
    val proofImageUri: String? = null
)