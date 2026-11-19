"""Build self-hosted editorial WOFF2 fonts from the official Google Fonts repo.

Run from any directory with Python, fontTools, and brotli installed.
Only files in this directory are written. Original font binaries stay in memory.
"""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import re
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

DEST = Path(__file__).resolve().parent
SITE = DEST.parent.parent
HEADERS = {"User-Agent": "Mofarigano-font-build/1.0"}


def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as response:
        return response.read()


lock_path = DEST / "editorial-fonts-sources.json"
if lock_path.exists():
    revision = json.loads(lock_path.read_text(encoding="utf-8"))["googleFontsRevision"]
else:
    revision = json.loads(fetch("https://api.github.com/repos/google/fonts/commits/main"))["sha"]
base = f"https://raw.githubusercontent.com/google/fonts/{revision}/ofl"
families = {
    "song": ("notoserifsc", "NotoSerifSC%5Bwght%5D.ttf", "NotoSerifSC-OFL.txt"),
    "editorial": ("instrumentserif", "InstrumentSerif-Italic.ttf", "InstrumentSerif-OFL.txt"),
    "hand": ("caveat", "Caveat%5Bwght%5D.ttf", "Caveat-OFL.txt"),
}
requests = {}
for key, (folder, file, license_file) in families.items():
    requests[key] = f"{base}/{folder}/{file}"
    requests[key + "-license"] = f"{base}/{folder}/OFL.txt"
with ThreadPoolExecutor(max_workers=6) as pool:
    payloads = dict(zip(requests, pool.map(fetch, requests.values())))

corpus_paths = [SITE / name for name in ("index.html", "app.js", "content.js", "cabinet/cabinet.js")]
corpus_paths += sorted((SITE / "modules").glob("*.html"))
corpus = set()
for file in corpus_paths:
    text = file.read_text(encoding="utf-8")
    text = re.sub(r"data:[^,\s\"']+;base64,[A-Za-z0-9+/=]+", "", text)
    text = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), text)
    corpus.update(ord(char) for char in text)
site_han = {cp for cp in corpus if 0x3400 <= cp <= 0x9FFF}
common_han = set()
for first in range(0xB0, 0xF8):
    for second in range(0xA1, 0xFF):
        try:
            common_han.add(ord(bytes([first, second]).decode("gb2312")))
        except UnicodeDecodeError:
            pass

latin = set(range(0x20, 0x250)) | set(range(0x2000, 0x2070))
punctuation = set(range(0x3000, 0x3040)) | set(range(0xFF00, 0xFFF0))
core_requested = corpus | latin | punctuation
source_song = TTFont(BytesIO(payloads["song"]))
source_cmap = set(source_song.getBestCmap())
core = core_requested & source_cmap
extra = (common_han & source_cmap) - core


def unicode_ranges(codepoints):
    values = sorted(codepoints)
    if not values:
        return ""
    chunks = []
    first = last = values[0]
    for cp in values[1:]:
        if cp == last + 1:
            last = cp
        else:
            chunks.append(f"U+{first:X}" if first == last else f"U+{first:X}-{last:X}")
            first = last = cp
    chunks.append(f"U+{first:X}" if first == last else f"U+{first:X}-{last:X}")
    return ",".join(chunks)


def rename_font(font, family, style):
    # Derived fonts receive distinct family/PostScript names. Copyright, license,
    # trademark and attribution records remain intact.
    postscript = family.replace(" ", "") + "-" + style.replace(" ", "")
    values = {1: family, 2: style, 3: postscript + ";MofariganoSubset1", 4: family + " " + style,
              6: postscript, 16: family, 17: style, 21: family, 22: style, 25: family.replace(" ", "")}
    for name_id, value in values.items():
        for platform, encoding, language in ((3, 1, 0x409), (1, 0, 0)):
            font["name"].setName(value, name_id, platform, encoding, language)


outputs = []
css = ["/* Self-hosted derived fonts; source, coverage and OFL: editorial-fonts-sources.json. */"]


