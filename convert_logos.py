import os
from PIL import Image

src_paths = [
    "/Users/akshitgoel/.gemini/antigravity/brain/60a56a67-4dd6-4912-ab29-ef41276aedd4/nirf_logo_1772929717447.png",
    "/Users/akshitgoel/.gemini/antigravity/brain/60a56a67-4dd6-4912-ab29-ef41276aedd4/naac_logo_1772929731947.png",
    "/Users/akshitgoel/.gemini/antigravity/brain/60a56a67-4dd6-4912-ab29-ef41276aedd4/global_ranking_logo_1772929745082.png",
    "/Users/akshitgoel/.gemini/antigravity/brain/60a56a67-4dd6-4912-ab29-ef41276aedd4/award_logo_1772929762513.png"
]

dest_dir = "/Users/akshitgoel/cursor/public/assets/logos"
os.makedirs(dest_dir, exist_ok=True)

names = ["nirf.webp", "naac.webp", "qs.webp", "award.webp"]

for src, name in zip(src_paths, names):
    if os.path.exists(src):
        img = Image.open(src)
        dest = os.path.join(dest_dir, name)
        img.save(dest, "WEBP", quality=90)
        print(f"Saved {dest}")
    else:
        print(f"File not found: {src}")
