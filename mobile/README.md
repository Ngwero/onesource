# One Source Mobile (Flutter)

Native iOS and Android app for the One Source shop. Lives alongside the web project in `mobile/` — the existing React shop is unchanged.

## Features

- Browse products and categories
- Search, product details, cart (persisted locally)
- Checkout with delivery (same UGX rules as web)
- Sign in with email + password + OTP (Supabase)
- Sign up, password reset, order history

## Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install) 3.27+
- Xcode (iOS) or Android Studio (Android)
- Running API: local `cd server && npm run dev` or production `https://www.onesourco.com/api`

## Setup

```bash
cd mobile
flutter pub get
```

## Run

**Production API (default):**

```bash
cd mobile
flutter run
```

**Local API (Android emulator):**

```bash
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:3001/api \
  --dart-define=SUPABASE_URL=https://kobbhuispglyflddjeqi.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your-anon-key
```

**Local API (iOS simulator):**

```bash
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api
```

## Project structure

```
mobile/
  lib/
    config/       # Env, theme
    models/       # Product, Order, Cart
    services/     # API client, Supabase auth, checkout
    providers/    # Riverpod state
    screens/      # UI screens
    widgets/      # Reusable components
    router/       # go_router navigation
  assets/brand/   # Logo assets
```

## Environment variables

Passed via `--dart-define`:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Anon public key |
| `API_BASE_URL` | Shop API including `/api` |
| `SUPABASE_STORAGE_BUCKET` | Default `images` |

Defaults in `lib/config/env.dart` point at production.

## Auth flow

Same as web:

1. `POST /api/auth/login/request-otp` — verify password
2. Supabase `signInWithOtp` — email OTP
3. Supabase `verifyOTP` — complete session

## Troubleshooting iOS launch (CoreDeviceError 10002)

The **build can succeed** but launch fails when Flutter/Xcode cannot install or start the app on the device.

### Fix checklist (do in order)

1. **Use a USB cable** — your iPhone shows as *wirelessly connected*, which often causes `CoreDeviceError 10002`. Plug in with USB, unlock the phone, tap **Trust**.

2. **Developer Mode** (iPhone): **Settings → Privacy & Security → Developer Mode** → ON → restart phone.

3. **Trust your certificate**: **Settings → General → VPN & Device Management** → your Apple ID → **Trust**.

4. **Delete the old app** from the home screen, then install again.

5. **Run from Xcode** (most reliable):
   ```bash
   open ios/Runner.xcworkspace
   ```
   Select your **iPhone** (not a simulator) → **Product → Run** (▶).

6. If Xcode launches the app but `flutter run` fails, use:
   ```bash
   flutter attach
   ```
   (Keep the app open from Xcode.)

7. **Mac permissions**: **System Settings → Privacy & Security → Automation** — allow Terminal/Cursor to control **Xcode**.

8. **Clean rebuild**:
   ```bash
   flutter clean
   rm -rf ios/Pods ios/Podfile.lock
   flutter pub get
   cd ios && pod install && cd ..
   flutter run
   ```

### iOS Simulator (no signing, quick test)

```bash
open -a Simulator
flutter run
```

Choose the simulator when prompted — no Apple certificate needed.

### App crashes at launch (`__pthread_kill` in lldb)

This usually means the app called `abort()` — often from a native plugin. `supabase_flutter` **2.15.0+** bundles the **passkeys** plugin, which can crash on launch if Associated Domains are not configured.

This project pins **`supabase_flutter: 2.14.2`** (no passkeys). After upgrading dependencies, run a clean rebuild:

```bash
cd mobile
flutter clean
flutter pub get
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
```

Delete the app from your phone, then run from Xcode (`open ios/Runner.xcworkspace` → ▶).

If it still crashes, check the **exception reason** in Xcode’s debug console (above the `__pthread_kill` frame) and share that message.


- Web shop: project root `README` / `DEPLOY.md`
- API routes: `server/routes/`
- Supabase email templates: `server/supabase/email-templates/`
