import ARKit
import ExpoModulesCore
import RoomPlan
import UIKit

// JS name: "LidarScanner". See ../index.ts for the TypeScript side.
public class LidarScannerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LidarScanner")

    // True on LiDAR devices (iPhone 12 Pro and later Pro models, recent iPad Pro).
    Function("isLidarAvailable") { () -> Bool in
      ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh)
    }

    Function("isRoomPlanAvailable") { () -> Bool in
      RoomCaptureSession.isSupported
    }

    // mode: "surface" (ARKit mesh -> OBJ) or "room" (RoomPlan -> USDZ).
    // Resolves with scan details, or null if the user cancels.
    AsyncFunction("startScan") { (mode: String, scanId: String, promise: Promise) in
      guard ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) else {
        promise.reject("E_NO_LIDAR", "This device has no LiDAR sensor.")
        return
      }
      if mode == "room" && !RoomCaptureSession.isSupported {
        promise.reject("E_NO_ROOMPLAN", "Room layout scanning is not supported on this device.")
        return
      }
      guard let presenter = self.appContext?.utilities?.currentViewController() else {
        promise.reject("E_NO_VIEW", "Could not open the scanner.")
        return
      }
      let url: URL
      do {
        url = try ScanFiles.outputURL(scanId: scanId, ext: mode == "room" ? "usdz" : "obj")
      } catch {
        promise.reject("E_FILE", "Could not prepare scan storage: \(error.localizedDescription)")
        return
      }

      let completion: (ScanOutput?, Error?) -> Void = { output, error in
        if let error = error {
          promise.reject("E_SCAN", error.localizedDescription)
        } else if let output = output {
          promise.resolve(output.dictionary)
        } else {
          promise.resolve() // cancelled -> null in JS
        }
      }

      let scanner: UIViewController = mode == "room"
        ? RoomScanViewController(outputURL: url, completion: completion)
        : MeshScanViewController(outputURL: url, completion: completion)
      let nav = UINavigationController(rootViewController: scanner)
      nav.modalPresentationStyle = .fullScreen
      presenter.present(nav, animated: true)
    }
    .runOnQueue(DispatchQueue.main)

    // Opens a scan file in a 3D viewer with tap-to-measure.
    // Resolves with the measurements taken: [{ label, mm }].
    AsyncFunction("openViewer") { (fileUri: String, promise: Promise) in
      guard let url = ScanFiles.url(from: fileUri), FileManager.default.fileExists(atPath: url.path) else {
        promise.reject("E_FILE", "Scan file not found.")
        return
      }
      guard let presenter = self.appContext?.utilities?.currentViewController() else {
        promise.reject("E_NO_VIEW", "Could not open the viewer.")
        return
      }
      let viewer = ModelViewerController(fileURL: url) { measurements in
        let result: [[String: Any]] = measurements.map { ["label": $0.label, "mm": $0.mm] }
        promise.resolve(result)
      }
      let nav = UINavigationController(rootViewController: viewer)
      nav.modalPresentationStyle = .fullScreen
      presenter.present(nav, animated: true)
    }
    .runOnQueue(DispatchQueue.main)
  }
}

struct ScanOutput {
  let url: URL
  let vertexCount: Int
  let faceCount: Int
  let durationSec: Double

  var dictionary: [String: Any] {
    ["fileUri": url.absoluteString, "vertexCount": vertexCount, "faceCount": faceCount, "durationSec": durationSec]
  }
}

enum ScanFiles {
  // Documents/scans/<scanId>.<ext> — the same folder the JS side uses.
  static func outputURL(scanId: String, ext: String) throws -> URL {
    let docs = try FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
    let dir = docs.appendingPathComponent("scans", isDirectory: true)
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    let safeId = scanId.replacingOccurrences(of: "[^A-Za-z0-9_-]", with: "_", options: .regularExpression)
    return dir.appendingPathComponent("\(safeId).\(ext)")
  }

  static func url(from uri: String) -> URL? {
    if uri.hasPrefix("file://") { return URL(string: uri) }
    return URL(fileURLWithPath: uri)
  }
}

struct ScanError: LocalizedError {
  let message: String
  var errorDescription: String? { message }
}
