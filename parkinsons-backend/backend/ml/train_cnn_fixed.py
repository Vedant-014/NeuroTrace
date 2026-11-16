"""
Train a CNN (transfer learning on MobileNetV2) to classify spiral/wave handwriting
drawings as Healthy vs Parkinson's.

IMPORTANT: run preprocess_dataset.py FIRST, and point --dataset_root at ITS output
folder, not the raw Kaggle dataset. This ensures the CNN trains on the exact same
cropped/centered/lighting-corrected images that inference.py produces from real
user uploads at prediction time - which is what fixes the "trained-set-only"
overfitting and instability seen when testing with real-world photos.

Expects the standardized dataset folder structure (same layout as the raw
dataset, just every image run through standardize_image() first):

    <STANDARDIZED_DATASET_ROOT>/
        spiral/
            training/
                healthy/
                parkinson/
            testing/
                healthy/
                parkinson/
        wave/
            training/
                healthy/
                parkinson/
            testing/
                healthy/
                parkinson/

Usage:
    python preprocess_dataset.py --dataset_root /path/to/raw_dataset --output_root /path/to/raw_dataset_standardized
    python train_cnn_fixed.py --dataset_root /path/to/raw_dataset_standardized --drawing_type spiral

Outputs:
    ../models/cnn_<drawing_type>.keras   (trained model)
    ../models/cnn_<drawing_type>_history.json (training history, for your report/slides)
"""

import argparse
import json
import os
import random

import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator

IMG_SIZE = (224, 224)
BATCH_SIZE = 16
EPOCHS = 25
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")


def _augment_realism(img_array: np.ndarray) -> np.ndarray:
    """
    Applied to training images only, on top of standardization.

    The standardized dataset images are clean - cropped, centered, lighting-
    corrected. Real user photos won't always be quite that clean even after
    standardization (slight blur, brightness variation, sensor noise). This
    function synthetically re-introduces that kind of mild, realistic variation
    during training, so the CNN learns to tolerate it instead of only ever
    seeing pristine inputs and being thrown off by anything less than perfect.
    """
    img = img_array.astype(np.float32)

    if random.random() < 0.5:
        factor = random.uniform(0.85, 1.15)
        img = np.clip(img * factor, 0, 255)

    if random.random() < 0.3:
        ksize = random.choice([3, 5])
        img = cv2.GaussianBlur(img, (ksize, ksize), 0)

    if random.random() < 0.3:
        noise = np.random.normal(0, 6, img.shape)
        img = np.clip(img + noise, 0, 255)

    return img


def build_model():
    base = MobileNetV2(input_shape=IMG_SIZE + (3,), include_top=False, weights="imagenet")
    base.trainable = False  # freeze pretrained weights - we have very little data

    inputs = layers.Input(shape=IMG_SIZE + (3,))
    x = tf.keras.applications.mobilenet_v2.preprocess_input(inputs)
    x = base(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(64, activation="relu")(x)
    x = layers.Dropout(0.2)(x)
    outputs = layers.Dense(1, activation="sigmoid")(x)

    model = models.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="binary_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")],
    )
    return model


