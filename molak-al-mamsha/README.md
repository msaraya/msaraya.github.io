# ملاك الممشى – حاسبة بدائل السداد

A standalone, responsive, privacy-first Arabic calculator for owners of the **D2 Walkway (R3) project** under *Beitak fi Misr*. No framework, CDN JavaScript, build process, backend, or API key required.

## Features

- Compares formal alternatives 1–4 (7%, 5%, 3%, 0% nominal price discounts).
- Formal alternative 4 tenors: **5, 7, 10 years**; a distinct **non-contractual 3-year simulation**.
- Interactive annual lending-rate and EGP/USD assumptions, *either up or down*, with presets and direct numeric edits. Quarter due date determines which annual assumption applies.
- Equal quarterly principal installments with variable interest calculated on opening outstanding balance; 2.5% extra charges isolated with explicit alternative assumptions.
- 12% commercial/administrative or 10% residential maintenance on **undiscounted** price; 1.5% administrative & board fees also on undiscounted price.
- Dashboard comparing nominal EGP total costs and savings and estimated USD transfers. Recommend least expensive **formally available** alternative subject to configurable upfront, handover, and quarter budgets.
- **عقار إكزيت** section distinguishing *not accepting handover*, *requesting cancellation before handover*, and *cancelling after handover*, including the booklet's 1.5% / minimum USD 500 deduction and 7% occupancy rule. Refund numbers **provisional** only.
- CSV downloads, print, browser-local preferences, light/dark mode.

## Host within your existing Jekyll/Chirpy GitHub Pages blog

Copy the directory `molak-al-mamsha/` into the **root of the existing blog repository** (not into `_posts/` and not into `_site/`). Commit and push. This results in:

`https://blog.msaraya.com/molak-al-mamsha/`

The website has relative CSS and JS URLs, so this works as a standalone static HTML subpath. Do **not** add a root `.nojekyll` to the existing Chirpy blog — that could break the Jekyll build.

```
# From within your existing blog repository
mkdir -p molak-al-mamsha
cp -a /path/to/downloaded/molak-al-mamsha/{index.html,styles.css,logic.js,app.js} molak-al-mamsha/
git add molak-al-mamsha/
git commit -m "Add Molak Al Mamsha interactive installment calculator"
git push origin HEAD
```

If the source repository uses a GitHub Actions Pages workflow, allow its existing deployment to complete. This site should then resolve at the URL above, **provided your existing blog repository is the GitHub Pages source for `blog.msaraya.com`**.

For local testing: `python3 -m http.server 8000` then open `http://localhost:8000/molak-al-mamsha/` (from the parent directory).

Tests: `node molak-al-mamsha/test.js`.

## Financial/legal assumptions

Booklet basis: the commercial and administrative units in *Beitak fi Misr* phase 2 booklet, the section corresponding to PDF pp. 44–47 in the combined 51-page edition. Financial terms for **D2 R3** are considered; **Zelal** and other project-specific alternatives are **not** used.

The 2% Ministry of Finance plus 0.5% fees are named, but the booklet does not fully explain precisely *how often* or *against what balance* they accrue. The default assumes 2.5 percentage points per year on opening declining balance (or lets you switch to 2.5% of original financed principal distributed over installments). Both are estimates, not authoritative. Quarterly payments use equal principal, not fixed annuity, because the official amortization method was not documented in the text at hand. Always verify an issued official statement. The annual exchange rate is a **scenario average**, not the official spot rate on the due date.

The current lending-rate starting point (20%) references the CBE press release dated 24 September 2026: https://www.cbe.org.eg/ar/news-publications/news/2026/09/24/15/38/mpc-press-release-24-september-2026 . Default exchange rate 52 EGP/USD is a hypothetical illustration, NOT a current live quote. All future rates are hypothetical and editable.

Cancellation at the purchaser's request and non-acceptance of handover are distinct. The 1.5% deduction (minimum USD 500) is in the booklet, and 7% annual occupancy applies after taking possession. The accounting treatment of already-paid administrative fees, maintenance deposits, refunds, USD conversion and dates must be confirmed by the authority. No automatic 1.5% deduction is stated for simply not collecting keys on a particular day.

No data is transmitted from the application: there are no analytics, external fonts, API calls or third-party scripts. Local storage remains exclusively in the visitor's browser.
