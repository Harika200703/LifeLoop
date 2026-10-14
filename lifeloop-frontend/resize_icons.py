
from PIL import Image
from pathlib import Path

public = Path("public")

icons = {
    "pwa-192x192.png": (192, 192),
    "pwa-512x512.png": (512, 512),
}

for filename, size in icons.items():
    path = public / filename

    if not path.exists():
        print(f"Missing icon: {path}")
        continue

    with Image.open(path) as img:
        img = img.convert("RGBA")
        img = img.resize(size, Image.Resampling.LANCZOS)
        img.save(path, "PNG")

    print(f"Resized {filename} to {size[0]}x{size[1]}")

print("Done! Both PWA icons have been checked.")
