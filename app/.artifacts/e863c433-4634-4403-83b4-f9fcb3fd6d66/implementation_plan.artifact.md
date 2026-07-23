# Fix Unresolved Reference 'auth' in MainActivity.kt

The error `Unresolved reference 'auth'` in `MainActivity.kt` occurs because the Firebase Authentication library is not included in the project's dependencies. Additionally, the project is missing the Firebase Firestore dependency which is also used in the file, and the Google Services plugin required for Firebase.

## Proposed Changes

### [Component Name] Build Configuration

#### [MODIFY] [libs.versions.toml](file:///C:/Users/SEANEURY_/Desktop/New%20folder/IceSense/app/gradle/libs.versions.toml)
- Add versions for Firebase BOM and Google Services plugin.
- Add library definitions for Firebase BOM, Auth, and Firestore.
- Add plugin definition for Google Services.

#### [MODIFY] [root build.gradle.kts](file:///C:/Users/SEANEURY_/Desktop/New%20folder/IceSense/app/build.gradle.kts)
- Register the Google Services plugin.

#### [MODIFY] [app build.gradle.kts](file:///C:/Users/SEANEURY_/Desktop/New%20folder/IceSense/app/app/build.gradle.kts)
- Apply the Google Services plugin.
- Add Firebase dependencies (BOM, Auth, and Firestore).

## Verification Plan

### Automated Tests
- Run `./gradlew :app:compileDebugKotlin` to verify that the unresolved reference error is resolved.

### Manual Verification
- Perform a Gradle Sync in Android Studio to ensure all dependencies are correctly downloaded and indexed.
