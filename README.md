# LEOPARD Energy Honey: product pages and QR codes

Two mobile product pages that open when a customer scans the QR code on the back of a sachet.

| | |
|---|---|
| **Royal Jelly** | `https://USERNAME.github.io/leopard-energy-honey/royal-jelly/` |
| **Ginseng & Tongkat Ali** | `https://USERNAME.github.io/leopard-energy-honey/ginseng-tongkat-ali/` |
| **Repository** | `https://github.com/USERNAME/leopard-energy-honey` |

> ## ⚠️ NEVER rename the repository or the page folders
> The printed QR codes depend on these exact URLs. If you rename `leopard-energy-honey`, `royal-jelly` or `ginseng-tongkat-ali`, every sachet already printed stops working. To change content, edit the files and keep the URLs the same.

---

## How to edit without coding

Everything you will normally change is in two files:

- `content/royal-jelly.json`
- `content/ginseng-tongkat-ali.json`

Each one holds the English text (`"en"`), the Arabic text (`"ar"`), the price and the contact details. Replace everything in `[SQUARE BRACKETS]` with your real details. Contact details and photos are set in each file separately, so change them in both.

Saved changes go live in **about 1 minute**. If you still see the old version, close the tab and open it again, or refresh.

### 1. Edit the text or price on github.com

**On a computer**

1. Open the repository on github.com and sign in.
2. Open the `content` folder and click the product's file.
3. Click the pencil icon (Edit this file).
4. Change the text, then click **Commit changes** twice.