def get_generators(dataset_root: str, drawing_type: str):
    train_dir = os.path.join(dataset_root, drawing_type, "training")
    test_dir = os.path.join(dataset_root, drawing_type, "testing")

    if not os.path.isdir(train_dir):
        raise FileNotFoundError(
            f"Expected training folder at {train_dir}. "
            "Check --dataset_root points at the STANDARDIZED dataset (output of "
            "preprocess_dataset.py), and that --drawing_type matches."
        )

    # NOTE: train and validation subsets both come from this same generator
    # instance (via validation_split), so _augment_realism is technically also
    # applied to validation images. This is a deliberate tradeoff: since the
    # whole point is measuring real-world-photo performance, a validation set
    # that includes some synthetic realism noise is arguably a more honest
    # signal than one evaluated only on pristine standardized images.
    train_datagen = ImageDataGenerator(
        rotation_range=360,  # spiral/wave drawings are rotation-invariant in meaning
        width_shift_range=0.05,
        height_shift_range=0.05,
        zoom_range=0.1,
        horizontal_flip=True,
        validation_split=0.15,
        preprocessing_function=_augment_realism,
    )

    train_gen = train_datagen.flow_from_directory(
        train_dir,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="binary",
        subset="training",
        classes=["healthy", "parkinson"],  # ensures label 0=healthy, 1=parkinson
        shuffle=True,
        seed=42,
    )
    val_gen = train_datagen.flow_from_directory(
        train_dir,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="binary",
        subset="validation",
        classes=["healthy", "parkinson"],
        shuffle=False,
        seed=42,
    )
    test_gen = None
    if os.path.isdir(test_dir):
        # Test set deliberately has NO augmentation/realism-noise applied -
        # this is meant to be the cleanest read on true held-out performance.
        test_datagen = ImageDataGenerator()
        test_gen = test_datagen.flow_from_directory(
            test_dir,
            target_size=IMG_SIZE,
            batch_size=BATCH_SIZE,
            class_mode="binary",
            classes=["healthy", "parkinson"],
            shuffle=False,
        )
        if len(test_gen) == 0:
            print(f"Warning: 'testing' folder found at {test_dir} but contains no usable images. Will fall back to validation metrics.")
            test_gen = None
    else:
        print(f"Note: no 'testing' folder found at {test_dir}. Will report validation metrics instead of a true held-out test score.")

    return train_gen, val_gen, test_gen


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset_root", required=True, help="Path to the STANDARDIZED dataset (output of preprocess_dataset.py)")
    parser.add_argument("--drawing_type", choices=["spiral", "wave"], default="spiral")
    args = parser.parse_args()

    os.makedirs(MODELS_DIR, exist_ok=True)

    train_gen, val_gen, test_gen = get_generators(args.dataset_root, args.drawing_type)
    model = build_model()
    model.summary()

    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor="val_auc", mode="max", patience=6, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3),
    ]

    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=EPOCHS,
        callbacks=callbacks,
    )

    # --- Save the model FIRST, before anything that could fail. ---
    model_path = os.path.join(MODELS_DIR, f"cnn_{args.drawing_type}.keras")
    model.save(model_path)
    print(f"\nSaved model to {model_path}")

    # --- Now attempt test-set evaluation, without risking the saved model. ---
    test_acc, test_auc = None, None
    test_source = "held-out test set"
    if test_gen is not None and len(test_gen) > 0:
        print("\nEvaluating on held-out test set...")
        try:
            test_loss, test_acc, test_auc = model.evaluate(test_gen)
            print(f"Test accuracy: {test_acc:.4f} | Test AUC: {test_auc:.4f}")
        except Exception as e:
            print(f"\nWarning: test-set evaluation failed ({e}). Falling back to validation metrics.")
            test_acc, test_auc = None, None

    if test_acc is None:
        test_source = "validation set (no usable testing/ folder found)"
        test_acc = history.history.get("val_accuracy", [None])[-1]
        test_auc = history.history.get("val_auc", [None])[-1]
        print(f"\nReporting validation metrics instead: accuracy={test_acc:.4f}, auc={test_auc:.4f}")
        print("(To get a true held-out test score, split off a separate testing/ folder that the model never trained or validated on.)")

    history_path = os.path.join(MODELS_DIR, f"cnn_{args.drawing_type}_history.json")
    with open(history_path, "w") as f:
        json.dump(
            {
                "history": {k: [float(v) for v in vals] for k, vals in history.history.items()},
                "test_accuracy": float(test_acc) if test_acc is not None else None,
                "test_auc": float(test_auc) if test_auc is not None else None,
                "test_metric_source": test_source,
            },
            f,
            indent=2,
        )
    print(f"Saved training history to {history_path}")


if __name__ == "__main__":
    main()
