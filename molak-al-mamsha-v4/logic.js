/* ملاك الممشى – Pure calculation engine. All numbers are illustrative, not official statements. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MamshaLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ALTERNATIVES = [
    { id: 'a1', title: 'البديل الأول', discount: .07, booking: .50, delivery: .50, years: 0, official: true },
    { id: 'a2', title: 'البديل الثاني', discount: .05, booking: .50, delivery: 0, years: 1, official: true },
    { id: 'a3', title: 'البديل الثالث', discount: .03, booking: .30, delivery: 0, years: 3, official: true },
    { id: 'a4-5', title: 'الرابع · ٥ سنوات', discount: 0, booking: .15, delivery: .10, years: 5, official: true },
    { id: 'a4-7', title: 'الرابع · ٧ سنوات', discount: 0, booking: .15, delivery: .10, years: 7, official: true },
    { id: 'a4-10', title: 'الرابع · ١٠ سنوات', discount: 0, booking: .15, delivery: .10, years: 10, official: true },
    { id: 'a4-3', title: 'الرابع · ٣ سنوات (افتراضي)', discount: 0, booking: .15, delivery: .10, years: 3, official: false }
  ];
  function nonnegative(v) { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function isoDate(d) { return d.toISOString().slice(0, 10); }
  function safeDate(str, fallback = '2026-11-01') { const d = new Date((str || fallback) + 'T12:00:00Z'); return Number.isFinite(d.getTime()) ? d : new Date(fallback + 'T12:00:00Z'); }
  function addMonths(str, n) {
    const d = safeDate(str), originalDay = d.getUTCDate();
    d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+1, 0)).getUTCDate();
    d.setUTCDate(Math.min(originalDay, last)); return isoDate(d);
  }
  function dateDiff(a, b) { return Math.round((safeDate(a) - safeDate(b)) / 86400000); }
  function getYearValue(values, year, fallback) {
    if (values && Object.prototype.hasOwnProperty.call(values, String(year))) return nonnegative(values[String(year)]);
    return fallback;
  }
  function formatMoney(v, fraction = 0) { return new Intl.NumberFormat('ar-EG', { maximumFractionDigits:fraction, minimumFractionDigits:fraction }).format(v); }
  function paidPrincipal(p) { return nonnegative(p.paidUSD)*nonnegative(p.historicalFX) + nonnegative(p.paidEGP); }
  function calculate(p, alt) {
    const unit = nonnegative(p.price), fx0 = nonnegative(p.historicalFX) || 52;
    const delivered = p.deliveryDate || '2026-11-01';
    const gross = unit * (1 - alt.discount);
    const bookingGoal = gross * alt.booking;
    const deliveryGoal = gross * alt.delivery;
    const credit = Math.min(gross, paidPrincipal(p));
    const paidBooking = Math.min(credit, bookingGoal);
    const bookingPrincipal = Math.max(0, bookingGoal - paidBooking);
    const excessBooking = Math.max(0, credit - bookingGoal);
    const paidDelivery = Math.min(deliveryGoal, excessBooking);
    const deliveryPrincipal = Math.max(0, deliveryGoal - paidDelivery);
    const excessDelivery = Math.max(0, excessBooking - deliveryGoal);
    const principalFinanced = Math.max(0, gross - bookingGoal - deliveryGoal - excessDelivery);
    const admin = unit * .01, board = unit * .005, fees = admin + board;
    const feeDue = Math.max(0, fees - nonnegative(p.paidFeesEGP));
    const maintenance = unit * (p.unitType === 'residential' ? .10 : .12);
    const study = nonnegative(p.studyFeeUSD ?? 50)*fx0;
    const installments = [], n = alt.years * 4;
    let balance = principalFinanced;
    const equalPrincipal = n ? principalFinanced / n : 0;
    let totalInterest=0, totalSurcharge=0, totalInstallmentsEGP=0, totalInstallmentsUSD=0, maxQuarter=0;
    // 2.5 percentage points is assumed annualized on declining balance, NOT established by the booklet.
    const annualExtra = nonnegative(p.extraAnnualPercent ?? 2.5)/100;
    for (let i=0; i<n; i++) {
      const date = addMonths(delivered, (i+1)*3), year = Number(date.slice(0,4));
      const annualRate = getYearValue(p.rates, year, 20)/100;
      const fx = getYearValue(p.fx, year, 52) || 52;
      const principal = (i === n-1) ? balance : Math.min(balance, equalPrincipal);
      const interest = alt.id==='a2' ? 0 : balance * annualRate/4;
      const surcharge = alt.id==='a2' ? 0 : (p.extraMode === 'flat-principal' ? principalFinanced * annualExtra / n : balance * annualExtra / 4);
      const due = principal + interest + surcharge;
      const dollar = due/fx;
      const beginning = balance;
      balance = Math.max(0, balance-principal);
      totalInterest += interest; totalSurcharge += surcharge;
      totalInstallmentsEGP += due; totalInstallmentsUSD += dollar;
      maxQuarter = Math.max(maxQuarter, due);
      installments.push({ index:i+1, date, year, beginning, principal, rate:annualRate*100, surcharge, interest, due, fx, dollar, ending:balance });
    }
    const bookingDue = bookingPrincipal + feeDue;
    const handoverDue = deliveryPrincipal + maintenance;
    // Full Egyptian-pound economic cost, including principal paid historically + study fee, regardless of outstanding credit.
    const totalEGP = gross + fees + maintenance + study + totalInterest + totalSurcharge;
    const currentFx = getYearValue(p.fx, new Date().getFullYear(), 52) || 52;
    // Approx USD view. Historical USD already sent counts as cash paid in USD, not revalued at today's rate.
    const alreadyPaidUSD = nonnegative(p.paidUSD) + nonnegative(p.paidEGP)/fx0 + nonnegative(p.paidFeesEGP)/fx0;
    const deliveryFX = getYearValue(p.fx, Number(delivered.slice(0,4)), 52) || 52;
    const totalUSD = alreadyPaidUSD + bookingDue/currentFx + handoverDue/deliveryFX + totalInstallmentsUSD + nonnegative(p.studyFeeUSD ?? 50);
    return { ...alt, gross, discountEGP:unit*alt.discount, admin, board, fees, maintenance, study,
      paidPrincipal:credit, feeDue, bookingPrincipal, bookingDue, deliveryPrincipal, handoverDue,
      principalFinanced, totalInterest, totalSurcharge, totalInstallmentsEGP, totalInstallmentsUSD,
      maxQuarter, totalEGP, totalUSD, installments, outstandingEGP:Math.max(0, totalEGP - paidPrincipal(p)-nonnegative(p.paidFeesEGP)-study) };
  }
  function compare(p) {
    const results=ALTERNATIVES.map(a=>calculate(p,a));
    const official=results.filter(x=>x.official);
    const bookingLimit=nonnegative(p.budgetBooking), deliveryLimit=nonnegative(p.budgetDelivery), quarterLimit=nonnegative(p.budgetQuarter);
    for (const r of results) r.feasible=(!bookingLimit || r.bookingDue<=bookingLimit+0.01) && (!deliveryLimit || r.handoverDue<=deliveryLimit+0.01) && (!quarterLimit || r.maxQuarter<=quarterLimit+0.01);
    const feasible=official.filter(r=>r.feasible).sort((a,b)=>a.totalEGP-b.totalEGP);
    const cheapest=official.slice().sort((a,b)=>a.totalEGP-b.totalEGP)[0];
    const best=feasible[0] || null;
    const baseline=results.find(x=>x.id==='a4-10');
    return {results, best, cheapest, baseline, savingVsBaseline:best ? baseline.totalEGP-best.totalEGP : null};
  }
  function exitEstimate(p, mode, dateToday) {
    const unit = nonnegative(p.price), fxNow = nonnegative(p.spotFX) || 52;
    const paid = paidPrincipal(p), paidFees = nonnegative(p.paidFeesEGP);
    const minPenalty = 500*fxNow, legalPenalty = Math.max(unit*.015,minPenalty);
    const alreadyAccountedForFees = Math.min(paidFees,legalPenalty);
    const penaltyRemaining = Math.max(0, legalPenalty - alreadyAccountedForFees);
    const days = mode==='after' ? Math.max(0,dateDiff(dateToday,p.actualHandoverDate || dateToday)) : 0;
    const occupancy = mode==='after' ? unit*.07*days/365 : 0;
    const requestedFromPrincipal=penaltyRemaining+occupancy;
    const refundable = Math.max(0, paid-requestedFromPrincipal);
    const unfundedDeduction = Math.max(0, requestedFromPrincipal - paid);
    const noticeDeadline = p.noticeDate ? addMonths(p.noticeDate,1) : null;
    const daysUntilDeadline = noticeDeadline ? dateDiff(noticeDeadline,dateToday) : null;
    const study = nonnegative(p.studyFeeUSD??50)*nonnegative(p.historicalFX);
    return {mode, unit, fxNow, paid, paidFees, minPenalty, legalPenalty, alreadyAccountedForFees,
      penaltyRemaining, occupancy, days, refundable, unfundedDeduction, study,
      noticeDeadline, daysUntilDeadline,
      // This is NOT a statutory refund determination. Fees may be treated differently by NUCA.
      indicativeLost:legalPenalty+occupancy+study};
  }
  // Forward-looking cancellation scenarios. Not an authoritative refund determination.
  // Period is measured in FULL years from handover. It assumes all scheduled sums due
  // before exit have been paid on time; no late penalties, rent, or market appreciation.
  function exitProjection(p, mode, yearsRequested, altId, dateToday) {
    const years = Math.round(clamp(Number(yearsRequested)||0,0,10));
    const alt = ALTERNATIVES.find(a => a.id === altId) || ALTERNATIVES[3];
    const handoverDate = p.actualHandoverDate || p.deliveryDate || dateToday || '2026-11-01';
    const exitDate = mode === 'after' ? addMonths(handoverDate, years*12) : (dateToday || handoverDate);
    // Real future quarter due dates should be anchored to actual handover if supplied.
    const schedule = calculate({...p, deliveryDate:handoverDate}, alt);
    const installments = mode === 'after' ? schedule.installments.filter(inst => inst.date <= exitDate) : [];
    const paidInstallmentPrincipal = installments.reduce((a,b)=>a+b.principal,0);
    const paidInstallmentInterest = installments.reduce((a,b)=>a+b.interest,0);
    const paidInstallmentExtras = installments.reduce((a,b)=>a+b.surcharge,0);
    const paidInstallments = installments.reduce((a,b)=>a+b.due,0);
    const principalPaid = mode === 'after'
      ? schedule.paidPrincipal + schedule.bookingPrincipal + schedule.deliveryPrincipal + paidInstallmentPrincipal
      : schedule.paidPrincipal;
    const feesPaid = mode === 'after' ? schedule.fees : Math.min(schedule.fees,nonnegative(p.paidFeesEGP));
    const maintenancePaid = mode === 'after' ? schedule.maintenance : 0;
    const study = nonnegative(p.studyFeeUSD??50)*nonnegative(p.historicalFX);
    const cashPaid = principalPaid + feesPaid + maintenancePaid + study + paidInstallmentInterest + paidInstallmentExtras;
    const futureFx = mode === 'after'
      ? getYearValue(p.fx,Number(exitDate.slice(0,4)), nonnegative(p.spotFX)||52)
      : nonnegative(p.spotFX)||52;
    const penalty = Math.max(schedule.fees,500*futureFx);
    const occupancy = mode === 'after' ? nonnegative(p.price)*.07*years : 0;
    const penaltyUncredited = penalty + occupancy;
    // Actual authority accounting may or may not set already-paid administrative fees against cancellation deduction.
    const penaltyCredited = Math.max(0,penalty-feesPaid)+occupancy;
    const refundLow = Math.max(0,principalPaid-penaltyUncredited);
    const refundHigh = Math.max(0,principalPaid-penaltyCredited);
    const excessDeductions = Math.max(0,penaltyUncredited-principalPaid);
    const remainingPrincipal = Math.max(0, schedule.principalFinanced-paidInstallmentPrincipal);
    return {mode,years,altId:alt.id,altName:alt.title,handoverDate,exitDate,futureFx,
      installmentCount:installments.length,paidInstallmentPrincipal,paidInstallmentInterest,
      paidInstallmentExtras,paidInstallments,principalPaid,feesPaid,maintenancePaid,study,
      cashPaid,penalty,occupancy,penaltyUncredited,penaltyCredited,refundLow,refundHigh,
      remainingPrincipal,excessDeductions,lossLow:Math.max(0,cashPaid-refundHigh),
      lossHigh:Math.max(0,cashPaid-refundLow),noticeDeadline:p.noticeDate?addMonths(p.noticeDate,1):null};
  }
  // Reverse-ledger scenario for every recorded alternative. It is a model of EGP credit,
  // NOT proof of either the amount sent in USD or the exchange rate applied by NUCA.
  // The discount is assumed to reduce the pre-handover balance in full. Specific
  // allocations may differ in the authority's statement.
  const LEDGER_OBLIGATIONS = Object.freeze({
    1: {fraction:1.065, label:'100% الثمن + 12% صيانة + 1.5% رسوم − 7% خصم'},
    2: {fraction:.585, label:'50% مقدم + 12% صيانة + 1.5% رسوم − 5% خصم'},
    3: {fraction:.405, label:'30% مقدم + 12% صيانة + 1.5% رسوم − 3% خصم'},
    4: {fraction:.385, label:'15% مقدم + 10% استلام + 12% صيانة + 1.5% رسوم'}
  });
  function ledgerUsdScenarios(unit, params={}) {
    if (!unit || !Number.isFinite(unit.officialOutstandingEGP) || !LEDGER_OBLIGATIONS[Number(unit.alt)]) {
      return { available:false, code:unit?.code||'', reason:'لا يوجد رصيد وبديل مسجلان لهذه الوحدة' };
    }
    const ref=LEDGER_OBLIGATIONS[Number(unit.alt)];
    const bookedUSD=nonnegative(params.bookingUSD ?? 5000);
    const bookFX=nonnegative(params.bookingFX ?? 47.5019);
    const fxDec=nonnegative(params.fxDec ?? 47.4061);
    const fxLater=nonnegative(params.fxLater ?? 53.4134);
    const deferredDiscount = params.discountTiming==='deferred';
    const discountRate={1:.07,2:.05,3:.03,4:0}[Number(unit.alt)];
    const fraction=ref.fraction+(deferredDiscount?discountRate:0);
    const targetEGP=unit.price*fraction;
    const creditedEGP=targetEGP-unit.officialOutstandingEGP;
    const bookedEGP=bookedUSD*bookFX;
    const subsequentEGP=creditedEGP-bookedEGP;
    const valid=creditedEGP>=0 && subsequentEGP>=-0.01 && fxDec>0 && fxLater>0 && bookFX>0;
    return { available:valid, code:unit.code, alt:Number(unit.alt), fraction, description:ref.label+(deferredDiscount?' (خصم مؤجل افتراضيًا)':''),
      bookedUSD, bookFX, fxDec, fxLater, targetEGP, creditedEGP, bookedEGP, subsequentEGP,
      usdAtDec: valid ? bookedUSD+subsequentEGP/fxDec : null,
      usdAtLater: valid ? bookedUSD+subsequentEGP/fxLater : null,
      subsequentUSDDec:valid ? subsequentEGP/fxDec : null,
      subsequentUSDLater:valid ? subsequentEGP/fxLater : null,
      // This is a currency-scenario spread, not evidence of overpayment.
      scenarioSpreadUSD:valid ? subsequentEGP/fxDec-subsequentEGP/fxLater : null,
      reason:valid ? '' : 'المعادلة لا تسمح بالتقدير بالقيم الحالية؛ تحقق من الرصيد/سعر الصرف' };
  }
  // Audit crosswalk: a displayed outstanding balance is NOT itself evidence of how much USD was sent.
  // For D2/R3 alternatives 3 and 4 only, infer credited EGP using a *stated*, adjustable
  // financial-obligations hypothesis and the ledger balance. The 3% discount for
  // alternative 3 is subtracted in full from the initial gross-priced obligations.
  function paymentAudit(unit, referenceFx, override = null) {
    const hasLedger = Number.isFinite(unit?.officialOutstandingEGP);
    const alt = Number(unit?.alt);
    const obligationsFraction = LEDGER_OBLIGATIONS[alt]?.fraction ?? null;
    const rate = Math.max(.01, nonnegative(referenceFx) || 53.4134);
    const known = Array.isArray(unit?.payments) && unit.payments.length > 0;
    const paid = known ? unit.payments.reduce((s,p)=>s+nonnegative(p.postedUSD??p.usd),0) : 0;
    const sent = known ? unit.payments.reduce((s,p)=>s+nonnegative(p.usd),0)+nonnegative(unit.studyPaidUSD) : 0;
    const credit = known ? unit.payments.reduce((s,p)=>s+nonnegative(p.postedUSD??p.usd)*nonnegative(p.fx),0) : 0;
    const weightedFx = paid > 0 ? credit/paid : rate;
    const studyUSD = nonnegative(unit?.studyPaidUSD);
    const unpostedUSD = known ? Math.max(0,sent-studyUSD-paid) : 0;
    const userAmounts = override && override.hasAmounts === true;
    const appliedEGP = userAmounts
      ? nonnegative(override.principalUSD)*nonnegative(override.historicalFX)
        +nonnegative(override.paidEGP)+nonnegative(override.paidFeesEGP)
      : (known ? credit : null);
    const paidUSD = userAmounts ? nonnegative(override.principalUSD)
          + (nonnegative(override.paidFeesEGP)/Math.max(.01,nonnegative(override.historicalFX)))
          : (known ? paid : null);
    const appliedFx = userAmounts ? nonnegative(override.historicalFX) : weightedFx;
    const targetEGP = hasLedger && obligationsFraction !== null ? unit.price * obligationsFraction : null;
    const impliedCreditedEGP = targetEGP === null ? null : targetEGP - unit.officialOutstandingEGP;
    const impliedUSDAtReference = impliedCreditedEGP===null ? null : impliedCreditedEGP/rate;
    const differenceEGP = appliedEGP===null || impliedCreditedEGP===null ? null : appliedEGP-impliedCreditedEGP;
    const differenceUSD = differenceEGP===null ? null : differenceEGP/Math.max(.01,appliedFx);
    return {code:unit?.code||'',alt,hasLedger,obligationsFraction,referenceFx:rate,known,
      sentUSD:sent,postedUSD:paid,studyUSD,unpostedUSD,knownAppliedEGP:credit,weightedFx,
      appliedEGP,paidUSD,appliedFx,targetEGP,impliedCreditedEGP,impliedUSDAtReference,
      differenceEGP,differenceUSD,userAmounts};
  }
  return {ALTERNATIVES, calculate, compare, exitEstimate, exitProjection, paymentAudit, ledgerUsdScenarios, LEDGER_OBLIGATIONS, addMonths, safeDate, formatMoney, clamp, nonnegative};
});
