package com.bellaerin.icesense.model

data class User(
    val uid: String,
    val email: String,
    val role: String,
    val name: String = "Driver"
)
