"""
Shared preprocessing pipeline used by BOTH the CNN and the classical feature
extractor, at BOTH training time and inference time.

Having exactly one implementation here - imported everywhere else instead of
each model doing its own thing - is what fixes two real problems seen in
testing:

  1. "Same photo, different answer" instability: the CNN and classical model
     were previously loading/resizing images through two different code paths,
     each reacting differently to incidental lighting/framing differences.

  2. Poor generalization to real-world photos: the old pipeline resized the
     raw photo straight to a fixed size with no cropping, so how much blank
     margin happened to be in a photo (a very common difference between a
     clean dataset scan and a phone photo) directly changed the apparent
     scale/position of the drawn stroke that features were computed from.

What this pipeline does, in order:
  1. Load grayscale
  2. Flatten uneven lighting (divide out a heavily blurred illumination
     estimate - phone photos almost always have some)
  3. Binarize with Otsu's method (more robust to real photos than a fixed or
     purely adaptive threshold on the raw image)
  4. Clean small noise with morphological open/close
  5. Crop tightly to the drawn stroke's bounding box (+ small padding)
  6. Letterbox-resize onto a fixed square canvas, preserving aspect ratio -
     never stretches/distorts the stroke, which a plain cv2.resize on a
     non-square crop would do

Returns two things from the same canonical, cropped/centered image:
  - canvas_gray:   normalized grayscale, used as CNN input. This is also what
                   Phase 2 Grad-CAM heatmaps should be overlaid on, since it's
                   what the CNN actually saw.
  - canvas_binary: clean black/white ink mask, used for classical feature
                   extraction (tremor_index, smoothness_score, etc).

Because both paths start from the same cropped/centered/lit-corrected image,
a Phase 2 SHAP explanation of the classical features and a Grad-CAM heatmap of
the CNN will visually line up with each other - which wouldn't be possible if
each model preprocessed the raw upload differently, as before.
"""

import cv2
import numpy as np

DEFAULT_CANVAS_SIZE = 512
DEFAULT_PADDING_RATIO = 0.10


def _flatten_illumination(gray: np.ndarray) -> np.ndarray:
    """Removes uneven lighting/shadow (very common in phone photos) by dividing
    out a heavily blurred estimate of the background."""
    blur = cv2.GaussianBlur(gray, (0, 0), sigmaX=max(gray.shape[1] / 10, 1))
    blur = np.clip(blur, 1, 255)
    flattened = cv2.divide(gray.astype(np.float32), blur.astype(np.float32), scale=255)
    return np.clip(flattened, 0, 255).astype(np.uint8)


def _binarize(flattened: np.ndarray) -> np.ndarray:
    """Otsu's method after illumination flattening - more robust to real-world
    photos than a fixed or purely adaptive threshold on the raw image."""
    _, binary = cv2.threshold(flattened, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    kernel = np.ones((3, 3), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    return binary


def _bounding_box(binary: np.ndarray, padding_ratio: float):
    ys, xs = np.where(binary > 0)
    if len(xs) == 0 or len(ys) == 0:
        h, w = binary.shape
        return 0, 0, w, h
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    w, h = x1 - x0, y1 - y0
    pad_x = int(w * padding_ratio) + 1
    pad_y = int(h * padding_ratio) + 1
    x0 = max(0, x0 - pad_x)
    y0 = max(0, y0 - pad_y)
    x1 = min(binary.shape[1], x1 + pad_x)
    y1 = min(binary.shape[0], y1 + pad_y)
    return x0, y0, x1, y1


def _letterbox_resize(img: np.ndarray, size: int, background_value: int) -> np.ndarray:
    """Resize preserving aspect ratio, padding with `background_value` to reach
    a square canvas. Prevents the stroke distortion a plain cv2.resize would
    cause on a non-square crop - a common, sneaky source of instability."""
    h, w = img.shape[:2]
    scale = size / max(h, w)
    new_w, new_h = max(1, int(w * scale)), max(1, int(h * scale))
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

    canvas = np.full((size, size), background_value, dtype=np.uint8)
    x_off = (size - new_w) // 2
    y_off = (size - new_h) // 2
    canvas[y_off:y_off + new_h, x_off:x_off + new_w] = resized
    return canvas


def standardize_image(
    image_path: str,
    canvas_size: int = DEFAULT_CANVAS_SIZE,
    padding_ratio: float = DEFAULT_PADDING_RATIO,
):
    """
    Loads an image from disk and returns (canvas_gray, canvas_binary), both
    canvas_size x canvas_size uint8 arrays, with the drawn stroke cropped,
    centered, and consistently scaled - regardless of the original photo's
    framing, lighting, or resolution.

    This is the ONE place image standardization happens. Both feature
    extraction and CNN inference/training call into this, so they always see
    the exact same canonical version of any given image.
    """
    gray = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if gray is None:
        raise ValueError(f"Could not read image at {image_path}")

    flattened = _flatten_illumination(gray)
    binary = _binarize(flattened)

    x0, y0, x1, y1 = _bounding_box(binary, padding_ratio)
    gray_crop = flattened[y0:y1, x0:x1]
    binary_crop = binary[y0:y1, x0:x1]

    canvas_gray = _letterbox_resize(gray_crop, canvas_size, background_value=255)
    canvas_binary = _letterbox_resize(binary_crop, canvas_size, background_value=0)
    # INTER_AREA resize on a binary mask can introduce gray edge pixels -
    # re-threshold to keep the mask clean for contour-based features.
    _, canvas_binary = cv2.threshold(canvas_binary, 127, 255, cv2.THRESH_BINARY)

    return canvas_gray, canvas_binary