**On a phone** (use your browser in desktop mode if you don't see the pencil)

1. In your phone's browser, open `github.com/USERNAME/leopard-energy-honey` and sign in.
2. Tap `content`, then the product's file.
3. Tap the `…` menu or the pencil, then **Edit file**.
4. Change the text, then tap **Commit changes**.

**Keep the punctuation.** Change only the words inside the quotes, and leave every `"`, `,`, `{` and `[` alone. A missing comma stops the file from loading. Customers who have visited before will see the last good version; new visitors will see a "being updated" message until it is fixed. Open the page right after each edit to check it. To undo a bad edit, open the file's **History** on github.com, or paste the file into [jsonlint.com](https://jsonlint.com) to find the mistake.

To remove a line, such as `[OTHER INGREDIENTS]`, delete its whole `{ ... },` row in both `"en"` and `"ar"`.

### 2. Replace a photo

Upload a new file with **exactly the same name** and it replaces the old one.

1. On github.com, open `assets/img/royal-jelly` or `assets/img/ginseng-tongkat-ali`.
2. Click **Add file → Upload files**, drop in the photo, then click **Commit changes**.

| File | What it is | Size to aim for |
|---|---|---|
| `sachet-hero.webp` | Sachet at the top of the page (transparent background) | 240 × 720 px, under 40 KB |
| `sachet-front.webp` | Gallery | 800 × 1000 px, under 60 KB |
| `sachet-back.webp` | Gallery | about 520 × 710 px, under 60 KB |
| `gift-box.webp` | Gallery | 1000 × 667 px, under 80 KB |

Photos must be WebP to keep the page fast. Convert them for free at [squoosh.app](https://squoosh.app).

**To add a photo where a "Photo needed" box is showing:** upload it (for example `gift-box.webp` or `lifestyle-1.webp`) to the product's folder. Then, in that product's JSON, fill in the empty `"image": ""` in the `gallery` list, for example `"image": "ginseng-tongkat-ali/gift-box.webp"`.

**Before you have the photo:** delete that row from `gallery` so customers don't see the "Photo needed" box.

### 3. Or edit on your computer

```bash
git clone https://github.com/USERNAME/leopard-energy-honey.git
cd leopard-energy-honey
# edit files, then:
git add -A
git commit -m "Update prices"
git push
```

### Optional: edit prices and text in a Google Sheet

The page first shows what's in the JSON file, then applies anything it finds in the sheet. If the sheet is slow (over 2.5 seconds), broken or unpublished, the JSON version simply stays on screen.

1. Create a Google Sheet with one tab per product, named `royal-jelly` and `ginseng-tongkat-ali`.
2. In each tab, make the first row exactly `key`, `en`, `ar`, then add only the rows you want to control:

   | key | en | ar |
   |---|---|---|
   | price | 1,250 EGP | ١٢٥٠ جنيه |
   | about | New English description | الوصف العربي الجديد |
   | contact.whatsapp | +20 100 000 0000 | |
   | ingredients.0.note | First ingredient's note | ملاحظة المكون الأول |
   | details.0.value | 25 g | ٢٥ جم |

   A key is the field's path in the JSON file, and counting starts at 0. Keys beginning with `contact.` use only the `en` column. Keys that don't exist are ignored.
3. Choose **File → Share → Publish to web**. Pick the tab and **Comma-separated values (.csv)**, click **Publish**, and copy the link. Repeat for the second tab.
4. Paste each link into its product's JSON: `"googleSheetCsvUrl": "https://docs.google.com/..."`.

Anyone with the published link can read that tab, so put only public product information in it. The sheet can't change photos or the gallery.

---

## Publish

The live site uses GitHub Pages, deployed from the `main` branch's root folder. No build step is needed; `.nojekyll` tells GitHub to serve the files as they are.

### First-time setup with the GitHub CLI

```bash
git push -u origin main
gh api -X POST repos/USERNAME/leopard-energy-honey/pages -f "source[branch]=main" -f "source[path]=/"
```

The first publish takes a few minutes. On the website, the same setting is at **Settings → Pages → Deploy from a branch → main, / (root)**.

### Alternative: Netlify drag-and-drop

Drag this folder onto [app.netlify.com/drop](https://app.netlify.com/drop). The pages work there unchanged, but the URLs are different, so the QR codes must be generated for the Netlify address **before printing**. Choose one host before you print.

---

## QR codes

Files are in `qr/`: `royal-jelly.svg`, `royal-jelly.png`, `ginseng-tongkat-ali.svg` and `ginseng-tongkat-ali.png`.

- Error correction H, dark brown `#3A1E0E` on white, with a full 4-module quiet zone.
- Each PNG is 1200 px wide with the label underneath. In the SVG, the label is outlined (no font needed) and has the id `label`, so a designer can move it.
- **Minimum print size: about 2 × 2 cm.** Print on a white background, as the sachet's white box provides. Test a printed sample with several phones before the full run.

The centre logo is off by default. At 2 cm each square is only about 0.35 mm, and the emblem would be too small to read. Add `--logo` only if you print larger and have tested real samples.

### Regenerate them

```bash
pip install -r tools/requirements.txt
python tools/generate_qr.py --base-url https://USERNAME.github.io/leopard-energy-honey
```

This writes all four files, decodes them again and stops with an error on any mismatch. Only regenerate if the URL has never been printed. Editing content never requires new codes.

---

## Re-test after a change

```bash
python tools/check_content.py
python -m http.server 8000
```

The first command reports JSON typos, missing photos, forbidden wording and remaining placeholders. The second serves the site at `http://localhost:8000/royal-jelly/`. Add `?lang=ar` or `?lang=en` to force a language.

Check on a real phone:

- [ ] Both pages open and the language button switches direction
- [ ] The WhatsApp button opens a chat with your number and names the right product
- [ ] Gallery swipes, and tapping a photo enlarges it
- [ ] The link to the other product works
- [ ] A printed QR code opens the right page

---

## What's where

```
royal-jelly/index.html           page shell; sets --base-tone to pearl white
ginseng-tongkat-ali/index.html   page shell; sets --base-tone to brushed silver
content/*.json                   ALL editable text, prices, contacts and photo lists
assets/css/site.css              the one stylesheet
assets/js/app.js                 the one template and behaviour
assets/img/                      photos and artwork
assets/fonts/                    self-hosted fonts
qr/                              print files
tools/                           QR generator and content checker
```

The two index files differ only in their product name, `data-product` and `--base-tone`. Layout changes go in `site.css` and `app.js`, and both pages pick them up.

Fonts: Marcellus, Michroma, Alegreya Sans, El Messiri and Tajawal, all under the SIL Open Font License.

## Wording rules

General wellness only. The pages must not make sexual-performance, "male enhancement" or medical claims. `tools/check_content.py` flags the common terms.
