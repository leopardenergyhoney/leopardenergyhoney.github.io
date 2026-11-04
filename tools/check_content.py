#!/usr/bin/env python3
"""Check the content files before or after editing:  python tools/check_content.py

Reports JSON typos, photos that don't exist, placeholders still to fill, and wording
the pages must not use.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BANNED = r"male enhancement|enhancement|sexual|libido|erect|potency|testosterone|impoten|cure[sd]?\b(?! or prevent)|تعزيز الذكورة|جنسي|الانتصاب|الفحولة"
errors = 0
for slug in ("royal-jelly", "ginseng-tongkat-ali"):
    path = ROOT / "content" / f"{slug}.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"{slug}: JSON ERROR on line {e.lineno}, column {e.colno}: {e.msg}")
        errors += 1
        continue
    for lang in ("en", "ar"):
        if set(data[lang]) != set(data["en"]):
            print(f"{slug}: {lang} is missing fields: {set(data['en']) ^ set(data[lang])}")
            errors += 1
        text = json.dumps(data[lang], ensure_ascii=False)
        text = text.replace("diagnose, treat, cure or prevent", "")
        for hit in re.findall(BANNED, text, re.I):
            print(f"{slug}: {lang} contains a forbidden term: {hit}")
            errors += 1
    images = [data["images"]["hero"]] + [g["image"] for g in data["gallery"] if g["image"]]
    for name in images:
        if not (ROOT / "assets" / "img" / name).exists():
            print(f"{slug}: missing photo assets/img/{name}")
            errors += 1
    empty = sum(1 for g in data["gallery"] if not g["image"])
    def strings(o):
        if isinstance(o, str):
            yield o
        elif isinstance(o, dict):
            for v in o.values():
                yield from strings(v)
        elif isinstance(o, list):
            for v in o:
                yield from strings(v)
    todo = sorted({s for s in strings({k: data[k] for k in ("contact", "en")}) if s.startswith("[")})
    print(f"{slug}: {len(todo)} placeholders to fill, {empty} photo slots empty")
    for t in todo:
        print(f"    {t}")
sys.exit(1 if errors else 0)
