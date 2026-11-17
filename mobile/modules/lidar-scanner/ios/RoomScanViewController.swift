import RoomPlan
import UIKit

// Room layout: Apple RoomPlan captures walls, openings, doors and windows and
// exports a to-scale USDZ (metres). Use for rooms and interior elevations.
final class RoomScanViewController: UIViewController, RoomCaptureViewDelegate, RoomCaptureSessionDelegate {
  private let outputURL: URL
  private var completion: ((ScanOutput?, Error?) -> Void)?
  private var captureView: RoomCaptureView!
  private var result: CapturedRoom?
  private var startedAt = Date()
  private var stopped = false

  init(outputURL: URL, completion: @escaping (ScanOutput?, Error?) -> Void) {
    self.outputURL = outputURL
    self.completion = completion
    super.init(nibName: nil, bundle: nil)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

  override func viewDidLoad() {
    super.viewDidLoad()
    title = "Room layout"
    captureView = RoomCaptureView(frame: view.bounds)
    captureView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    captureView.delegate = self
    captureView.captureSession.delegate = self
    view.addSubview(captureView)

    navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(cancelTapped))
    navigationItem.rightBarButtonItem = UIBarButtonItem(title: "Done", style: .done, target: self, action: #selector(doneTapped))
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    startedAt = Date()
    captureView.captureSession.run(configuration: RoomCaptureSession.Configuration())
  }

  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    if !stopped { captureView.captureSession.stop() }
  }

  // Ask RoomPlan to process and show the final model.
  func captureView(shouldPresent roomDataForProcessing: CapturedRoomData, error: Error?) -> Bool { true }

  func captureView(didPresent processedResult: CapturedRoom, error: Error?) {
    if let error = error {
      finish(nil, error)
      return
    }
    result = processedResult
    navigationItem.rightBarButtonItem = UIBarButtonItem(title: "Save", style: .done, target: self, action: #selector(saveTapped))
  }

  @objc private func cancelTapped() {
    if !stopped { stopped = true; captureView.captureSession.stop() }
    finish(nil, nil)
  }

  @objc private func doneTapped() {
    stopped = true
    navigationItem.rightBarButtonItem?.isEnabled = false
    captureView.captureSession.stop()
  }

  @objc private func saveTapped() {
    guard let room = result else { return }
    do {
      try room.export(to: outputURL)
      var surfaces = room.walls.count + room.doors.count + room.windows.count + room.openings.count
      if #available(iOS 17.0, *) { surfaces += room.floors.count }
      let output = ScanOutput(url: outputURL, vertexCount: 0, faceCount: surfaces, durationSec: Date().timeIntervalSince(startedAt))
      finish(output, nil)
    } catch {
      finish(nil, error)
    }
  }

  private func finish(_ output: ScanOutput?, _ error: Error?) {
    guard let completion = completion else { return }
    self.completion = nil
    dismiss(animated: true) { completion(output, error) }
  }
}
