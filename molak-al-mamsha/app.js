(function(){
 'use strict';
 const L=window.MamshaLogic;
 const $=(id)=>document.getElementById(id);
 const num=(v)=>L.nonnegative(v), fmt=(v,dec=0)=>L.formatMoney(Number.isFinite(v)?v:0,dec);
 const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const MAIN_IDS=['price','unitType','deliveryDate','spotFX','paidUSD','historicalFX','paidEGP','paidFeesEGP','budgetBooking','budgetDelivery','budgetQuarter','extraAnnualPercent','extraMode','studyFeeUSD','noticeDate','actualHandoverDate'];
 const inputDefault = {price:9170000,unitType:'commercial',deliveryDate:'2026-11-01',spotFX:52,paidUSD:5000,historicalFX:50,paidEGP:0,paidFeesEGP:0,budgetBooking:0,budgetDelivery:0,budgetQuarter:0,extraAnnualPercent:2.5,extraMode:'balance-annual',studyFeeUSD:50,noticeDate:'',actualHandoverDate:''};
 let years={}, rates={}, fx={}, selected='a4-5', exitMode='wait';
 let lastComparison=null;
 const STORAGE_KEY='molak-al-mamsha-calculator-v2';
 function defaultAnnual(year){const k=Math.max(0,year-new Date().getFullYear());return {rate:Math.max(9, 20-2.0*k),fx:52};}
 function load(){try{const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(data&&typeof data==='object'){
  for(const key of MAIN_IDS)if(data.fields&&Object.prototype.hasOwnProperty.call(data.fields,key))$(key).value=data.fields[key];
  if(data.rates&&typeof data.rates==='object')rates=data.rates;if(data.fx&&typeof data.fx==='object')fx=data.fx;
  if(L.ALTERNATIVES.some(x=>x.id===data.selected))selected=data.selected;
  if(['wait','before','after'].includes(data.exitMode))exitMode=data.exitMode;
 }}catch(e){console.warn('Could not restore local preferences',e);}}
 function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({fields:Object.fromEntries(MAIN_IDS.map(k=>[k,$(k).value])),rates,fx,selected,exitMode}));}catch(e){}}
 function ensureYears(){const base=new Date().getFullYear(),delYear=Number(($('deliveryDate').value||'2026-11-01').slice(0,4));const start=Math.min(base,delYear),end=Math.max(base,delYear+11);years=Array.from({length:Math.min(19,end-start+1)},(_,i)=>start+i);
  for(const y of years){if(rates[y]===undefined)rates[y]=defaultAnnual(y).rate;if(fx[y]===undefined)fx[y]=defaultAnnual(y).fx;}}
 function annualEntry(y,prop,label,min,max,step){const wrap=document.createElement('div');wrap.className='year-entry '+(prop==='fx'?'fx':'');const range=document.createElement('input');range.type='range';range.min=min;range.max=max;range.step=step;range.value=prop==='fx'?fx[y]:rates[y];range.setAttribute('aria-label',label+' '+y);
  const value=document.createElement('input');value.type='number';value.min=min;value.max=max;value.step=step;value.value=range.value;value.setAttribute('aria-label',label+' '+y+' رقم');const unit=document.createElement('b');unit.textContent=prop==='fx'?'جنيه':'٪';
  const setter=(next)=>{const valid=Math.min(max,Math.max(min,Number(next)));if(!Number.isFinite(valid))return;
   if(prop==='fx')fx[y]=valid;else rates[y]=valid;range.value=String(valid);value.value=String(valid);calculateAll();};
  range.addEventListener('input',()=>setter(range.value));value.addEventListener('input',()=>{if(value.value!=='')setter(value.value)});value.addEventListener('change',()=>setter(value.value));
  wrap.append(range,value,unit);return wrap;
 }
 function buildYears(){ensureYears();$('yearRows').replaceChildren();const frag=document.createDocumentFragment();for(const y of years){const row=document.createElement('div');row.className='year-row';row.dataset.year=y;const year=document.createElement('div');year.className='year-id';year.textContent=y;
  row.append(year,annualEntry(y,'rate','متوسط الفائدة السنوية',0,40,.25),annualEntry(y,'fx','متوسط سعر الدولار',1,200,.5));frag.append(row);} $('yearRows').append(frag);}
 function renderAnnualValues(){for(const y of years){const row=$('yearRows').querySelector(`[data-year="${y}"]`);if(!row)continue;const fields=row.querySelectorAll('.year-entry');for(const [idx,val] of [[0,rates[y]],[1,fx[y]]]){fields[idx].querySelector('input[type=range]').value=val;fields[idx].querySelector('input[type=number]').value=val;}}}
 function val(){return {...Object.fromEntries(MAIN_IDS.map(k=>[k,($(k).type==='number'?num($(k).value):$(k).value)])),rates,fx};}
 function columnNumber(v){return `<span dir="ltr">${fmt(v)}</span>`;}
 function renderRecommendation(c){const r=c.best;if(!r){$('bestTitle').textContent='لا يوجد بديل ضمن الحدود';$('bestReason').textContent='ارفع الميزانية المحددة للحجز أو الاستلام أو القسط، أو غيّر السيناريو السنوي.';$('bestSaving').textContent='';}
 else {$('bestTitle').textContent=r.title;$('bestReason').textContent=`أقل تكلفة إجمالية من البدائل الرسمية التي تناسب حدودك. المطلوب الآن ${fmt(r.bookingDue)} ج.م، وأكبر قسط ${fmt(r.maxQuarter)} ج.م.`;$('bestSaving').textContent=`توفير ${fmt(Math.max(0,c.savingVsBaseline))} جنيه مقارنة بالرابع ١٠ سنوات`;} }
 function renderCompare(c){const b=$('compareBody');b.innerHTML='';const baseline=c.baseline;for(const r of c.results){const tr=document.createElement('tr');tr.className=(c.best?.id===r.id?'best-row ':'')+(!r.feasible?'infeasible-row ':'')+(!r.official?'hypothetical-row':'');
  const status=!r.official?'<span class="status-label sim">غير رسمي</span>':(!r.feasible?'<span class="status-label bad">فوق الميزانية</span>':c.best?.id===r.id?'<span class="status-label">الأنسب</span>':'');
  tr.innerHTML=`<td><b>${r.title}</b>${status}</td><td>${fmt(r.discount*100)}٪</td><td>${columnNumber(r.bookingDue)}</td><td>${columnNumber(r.handoverDue)}</td><td>${columnNumber(r.maxQuarter)}</td><td>${columnNumber(r.totalInterest+r.totalSurcharge)}</td><td class="strong">${columnNumber(r.totalEGP)}</td><td>${columnNumber(baseline.totalEGP-r.totalEGP)}</td>`;
  b.append(tr);
 }
 const cheapest=c.cheapest||c.results[0];$('cheapestName').textContent=cheapest.title;$('cheapestTotal').textContent=fmt(cheapest.totalEGP)+' جنيه';
 $('savingsEGP').textContent=c.best?fmt(c.savingVsBaseline):'لا يوجد بديل';$('discountEGP').textContent=c.best?fmt(c.best.discountEGP):'—';$('totalUSD').textContent=c.best?fmt(c.best.totalUSD):'—';
 const max=Math.max(...c.results.filter(r=>r.official).map(r=>r.totalEGP),1), chart=$('costChart');chart.replaceChildren();const heading=document.createElement('div');heading.className='chart-title';heading.textContent='إجمالي التكلفة بالجنيه – كلما كان العمود أقصر كانت التكلفة أقل';chart.append(heading);
 for(const r of c.results.filter(x=>x.official)){const row=document.createElement('div');row.className='chart-row';const lbl=document.createElement('div');lbl.className='chart-label';lbl.textContent=r.title;const track=document.createElement('div');track.className='chart-track';const bar=document.createElement('div');bar.className='chart-fill'+(c.best?.id===r.id?' best':'');bar.style.width=(r.totalEGP/max*100).toFixed(2)+'%';track.append(bar);const price=document.createElement('div');price.className='chart-value';price.textContent=fmt(r.totalEGP);row.append(lbl,track,price);chart.append(row);}
 }
 function renderSchedule(c){const a=c.results.find(r=>r.id===selected)||c.results[0];const sm=$('scheduleSummary');sm.innerHTML='';
 const chips=[['إجمالي أصل الدين المقسط',a.principalFinanced],['مجموع فوائد البنك المركزي',a.totalInterest],['إضافة ٢٫٥٪ المقدرة',a.totalSurcharge],['المطلوب عند الاستلام + الصيانة',a.handoverDue]];
 for(const [label,value] of chips){const el=document.createElement('div');el.className='mini-metric';el.innerHTML=`<label>${label}</label><b>${fmt(value)} جنيه</b>`;sm.append(el);}
 const tbody=$('scheduleBody');tbody.innerHTML='';const ft=$('scheduleFoot');ft.innerHTML='';const annual={};
 if(!a.installments.length){tbody.innerHTML='<tr><td colspan="11" class="table-placeholder">البديل الأول بدون أقساط: ٥٠٪ عند الحجز و٥٠٪ عند الاستلام بعد الخصم.</td></tr>';}else{
 for(const p of a.installments){const tr=document.createElement('tr');tr.innerHTML=`<td>${p.index}</td><td dir="ltr">${p.date}</td><td>${columnNumber(p.beginning)}</td><td>${fmt(p.rate,2)}٪</td><td>${columnNumber(p.principal)}</td><td>${columnNumber(p.interest)}</td><td>${columnNumber(p.surcharge)}</td><td class="strong">${columnNumber(p.due)}</td><td>${fmt(p.fx,2)}</td><td>${fmt(p.dollar,2)}</td><td>${columnNumber(p.ending)}</td>`;tbody.append(tr);
 const k=annual[p.year]??={count:0,principal:0,interest:0,surcharge:0,due:0,dollar:0};k.count++;k.principal+=p.principal;k.interest+=p.interest;k.surcharge+=p.surcharge;k.due+=p.due;k.dollar+=p.dollar;
 }
 ft.innerHTML=`<tr><td colspan="4">إجمالي الأقساط</td><td>${columnNumber(a.principalFinanced)}</td><td>${columnNumber(a.totalInterest)}</td><td>${columnNumber(a.totalSurcharge)}</td><td>${columnNumber(a.totalInstallmentsEGP)}</td><td>—</td><td>${fmt(a.totalInstallmentsUSD,2)}</td><td>٠</td></tr>`;}
 const annualBody=$('annualBody');annualBody.innerHTML='';for(const [year,r] of Object.entries(annual)){const tr=document.createElement('tr');tr.innerHTML=`<td>${year}</td><td>${r.count}</td><td>${columnNumber(r.principal)}</td><td>${columnNumber(r.interest)}</td><td>${columnNumber(r.surcharge)}</td><td class="strong">${columnNumber(r.due)}</td><td>${fmt(r.dollar,2)}</td>`;annualBody.append(tr);}if(!a.installments.length)annualBody.innerHTML='<tr><td colspan="7" class="table-placeholder">لا يوجد أقساط.</td></tr>';
 }
 function stat(label,value,cls=''){return `<div class="exit-stat"><span>${label}</span><b class="${cls}">${value}</b></div>`;}
 function renderExit(p){const o=L.exitEstimate(p,exitMode,today());$('handoverDateField').hidden=exitMode!=='after';const out=$('exitOutput');
 if(exitMode==='wait'){
  const deadline=o.noticeDeadline?(o.daysUntilDeadline>=0?`متبقٍ تقريبًا ${fmt(o.daysUntilDeadline)} يوم حتى ${o.noticeDeadline}`:`مرّ ${fmt(-o.daysUntilDeadline)} يوم على ${o.noticeDeadline}`):'لم يُدخل تاريخ الإخطار';
  out.innerHTML=`<div class="exit-results-list">${stat('خصم فوري محدد لمجرد عدم الاستلام','غير مقرر رقميًا')}${stat('المبالغ المستحقة عند الاستلام','لا تسقط')}${stat('مهلة شهر من الإخطار',deadline)}${stat('خصم عند إلغاء لاحق قبل الاستلام',fmt(o.legalPenalty)+' جنيه','negative')}</div><p class="exit-explain"><b>الكراسة:</b> يلتزم المشتري باستلام الوحدة خلال شهر من الإخطار، وبسداد المستحقات المالية عند الاستلام حتى لو لم يحضر. وتذكر أن عدم التعاقد والاستلام في الموعد سبب ممكن لإلغاء التخصيص. <b>الامتناع اليوم لا يساوي تقديم طلب إلغاء</b>، ولا يعني أن الخصم يُنفذ آليًا الآن.</p>`;
 } else {
  out.innerHTML=`<div class="exit-results-list">${stat('الخصم الأساسي ١٫٥٪ (أو ٥٠٠ دولار حدًا أدنى)',fmt(o.legalPenalty)+' جنيه','negative')}${stat('الرسوم الإدارية المسددة بالفعل – لعرض احتمال التسوية',fmt(o.alreadyAccountedForFees)+' جنيه')}${stat('مقابل إشغال ٧٪ سنويًا',fmt(o.occupancy)+' جنيه','negative')}${stat('رد تقديري من دفعات الثمن',fmt(o.refundable)+' جنيه','positive')}</div><p class="exit-explain">رصيد المدفوعات من ثمن الوحدة: <b>${fmt(o.paid)} جنيه</b>. المتبقي من الخصم بعد احتساب احتمال تسوية الرسوم الإدارية المدفوعة: <b>${fmt(o.penaltyRemaining)} جنيه</b>. مصاريف الدراسة غير المستردة (إن دُفعت): <b>${fmt(o.study)} جنيه</b>.${exitMode==='after'?` فترة الإشغال المحتسبة: <b>${fmt(o.days)} يومًا</b>. ${!p.actualHandoverDate?"<b>أدخل تاريخ الاستلام الفعلي حتى لا يظهر مقابل الإشغال صفرًا مؤقتًا.</b>":""}`:''} ${o.unfundedDeduction>0?`المبلغ المحتمل غير المغطى من دفعات الثمن: <b>${fmt(o.unfundedDeduction)} جنيه</b>.`:''}</p><p class="exit-explain">هذه <b>محاكاة فقط</b> على أساس أن ما سبق دفعه من الرسوم الإدارية يُسوَّى ضمن خصم الـ١٫٥٪، وهو أمر يحتاج تأكيدًا رسميًا؛ وقد تختلف قيمة الرد الفعلية أو المعالجة المحاسبية من الجهاز. الحد الأدنى ٥٠٠ دولار محسوب بسعر الصرف الفوري الذي أدخلته، وليس سعرًا معتمدًا من الجهة.</p>`;
 }
 }
 function calculateAll(){const p=val();lastComparison=L.compare(p);renderRecommendation(lastComparison);renderCompare(lastComparison);renderSchedule(lastComparison);renderExit(p);persist();}
 function csvCell(v){const s=String(v??'');return '"'+s.replaceAll('"','""')+'"';}
 function csvDownload(rows,file){const csv='\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=file;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
 function exportCompare(){if(!lastComparison)return;const headers=['البديل','رسمي','الخصم %','الآن جنيه','الاستلام جنيه','أكبر قسط جنيه','فائدة جنيه','إضافات جنيه','إجمالي جنيه','توفير مقابل الرابع ١٠ سنوات'];csvDownload([headers,...lastComparison.results.map(r=>[r.title,r.official?'نعم':'لا',r.discount*100,r.bookingDue,r.handoverDue,r.maxQuarter,r.totalInterest,r.totalSurcharge,r.totalEGP,lastComparison.baseline.totalEGP-r.totalEGP])],'molak-al-mamsha-comparison.csv');}
 function exportSchedule(){if(!lastComparison)return;const a=lastComparison.results.find(r=>r.id===selected);csvDownload([['القسط','التاريخ','السنة','المديونية','سعر الفائدة %','الأصل','الفائدة','إضافة ٢٫٥٪','إجمالي جنيه','سعر الدولار','إجمالي دولار','المتبقي'],...a.installments.map(r=>[r.index,r.date,r.year,r.beginning,r.rate,r.principal,r.interest,r.surcharge,r.due,r.fx,r.dollar,r.ending])],'molak-al-mamsha-'+selected+'-schedule.csv');}
 function attach(){for(const k of MAIN_IDS){$(k).addEventListener('input',()=>{if(k==='deliveryDate'){buildYears();}calculateAll();});$(k).addEventListener('change',()=>{if(k==='deliveryDate')buildYears();calculateAll();});}
 for(const radio of document.querySelectorAll('[name="exitMode"]'))radio.addEventListener('change',()=>{exitMode=radio.value;calculateAll();});
 $('selectAlt').addEventListener('change',()=>{selected=$('selectAlt').value;calculateAll();});
 $('fallPreset').addEventListener('click',()=>{years.forEach((y,i)=>rates[y]=Math.max(5,20-2*i));renderAnnualValues();calculateAll();});
 $('flatPreset').addEventListener('click',()=>{years.forEach(y=>rates[y]=20);renderAnnualValues();calculateAll();});
 $('risePreset').addEventListener('click',()=>{years.forEach((y,i)=>rates[y]=Math.min(40,20+2*i));renderAnnualValues();calculateAll();});
 $('fxLowPreset').addEventListener('click',()=>{years.forEach((y,i)=>fx[y]=Math.max(15,52-2*i));renderAnnualValues();calculateAll();});
 $('fxFlatPreset').addEventListener('click',()=>{years.forEach(y=>fx[y]=52);renderAnnualValues();calculateAll();});
 $('fxHighPreset').addEventListener('click',()=>{years.forEach((y,i)=>fx[y]=52+3*i);renderAnnualValues();calculateAll();});
 $('resetButton').addEventListener('click',()=>{if(!window.confirm('هل تريد إعادة كل المدخلات والسيناريوهات إلى القيم الافتراضية؟'))return;localStorage.removeItem(STORAGE_KEY);for(const [k,v] of Object.entries(inputDefault))$(k).value=v;rates={};fx={};selected='a4-5';exitMode='wait';document.querySelector('input[name="exitMode"][value="wait"]').checked=true;$('selectAlt').value=selected;buildYears();calculateAll();});
 $('themeButton').addEventListener('click',()=>{document.body.classList.toggle('dark');try{localStorage.setItem(STORAGE_KEY+'-dark',document.body.classList.contains('dark')?'1':'0');}catch(e){}});
 $('exportCompare').addEventListener('click',exportCompare);$('exportSchedule').addEventListener('click',exportSchedule);$('printButton').addEventListener('click',()=>window.print());
 }
 function init(){load();for(const a of L.ALTERNATIVES){const option=document.createElement('option');option.value=a.id;option.textContent=a.title;$('selectAlt').append(option);}$('selectAlt').value=selected;document.querySelector(`input[name="exitMode"][value="${exitMode}"]`).checked=true;
  try{document.body.classList.toggle('dark',localStorage.getItem(STORAGE_KEY+'-dark')==='1');}catch(e){}
  buildYears();attach();calculateAll();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
