# Implementation Plan: Fetching Linked Delivery Data from Firestore

This plan outlines the changes needed to fetch delivery data by linking the `orders` collection (which contains the `userId`) with the `users` collection (which contains the customer's name and address details).

## Proposed Changes

### [MainActivity.kt](file:///C:/Users/Nadine/Downloads/IceSense/iceSenseWeb/app/app/src/main/java/com/bellaerin/icesense/MainActivity.kt)

- **Update `deliveries` fetching logic**:
    - Modify the `orders` collection listener to fetch user details for each order.
    - Implement a mechanism to fetch and map data from the `users` collection:
        - Get `userId` from the order document.
        - Fetch the user document corresponding to that `userId`.
        - Combine `firstName` (and `lastName` if available) for the `customerName`.
        - Retrieve the address from the `addresses` array. Specifically, look for the address object where the `id` matches `defaultAddressId`.
        - Concatenate address components (street, city, state) into a single string.
        - Extract `latitude` and `longitude` from the matched address object.
    - Ensure the `deliveries` state is updated correctly even though fetching user details is asynchronous.

## Verification Plan

### Automated Tests
- Run the app and check for any Firestore-related errors in Logcat.
- Verify that `deliveries` list is populated correctly in the UI.

### Manual Verification
- **Data Loading**: Observe that orders are loaded and names/addresses are correctly displayed.
- **Filtering**: Check if "To Deliver" and "Delivered" tabs correctly filter orders based on the `isConfirmed` status.
- **Confirmation**: Mark an order as "Delivered" and verify:
    - The UI updates locally.
    - The `orders` document in Firestore is updated with `isConfirmed: true` and the `proofImageUri`.
- **Navigation**: Click "View Map" on an order and ensure it opens Google Maps at the correct coordinates.
