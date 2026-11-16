"""
Classical, hand-engineered feature extraction from handwriting/drawing images.

These features give the report something explainable to show the patient/clinician
("tremor index", "smoothness score") instead of a pure black-box CNN score, and are
also used to train a lightweight classical model (RandomForest) that we ensemble
with the CNN for a more robust final prediction. They'll also be the input to a
Phase 2 SHAP explainer, so having them computed from a stable, consistently-scaled
image (not a raw, arbitrarily-framed photo) matters for reproducibility.

Image loading/cropping/binarizing is handled by preprocessing.standardize_image(),
NOT here - this keeps exactly one image-standardization implementation shared with
the CNN, so both models always see the same canonical version of any given photo.
"""

import cv2
import numpy as np

from preprocessing import standardize_image


def _largest_contour(binary_img):
    contours, _ = cv2.findContours(binary_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        return None
    return max(contours, key=cv2.contourArea)


def extract_features(image_path: str) -> dict:
    """
    Returns a dict of interpretable features:
      - tremor_index: how jagged/irregular the stroke boundary is (higher = more tremor-like)
      - smoothness_score: inverse of tremor_index, scaled 0-100 for display
      - stroke_area_ratio: fraction of the standardized canvas covered by ink (very
        thin/broken strokes can indicate micrographia, common in Parkinson's).
        Because the canvas is now cropped tightly to the stroke's bounding box
        (see preprocessing.py), this ratio is comparable across photos taken at
        different distances/framings, unlike before.
      - contour_solidity: contour area / convex hull area (irregular, non-convex
        shapes score lower)
      - num_direction_changes: how many times the stroke direction changes sign,
        normalized by contour length (proxy for hand tremor frequency)
    """
    _, binary = standardize_image(image_path)
    contour = _largest_contour(binary)

    h, w = binary.shape
    total_pixels = h * w
    ink_pixels = int(np.sum(binary > 0))
    stroke_area_ratio = ink_pixels / total_pixels

    if contour is None or len(contour) < 10:
        # Fallback if we couldn't isolate a stroke - return neutral/uninformative values
        return {
            "tremor_index": 0.5,
            "smoothness_score": 50.0,
            "stroke_area_ratio": stroke_area_ratio,
            "contour_solidity": 0.5,
            "num_direction_changes": 0.5,
        }

    # --- Solidity: contour area vs convex hull area ---
    contour_area = cv2.contourArea(contour)
    hull = cv2.convexHull(contour)
    hull_area = cv2.contourArea(hull)
    solidity = (contour_area / hull_area) if hull_area > 0 else 0.5

    # --- Tremor index: local curvature variance along the contour ---
    points = contour.reshape(-1, 2).astype(np.float64)
    diffs = np.diff(points, axis=0)
    angles = np.arctan2(diffs[:, 1], diffs[:, 0])
    angle_diffs = np.diff(angles)
    angle_diffs = (angle_diffs + np.pi) % (2 * np.pi) - np.pi

    tremor_index_raw = float(np.std(angle_diffs)) if len(angle_diffs) > 0 else 0.0
    tremor_index = float(np.clip(tremor_index_raw / 1.2, 0, 1))
    smoothness_score = float(np.clip((1 - tremor_index) * 100, 0, 100))

    # --- Direction change frequency: sign changes in angle_diffs, normalized ---
    if len(angle_diffs) > 1:
        sign_changes = np.sum(np.diff(np.sign(angle_diffs)) != 0)
        num_direction_changes = float(sign_changes / len(angle_diffs))
    else:
        num_direction_changes = 0.5

    return {
        "tremor_index": round(tremor_index, 4),
        "smoothness_score": round(smoothness_score, 2),
        "stroke_area_ratio": round(float(stroke_area_ratio), 4),
        "contour_solidity": round(float(solidity), 4),
        "num_direction_changes": round(num_direction_changes, 4),
    }


def features_to_vector(features: dict) -> np.ndarray:
    """Fixed-order feature vector for the classical ML model."""
    order = [
        "tremor_index",
        "smoothness_score",
        "stroke_area_ratio",
        "contour_solidity",
        "num_direction_changes",
    ]
    return np.array([features[k] for k in order], dtype=np.float64)
