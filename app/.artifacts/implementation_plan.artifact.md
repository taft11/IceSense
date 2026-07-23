# Fix Unresolved Reference 'auth'

The error `Unresolved reference 'auth'` in `MainActivity.kt` is caused by missing Firebase dependencies and the Google Services plugin configuration in the project.

## User Review Required

> [!IMPORTANT]
> To successfully run the app on a device/emulator, you will eventually need a `google-services.json` file from your Firebase console. However, this plan focuses on fixing the build error by adding the necessary dependencies.

## Proposed Changes

### Build Configuration

#### [MODIFY] [libs.versions.toml](file:///C:/Users/SEANEURY_/Desktop/New%20folder/IceSense/app/gradle/libs.versions.toml)
- Add versions for Firebase BOM (`34.16.0`) and Google Services plugin (`4.5.0`).
- Add library definitions for:
    - `firebase-bom`
    - `firebase-auth`
    - `firebase-firestore`
- Add plugin definition for `google-services`.

#### [MODIFY] [build.gradle.kts (root)](file:///C:/Users/SEANEURY_/Desktop/New%20folder/IceSense/app/build.gradle.kts)
- Register the Google Services plugin in the top-level `plugins` block.

#### [MODIFY] [build.gradle.kts (:app)](file:///C:/Users/SEANEURY_/Desktop/New%20folder/IceSense/app/app/build.gradle.kts)
- Apply the `google-services` plugin.
- Add Firebase dependencies using the BOM for version management.

## Verification Plan

### Automated Tests
- Run `./gradlew :app:compileDebugKotlin` to ensure the "Unresolved reference" errors are resolved.

### Manual Verification
- Perform a Gradle Sync in Android Studio to confirm all dependencies are correctly resolved.
