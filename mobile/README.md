# Asset Ledger · Field (phone app)

Phone app for site capture. iOS and Android from one Expo codebase.
The Next.js web app in the repo root stays the place for consultant review and approvals.

## What it does

- **Elements** use the same IDs as the web catalogue (e.g. GY-192).
- **LiDAR surface scan** (iPhone/iPad Pro): ARKit mesh of a façade, element or opening. Saved as OBJ, in metres.
- **LiDAR room layout** (iPhone/iPad Pro): Apple RoomPlan walls, openings, doors and windows. Saved as USDZ.
- **3D view and measure** (iOS): orbit and zoom the scan, then tap two points for a distance in mm.
- **Photo set** (all phones, including Android): guided overlapping photos for later 3D processing.
- **Scale check**: tape one distance on site, measure it on the scan, and record the difference.
- **Defects**: type, severity 1–5, location, size, photo, proposed repair. Can be linked to a scan.
- **History**: every capture, measurement, scale check and defect is logged. There are no edit or delete functions for the log.
- **Sync**: sends scans, photos and defects to the web app. Files upload straight to Cloudflare R2. Set the web app address and device token in **Settings** (the token is kept in secure storage). Anything not yet sent shows on the **Sync** button, and a failed sync can be repeated safely.

The phone records evidence only. It has no approve or release buttons. Consultant decisions stay in the web app under the existing Contractor/Consultant rules.

## Not built yet

- Showing synced scans and 3D models on the web asset pages.
- Server processing of photo sets into 3D models.
- 3D viewer on Android. Android phones have no LiDAR, so they only capture photo sets.
- PDF condition report export.

## Accuracy

iPhone LiDAR is typically within 1–2 cm at under 5 m. It's fine for condition records and quantities, not fabrication. Record a scale check on every scan you'll rely on for dimensions.

## Run it

The LiDAR code is native Swift (`modules/lidar-scanner/ios`), so it does not run in Expo Go. You need a development build.

```sh
cd mobile
npm install
npx tsc --noEmit && npx expo lint
```

**Build in the cloud (no Mac needed):**

```sh
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform ios      # needs an Apple Developer account
npx eas-cli@latest build --profile development --platform android
npx expo start --dev-client
```

Install the build on the phone from the link EAS gives you, then open it while `expo start` is running.

**Or build locally on a Mac with Xcode:** `npx expo run:ios --device`.

To test LiDAR you need an iPhone 12 Pro or newer Pro model, or a LiDAR iPad Pro. The bundle ID `com.barkleyhunt.assetledger` in `app.json` is a placeholder; change it to one you own before your first build.

## Layout

```
src/app/                 screens (Expo Router)
src/lib/db.ts            SQLite store: elements, scans, measurements, defects, events
src/lib/files.ts         scan and photo storage under Documents/
modules/lidar-scanner/   native module
  index.ts               JS API
  ios/MeshScanViewController.swift   ARKit mesh capture → OBJ
  ios/RoomScanViewController.swift   RoomPlan capture → USDZ
  ios/ModelViewerController.swift    SceneKit viewer with tap-to-measure
```
