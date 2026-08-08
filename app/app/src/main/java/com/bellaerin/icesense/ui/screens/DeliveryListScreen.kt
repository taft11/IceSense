package com.bellaerin.icesense.ui.screens

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.Message
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.net.toUri
import coil.compose.AsyncImage
import com.bellaerin.icesense.model.Delivery
import com.bellaerin.icesense.ui.components.BellaErinLogo
import com.bellaerin.icesense.utils.getCurrentLocation
import com.bellaerin.icesense.utils.openGoogleMaps
import com.google.android.gms.location.LocationServices
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.roundToInt

@Composable
fun DeliveryListScreen(
    deliveries: List<Delivery>,
    onConfirm: (String, String?) -> Unit,
    onOpenMenu: () -> Unit
) {
    val context = LocalContext.current
    val fusedLocationClient = remember { LocationServices.getFusedLocationProviderClient(context) }
    
    var selectedTabIndex by remember { mutableIntStateOf(0) }
    val tabs = listOf("Pending", "Delivered")

    var hasLocationPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    var tempPhotoUri by remember { mutableStateOf<Uri?>(null) }
    var currentDeliveryId by remember { mutableStateOf<String?>(null) }

    val cameraLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && tempPhotoUri != null && currentDeliveryId != null) {
            onConfirm(currentDeliveryId!!, tempPhotoUri.toString())
            Toast.makeText(context, "Delivery confirmed with proof", Toast.LENGTH_SHORT).show()
        }
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasCameraPermission = isGranted
        if (isGranted && currentDeliveryId != null) {
            val uri = createImageUri(context)
            tempPhotoUri = uri
            cameraLauncher.launch(uri)
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasLocationPermission = isGranted
        if (!isGranted) {
            Toast.makeText(context, "Location permission is required to proceed.", Toast.LENGTH_LONG).show()
        }
    }

    Column(modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp, vertical = 16.dp)) {
        // Logo and Header
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth().padding(bottom = 20.dp)
        ) {
            Surface(
                onClick = onOpenMenu,
                shape = CircleShape,
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                modifier = Modifier.size(44.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.Menu,
                        contentDescription = "Menu",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "BELLA ERIN",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.onSurface,
                    letterSpacing = 0.5.sp
                )
                Text(
                    text = "Tube Ice Delivery Service",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
                )
            }
            
            BellaErinLogo(iconSize = 40.dp, showText = false)
        }

        val pendingCount = deliveries.count { !it.isConfirmed }
        val deliveredCount = deliveries.count { it.isConfirmed }

        TabRow(
            selectedTabIndex = selectedTabIndex,
            containerColor = Color.Transparent,
            contentColor = MaterialTheme.colorScheme.primary,
            indicator = { tabPositions ->
                if (selectedTabIndex < tabPositions.size) {
                    TabRowDefaults.SecondaryIndicator(
                        Modifier.tabIndicatorOffset(tabPositions[selectedTabIndex]),
                        height = 3.dp,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            },
            divider = {}
        ) {
            tabs.forEachIndexed { index, title ->
                val count = if (index == 0) pendingCount else deliveredCount
                Tab(
                    selected = selectedTabIndex == index,
                    onClick = { selectedTabIndex = index },
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = title,
                                fontWeight = if (selectedTabIndex == index) FontWeight.Bold else FontWeight.Normal
                            )
                            if (count > 0) {
                                Spacer(modifier = Modifier.width(6.dp))
                                Badge(
                                    containerColor = if (selectedTabIndex == index) 
                                        MaterialTheme.colorScheme.primary 
                                    else 
                                        MaterialTheme.colorScheme.surfaceVariant
                                ) {
                                    Text(count.toString())
                                }
                            }
                        }
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
        
        val filteredDeliveries = remember(deliveries, selectedTabIndex) {
            if (selectedTabIndex == 0) {
                deliveries.filter { !it.isConfirmed }
            } else {
                deliveries.filter { it.isConfirmed }
            }
        }

        if (filteredDeliveries.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = if (selectedTabIndex == 0) Icons.Default.Check else Icons.Default.LocationOn,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.outlineVariant
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = if (selectedTabIndex == 0) "All caught up!" else "No deliveries yet",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            }
        } else {
            Column {
                if (!hasLocationPermission && selectedTabIndex == 0) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                        modifier = Modifier.padding(bottom = 16.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Location Required", fontWeight = FontWeight.Bold)
                            Text("We need location access to verify arrival and show navigation.")
                            Button(
                                onClick = { permissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION) },
                                modifier = Modifier.padding(top = 8.dp)
                            ) {
                                Text("Grant Permission")
                            }
                        }
                    }
                }

                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    contentPadding = PaddingValues(bottom = 24.dp)
                ) {
                    if (selectedTabIndex == 0) {
                        val slots = listOf("8:00 AM - 11:00 AM", "11:00 AM - 2:00 PM", "2:00 PM - 5:00 PM")
                        
                        slots.forEach { slot ->
                            val slotDeliveries = filteredDeliveries.filter { it.deliverySlot == slot }
                            if (slotDeliveries.isNotEmpty()) {
                                item(key = "header_$slot") {
                                    SlotHeader(slot)
                                }
                                items(slotDeliveries, key = { it.id }) { delivery ->
                                    DeliveryCardItem(
                                        delivery = delivery,
                                        hasLocationPermission = hasLocationPermission,
                                        onOpenMap = { openGoogleMaps(context, delivery.latitude, delivery.longitude) },
                                        onConfirmRequest = {
                                            getCurrentLocation(context, fusedLocationClient) { _ ->
                                                currentDeliveryId = delivery.id
                                                if (hasCameraPermission) {
                                                    val uri = createImageUri(context)
                                                    tempPhotoUri = uri
                                                    cameraLauncher.launch(uri)
                                                } else {
                                                    cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                                                }
                                            }
                                        },
                                        onPermissionRequest = { permissionLauncher.launch(it) }
                                    )
                                }
                            }
                        }
                        
                        val otherDeliveries = filteredDeliveries.filter { it.deliverySlot !in slots }
                        if (otherDeliveries.isNotEmpty()) {
                            item(key = "header_others") {
                                SlotHeader("Others")
                            }
                            items(otherDeliveries, key = { it.id }) { delivery ->
                                DeliveryCardItem(
                                    delivery = delivery,
                                    hasLocationPermission = hasLocationPermission,
                                    onOpenMap = { openGoogleMaps(context, delivery.latitude, delivery.longitude) },
                                    onConfirmRequest = {
                                        getCurrentLocation(context, fusedLocationClient) { _ ->
                                            currentDeliveryId = delivery.id
                                            if (hasCameraPermission) {
                                                val uri = createImageUri(context)
                                                tempPhotoUri = uri
                                                cameraLauncher.launch(uri)
                                            } else {
                                                cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                                            }
                                        }
                                    },
                                    onPermissionRequest = { permissionLauncher.launch(it) }
                                )
                            }
                        }
                    } else {
                        items(filteredDeliveries, key = { it.id }) { delivery ->
                            DeliveryCardItem(
                                delivery = delivery,
                                hasLocationPermission = hasLocationPermission,
                                onOpenMap = { openGoogleMaps(context, delivery.latitude, delivery.longitude) },
                                onConfirmRequest = { /* Not needed for delivered */ },
                                onPermissionRequest = { permissionLauncher.launch(it) }
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun createImageUri(context: Context): Uri {
    val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
    val storageDir = context.getExternalFilesDir("Pictures")
    val file = File.createTempFile("JPEG_${timeStamp}_", ".jpg", storageDir)
    return FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file
    )
}

@Composable
fun SlotHeader(slot: String) {
    Surface(
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.padding(top = 12.dp, bottom = 8.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Schedule,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = slot,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }
    }
}

@Composable
fun DeliveryCardItem(
    delivery: Delivery,
    hasLocationPermission: Boolean,
    onOpenMap: () -> Unit,
    onConfirmRequest: () -> Unit,
    onPermissionRequest: (String) -> Unit
) {
    val context = LocalContext.current
    var showConfirmDialog by remember { mutableStateOf(false) }
    var showImagePreview by remember { mutableStateOf(false) }

    if (showImagePreview && delivery.proofImageUrl != null) {
        Dialog(onDismissRequest = { showImagePreview = false }) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color.Black)
                    .clickable { showImagePreview = false } // Tap anywhere to close
            ) {
                AsyncImage(
                    model = delivery.proofImageUrl,
                    contentDescription = "Proof Preview",
                    modifier = Modifier.fillMaxSize()
                )
                
                Surface(
                    color = Color.Black.copy(alpha = 0.6f),
                    shape = CircleShape,
                    modifier = Modifier.align(Alignment.TopEnd).padding(12.dp)
                ) {
                    IconButton(
                        onClick = { showImagePreview = false },
                        modifier = Modifier.size(40.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Color.White
                        )
                    }
                }
                
                Text(
                    text = "Tap anywhere to close",
                    color = Color.White.copy(alpha = 0.7f),
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 16.dp)
                )
            }
        }
    }

    if (showConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showConfirmDialog = false },
            title = { Text("Confirm Arrival") },
            text = { Text("Are you sure you have arrived at ${delivery.customerName}'s location?") },
            confirmButton = {
                Button(
                    onClick = {
                        showConfirmDialog = false
                        onConfirmRequest()
                    },
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Yes, Arrived")
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    ElevatedCard(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.elevatedCardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.elevatedCardElevation(defaultElevation = 2.dp)
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            // Status Indicator Bar
            Box(
                modifier = Modifier
                    .width(6.dp)
                    .fillMaxHeight()
                    .align(Alignment.CenterStart)
                    .background(
                        if (delivery.isConfirmed) Color(0xFF4CAF50) else Color(0xFFFF9800)
                    )
            )

            Column(modifier = Modifier.padding(start = 22.dp, end = 20.dp, top = 20.dp, bottom = 20.dp)) {
                // Header: Order ID and Contact Actions
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                text = "#${delivery.id.take(8).uppercase()}",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.ExtraBold
                            )
                        }
                        
                        if (delivery.deliverySlot != null) {
                            Spacer(modifier = Modifier.width(12.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Schedule,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.outline,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = delivery.deliverySlot,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.outline,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    val activeNumber = delivery.phoneNumber ?: delivery.contactNumber
                    if (!activeNumber.isNullOrBlank()) {
                        Row {
                            FilledIconButton(
                                onClick = {
                                    val intent = Intent(Intent.ACTION_DIAL, "tel:$activeNumber".toUri())
                                    context.startActivity(intent)
                                },
                                modifier = Modifier.size(36.dp),
                                colors = IconButtonDefaults.filledIconButtonColors(
                                    containerColor = MaterialTheme.colorScheme.primaryContainer
                                )
                            ) {
                                Icon(
                                    Icons.Default.Phone,
                                    contentDescription = "Call",
                                    modifier = Modifier.size(18.dp),
                                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }

                            Spacer(modifier = Modifier.width(8.dp))

                            FilledIconButton(
                                onClick = {
                                    val intent = Intent(Intent.ACTION_SENDTO, "smsto:$activeNumber".toUri())
                                    context.startActivity(intent)
                                },
                                modifier = Modifier.size(36.dp),
                                colors = IconButtonDefaults.filledIconButtonColors(
                                    containerColor = MaterialTheme.colorScheme.primaryContainer
                                )
                            ) {
                                Icon(
                                    Icons.AutoMirrored.Filled.Message,
                                    contentDescription = "Message",
                                    modifier = Modifier.size(18.dp),
                                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Customer Info
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = delivery.customerName,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        Row(verticalAlignment = Alignment.Top) {
                            Icon(
                                Icons.Default.LocationOn,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp).padding(top = 2.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = delivery.address,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                lineHeight = 20.sp
                            )
                        }

                        if (!delivery.phoneNumber.isNullOrBlank() || !delivery.contactNumber.isNullOrBlank()) {
                            val displayNum = delivery.phoneNumber ?: delivery.contactNumber
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.Phone,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = MaterialTheme.colorScheme.outline
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = displayNum!!,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.outline
                                )
                            }
                        }
                    }
                    
                    // Status Badge
                    Surface(
                        color = if (delivery.isConfirmed) 
                            Color(0xFFE8F5E9) 
                        else 
                            Color(0xFFFFF3E0),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = if (delivery.isConfirmed) "Delivered" else "Pending",
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (delivery.isConfirmed) Color(0xFF2E7D32) else Color(0xFFE65100)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Footer Actions
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (delivery.isConfirmed) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            TextButton(
                                onClick = onOpenMap,
                                contentPadding = PaddingValues(horizontal = 12.dp)
                            ) {
                                Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Route")
                            }
                            
                            delivery.proofImageUrl?.let { uri ->
                                Spacer(modifier = Modifier.width(12.dp))
                                Box(
                                    modifier = Modifier
                                        .size(56.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(MaterialTheme.colorScheme.surfaceVariant)
                                        .clickable { showImagePreview = true },
                                    contentAlignment = Alignment.Center
                                ) {
                                    AsyncImage(
                                        model = uri,
                                        contentDescription = "Proof",
                                        modifier = Modifier.fillMaxSize()
                                    )
                                    // Small "View" overlay
                                    Box(
                                        modifier = Modifier
                                            .fillMaxSize()
                                            .background(Color.Black.copy(alpha = 0.2f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Check, // Reusing check icon for confirmation look
                                            contentDescription = null,
                                            tint = Color.White.copy(alpha = 0.8f),
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }
                            }
                        }
                    } else {
                        // Action buttons for Pending
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            OutlinedButton(
                                onClick = {
                                    if (hasLocationPermission) onOpenMap() 
                                    else onPermissionRequest(Manifest.permission.ACCESS_FINE_LOCATION)
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                contentPadding = PaddingValues(vertical = 12.dp)
                            ) {
                                Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Route")
                            }
                            
                            SwipeToConfirmButton(
                                modifier = Modifier.weight(2f),
                                onConfirmed = {
                                    if (hasLocationPermission) showConfirmDialog = true
                                    else onPermissionRequest(Manifest.permission.ACCESS_FINE_LOCATION)
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SwipeToConfirmButton(
    modifier: Modifier = Modifier,
    onConfirmed: () -> Unit
) {
    val density = LocalDensity.current
    var offsetX by remember { mutableFloatStateOf(0f) }
    var widthPx by remember { mutableFloatStateOf(0f) }
    
    Box(
        modifier = modifier
            .height(44.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.08f))
            .onSizeChanged { widthPx = it.width.toFloat() }
    ) {
        val thumbSize = 36.dp
        val thumbSizePx = with(density) { thumbSize.toPx() }
        val paddingPx = with(density) { 4.dp.toPx() }
        val maxOffset = (widthPx - thumbSizePx - (paddingPx * 2)).coerceAtLeast(0f)

        // Track progress for UI changes
        val progress = if (maxOffset > 0f) (offsetX / maxOffset).coerceIn(0f, 1f) else 0f

        Text(
            text = "Slide to Confirm",
            modifier = Modifier.align(Alignment.Center),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.primary.copy(alpha = (0.7f - (progress * 0.5f)).coerceIn(0f, 1f)),
            fontWeight = FontWeight.Bold
        )

        Box(
            modifier = Modifier
                .offset { IntOffset(offsetX.roundToInt(), 0) }
                .padding(4.dp)
                .size(thumbSize)
                .clip(CircleShape)
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(
                            MaterialTheme.colorScheme.primary,
                            MaterialTheme.colorScheme.secondary
                        )
                    )
                )
                .draggable(
                    orientation = Orientation.Horizontal,
                    state = rememberDraggableState { delta ->
                        offsetX = (offsetX + delta).coerceIn(0f, maxOffset)
                    },
                    onDragStopped = {
                        if (offsetX > maxOffset * 0.85f) {
                            offsetX = maxOffset
                            onConfirmed()
                        }
                        offsetX = 0f
                    }
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = if (progress > 0.85f) Icons.Default.Check else Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}
