# Publish One Source to Google Play

Package ID: `com.ngwero.onesource`  
App name: **One Source**

## 1. Signing (done locally)

- Upload keystore: `mobile/android/upload-keystore.jks`
- Passwords / alias: `mobile/android/key.properties`
- Backup note: `mobile/android/PLAY_SIGNING_BACKUP.txt`

**Back these up somewhere safe (password manager / encrypted drive).**  
Losing them means you cannot publish updates to the same Play listing.

These files are gitignored — do not commit them.

## 2. Build the Play upload (App Bundle)

```bash
cd mobile
flutter pub get
flutter build appbundle --release
```

Output:

`mobile/build/app/outputs/bundle/release/app-release.aab`

Production API is already the default (`https://www.onesourco.com/api`).

## 3. Google Play Console

1. Open [Google Play Console](https://play.google.com/console) (need a Google developer account — one-time ~$25 USD).
2. **Create app** → One Source → App / Free / Uganda (or worldwide).
3. Complete **Dashboard** tasks:
   - Store listing (title, short + full description, screenshots, icon 512×512, feature graphic 1024×500)
   - Privacy policy URL (e.g. `https://www.onesourco.com/privacy` — required)
   - App content / Data safety questionnaire
   - Target audience / content rating
4. **Production** (or Internal testing first) → **Create release** → upload `app-release.aab`.
5. Use **Play App Signing** (recommended): upload your AAB; Google manages the app signing key; your file is the *upload* key.

## 4. Suggested first path

**Internal testing** → invite your Gmail → install from Play → then promote to **Closed / Open testing** → **Production**.

## 5. Version bumps for later updates

In `mobile/pubspec.yaml`:

```yaml
version: 1.0.1+2   # name+code — code must increase every upload
```

Then rebuild the AAB and upload a new release.
