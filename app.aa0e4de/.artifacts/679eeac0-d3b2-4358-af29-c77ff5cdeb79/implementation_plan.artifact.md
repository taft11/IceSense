# Implementation Plan - Refactor UI to Hamburger Menu

Replace the current logout button with a navigation drawer (hamburger menu) that includes a user profile section, Edit Profile, About Us, and other placeholders.

## User Review Required

> [!IMPORTANT]
> The "Edit Profile" and "About Us" screens will be implemented as basic placeholders. You can later integrate them with your backend or static content as needed.

## Proposed Changes

### [Component Name] UI Components & Models

#### [NEW] [User.kt](file:///C:/Users/SEANEURY_/Desktop/New%20folder/IceSense/app/app/src/main/java/com/bellaerin/icesense/model/User.kt)
- Create a simple data class to hold user profile information (name, email, role).

#### [NEW] [AboutUsScreen.kt](file:///C:/Users/SEANEURY_/Desktop/New%20folder/IceSense/app/app/src/main/java/com/bellaerin/icesense/ui/screens/AboutUsScreen.kt)
- A new composable for the "About Us" information.

#### [NEW] [EditProfileScreen.kt](file:///C:/Users/SEANEURY_/Desktop/New%20folder/IceSense/app/app/src/main/java/com/bellaerin/icesense/ui/screens/EditProfileScreen.kt)
- A new composable for editing user profile (placeholder for now).

---

### [Component Name] Main App Refactoring

#### [MODIFY] [MainActivity.kt](file:///C:/Users/SEANEURY_/Desktop/New%20folder/IceSense/app/app/src/main/java/com/bellaerin/icesense/MainActivity.kt)
- Update `DeliveryApp` to include `ModalNavigationDrawer`.
- Manage user profile state.
- Add navigation logic for the new screens.
- Implement the `DrawerContent` with:
    - User profile header (Name/Email).
    - Navigation items (Home, Edit Profile, About Us).
    - Logout action at the bottom.

#### [MODIFY] [DeliveryListScreen.kt](file:///C:/Users/SEANEURY_/Desktop/New%20folder/IceSense/app/app/src/main/java/com/bellaerin/icesense/ui/screens/DeliveryListScreen.kt)
- Replace the logout icon button with a hamburger menu icon.
- Add a callback to open the drawer.

## Verification Plan

### Automated Tests
- Build the project to ensure no compilation errors.

### Manual Verification
1.  **Login**: Ensure login still works.
2.  **Drawer**: Click the hamburger menu on the `DeliveryListScreen` and verify the drawer opens.
3.  **Profile**: Verify user info (email/name if available) is shown in the drawer header.
4.  **Navigation**: Click "Edit Profile" and "About Us" to ensure they navigate correctly.
5.  **Logout**: Click the logout button in the drawer and verify it redirects to the login screen.
