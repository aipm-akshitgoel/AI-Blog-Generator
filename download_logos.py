import urllib.request
import json
import ssl
from PIL import Image
import io
import os

ssl._create_default_https_context = ssl._create_unverified_context
os.makedirs("public/assets/logos", exist_ok=True)

# Using wikimedia pageimage API (REST API gives thumbnail URLs easily)
def fetch_wiki_image(title):
    url = f"https://en.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(title)}&prop=pageimages&pithumbsize=800&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    res = json.loads(urllib.request.urlopen(req).read())
    pages = res['query']['pages']
    for page_id in pages:
        if 'thumbnail' in pages[page_id]:
            return pages[page_id]['thumbnail']['source']
    return None

logos = {
    "nirf": fetch_wiki_image("National_Institutional_Ranking_Framework"),
    "naac": fetch_wiki_image("National_Assessment_and_Accreditation_Council"),
    "qs": fetch_wiki_image("QS_World_University_Rankings"),
    # Free icon provider for award
    "award": "https://cdn-icons-png.flaticon.com/512/3135/3135706.png"
}

for name, url in logos.items():
    if not url:
        print(f"Failed to find URL for {name}")
        continue
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        data = urllib.request.urlopen(req).read()
        
        # We process with PIL to convert to WebP
        img = Image.open(io.BytesIO(data))
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
            
        out_path = f"public/assets/logos/{name}.webp"
        img.save(out_path, "WEBP", quality=90)
        print(f"Saved {out_path}")
    except Exception as e:
        print(f"Failed to process {name} from {url}: {e}")
