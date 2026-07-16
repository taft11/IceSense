# Implementation Plan: High-Fidelity Vector Logo for Login Screen

I will recreate the "Bella Erin" logo using Compose `Canvas` (shapes) to ensure it stays perfectly sharp at any size. This will replace the image in the `LoginScreen` and allow it to be displayed much larger as requested.

## Proposed Changes

### UI Components

#### [MODIFY] [AppBranding.kt](file:///C:/Users/SEANEURY_/AndroidStudioProjects/IceSense2/app/src/main/java/com/example/icesense/ui/components/AppBranding.kt)
- Refine the `BellaErinLogo` geometry to match the uploaded image's mountain peaks and geometric internal lines more accurately.
- Use the exact colors: Blue `#2196F3` for the lines and dark grey `#333333` for the text.

### UI Screens

#### [MODIFY] [LoginScreen.kt](file:///C:/Users/SEANEURY_/AndroidStudioProjects/IceSense2/app/src/main/java/com/example/icesense/ui/screens/LoginScreen.kt)
- Switch back from using the `Image` (uploaded file) to the refined `BellaErinLogo` (vector shapes).
- Increase the `iconSize` to **240.dp** to make it significantly larger.

#### [MODIFY] [DeliveryListScreen.kt](file:///C:/Users/SEANEURY_/AndroidStudioProjects/IceSense2/app/src/main/java/com/example/icesense/ui/screens/DeliveryListScreen.kt)
- Switch the header logo back to the refined `BellaErinLogo` vector for consistency.

## Verification Plan

### Manual Verification
- Render the `LoginScreen` to verify the new logo size and sharpness.
- Ensure the geometric lines look "clean" and match the branding provided in the chat.
- Verify the logo still fits and looks proportional in the `DeliveryListScreen` header.
