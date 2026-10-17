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
  return {ALTERNATIVES, calculate, compare, exitEstimate, addMonths, safeDate, formatMoney, clamp, nonnegative};
});
