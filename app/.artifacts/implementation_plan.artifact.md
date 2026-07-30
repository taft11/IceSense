# Implementation Plan - Driver Assignment Restriction

Restrict the visibility of orders so that a driver only sees orders assigned specifically to them by the admin.

## User Review Required

> [!IMPORTANT]
> This change relies on the `assignedDriverId` field being present in the Firestore `orders` documents. We will compare this field with the currently logged-in user's UID.

## Proposed Changes

### MainActivity

#### [MODIFY] [MainActivity.kt](file:///C:/Users/SEANEURY_/Desktop/New folder/IceSense/app/app/src/main/java/com/bellaerin/icesense/MainActivity.kt)
- **Filtering Logic**: Update the `orderDocs.filter` block inside the `addSnapshotListener`.
- Add a check to compare `doc.getString("assignedDriverId")` with `currentUserProfile?.uid`.
- Only include orders where the status is `"Processing"` or `"Delivered"` **AND** the `assignedDriverId` matches the logged-in driver.

## Verification Plan

### Manual Verification
- **Scenario 1**: Log in as Driver A (e.g., Sean). Create an order assigned to Driver B (e.g., Tan). Verify Driver A **cannot** see the order.
- **Scenario 2**: Update the order's `assignedDriverId` to Driver A's UID. Verify the order **appears** for Driver A.
- **Scenario 3**: Verify that orders with status `"Delivered"` also remain visible to the assigned driver in their history.
