# Implementation Plan - Fix Unresolved Reference 'auth'

The error `Unresolved reference 'auth'` in `MainActivity.kt` is caused by missing Firebase dependencies. The code attempts to use Firebase Authentication and Cloud Firestore, but these libraries are not included in the project configuration.

## Proposed Changes

### Build Configuration

#### [MODIFY] [libs.versions.toml](file:///C:/Users/SEANEURY_/Desktop/New%20folder/IceSense/app/gradle/libs.versions.toml)
- Add versions for Firebase BOM (`34.16.0`) and Google Services plugin (`4.5.0`).
- Add library definitions for:
    - `firebase-bom`
    - `firebase-auth`
    - `firebase-firestore`
- Add plugin definition for `google-services`.

#### [MODIFY] [root build.gradle.kts](file:///C:/Users/SEANEURY_/Desktop/New%20folder/IceSense/app/build.gradle.kts)
- Add the `google-services` plugin to the top-level plugins block (applied as `false`).

#### [MODIFY] [app build.gradle.kts](file:///C:/Users/SEANEURY_/Desktop/New%20folder/IceSense/app/app/build.gradle.kts)
- Apply the `google-services` plugin.
- Add Firebase dependencies:
    - `implementation(platform(libs.firebase.bom))`
    - `implementation(libs.firebase.auth)`
    - `implementation(libs.firebase.firestore)`

## Verification Plan

### Automated Tests
- Execute `./gradlew :app:assembleDebug` to confirm the project compiles without unresolved reference errors.

### Manual Verification
- Verify that the `import com.google.firebase.auth.FirebaseAuth` in `MainActivity.kt` is no longer flagged as an error by the IDE.

> [!IMPORTANT]
> To successfully run the app on a device, you will need to add a `google-services.json` file (obtained from the Firebase Console) to the `app/` directory. Without this file, the app may crash at startup or during Firebase initialization.
