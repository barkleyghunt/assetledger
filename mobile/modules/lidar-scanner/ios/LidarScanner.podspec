Pod::Spec.new do |s|
  s.name           = 'LidarScanner'
  s.version        = '0.1.0'
  s.summary        = 'LiDAR surface and room scanning for Asset Ledger'
  s.description    = 'ARKit mesh capture to OBJ, RoomPlan room capture to USDZ, and a SceneKit viewer with point-to-point measurement.'
  s.author         = 'Asset Ledger'
  s.homepage       = 'https://github.com/barkleyghunt/assetledger'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/barkleyghunt/assetledger.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'ARKit', 'RealityKit', 'RoomPlan', 'SceneKit', 'ModelIO'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
