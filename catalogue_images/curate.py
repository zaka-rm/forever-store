"""
Scores every extracted PDF image per page and picks the best "hero" product
photo, rejecting decorative watercolor textures, near-solid/black logo
artifacts, and rasterized text banners. Resizes the winner and saves it to
public/products/page-NN.jpg.
"""
import os
import io
from PIL import Image, ImageStat, ImageFilter

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(os.path.dirname(SRC_DIR), "public", "products")
os.makedirs(OUT_DIR, exist_ok=True)

MANIFEST = os.path.join(SRC_DIR, "manifest.txt")


def score_image(path):
    try:
        im = Image.open(path).convert("RGB")
    except Exception:
        return None

    w, h = im.size
    area = w * h
    if area < 80 * 80:
        return None

    small = im.resize((min(300, w), min(300, h)))
    stat = ImageStat.Stat(small)
    stddev = sum(stat.stddev) / 3
    mean = sum(stat.mean) / 3

    if mean < 12:
        return None
    if mean > 248 and stddev < 8:
        return None
    if stddev < 18:
        return None

    hsv = small.convert("HSV")
    hstat = ImageStat.Stat(hsv)
    saturation = hstat.mean[1]

    # Sharpness/detail: watercolor washes are soft blurry gradients (low
    # edge energy); real product photos have crisp label text/cap edges
    # (high edge energy) even on a plain background.
    edges = small.convert("L").filter(ImageFilter.FIND_EDGES)
    edge_stat = ImageStat.Stat(edges)
    sharpness = edge_stat.mean[0]
    if sharpness < 6:
        return None  # hard reject: too soft/blurry to be a real photo

    aspect = max(w, h) / max(1, min(w, h))
    aspect_penalty = 1.0 if aspect <= 2.2 else 0.4

    score = (
        (area ** 0.5)
        * (1 + saturation / 255)
        * (1 + sharpness / 40)
        * aspect_penalty
    )
    return score


def main():
    pages = {}
    with open(MANIFEST, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split("\t")
            if len(parts) != 3:
                continue
            page_no, fname, _dims = parts
            pages.setdefault(int(page_no), []).append(fname)

    results = []
    for page_no, files in sorted(pages.items()):
        best = None
        best_score = -1
        for fname in files:
            path = os.path.join(SRC_DIR, fname)
            s = score_image(path)
            if s is not None and s > best_score:
                best_score = s
                best = fname
        if best is None:
            results.append((page_no, None, None))
            continue

        src_path = os.path.join(SRC_DIR, best)
        im = Image.open(src_path).convert("RGB")
        w, h = im.size
        max_edge = 1400
        if max(w, h) > max_edge:
            ratio = max_edge / max(w, h)
            im = im.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

        out_name = f"page-{page_no:02d}.jpg"
        out_path = os.path.join(OUT_DIR, out_name)
        im.save(out_path, "JPEG", quality=85, optimize=True)
        results.append((page_no, best, out_name))

    with io.open(os.path.join(SRC_DIR, "curation_result.txt"), "w", encoding="utf-8") as f:
        for page_no, src, out in results:
            f.write(f"{page_no}\t{src}\t{out}\n")

    print("Curated", sum(1 for r in results if r[2]), "of", len(results), "pages")


if __name__ == "__main__":
    main()
