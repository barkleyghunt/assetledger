import ModelIO
import SceneKit
import SceneKit.ModelIO
import UIKit

struct ScanMeasurement {
  let label: String
  let mm: Double
}

// 3D viewer for OBJ / USDZ scans. Drag to orbit, pinch to zoom.
// Turn on Measure, then tap two points on the model to get a distance.
final class ModelViewerController: UIViewController {
  private let fileURL: URL
  private var completion: (([ScanMeasurement]) -> Void)?
  private let scnView = SCNView()
  private let infoLabel = UILabel()
  private let markers = SCNNode()
  private var measuring = false
  private var pendingPoint: SCNVector3?
  private var measurements: [ScanMeasurement] = []
  private var measurementNodes: [[SCNNode]] = []
  private var markerRadius: CGFloat = 0.01

  init(fileURL: URL, completion: @escaping ([ScanMeasurement]) -> Void) {
    self.fileURL = fileURL
    self.completion = completion
    super.init(nibName: nil, bundle: nil)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

  override func viewDidLoad() {
    super.viewDidLoad()
    title = "3D view"
    view.backgroundColor = UIColor(red: 0.08, green: 0.13, blue: 0.24, alpha: 1)

    scnView.frame = view.bounds
    scnView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    scnView.backgroundColor = view.backgroundColor
    scnView.allowsCameraControl = true
    scnView.autoenablesDefaultLighting = true
    scnView.antialiasingMode = .multisampling4X
    view.addSubview(scnView)

    infoLabel.translatesAutoresizingMaskIntoConstraints = false
    infoLabel.numberOfLines = 0
    infoLabel.textAlignment = .center
    infoLabel.textColor = .white
    infoLabel.font = .systemFont(ofSize: 16, weight: .semibold)
    infoLabel.backgroundColor = UIColor.black.withAlphaComponent(0.6)
    infoLabel.layer.cornerRadius = 10
    infoLabel.clipsToBounds = true
    view.addSubview(infoLabel)
    NSLayoutConstraint.activate([
      infoLabel.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
      infoLabel.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
      infoLabel.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
      infoLabel.heightAnchor.constraint(greaterThanOrEqualToConstant: 56),
    ])

    navigationItem.leftBarButtonItem = UIBarButtonItem(title: "Close", style: .done, target: self, action: #selector(closeTapped))
    updateButtons()

    let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
    scnView.addGestureRecognizer(tap)

    loadModel()
  }

  private func loadModel() {
    do {
      let scene: SCNScene
      if fileURL.pathExtension.lowercased() == "obj" {
        let asset = MDLAsset(url: fileURL)
        for case let mesh as MDLMesh in asset.childObjects(of: MDLMesh.self) {
          mesh.addNormals(withAttributeNamed: MDLVertexAttributeNormal, creaseThreshold: 0.6)
        }
        scene = SCNScene(mdlAsset: asset)
        let material = SCNMaterial()
        material.diffuse.contents = UIColor(white: 0.85, alpha: 1)
        material.isDoubleSided = true
        scene.rootNode.enumerateChildNodes { node, _ in
          node.geometry?.materials = [material]
        }
      } else {
        scene = try SCNScene(url: fileURL, options: nil)
      }
      scene.rootNode.addChildNode(markers)
      scnView.scene = scene

      let (minB, maxB) = scene.rootNode.boundingBox
      let diag = simd_distance(SIMD3<Float>(Float(minB.x), Float(minB.y), Float(minB.z)), SIMD3<Float>(Float(maxB.x), Float(maxB.y), Float(maxB.z)))
      markerRadius = CGFloat(max(0.004, min(0.03, diag * 0.004)))
      infoLabel.text = String(format: "Model extent about %.2f m. Drag to orbit, pinch to zoom.", diag)
    } catch {
      infoLabel.text = "Could not open this scan: \(error.localizedDescription)"
    }
  }

  private func updateButtons() {
    let measure = UIBarButtonItem(title: measuring ? "Measuring" : "Measure", style: measuring ? .done : .plain, target: self, action: #selector(toggleMeasure))
    let undo = UIBarButtonItem(title: "Undo", style: .plain, target: self, action: #selector(undoTapped))
    undo.isEnabled = !measurements.isEmpty || pendingPoint != nil
    navigationItem.rightBarButtonItems = [measure, undo]
  }

  @objc private func toggleMeasure() {
    measuring.toggle()
    // Orbiting stays on so the user can reposition between taps.
    infoLabel.text = measuring ? "Tap the first point." : summary()
    if !measuring, pendingPoint != nil { removePending() }
    updateButtons()
  }

  @objc private func handleTap(_ gesture: UITapGestureRecognizer) {
    guard measuring else { return }
    let location = gesture.location(in: scnView)
    // Category 1 = model geometry; markers use category 2 so they are not hit.
    let hits = scnView.hitTest(location, options: [
      .searchMode: SCNHitTestSearchMode.closest.rawValue,
      .categoryBitMask: 1,
    ])
    guard let hit = hits.first else {
      infoLabel.text = "Missed the model. Tap on the surface."
      return
    }
    let point = hit.worldCoordinates
    if let start = pendingPoint {
      let metres = simd_distance(SIMD3<Float>(Float(start.x), Float(start.y), Float(start.z)), SIMD3<Float>(Float(point.x), Float(point.y), Float(point.z)))
      let mm = Double(metres) * 1000
      let label = "M\(measurements.count + 1)"
      measurements.append(ScanMeasurement(label: label, mm: mm))
      let end = marker(at: point)
      let line = lineNode(from: start, to: point)
      var nodes = measurementNodes.popLast() ?? []
      nodes.append(contentsOf: [end, line])
      measurementNodes.append(nodes)
      pendingPoint = nil
      infoLabel.text = String(format: "%@: %.0f mm. Tap the next first point.", label, mm)
    } else {
      pendingPoint = point
      measurementNodes.append([marker(at: point)])
      infoLabel.text = "Tap the second point."
    }
    updateButtons()
  }

  @objc private func undoTapped() {
    if pendingPoint != nil {
      removePending()
    } else if !measurements.isEmpty {
      measurements.removeLast()
      measurementNodes.popLast()?.forEach { $0.removeFromParentNode() }
    }
    infoLabel.text = summary()
    updateButtons()
  }

  private func removePending() {
    pendingPoint = nil
    measurementNodes.popLast()?.forEach { $0.removeFromParentNode() }
  }

  private func summary() -> String {
    if measurements.isEmpty { return "No measurements yet. Tap Measure to start." }
    return measurements.map { String(format: "%@ %.0f mm", $0.label, $0.mm) }.joined(separator: " · ")
  }

  private func marker(at p: SCNVector3) -> SCNNode {
    let sphere = SCNSphere(radius: markerRadius)
    sphere.firstMaterial?.diffuse.contents = UIColor.systemOrange
    sphere.firstMaterial?.lightingModel = .constant
    let node = SCNNode(geometry: sphere)
    node.position = p
    node.categoryBitMask = 2
    markers.addChildNode(node)
    return node
  }

  private func lineNode(from a: SCNVector3, to b: SCNVector3) -> SCNNode {
    let source = SCNGeometrySource(vertices: [a, b])
    let element = SCNGeometryElement(indices: [Int32(0), Int32(1)], primitiveType: .line)
    let geometry = SCNGeometry(sources: [source], elements: [element])
    geometry.firstMaterial?.diffuse.contents = UIColor.systemOrange
    geometry.firstMaterial?.lightingModel = .constant
    let node = SCNNode(geometry: geometry)
    node.categoryBitMask = 2
    markers.addChildNode(node)
    return node
  }

  @objc private func closeTapped() {
    guard let completion = completion else { return }
    self.completion = nil
    let result = measurements
    dismiss(animated: true) { completion(result) }
  }
}
