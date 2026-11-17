import { requireOptionalNativeModule } from "expo";

export type LidarScanResult = {
  fileUri: string;
  vertexCount: number;
  faceCount: number;
  durationSec: number;
};

export type ViewerMeasurement = { label: string; mm: number };

type NativeLidarScanner = {
  isLidarAvailable(): boolean;
  isRoomPlanAvailable(): boolean;
  startScan(mode: "surface" | "room", scanId: string): Promise<LidarScanResult | null>;
  openViewer(fileUri: string): Promise<ViewerMeasurement[]>;
};

// Null on Android and in Expo Go: the native module only exists in iOS development/production builds.
const native = requireOptionalNativeModule<NativeLidarScanner>("LidarScanner");

export const LidarScanner = {
  isLidarAvailable: (): boolean => native?.isLidarAvailable() ?? false,
  isRoomPlanAvailable: (): boolean => native?.isRoomPlanAvailable() ?? false,
  canView: (): boolean => native != null,

  /** Opens the full-screen scanner. Resolves null if the user cancels. */
  startScan(mode: "surface" | "room", scanId: string): Promise<LidarScanResult | null> {
    if (!native) return Promise.reject(new Error("LiDAR scanning needs an iPhone Pro with an Asset Ledger build."));
    return native.startScan(mode, scanId);
  },

  /** Opens the 3D viewer. Resolves with any measurements taken. */
  openViewer(fileUri: string): Promise<ViewerMeasurement[]> {
    if (!native) return Promise.reject(new Error("The 3D viewer is iOS-only in this version."));
    return native.openViewer(fileUri);
  },
};
