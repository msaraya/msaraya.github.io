(function(){
 'use strict';
 const L=window.MamshaLogic;
 const $=(id)=>document.getElementById(id);
 const num=(v)=>L.nonnegative(v), fmt=(v,dec=0)=>L.formatMoney(Number.isFinite(v)?v:0,dec);
 const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const MAIN_IDS=['price','unitType','deliveryDate','spotFX','paidUSD','historicalFX','paidEGP','paidFeesEGP','budgetBooking','budgetDelivery','budgetQuarter','extraAnnualPercent','extraMode','studyFeeUSD','noticeDate','actualHandoverDate','unitCode','exitYears','paymentReferenceFX'];
 const inputDefault = {price:8439000,unitType:'commercial',deliveryDate:'2026-11-01',spotFX:52,paidUSD:0,historicalFX:53.4134,paidEGP:0,paidFeesEGP:0,budgetBooking:0,budgetDelivery:0,budgetQuarter:0,extraAnnualPercent:2.5,extraMode:'balance-annual',studyFeeUSD:50,noticeDate:'',actualHandoverDate:'',unitCode:'',exitYears:'1'};
 let years={}, rates={}, fx={}, selected='a4-5', exitMode='after';
 let lastComparison=null;
 const STORAGE_KEY='molak-al-mamsha-calculator-v4';
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
 const UNITS=Array.isArray(window.MamshaUnits)?window.MamshaUnits:[];
 const UNIT_BY_CODE=Object.fromEntries(UNITS.map(u=>[u.code,u]));
 function populateUnits(){const select=$('unitCode');const byBuilding={};
  for(const u of UNITS)(byBuilding[u.building]??=[]).push(u);
  for(const building of Object.keys(byBuilding).sort((a,b)=>Number(a)-Number(b))){
   const group=document.createElement('optgroup');group.label='العمارة '+building;
   for(const u of byBuilding[building].sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true}))){
    const option=document.createElement('option');option.value=u.code;
    option.textContent=`${u.code} | ${u.type} | ${fmt(u.area)} م² | ${fmt(u.price)} جنيه`;
    group.append(option);
   }select.append(group);
  }
 }
 function renderUnitsList(){
  const q=($('unitSearch').value||'').trim().toUpperCase();const building=$('buildingFilter').value,kind=$('typeFilter').value;
  const filtered=UNITS.filter(u=>(!q||u.code.toUpperCase().includes(q))&&(!building||u.building===building)&&(!kind||u.type===kind));
  $('unitCount').textContent=`${fmt(filtered.length)} وحدة ظاهرة من أصل ${fmt(UNITS.length)} وحدة`;
  const frag=document.createDocumentFragment();
  for(const u of filtered){const tr=document.createElement('tr');tr.innerHTML=`<td dir="ltr"><b>${u.code}</b></td><td>${u.type}</td><td>${fmt(u.area)}</td><td>${fmt(u.price)}</td><td>${u.alt?'البديل '+fmt(u.alt):'غير معروف'}</td><td>${Number.isFinite(u.officialOutstandingEGP)?fmt(u.officialOutstandingEGP,2):'غير متاح'}</td><td><button class="soft small open-unit" data-code="${u.code}" type="button">اختيار</button></td>`;frag.append(tr);}
  $('unitsBody').replaceChildren(frag);
 }
 function renderPayments(p){
   const u=UNIT_BY_CODE[$('unitCode').value], s=$('paymentSummary'),m=$('paymentMetrics'),lines=$('paymentLines'),v=$('paymentVerdict');
   if(!u){s.innerHTML='<p class="muted-note">اختار رقم وحدة من الجدول أو القائمة لعرض الرصيد المعروف ومطابقة التحويلات.</p>';m.replaceChildren();lines.replaceChildren();v.textContent='بدون كود الوحدة لا توجد مديونية مسجلة للمقارنة.';return;}
   const fxRef=num($('paymentReferenceFX').value)||53.4134;
   const manualHasAmounts=num(p.paidUSD)>0||num(p.paidEGP)>0||num(p.paidFeesEGP)>0;
   const a=L.paymentAudit(u,fxRef,{hasAmounts:manualHasAmounts,principalUSD:p.paidUSD,historicalFX:p.historicalFX,paidEGP:p.paidEGP,paidFeesEGP:p.paidFeesEGP});
   s.innerHTML=`<h3>${u.code} · ${u.type} · ${fmt(u.area)} م²</h3><p class="muted-note">السعر: <b>${fmt(u.price)}</b> جنيه · البديل المسجل: <b>${u.alt||'غير متاح'}</b> · رصيد كشف المديونيات: <b>${Number.isFinite(u.officialOutstandingEGP)?fmt(u.officialOutstandingEGP,2)+' جنيه':'غير متاح'}</b>. الرصيد ليس مُحدَّثًا تلقائيًا.</p>`;
   const metrics=[['الالتزامات المعيارية بالفرضية',a.targetEGP===null?'غير محسوبة':fmt(a.targetEGP)+' ج.م'],['المقيد تقديريًا بحسب كشف الرصيد',a.impliedCreditedEGP===null?'لا توجد معادلة معتمدة':fmt(a.impliedCreditedEGP,2)+' ج.م'],['دولارات مستنتجة عند السعر المرجعي',a.impliedUSDAtReference===null?'غير متاح':fmt(a.impliedUSDAtReference,2)+' $'],['إجمالي الدولار المُبلّغ بتحويله',a.known?fmt(a.sentUSD,2)+' $':manualHasAmounts?fmt(num(p.paidUSD))+' $ (مدخل يدوي)':'غير موثق']];
   m.innerHTML=metrics.map(([k,val])=>`<div class="mini-metric"><label>${k}</label><b>${val}</b></div>`).join('');
   if(a.known){
     const sentLines=u.payments.map(x=>`<tr><td>${x.date||'تاريخ غير مثبت'}</td><td>${fmt(x.usd,2)} $</td><td>${fmt(x.fx,4)}</td><td>${fmt(x.usd*x.fx,2)} ج.م</td><td>${x.source||'إفادة'}</td></tr>`).join('');
     const portal=u.paymentBreakdown?`<p class="fine">قيد المنصة بالدفعة الثانية: أصل وحدة <b>${fmt(u.paymentBreakdown.otherPrincipalUSD,2)} $</b> ورسوم <b>${fmt(u.paymentBreakdown.feesUSD,2)} $</b>. الفرق بين المحوّل والمسجل: <b>${fmt(a.unpostedUSD,2)} $</b>، لا يُعتبر تلقائيًا دفعة زائدة.</p>`:'';
     lines.innerHTML=`<div class="payment-lines-title">تحويلات معلومة بإفادة/مستندات (ليست لكل الوحدات)</div><div class="table-wrap"><table><thead><tr><th>التاريخ</th><th>الدولار المحول لتغطية الثمن</th><th>سعر الصرف المرجعي</th><th>المعادل</th><th>درجة الإثبات</th></tr></thead><tbody>${sentLines}</tbody></table></div><p class="fine">${u.paymentStatus||''}${a.studyUSD?' · يوجد '+fmt(a.studyUSD)+' دولار دراسة بالإضافة إلى مبالغ الثمن الواردة بالجدول.':''}</p>${portal}`;
   } else {
     lines.innerHTML='<p class="muted-note">لا توجد بيانات تحويلات مثبتة لهذه الوحدة في الملفات المتاحة. قيمة الدولار «المستنتجة» ناتجة عن معادلة الرصيد فقط، وليست إيصال سداد أو سعر صرف خاص بهذه الوحدة. لو صاحب الوحدة لديه تحويلات فعلية، يدخلها في خانات المدفوعات بالأعلى.</p>';
   }
   if(a.differenceEGP===null){
     v.innerHTML='<b>نتيجة المقارنة:</b> لا يمكن إثبات وجود دولار زائد أو ناقص: لا توجد تحويلات معلومة لهذه الوحدة، أو لا تتوفر معادلة رصيد صالحة لهذا البديل. اكتب المدفوع الحقيقي وأسعار الصرف أولًا.';
   }else{
     const delta=Math.abs(a.differenceEGP),usd=Math.abs(a.differenceUSD);
     const near=delta<=Math.max(100,u.price*.00005);
     const direction=near?'فرق محدود جدًا':a.differenceEGP>0?'مدفوع محسوب أعلى من الرصيد المفسَّر':'الرصيد المفسَّر يشير إلى قيد أكبر من التحويلات المدخلة';
     v.innerHTML=`<b>نتيجة المقارنة: ${direction}.</b> الفرق في المعادل بالجنيه <b>${fmt(delta,2)} ج.م</b> ≈ <b>${fmt(usd,2)} دولار</b> بسعر ${fmt(a.appliedFx,4)}. ${near?'الفرق ضمن هامش تقريبي صغير؛ لا يعني سدادًا زائدًا.':'الفرق قد ينتج من يوم تقييم مختلف أو رسوم أو دفعات أخرى أو طريقة احتساب الخصم.'} <b>لا يصح اعتباره دولارًا زائدًا مثبتًا أو استحقاق رد إلا بعد مطابقة كشف الهيئة وإيصالات التحويل وسعر الصرف المعتمد لكل دفعة.</b>`;
   }
 }
 function renderUnitSummary(){const u=UNIT_BY_CODE[$('unitCode').value], el=$('unitSelected');
  if(!u){el.textContent=`توجد ${UNITS.length} وحدة من كشف الأسعار. اختار الكود ليظهر السعر والمساحة والبديل المسجل فورًا. ويمكنك إدخال السعر يدويًا.`;return;}
  const rateLabel=u.alt?'البديل المسجل في كشف المديونيات: '+u.alt:'بديل السداد غير موجود في الكشف المتاح';
  const priceMatch=Math.abs(num($('price').value)-Number(u.price))<1;
  el.textContent=`${u.code} · عمارة ${u.building} · ${u.unitLabel} · ${u.type} · ${u.floor} · ${fmt(u.area)} م² · سعر الكشف ${fmt(u.price)} جنيه · ${rateLabel}. ${priceMatch?'':'⚠ السعر المدخل يدويًا يختلف عن سعر الكشف.'}`;
 }
 function selectUnit(code,resetPayments){const u=UNIT_BY_CODE[code];if(!u){renderUnitSummary();calculateAll();return;}
  $('price').value=u.price;$('unitType').value='commercial';
  if(resetPayments){
    const payments=u.payments||[];
    if(u.paymentBreakdown){const alloc=u.paymentBreakdown;
      const principal=alloc.bookingPrincipalUSD+alloc.otherPrincipalUSD;
      $('paidUSD').value=principal;
      $('historicalFX').value=((alloc.bookingPrincipalUSD*payments[0].fx+alloc.otherPrincipalUSD*payments[1].fx)/principal).toFixed(6);
      $('paidFeesEGP').value=(alloc.feesUSD*payments[1].fx).toFixed(2);
    }else if(payments.length){const applied=payments.reduce((t,v)=>t+(v.postedUSD??v.usd),0);
      $('paidUSD').value=applied;$('historicalFX').value=(payments.reduce((t,v)=>t+(v.postedUSD??v.usd)*v.fx,0)/applied).toFixed(6);
      $('paidFeesEGP').value=0;
    }else{$('paidUSD').value=0;$('historicalFX').value=53.4134;$('paidFeesEGP').value=0;}
    $('paidEGP').value=0;
  }
  if(u.alt){selected=u.alt===4?'a4-5':'a'+u.alt;$('selectAlt').value=selected;}
  renderUnitSummary();calculateAll();
 }
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
 function renderExit(p){
  const exitYears=Math.min(10,Math.max(0,Math.round(Number($('exitYears').value)||0)));
  const o=L.exitProjection(p,exitMode,exitYears,selected,today());
  $('exitYearBlock').hidden=exitMode!=='after';
  $('handoverDateField').hidden=exitMode!=='after';
  $('exitYearsText').textContent=exitYears===0?'فور الاستلام':exitYears===1?'سنة واحدة':exitYears===2?'سنتين':`${fmt(exitYears)} سنوات`;
  for(const b of document.querySelectorAll('[data-exit-years]')) b.classList.toggle('active',Number(b.dataset.exitYears)===exitYears);
  const out=$('exitOutput');
  if(exitMode==='wait'){
    const deadline=o.noticeDeadline?`الموعد التقديري بعد شهر: ${o.noticeDeadline}`:'أدخل تاريخ الإخطار لعرض المهلة التقريبية';
    out.innerHTML=`<div class="exit-results-list">
      ${stat('خصم فوري محدد لمجرد عدم الاستلام','غير محدد بالكراسة')}
      ${stat('الخصم الأساسي المحتمل عند إلغاء لاحق',fmt(o.penalty)+' جنيه','negative')}
      ${stat('مبالغ الثمن المسددة الآن',fmt(o.principalPaid)+' جنيه')}
      ${stat('مهلة الاستلام',deadline)}</div>
      <div class="exit-alert"><b>تنبيه:</b> التأجيل ليس إلغاءً ولا يوقف استحقاق الدفعات أو يضمن استمرار تخصيص الوحدة. لا توجد معادلة استرداد تلقائي لمجرد عدم استلام المفاتيح اليوم. يُنصح باعتراض موثق وطلب موقف مالي رسمي قبل التصرف.</div>`;
  }else if(exitMode==='before'){
    out.innerHTML=`<div class="exit-results-list">
      ${stat('المدفوع من ثمن الوحدة',fmt(o.principalPaid)+' جنيه')}
      ${stat('خصم ١٫٥٪ أو ٥٠٠ دولار كحد أدنى',fmt(o.penalty)+' جنيه','negative')}
      ${stat('استرداد تحفظي محتمل',fmt(o.refundLow)+' جنيه','positive')}
      ${stat('استرداد مع احتساب رسوم سبق دفعها',fmt(o.refundHigh)+' جنيه','positive')}
      </div><p class="exit-explain">مصاريف الدراسة التقديرية غير المستردة: <b>${fmt(o.study)} جنيه</b>. خصم الـ١٫٥٪ محسوب من السعر قبل الخصم، وحد ٥٠٠ دولار بسعر الصرف المدخل. الاسترداد هنا نطاق توضيحي يختلف حسب تسوية رسوم سُددت مسبقًا، ولا يمثل قيمة معتمدة أو موعدًا للرد.</p>`;
  }else{
    out.innerHTML=`<div class="exit-results-list">
      ${stat('تاريخ الخروج الافتراضي',o.exitDate)}
      ${stat('أقساط يفترض سدادها حتى الخروج',fmt(o.installmentCount)+' قسط')}
      ${stat('أصل الثمن المسدد حتى الخروج',fmt(o.principalPaid)+' جنيه')}
      ${stat('فوائد وإضافات تم دفعها',fmt(o.paidInstallmentInterest+o.paidInstallmentExtras)+' جنيه','negative')}
      ${stat('خصم الإلغاء الأساسي',fmt(o.penalty)+' جنيه','negative')}
      ${stat('مقابل إشغال ٧٪ سنويًا × '+fmt(exitYears)+' سنوات',fmt(o.occupancy)+' جنيه','negative')}
      ${stat('تقدير استرداد تحفظي',fmt(o.refundLow)+' جنيه','positive')}
      ${stat('أقصى استرداد بالمقاصة المحتملة',fmt(o.refundHigh)+' جنيه','positive')}
      ${stat('إجمالي أموال يفترض دفعها حتى الخروج',fmt(o.cashPaid)+' جنيه')}
      ${stat('العبء غير المسترد تقديريًا',fmt(o.lossHigh)+' جنيه','negative')}
      ${stat('متبقي أصل الأقساط وقت الخروج',fmt(o.remainingPrincipal)+' جنيه')}
      ${stat('وديعة الصيانة ضمن النقد المدفوع',fmt(o.maintenancePaid)+' جنيه')}</div>
      <p class="exit-explain">الحساب مبني على <b>${o.altName}</b> وأن كل الأقساط التي يحين موعدها خلال المدة دُفعت بالكامل، مع افتراض عدم وجود أقساط متأخرة. بداية السنوات: <b>${o.handoverDate}</b>. سيناريو الاسترداد الأقل يخصم كامل ١٫٥٪ ومقابل الإشغال من أصل الثمن المسدد؛ السيناريو الأعلى يفترض إمكانية مقاصة الرسوم الإدارية المسددة. كلاهما <b>غير معتمدين رسميًا</b>.</p>
      <div class="exit-alert">⚠ «العبء غير المسترد» يضم فوائد ورسومًا ومصاريف دراسة ووديعة صيانة مدفوعة يفترض عدم ردها في الحساب المحافظ؛ <b>مصير وديعة الصيانة وتصفية التمويل المتبقي والغرامات غير محسوم</b> ويحتاج كشف تسوية من الجهاز. مقابل الإشغال ٧٪ من إجمالي قيمة الوحدة عن كل سنة وفق الكراسة، وليس فائدة بنكية.</div>`;
  }
 }
 function calculateAll(){const p=val();lastComparison=L.compare(p);renderRecommendation(lastComparison);renderCompare(lastComparison);renderSchedule(lastComparison);renderExit(p);renderUnitSummary();renderPayments(p);persist();}
 function csvCell(v){const s=String(v??'');return '"'+s.replaceAll('"','""')+'"';}
 function csvDownload(rows,file){const csv='\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=file;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
 function exportCompare(){if(!lastComparison)return;const headers=['البديل','رسمي','الخصم %','الآن جنيه','الاستلام جنيه','أكبر قسط جنيه','فائدة جنيه','إضافات جنيه','إجمالي جنيه','توفير مقابل الرابع ١٠ سنوات'];csvDownload([headers,...lastComparison.results.map(r=>[r.title,r.official?'نعم':'لا',r.discount*100,r.bookingDue,r.handoverDue,r.maxQuarter,r.totalInterest,r.totalSurcharge,r.totalEGP,lastComparison.baseline.totalEGP-r.totalEGP])],'molak-al-mamsha-comparison.csv');}
 function exportSchedule(){if(!lastComparison)return;const a=lastComparison.results.find(r=>r.id===selected);csvDownload([['القسط','التاريخ','السنة','المديونية','سعر الفائدة %','الأصل','الفائدة','إضافة ٢٫٥٪','إجمالي جنيه','سعر الدولار','إجمالي دولار','المتبقي'],...a.installments.map(r=>[r.index,r.date,r.year,r.beginning,r.rate,r.principal,r.interest,r.surcharge,r.due,r.fx,r.dollar,r.ending])],'molak-al-mamsha-'+selected+'-schedule.csv');}
 function attach(){for(const k of MAIN_IDS.filter(k=>k!=='unitCode')){$(k).addEventListener('input',()=>{if(k==='deliveryDate'){buildYears();}calculateAll();});$(k).addEventListener('change',()=>{if(k==='deliveryDate')buildYears();calculateAll();});}
 $('unitCode').addEventListener('change',()=>selectUnit($('unitCode').value,true));
 for(const id of ['unitSearch','buildingFilter','typeFilter'])$(id).addEventListener('input',renderUnitsList);
 $('paymentReferenceFX').addEventListener('input',calculateAll);
 $('unitsBody').addEventListener('click',(event)=>{const button=event.target.closest('button[data-code]');if(!button)return;
    $('unitCode').value=button.dataset.code;selectUnit(button.dataset.code,true);$('calculator').scrollIntoView({behavior:'smooth',block:'start'});});
 $('exportUnits').addEventListener('click',()=>csvDownload([['كود','عمارة','نوع','مساحة م²','سعر جنيه','بديل','رصيد كشف جنيه'],...UNITS.map(u=>[u.code,u.building,u.type,u.area,u.price,u.alt??'',u.officialOutstandingEGP??''])],'molak-al-mamsha-units.csv'));

 for(const b of document.querySelectorAll('[data-exit-years]'))b.addEventListener('click',()=>{$('exitYears').value=b.dataset.exitYears;calculateAll();});
 for(const radio of document.querySelectorAll('[name="exitMode"]'))radio.addEventListener('change',()=>{exitMode=radio.value;calculateAll();});
 $('selectAlt').addEventListener('change',()=>{selected=$('selectAlt').value;calculateAll();});
 $('fallPreset').addEventListener('click',()=>{years.forEach((y,i)=>rates[y]=Math.max(5,20-2*i));renderAnnualValues();calculateAll();});
 $('flatPreset').addEventListener('click',()=>{years.forEach(y=>rates[y]=20);renderAnnualValues();calculateAll();});
 $('risePreset').addEventListener('click',()=>{years.forEach((y,i)=>rates[y]=Math.min(40,20+2*i));renderAnnualValues();calculateAll();});
 $('fxLowPreset').addEventListener('click',()=>{years.forEach((y,i)=>fx[y]=Math.max(15,52-2*i));renderAnnualValues();calculateAll();});
 $('fxFlatPreset').addEventListener('click',()=>{years.forEach(y=>fx[y]=52);renderAnnualValues();calculateAll();});
 $('fxHighPreset').addEventListener('click',()=>{years.forEach((y,i)=>fx[y]=52+3*i);renderAnnualValues();calculateAll();});
 $('resetButton').addEventListener('click',()=>{if(!window.confirm('هل تريد إعادة كل المدخلات والسيناريوهات إلى القيم الافتراضية؟'))return;localStorage.removeItem(STORAGE_KEY);for(const [k,v] of Object.entries(inputDefault))$(k).value=v;rates={};fx={};$('paymentReferenceFX').value=53.4134;selected='a4-5';exitMode='after';document.querySelector('input[name="exitMode"][value="after"]').checked=true;$('selectAlt').value=selected;buildYears();calculateAll();});
 $('themeButton').addEventListener('click',()=>{document.body.classList.toggle('dark');try{localStorage.setItem(STORAGE_KEY+'-dark',document.body.classList.contains('dark')?'1':'0');}catch(e){}});
 $('exportCompare').addEventListener('click',exportCompare);$('exportSchedule').addEventListener('click',exportSchedule);$('printButton').addEventListener('click',()=>window.print());
 }
 function init(){populateUnits();renderUnitsList();load();for(const a of L.ALTERNATIVES){const option=document.createElement('option');option.value=a.id;option.textContent=a.title;$('selectAlt').append(option);}$('selectAlt').value=selected;document.querySelector(`input[name="exitMode"][value="${exitMode}"]`).checked=true;
  try{document.body.classList.toggle('dark',localStorage.getItem(STORAGE_KEY+'-dark')==='1');}catch(e){}
  buildYears();attach();calculateAll();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
