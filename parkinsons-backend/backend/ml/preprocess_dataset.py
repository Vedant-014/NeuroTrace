"""
One-time dataset preprocessing step, needed ONLY for CNN training.

Walks the raw Kaggle-style dataset folder and writes a *standardized* mirror of
every image using the exact same standardize_image() pipeline that inference.py
uses on real user uploads at prediction time. Point train_cnn_fixed.py's
--dataset_root at the OUTPUT folder this script creates, not the raw dataset.

Why this step exists (and why train_classical.py does NOT need it):
Keras' ImageDataGenerator.flow_from_directory() loads image files directly from
disk in its own way - it never calls our standardize_image() function. So for the
CNN, we have to pre-bake the standardization into a new copy of the dataset on
disk before training. train_classical.py, by contrast, calls extract_features()
per image, which already calls standardize_image() internally - so it can train
directly on the RAW dataset_root, no separate preprocessing step needed.

Usage:
    python preprocess_dataset.py --dataset_root /path/to/raw_dataset --output_root /path/to/raw_dataset_standardized

Then:
    python train_cnn_fixed.py --dataset_root /path/to/raw_dataset_standardized --drawing_type spiral
"""

import argparse
import glob
import os

import cv2

from preprocessing import standardize_image

DRAWING_TYPES = ["spiral", "wave"]
SPLITS = ["training", "testing"]
CLASSES = ["healthy", "parkinson"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset_root", required=True, help="Path to the raw dataset")
    parser.add_argument("--output_root", required=True, help="Path to write the standardized mirror to")
    parser.add_argument("--canvas_size", type=int, default=224, help="Should match train_cnn_fixed.py's IMG_SIZE")
    args = parser.parse_args()

    total, failed = 0, 0
    for drawing_type in DRAWING_TYPES:
        for split in SPLITS:
            for class_name in CLASSES:
                src_folder = os.path.join(args.dataset_root, drawing_type, split, class_name)
                if not os.path.isdir(src_folder):
                    continue
                dst_folder = os.path.join(args.output_root, drawing_type, split, class_name)
                os.makedirs(dst_folder, exist_ok=True)

                paths = glob.glob(os.path.join(src_folder, "*"))
                print(f"Processing {len(paths)} images in {drawing_type}/{split}/{class_name}...")
                for path in paths:
                    total += 1
                    try:
                        canvas_gray, _ = standardize_image(path, canvas_size=args.canvas_size)
                        out_name = os.path.splitext(os.path.basename(path))[0] + ".png"
                        cv2.imwrite(os.path.join(dst_folder, out_name), canvas_gray)
                    except Exception as e:
                        failed += 1
                        print(f"  Skipping {path}: {e}")

    print(f"\nDone. Processed {total - failed}/{total} images successfully.")
    print(f"Standardized dataset written to: {args.output_root}")
    print("Now run train_cnn_fixed.py with --dataset_root pointing at this output folder.")


if __name__ == "__main__":
    main()
