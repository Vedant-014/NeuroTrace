"""
Train a RandomForest classifier on hand-engineered features (tremor index, smoothness,
solidity, etc.) extracted from the spiral/wave drawings. This is ensembled with the
CNN at inference time, and also gives us feature importances to explain the CNN's
"black box" result in the patient report.

Usage:
    python train_classical.py --dataset_root /path/to/dataset --drawing_type spiral
"""

import argparse
import glob
import os

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split

from features import extract_features, features_to_vector

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")


def load_dataset(dataset_root: str, drawing_type: str):
    X, y = [], []
    for split in ["training", "testing"]:
        for label, class_name in enumerate(["healthy", "parkinson"]):
            folder = os.path.join(dataset_root, drawing_type, split, class_name)
            image_paths = glob.glob(os.path.join(folder, "*"))
            for path in image_paths:
                try:
                    feats = extract_features(path)
                    X.append(features_to_vector(feats))
                    y.append(label)
                except Exception as e:
                    print(f"Skipping {path}: {e}")
    return np.array(X), np.array(y)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset_root", required=True)
    parser.add_argument("--drawing_type", choices=["spiral", "wave"], default="spiral")
    args = parser.parse_args()

    os.makedirs(MODELS_DIR, exist_ok=True)

    print("Extracting features from all images (this can take a minute)...")
    X, y = load_dataset(args.dataset_root, args.drawing_type)
    print(f"Loaded {len(X)} samples.")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(n_estimators=300, max_depth=6, random_state=42, class_weight="balanced")
    clf.fit(X_train, y_train)

    preds = clf.predict(X_test)
    probs = clf.predict_proba(X_test)[:, 1]
    print(classification_report(y_test, preds, target_names=["healthy", "parkinson"]))
    print(f"ROC AUC: {roc_auc_score(y_test, probs):.4f}")

    feature_names = ["tremor_index", "smoothness_score", "stroke_area_ratio", "contour_solidity", "num_direction_changes"]
    print("\nFeature importances:")
    for name, importance in sorted(zip(feature_names, clf.feature_importances_), key=lambda x: -x[1]):
        print(f"  {name}: {importance:.4f}")

    model_path = os.path.join(MODELS_DIR, f"classical_{args.drawing_type}.joblib")
    joblib.dump(clf, model_path)
    print(f"\nSaved classical model to {model_path}")


if __name__ == "__main__":
    main()
