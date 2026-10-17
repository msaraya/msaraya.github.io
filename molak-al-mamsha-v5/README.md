# ملاك الممشى – حاسبة بدائل السداد

A standalone, responsive, privacy-first Arabic calculator for owners of the **D2 Walkway (R3) project** under *Beitak fi Misr*. No framework, CDN JavaScript, build process, backend, or API key required.

## Features

- Compares formal alternatives 1–4 (7%, 5%, 3%, 0% nominal price discounts).
- Formal alternative 4 tenors: **5, 7, 10 years**; a distinct **non-contractual 3-year simulation**.
- Interactive annual lending-rate and EGP/USD assumptions, *either up or down*, with presets and direct numeric edits. Quarter due date determines which annual assumption applies.
- Equal quarterly principal installments with variable interest calculated on opening outstanding balance; 2.5% extra charges isolated with explicit alternative assumptions.
- 12% commercial/administrative or 10% residential maintenance on **undiscounted** price; 1.5% administrative & board fees also on undiscounted price.
- Catalogue of **62 units** with unit code, area, type, price; **61 recorded payment alternatives** and their imported ledger balances (no owner names).
- A dedicated payments reconciliation panel with known USD transfers for two units, reference historical FX rates, inferred credited EGP and differences transparently marked as hypotheses.
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
cp -a /path/to/downloaded/molak-al-mamsha/{index.html,styles.css,logic.js,units.js,app.js} molak-al-mamsha/
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

## Unit data, privacy and the meaning of "extra dollars"

The static `units.js` includes 62 unit codes, floor, type, areas and undiscounted unit prices; 61 have payment-choice and balance entries from the supplied spreadsheets. The correction `MLR56GB` → `MLR56G8` is based on the code matching the underlying list. It carries **no owner names, email addresses or phone numbers**.

Only two units have user-provided payment histories included: `MLR56G4` and `MLC56M1`. Other buyers' true USD transfers and receipt dates are unknown; the site **never silently treats inferred USD as proven payments**. Historical rates on those two histories are *reference rates* from earlier comparisons, not bank-certified posting rates. `MLR56G4` was said to have transferred USD 24,285 plus USD 5,000, while the portal breakdown referenced USD 24,277.44: the USD 7.56 difference is unallocated and **not** automatically classified as extra purchase principal. `MLC56M1` has USD 5,050 (including USD 50 study) and USD 20,006; the requested December 21, 2025 payment references December 22 working-day FX.

The older v4 release applied a hypothesis to alternatives 3 and 4 only. **The current update applies the following reverse-ledger scenarios to all 61 available balances** (see the section below): choices 1/2/3/4 respectively use 106.5%, 58.5%, 40.5%, 38.5% of undiscounted price with immediate-discount assumptions. The timing of discounts can be changed in the FX panel. An implied credited-EGP amount is calculated as obligation minus the balance. A reference FX converts this amount into hypothetical USD. This is a reverse calculation, **not** proof of a particular amount transferred. Enter receipt-backed payments in the inputs before attempting a reconciliation. Positive or negative differences alone are not statements of overpayment, tax, credit or right to a refund.

The year-based **عقار إكزيت** simulator compares cancellation before possession and 0–10 years after actual/assumed possession, on an assumed on-time payment schedule and a 7% yearly occupancy charge; maintenance refund, delays, unsettled dues and official reconciliation are unknown.


## FX reconciliation update v4.61b (17 October 2026)

The previously blank implied USD amounts for payment choices 1 and 2 are now calculated. **61 of 62** catalogue units have usable choice and ledger balance; the remaining `MLC41M19` is shown as unavailable, not zero. All owner names are excluded.

Reverse ledger model for the D2 R3 booklet:

| Payment choice | Hypothetical pre-handover obligation / original price |
|---|---:|
| 1 | 106.5% = 100% + 12% maintenance + 1.5% fees - 7% discount |
| 2 | 58.5% = 50% + 12% + 1.5% - 5% discount |
| 3 | 40.5% = 30% + 12% + 1.5% - 3% discount |
| 4 | 38.5% = 15% + 10% delivery + 12% + 1.5% |

`implied credited EGP = price * obligation_fraction - ledger_balance`. If the assumed first USD 5,000 booking is credited at FX=47.5019, the implied follow-up USD for a rate `r` is `(implied EGP - 5000*47.5019)/r`. The program supplies **two benchmarks**, 47.4061 (22 December 2025, CBE-reported buy rate) and 53.4134 (15 October 2026 CBE customer buy rate). Both can be edited; the resulting USD figures **are conditional estimates, NOT actual USD remittances**. A zero/unknown ledger remains '—'. For the December rate: https://www.firstbankeg.com/41009 ; for the October rate: https://www.cbe.org.eg/ar/ .

Only two units have reported/documented payments in the accessible material; these retain their separate evidence and are never silently replaced with imputed values. The difference between model FX scenarios is **not** overpaid dollars. For that determination, use the official payment allocations, acceptance dates, applied exchange rates, receipts and the authority's accounting reconciliation.

All CSS and JavaScript references include a `?v=61b` cache-busting query. Files are designed for static hosting inside your existing `molak-al-mamsha-v4` directory.

Users can switch discountTiming between `upfront` and `deferred`: under the deferred hypothesis, 7%, 5%, or 3% is added back to the relevant financial target before USD estimation. This isolates accounting uncertainty; it does not establish the real credit posting.


## الإصدار v4.62 — عرض شهري وربع سنوي

- في **جدول السداد بالتفصيل** اختَر «ربع سنوي (رسمي)» أو «شهري (ميزانية تقديرية)».
- كل دفعة شهرية ظاهرية = ثلث **القسط الربع سنوي المحتسب** (أصل + فائدة + إضافة). التاريخ الشهري يمثل شهر تخصيص الادخار فقط؛ يظل السداد الفعلي لهيئة المجتمعات في تاريخ القسط الربع سنوي.
- عند تقلب سعر الدولار أو الفائدة في سنة الاستحقاق، تُحدّث القيم في الوضعين تلقائيًا؛ تعتمد معادلة الـUSD الشهرية على سعر **يوم الاستحقاق الرسمي المفترض** وليس سعر شهر الادخار.
- الجدول الشهري لا يمثل موافقة على تقسيط شهري، ولا يعيد احتساب الفائدة شهريًا، ولا يغيّر إجمالي السداد.
- تنزيل CSV يحترم وضع العرض الحالي.
- مثال GitHub Pages: افرد مجلد `molak-al-mamsha-v4` في جذر مستودع المدونة ثم `git add molak-al-mamsha-v4 && git commit -m "Add monthly budgeting view" && git push origin main`.
