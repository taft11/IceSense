# Implementation Plan - Separate Delivery States with Tabs

Organize the delivery list into two distinct views: "To Deliver" (Pending) and "Delivered" (Confirmed). This will prevent the list from becoming cluttered and make it easier for drivers to focus on current tasks.

## Proposed Changes

### [Component: UI]

#### [MODIFY] [DeliveryListScreen.kt](file:///C:/Users/SEANEURY_/AndroidStudioProjects/IceSense2/app/src/main/java/com/example/icesense/ui/screens/DeliveryListScreen.kt)
- **Tab State**: Add `selectedTabIndex` state.
- **Filtering**: Create two filtered lists: `pendingDeliveries` and `confirmedDeliveries`.
- **TabRow**: Implement a `PrimaryTabRow` below the header to toggle between the two views.
- **Badge/Count**: (Optional but recommended) Show the count of pending deliveries in the "To Deliver" tab.
- **List Logic**: Update the `LazyColumn` to display only the deliveries relevant to the selected tab.
- **Empty States**: Add a simple message (e.g., "No pending deliveries") when a list is empty.

## Verification Plan

### Automated Tests
- N/A

### Manual Verification
1.  **Tab Switching**: Click on "To Deliver" and "Delivered" tabs and verify the list updates correctly.
2.  **Confirmation Flow**: Confirm a delivery in the "To Deliver" tab and verify it moves to the "Delivered" tab automatically.
3.  **Counts**: Verify that the "Pending" count in the header or tab matches the actual number of items.
4.  **Proof Visibility**: Ensure proof images are still visible and clickable in the "Delivered" tab.