def build(key, filename, family, style, weight, requested, axis):
    font = TTFont(BytesIO(payloads[key]))
    options = subset.Options()
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.notdef_glyph = True
    options.notdef_outline = True
    options.layout_features = ["*"]
    worker = subset.Subsetter(options=options)
    worker.populate(unicodes=requested)
    worker.subset(font)
    if axis is not None:
        instantiateVariableFont(font, {"wght": axis}, inplace=True)
    rename_font(font, family, "Italic" if style == "italic" else "Regular")
    font.flavor = "woff2"
    file = DEST / filename
    font.save(file)
    verified = TTFont(file)
    cmap = set(verified.getBestCmap())
    outputs.append({"file": filename, "family": family, "style": style, "weight": weight,
                    "bytes": file.stat().st_size, "sha256": sha256(file.read_bytes()).hexdigest(),
                    "codepointCount": len(cmap), "hanCount": len({cp for cp in cmap if 0x3400 <= cp <= 0x9FFF}),
                    "unicodeRange": unicode_ranges(cmap),
                    "axis": [{"tag": a.axisTag, "min": a.minValue, "default": a.defaultValue, "max": a.maxValue}
                             for a in verified["fvar"].axes] if "fvar" in verified else []})
    css.append(f"@font-face{{font-family:'{family}';font-style:{style};font-weight:{weight};font-display:swap;src:url('./{filename}') format('woff2');unicode-range:{unicode_ranges(cmap)};}}")
    print(json.dumps({"file": filename, "bytes": file.stat().st_size, "characters": len(cmap)}, ensure_ascii=False), flush=True)


build("song", "journal-song-core.woff2", "Journal Song", "normal", "400 700", core, (400, 400, 700))
build("song", "journal-song-common.woff2", "Journal Song", "normal", "400 700", extra, (400, 400, 700))
build("editorial", "journal-editorial-italic.woff2", "Journal Editorial", "italic", "400", latin, None)
build("hand", "journal-hand.woff2", "Journal Hand", "normal", "400", latin, 400)

for key, (folder, file, license_file) in families.items():
    (DEST / license_file).write_bytes(payloads[key + "-license"])

manifest = {
    "googleFontsRevision": revision,
    "sourceRepository": "https://github.com/google/fonts",
    "license": "SIL Open Font License 1.1; see original unmodified OFL files alongside the derived fonts.",
    "derivation": "Subset with fontTools; Chinese weight axis restricted to 400-700 (default 400); Caveat instantiated at 400; renamed internal family/full/PostScript names to Journal families; saved as WOFF2. Original copyright/trademark/license names retained.",
    "sourceFiles": [{"key": key, "fontUrl": requests[key], "fontSha256": sha256(payloads[key]).hexdigest(),
                     "licenseUrl": requests[key + "-license"], "licenseFile": families[key][2]}
                    for key in families],
    "corpusFiles": [str(p.relative_to(SITE)).replace("\\", "/") for p in corpus_paths],
    "coverage": {"siteHanCount": len(site_han), "missingSiteHan": [f"U+{cp:04X}" for cp in sorted(site_han - source_cmap)],
                 "commonHanRequested": len(common_han), "commonHanMissing": [f"U+{cp:04X}" for cp in sorted(common_han - source_cmap)],
                 "coreRequestedMissing": [f"U+{cp:04X}" for cp in sorted(core_requested - source_cmap) if cp >= 0x20],
                 "strategy": "Core covers all source-supported characters in current pages, Latin, CJK punctuation and fullwidth punctuation. The disjoint common shard adds the remaining GB2312 Han characters only when used. Uncovered symbols, emoji and rare/new characters use system fallbacks."},
    "files": outputs,
    "totalFontBytes": sum(o["bytes"] for o in outputs),
}
(DEST / "editorial-fonts.css").write_text("\n".join(css) + "\n", encoding="utf-8")
lock_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"totalBytes": manifest["totalFontBytes"], "siteHanCount": len(site_han),
                  "missingSiteHan": manifest["coverage"]["missingSiteHan"],
                  "commonHanCount": len(common_han)}, ensure_ascii=False), flush=True)
