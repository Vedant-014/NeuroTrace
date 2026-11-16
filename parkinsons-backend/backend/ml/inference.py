"""
Inference pipeline: loads the trained CNN and classical models, runs a prediction
on a single uploaded image, and produces a final report-ready result.

IMPORTANT: this produces a *screening likelihood estimate*, not a clinical diagnosis
or a validated disease-stage score. The severity band is a confidence-based proxy,
not a UPDRS-equivalent measurement.

Both the CNN and the classical model now see the SAME standardized image (see
preprocessing.py) - cropped to the stroke, centered, lighting-corrected, and
consistently scaled. Previously the CNN loaded the raw photo through a different
path than the classical features did, which was the main source of unstable /
inconsistent predictions on real-world (non-dataset) photos.
"""

import os

import cv2
import joblib
import numpy as np
import tensorflow as tf

from features import extract_features, features_to_vector
from preprocessing import standardize_image

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
IMG_SIZE = (224, 224)

# Weight given to the CNN vs the classical model in the final ensembled score.
# CNN tends to be the stronger model when enough data is available; classical model
# adds robustness and explainability.
CNN_WEIGHT = 0.65
CLASSICAL_WEIGHT = 0.35


class ParkinsonsPredictor:
    def __init__(self, drawing_type: str = "handwriting"):
        self.drawing_type = drawing_type
        cnn_path = os.path.join(MODELS_DIR, f"cnn_{drawing_type}.keras")
        classical_path = os.path.join(MODELS_DIR, f"classical_{drawing_type}.joblib")

        if not os.path.exists(cnn_path):
            raise FileNotFoundError(
                f"CNN model not found at {cnn_path}. Run ml/train_cnn_fixed.py first."
            )
        if not os.path.exists(classical_path):
            raise FileNotFoundError(
                f"Classical model not found at {classical_path}. Run ml/train_classical.py first."
            )

        self.cnn = tf.keras.models.load_model(cnn_path)
        self.classical = joblib.load(classical_path)

    def _cnn_score(self, image_path: str) -> float:
        # Same standardized canvas the classical features are computed from -
        # cropped to the stroke, lighting-corrected, consistently scaled.
        canvas_gray, _ = standardize_image(image_path, canvas_size=IMG_SIZE[0])
        rgb = cv2.cvtColor(canvas_gray, cv2.COLOR_GRAY2RGB).astype(np.float32)
        arr = np.expand_dims(rgb, axis=0)
        # NOTE: the model itself applies mobilenet_v2.preprocess_input internally
        # (see build_model() in train_cnn_fixed.py), so we feed raw 0-255 values
        # here, not pre-normalized ones - do not double-normalize.
        score = self.cnn.predict(arr, verbose=0)[0][0]
        return float(score)

    def _severity_band(self, score: float, tremor_index: float) -> str:
        """
        Maps the ensembled probability + tremor index into a plain-language band.
        This is an ESTIMATE for screening purposes, not a clinical staging system.
        """
        if score < 0.35:
            return "Low likelihood"
        elif score < 0.65:
            return "Moderate likelihood"
        else:
            if tremor_index > 0.7:
                return "High likelihood (pronounced motor signal)"
            return "High likelihood"

    def predict(self, image_path: str) -> dict:
        features = extract_features(image_path)
        feature_vector = features_to_vector(features).reshape(1, -1)

        cnn_score = self._cnn_score(image_path)
        classical_score = float(self.classical.predict_proba(feature_vector)[0][1])

        final_score = CNN_WEIGHT * cnn_score + CLASSICAL_WEIGHT * classical_score
        label = "parkinson" if final_score >= 0.5 else "healthy"

        return {
            "drawing_type": self.drawing_type,
            "predicted_label": label,
            "confidence": round(final_score * 100, 2),
            "cnn_score": round(cnn_score * 100, 2),
            "classical_score": round(classical_score * 100, 2),
            "severity_band": self._severity_band(final_score, features["tremor_index"]),
            "features": features,
            "disclaimer": (
                "This is an AI-assisted screening estimate based on handwriting/drawing "
                "analysis, not a medical diagnosis. Please consult a neurologist for "
                "clinical evaluation."
            ),
        }


# Simple module-level cache so we don't reload the model on every request
_predictor_cache: dict[str, ParkinsonsPredictor] = {}


def get_predictor(drawing_type: str = "handwriting") -> ParkinsonsPredictor:
    if drawing_type not in _predictor_cache:
        _predictor_cache[drawing_type] = ParkinsonsPredictor(drawing_type)
    return _predictor_cache[drawing_type]
