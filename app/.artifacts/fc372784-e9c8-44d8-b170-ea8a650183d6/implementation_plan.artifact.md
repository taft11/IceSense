# Restrict App Access to Drivers Only

Update the login logic to verify that the authenticated user has the "driver" role in the Realtime Database before allowing access to the app.

## Proposed Changes

### Login Logic

#### [MODIFY] [LoginScreen.kt](file:///C:/Users/Nadine/Downloads/IceSense/iceSenseWeb/app/app/src/main/java/com/bellaerin/icesense/ui/screens/LoginScreen.kt)
- Import `FirebaseDatabase`.
- Update the `signInWithEmailAndPassword` completion listener:
    - After a successful login, fetch the user's data from the path `users/{uid}` in the Realtime Database.
    - Check if the `role` field exists and equals `"driver"`.
    - If valid, call `onLoginSuccess()`.
    - If invalid or missing, sign the user out and show an error message: "Access denied. Only drivers can use this app."

## Verification Plan

### Manual Verification
- Attempt to login with an account that has `role: "driver"` in the database. It should succeed.
- Attempt to login with an account that has a different role (e.g., `"admin"`) or no entry in the `users` table. It should fail with an "Access denied" message.
