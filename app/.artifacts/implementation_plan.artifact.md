# Implementation Plan: Group Deliveries by Time Slot on Dashboard

This plan outlines the changes to support delivery time slots. We will update the data model, fetch the time slot from Firestore, and organize the driver's dashboard into sections based on these slots (8:00 AM - 11:00 AM, 11:00 AM - 2:00 PM, 2:00 PM - 5:00 PM) to help drivers prioritize their deliveries.

## Proposed Changes

### [Delivery.kt](file:///C:/Users/SEANEURY_/Desktop/New folder/IceSense/app/app/src/main/java/com/bellaerin/icesense/model/Delivery.kt)

- **[MODIFY]** Add a `deliverySlot: String?` field to the `Delivery` data class to store the scheduled time.

### [MainActivity.kt](file:///C:/Users/SEANEURY_/Desktop/New folder/IceSense/app/app/src/main/java/com/bellaerin/icesense/MainActivity.kt)

- **[MODIFY]** Update the Firestore fetching logic within `DeliveryApp` to:
    - Retrieve the `deliveryTimeSlot` field from the order document.
    - Map it to the `deliverySlot` property when creating `Delivery` objects.

### [DeliveryListScreen.kt](file:///C:/Users/SEANEURY_/Desktop/New folder/IceSense/app/app/src/main/java/com/bellaerin/icesense/ui/screens/DeliveryListScreen.kt)

- **[MODIFY]** Update `DeliveryListScreen` to group "To Deliver" items by their `deliverySlot`.
- **[MODIFY]** Implement section headers in the `LazyColumn` for each time slot:
    - 8:00 AM - 11:00 AM
    - 11:00 AM - 2:00 PM
    - 2:00 PM - 5:00 PM
    - Others/Unscheduled
- **[MODIFY]** Update `DeliveryCard` to display the specific time slot inside the card for quick reference.

## Verification Plan

### Automated Tests
- Run `gradle build` to ensure the project compiles with the updated data model.

### Manual Verification
1.  **Data Fetching**: Verify in Logcat that `deliveryTimeSlot` is being correctly retrieved from Firestore.
2.  **Dashboard Organization**: Open the "To Deliver" tab and ensure deliveries are grouped under the correct time slot headers.
3.  **Prioritization**: Confirm that the 8:00 AM - 11:00 AM section appears first, followed by later slots.
4.  **Edge Case**: Check that deliveries without a valid time slot appear in an "Others" or "Unscheduled" section at the bottom.
