"""Build standalone transparent character PNGs from the original artwork.

Run when source artwork changes: python scripts/split-eatti-characters.py
Requires Pillow, NumPy and SciPy on the development machine, never at runtime.
Isolate connected artwork before padding: fixed grid rectangles cut off props.
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "assets"
IDS = "ROAM HOME MIXD DAWN NOON DUSK EDGE SAVE JUST TREAT WEIGH LEAF SIP BAKE NOOD WEST SPICE WOK HALAL ROAST SET RHYT WEEK PAIR TEA".split()


def split():
    source = np.array(Image.open(ASSETS / "eatti-characters-cartoon.png").convert("RGBA"))
    labels, count = ndimage.label(source[:, :, 3] > 8)
    slices = ndimage.find_objects(labels)
    sizes = np.bincount(labels.ravel())
    main = [i for i in range(1, count + 1) if sizes[i] > 10000]
    if len(main) != 25:
        raise ValueError("Expected 25 separate characters; inspect the source artwork")

    def center(i):
        sy, sx = slices[i - 1]
        return (sx.start + sx.stop) / 2, (sy.start + sy.stop) / 2

    main.sort(key=lambda i: (int(center(i)[1] / 250), center(i)[0]))
    owners = np.zeros(count + 1, dtype=np.uint8)
    for role, component in enumerate(main, 1):
        owners[component] = role

    def distance(component, primary):
        sy, sx = slices[component - 1]
        py, px = slices[primary - 1]
        dx = max(px.start - sx.stop, sx.start - px.stop, 0)
        dy = max(py.start - sy.stop, sy.start - py.stop, 0)
        x, y = center(component)
        cx, cy = center(primary)
        return dx * dx + dy * dy, (x - cx) ** 2 + (y - cy) ** 2

    # Detached pearls and utensils belong to the nearest character artwork.
    for component in range(1, count + 1):
        if not owners[component]:
            primary = min(main, key=lambda i: distance(component, i))
            owners[component] = owners[primary]

    # Keep original antialiased pixels, without including neighbouring artwork.
    _, nearest = ndimage.distance_transform_edt(labels == 0, return_indices=True)
    pixels = owners[labels[tuple(nearest)]]
    destination = ASSETS / "characters"
    destination.mkdir(exist_ok=True)
    for index, role in enumerate(IDS, 1):
        if role == "WEST":
            image = Image.open(ASSETS / "eatti-western-steak.png").convert("RGBA")
        else:
            rgba = source.copy()
            rgba[pixels != index] = 0
            image = Image.fromarray(rgba)
        image = image.crop(image.getbbox())
        side = max(image.size) + 24
        padded = Image.new("RGBA", (side, side))
        padded.paste(image, ((side - image.width) // 2, (side - image.height) // 2))
        padded.save(destination / f"{role}.png", optimize=True)
        print(f"{role}: {side} x {side}")


if __name__ == "__main__":
    split()
