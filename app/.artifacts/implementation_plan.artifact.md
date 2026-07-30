# Implementation Plan - Dark Mode Toggle

Add a theme toggle (Dark/Light mode) to the navigation drawer (hamburger menu) to allow drivers to switch between themes manually.

## Proposed Changes

### MainActivity

#### [MODIFY] [MainActivity.kt](file:///C:/Users/SEANEURY_/Desktop/New folder/IceSense/app/app/src/main/java/com/bellaerin/icesense/MainActivity.kt)
- **Theme State**:
    - Initialize `isDarkMode` by reading from `SharedPreferences`.
    - Use `isSystemInDarkTheme()` as the default if no preference is saved.
- **Theme Injection**: Pass `isDarkMode` to the `IceSenseTheme` wrapper in `setContent`.
- **UI Component**:
    - Add a `HorizontalDivider` above the logout item in the `ModalDrawerSheet`.
    - Add a `NavigationDrawerItem` with a `Switch` in the `badge` or `trailingIcon` slot to toggle the theme.
- **Persistence**: Save the new preference to `SharedPreferences` whenever the toggle is flipped.

## Verification Plan

### Manual Verification
- **Scenario 1**: Open the hamburger menu and toggle the switch. Verify the entire app theme changes immediately.
- **Scenario 2**: Check visibility of the toggle in both themes.
- **Scenario 3**: Verify the theme preference persists during the current app session (it will reset on app restart unless SharedPreferences is used, but for this task, runtime state is likely sufficient).
