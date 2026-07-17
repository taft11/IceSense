package com.example.icesense.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun BellaErinLogo(modifier: Modifier = Modifier, iconSize: Dp = 100.dp, showText: Boolean = true) {
    val logoBlue = Color(0xFF2196F3)
    val darkGrey = Color(0xFF333333)

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Canvas(modifier = Modifier.size(iconSize)) {
            val w = size.width
            val h = size.height
            
            // Refined Geometric Iceberg Path to match the uploaded logo perfectly
            val path = Path().apply {
                // Outer boundary peaks
                moveTo(w * 0.05f, h * 0.75f) // Bottom left start
                lineTo(w * 0.95f, h * 0.75f) // Bottom right

                lineTo(w * 0.82f, h * 0.58f) // Far right peak
                lineTo(w * 0.52f, h * 0.10f) // Highest peak
                lineTo(w * 0.42f, h * 0.45f) // Mid dip
                lineTo(w * 0.30f, h * 0.30f) // Left secondary peak
                lineTo(w * 0.22f, h * 0.52f) // Far left small peak
                lineTo(w * 0.05f, h * 0.75f) // Back to start

                // Internal geometric structure lines
                // Primary peak connections
                moveTo(w * 0.52f, h * 0.10f)
                lineTo(w * 0.60f, h * 0.55f)
                lineTo(w * 0.82f, h * 0.58f)
                
                moveTo(w * 0.60f, h * 0.55f)
                lineTo(w * 0.95f, h * 0.75f)

                // Mid peak connections
                moveTo(w * 0.30f, h * 0.30f)
                lineTo(w * 0.45f, h * 0.75f)

                moveTo(w * 0.42f, h * 0.45f)
                lineTo(w * 0.60f, h * 0.75f)
                
                // Left peak connections
                moveTo(w * 0.22f, h * 0.52f)
                lineTo(w * 0.35f, h * 0.50f)
                lineTo(w * 0.45f, h * 0.75f)
                
                moveTo(w * 0.35f, h * 0.50f)
                lineTo(w * 0.30f, h * 0.30f)
            }
            
            drawPath(
                path = path,
                color = logoBlue,
                style = Stroke(
                    width = (iconSize.value * 0.03).dp.toPx(), // Adaptive stroke width
                    cap = StrokeCap.Round,
                    join = StrokeJoin.Round
                )
            )
        }
        
        if (showText) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "BELLA ERIN",
                fontSize = (iconSize.value * 0.22).sp,
                fontWeight = FontWeight.ExtraBold,
                color = darkGrey,
                letterSpacing = 2.sp
            )
            Text(
                text = "TUBE ICE",
                fontSize = (iconSize.value * 0.10).sp,
                fontWeight = FontWeight.Medium,
                color = darkGrey.copy(alpha = 0.7f),
                letterSpacing = 5.sp
            )
        }
    }
}
