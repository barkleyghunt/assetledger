import ARKit
import RealityKit
import UIKit

// Surface scan: walks the user round a façade, element or opening and builds a
// LiDAR mesh. Exported as OBJ in metres (ARKit world coordinates, Y up).
final class MeshScanViewController: UIViewController, ARSessionDelegate {
  private let outputURL: URL
  private var completion: ((ScanOutput?, Error?) -> Void)?
  private let arView = ARView(frame: .zero)
  private let statusLabel = UILabel()
  private let spinner = UIActivityIndicatorView(style: .large)
  private var startedAt = Date()
  private var statusTimer: Timer?

  init(outputURL: URL, completion: @escaping (ScanOutput?, Error?) -> Void) {
    self.outputURL = outputURL
    self.completion = completion
    super.init(nibName: nil, bundle: nil)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

  override func viewDidLoad() {
    super.viewDidLoad()
    title = "Surface scan"
    view.backgroundColor = .black

    arView.frame = view.bounds
    arView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    arView.automaticallyConfigureSession = false
    arView.debugOptions.insert(.showSceneUnderstanding)
    arView.renderOptions.insert(.disableMotionBlur)
    view.addSubview(arView)

    statusLabel.translatesAutoresizingMaskIntoConstraints = false
    statusLabel.numberOfLines = 0
    statusLabel.textAlignment = .center
    statusLabel.textColor = .white
    statusLabel.font = .systemFont(ofSize: 16, weight: .semibold)
    statusLabel.backgroundColor = UIColor.black.withAlphaComponent(0.6)
    statusLabel.layer.cornerRadius = 10
    statusLabel.clipsToBounds = true
    statusLabel.text = "Move slowly, 1–3 m from the surface. Cover every face once."
    view.addSubview(statusLabel)

    spinner.translatesAutoresizingMaskIntoConstraints = false
    spinner.color = .white
    spinner.hidesWhenStopped = true
    view.addSubview(spinner)

    NSLayoutConstraint.activate([
      statusLabel.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
      statusLabel.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
      statusLabel.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
      statusLabel.heightAnchor.constraint(greaterThanOrEqualToConstant: 64),
      spinner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      spinner.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])

    navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(cancelTapped))
    navigationItem.rightBarButtonItem = UIBarButtonItem(title: "Finish", style: .done, target: self, action: #selector(finishTapped))
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    let config = ARWorldTrackingConfiguration()
    config.sceneReconstruction = .mesh
    config.planeDetection = [.horizontal, .vertical]
    arView.session.delegate = self
    arView.session.run(config, options: [.resetTracking, .removeExistingAnchors])
    startedAt = Date()
    statusTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in self?.updateStatus() }
  }

  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    statusTimer?.invalidate()
    arView.session.pause()
  }

  private func meshAnchors() -> [ARMeshAnchor] {
    arView.session.currentFrame?.anchors.compactMap { $0 as? ARMeshAnchor } ?? []
  }

  private func updateStatus() {
    guard let frame = arView.session.currentFrame else { return }
    let points = meshAnchors().reduce(0) { $0 + $1.geometry.vertices.count }
    var tracking = "Tracking good"
    switch frame.camera.trackingState {
    case .notAvailable: tracking = "Tracking unavailable"
    case .limited(let reason):
      switch reason {
      case .excessiveMotion: tracking = "Slow down"
      case .insufficientFeatures: tracking = "Not enough detail — add light or texture"
      case .initializing, .relocalizing: tracking = "Starting… hold steady"
      @unknown default: tracking = "Tracking limited"
      }
    case .normal: break
    }
    let secs = Int(Date().timeIntervalSince(startedAt))
    statusLabel.text = "\(tracking)\n\(points.formatted()) points · \(secs)s"
  }

  @objc private func cancelTapped() {
    finish(nil, nil)
  }

  @objc private func finishTapped() {
    let anchors = meshAnchors()
    guard !anchors.isEmpty else {
      statusLabel.text = "Nothing captured yet. Keep scanning."
      return
    }
    arView.session.pause()
    statusTimer?.invalidate()
    navigationItem.rightBarButtonItem?.isEnabled = false
    navigationItem.leftBarButtonItem?.isEnabled = false
    statusLabel.text = "Saving scan…"
    spinner.startAnimating()

    let url = outputURL
    let duration = Date().timeIntervalSince(startedAt)
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let counts = try MeshExporter.writeOBJ(anchors: anchors, to: url)
        DispatchQueue.main.async {
          self.finish(ScanOutput(url: url, vertexCount: counts.vertices, faceCount: counts.faces, durationSec: duration), nil)
        }
      } catch {
        DispatchQueue.main.async { self.finish(nil, error) }
      }
    }
  }

  private func finish(_ output: ScanOutput?, _ error: Error?) {
    guard let completion = completion else { return }
    self.completion = nil
    dismiss(animated: true) { completion(output, error) }
  }
}

enum MeshExporter {
  // Writes ARKit mesh anchors to a Wavefront OBJ in world coordinates (metres).
  // Streams to disk in chunks so large façades don't exhaust memory.
  static func writeOBJ(anchors: [ARMeshAnchor], to url: URL) throws -> (vertices: Int, faces: Int) {
    FileManager.default.createFile(atPath: url.path, contents: nil)
    guard let handle = try? FileHandle(forWritingTo: url) else {
      throw ScanError(message: "Could not open the scan file for writing.")
    }
    defer { try? handle.close() }

    var buffer = "# Asset Ledger surface scan\n# Units: metres. Captured \(ISO8601DateFormatter().string(from: Date()))\n"
    func flush(force: Bool = false) throws {
      if force || buffer.utf8.count > 1_000_000 {
        try handle.write(contentsOf: Data(buffer.utf8))
        buffer.removeAll(keepingCapacity: true)
      }
    }

    var vertexOffset = 1 // OBJ indices are 1-based
    var totalVertices = 0
    var totalFaces = 0

    for anchor in anchors {
      let geometry = anchor.geometry
      let vertices = geometry.vertices
      let faces = geometry.faces
      let transform = anchor.transform
      let vBase = vertices.buffer.contents()

      for i in 0..<vertices.count {
        // Vertex format is float3: three packed Floats.
        let p = vBase.advanced(by: vertices.offset + vertices.stride * i).assumingMemoryBound(to: Float.self)
        let world = transform * SIMD4<Float>(p[0], p[1], p[2], 1)
        buffer += "v \(fmt(world.x)) \(fmt(world.y)) \(fmt(world.z))\n"
        try flush()
      }

      let fBase = faces.buffer.contents()
      let perFace = faces.indexCountPerPrimitive
      if perFace == 3 {
        for f in 0..<faces.count {
          var idx = [Int](repeating: 0, count: 3)
          for k in 0..<3 {
            let at = fBase.advanced(by: (f * 3 + k) * faces.bytesPerIndex)
            idx[k] = faces.bytesPerIndex == 4
              ? Int(at.assumingMemoryBound(to: UInt32.self).pointee)
              : Int(at.assumingMemoryBound(to: UInt16.self).pointee)
          }
          buffer += "f \(idx[0] + vertexOffset) \(idx[1] + vertexOffset) \(idx[2] + vertexOffset)\n"
          try flush()
        }
        totalFaces += faces.count
      }

      vertexOffset += vertices.count
      totalVertices += vertices.count
    }
    try flush(force: true)
    return (totalVertices, totalFaces)
  }

  private static func fmt(_ v: Float) -> String { String(format: "%.4f", v) }
}
