package com.example.icesense.model

data class Delivery(
    val id: Int,
    val customerName: String,
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val isConfirmed: Boolean = false,
    val proofImageUri: String? = null
)