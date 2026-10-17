'use strict';
const assert=require('node:assert/strict');
const {monthlyBudget,calculate,ALTERNATIVES,addMonths}=require('./logic.js');
const pick=id=>ALTERNATIVES.find(a=>a.id===id);
const base={price:8439000,unitType:'commercial',deliveryDate:'2026-11-01',paidUSD:5000,historicalFX:47.5019,extraAnnualPercent:2.5,extraMode:'balance-annual',rates:{2027:20,2028:17,2029:14,2030:11,2031:9,2032:8,2033:7,2034:6,2035:5,2036:4,2037:3},fx:{2027:53,2028:55,2029:60,2030:63,2031:65,2032:68,2033:70,2034:75,2035:79,2036:82,2037:85}};
const sum=(rows,key)=>rows.reduce((s,a)=>s+a[key],0);
for(const years of [5,7,10]){
 const alt=pick('a4-'+years), q=calculate(base,alt), m=monthlyBudget(q.installments,base.deliveryDate);
 assert.equal(q.installments.length,years*4);
 assert.equal(m.length,years*12);
 assert.equal(m[0].date,addMonths(base.deliveryDate,1));
 assert.equal(m[2].date,q.installments[0].date);
 assert.equal(m.at(-1).date,q.installments.at(-1).date);
 for(const key of ['principal','interest','surcharge','due','dollar'])assert.ok(Math.abs(sum(q.installments,key)-sum(m,key))<0.005,key);
 assert.ok(Math.abs(sum(m,'officialDue')-sum(q.installments,'due'))<0.005);
 assert.ok(m.every((row,i)=>row.quarterDueDate===q.installments[Math.floor(i/3)].date));
 assert.ok(m.every((row,i)=>row.officialDue===(i%3===2?q.installments[Math.floor(i/3)].due:0)));
 assert.ok(m.every((row,i)=>row.fx===q.installments[Math.floor(i/3)].fx));
 const changes=calculate({...base,fx:Object.fromEntries(Object.keys(base.fx).map(y=>[y,Math.max(20,base.fx[y]-8)]))},alt);
 assert.ok(changes.totalInstallmentsUSD>q.totalInstallmentsUSD);
 assert.ok(Math.abs(changes.totalInstallmentsEGP-q.totalInstallmentsEGP)<.001);
 const cheapRate=calculate({...base,rates:Object.fromEntries(Object.keys(base.rates).map(y=>[y,5]))},alt);
 assert.ok(cheapRate.totalInterest<q.totalInterest);
 console.log(`${years} years: ${q.installments.length} official quarters, ${m.length} months, sums and FX/rate response OK`);
}
const blank=monthlyBudget([],base.deliveryDate);
assert.equal(blank.length,0);
console.log('Monthly budget unit tests passed');
