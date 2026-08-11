# Android signing and Google Play releases

This file is the source of truth for Android releases of `com.torahapp.pash`.
Read it before changing `versionCode`, building an AAB, or uploading to Google Play.

## Current status

- App: תורה עם מפרשים
- Package: `com.torahapp.pash`
- Google Play app ID: `4973641710236493710`
- Developer account ID: `7704462559572865167`
- Testing track: `internal`
- Current internal-testing release: `1.8.5`, version code `29`
- Current production release: `1.8.2`, version code `26`
- Upload-key reset requested on 2026-08-06 and approved by Google. The new key was confirmed by a successful upload on 2026-08-11.
- Internal testing is active. Release `1.8.5` is available to the selected tester email lists.
- Tester opt-in URL: `https://play.google.com/apps/internaltest/4701562293919669655`

### Certificate fingerprints

- Old Google Play upload certificate SHA-1: `0F:DF:16:62:1B:4C:E9:3B:5F:4F:45:9C:08:CF:8B:1A:BF:6E:6A:AC`
- New local upload certificate SHA-1: `A6:5F:46:C5:30:6A:41:AC:6E:03:4F:1E:89:E0:60:FA:F9:C6:7E:A7`
- Google Play app-signing certificate SHA-1: `0E:32:11:2D:5C:F3:9F:31:F0:29:6C:B6:46:CF:24:9A:0B:87:0B:B7`

The app-signing key belongs to Google Play and is intentionally different from the upload key.

## Files required for every release

These files are intentionally ignored by Git and must never be committed:

- `android/app/pashash-release.keystore` — private upload key.
- `android/app/signing.properties` — keystore filename, alias, and passwords.
- `scripts/google-play-service-account.json` — Google Play API credentials.

A complete private backup is stored outside the repository at:

`C:\Users\jj121\Documents\Pash-Android-Signing-Backup-KEEP-SAFE`

Do not email, upload to GitHub, or publicly share that folder.

## Mandatory check before building

Run this from the repository root:

```powershell
$props = @{}
Get-Content android/app/signing.properties | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') { $props[$matches[1].Trim()] = $matches[2].Trim() }
}
$keyPath = Join-Path 'android/app' $props.storeFile
keytool -list -v -keystore $keyPath -storepass $props.storePassword -alias $props.keyAlias |
  Select-String 'SHA1:'
```

The result must be:

`A6:5F:46:C5:30:6A:41:AC:6E:03:4F:1E:89:E0:60:FA:F9:C6:7E:A7`

If the fingerprint differs, stop. Do not upload the AAB.

## Release process

1. Confirm the upload-key fingerprint using the command above.
2. Increase `versionCode` in `android/app/build.gradle`. It must be higher than every version already uploaded.
3. Update `versionName` in `android/app/build.gradle`, `package.json`, and `package-lock.json`.
4. Run `npm run build`.
5. Run `npx cap sync android`.
6. Run `android\gradlew.bat bundleRelease` from the repository root, or `gradlew.bat bundleRelease` inside `android`.
7. Upload `android/app/build/outputs/bundle/release/app-release.aab` only to the intended track.
8. For testers, use Google Play Console → Testing and release → Internal testing.
9. Verify the new version is marked as available to internal testers before reporting completion.

## If Google rejects the signing key

Do not generate another key and do not repeatedly upload the same bundle.

1. Compare the SHA-1 shown by Google with the local SHA-1.
2. Restore the exact keystore and `signing.properties` from the private backup.
3. If the original upload key is permanently lost, request an upload-key reset in Google Play Console → Protected by Play → App signing.
4. Export only the public certificate as PEM for the request:

```powershell
keytool -exportcert -rfc -keystore upload-key.jks -alias upload -file upload-certificate.pem
```

5. Wait until Google shows the new upload certificate fingerprint before uploading a new AAB.

## Important distinction

- Upload key: used locally to prove that an upload comes from this developer.
- App-signing key: held by Google and used to sign the APKs delivered to users.

Never attempt to replace the Google Play app-signing key merely because an upload-key error occurred.
