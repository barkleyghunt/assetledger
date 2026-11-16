import { test } from "node:test";
import assert from "node:assert/strict";
import { defectPhotoKey, scanFileKey } from "./r2.ts";

test("scan file keys are built from safe parts only", () => {
  assert.equal(scanFileKey("GY-192", "SCN-abc-123", "SCN-abc-123.obj"), "elements/GY-192/scans/SCN-abc-123/SCN-abc-123.obj");
  assert.equal(scanFileKey("West Bay/04", "SCN-1", "001.jpg"), "elements/West_Bay_04/scans/SCN-1/001.jpg");
  assert.equal(scanFileKey("GY-192", "../x", "a.obj"), null);
  assert.equal(scanFileKey("GY-192", "SCN-1", "../../a.obj"), null);
  assert.equal(scanFileKey("GY-192", "SCN-1", "run.sh"), null);
});

test("defect photo keys reject unsafe IDs", () => {
  assert.equal(defectPhotoKey("GY-192", "DEF-1"), "elements/GY-192/defects/DEF-1.jpg");
  assert.equal(defectPhotoKey("GY-192", "DEF/../1"), null);
});
