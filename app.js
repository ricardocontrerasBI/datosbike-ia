'use strict';
const $=id=>document.getElementById(id),charts={},months=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];let raw=[],meta={};
const usd=v=>'$ '+new Intl.NumberFormat('es-EC',{maximumFractionDigits:0}).format(v),short=v=>{const a=Math.abs(v);return a>=1e6?'$ '+new Intl.NumberFormat('es-EC',{maximumFractionDigits:2}).format(v/1e6)+' M':a>=1000?'$ '+new Intl.NumberFormat('es-EC',{maximumFractionDigits:1}).format(v/1000)+' mil':usd(v)},percent=v=>new Intl.NumberFormat('es-EC',{maximumFractionDigits:2}).format(v)+' %';
const sum=(arr,key)=>arr.reduce((s,r)=>s+(Number(r[key])||0),0);
function grouped(rows,key){const o=new Map();for(const r of rows){const k=key(r);o.set(k,(o.get(k)||0)+r.sales)}return o}
function options(id,values,all){const el=$(id),old=el.value;el.replaceChildren();for(const [v,t] of [['all',all],...values.map(v=>[String(v),String(v)])]){const opt=document.createElement('option');opt.value=v;opt.textContent=t;el.add(opt)}if([...el.options].some(o=>o.value===old))el.value=old}
function filtered(excludeYear=false){return raw.filter(r=>(excludeYear||$('year').value==='all'||String(r.y)===$('year').value)&&($('country').value==='all'||r.country===$('country').value)&&($('category').value==='all'||r.category===$('category').value)&&($('product').value==='all'||r.product===$('product').value))}
function draw(id,type,labels,values,extra={}) {
  if(charts[id]) charts[id].destroy();
  const total=values.reduce((a,b)=>a+b,0);
  const callbacks={
    label:ctx=>'Ventas: '+usd(ctx.raw)+(type==='doughnut'?' · '+percent(total?ctx.raw/total*100:0):''),
    afterLabel:ctx=>{
      if(id!=='annual')return '';
      const year=Number(labels[ctx.dataIndex]);
      const prior=extra.byYear.get(year-1);
      if(prior===undefined)return ['Variación USD: sin año anterior','Variación %: no disponible'];
      const diff=ctx.raw-prior;
      return ['Var. USD: '+(diff>=0?'+':'')+usd(diff), 'Var. %: '+(prior!==0?(diff>=0?'+':'')+percent(diff/prior*100):'No comparable')];
    }
  };
  const scales=type==='doughnut'?{}:{
    x:{grid:{display:!!extra.horizontal},ticks:{callback:extra.horizontal?function(v){return short(v)}:undefined}},
    y:{beginAtZero:true,grid:{color:'#edf2f8'},ticks:{callback:extra.horizontal?undefined:function(v){return short(v)}}}
  };
  charts[id]=new Chart($(id),{
    type,
    data:{labels,datasets:[{label:'Ventas',data:values,backgroundColor:type==='doughnut'?['#1685ef','#152b8f','#f27c42','#9222b7','#ed48a6','#7d5ce8']:'#1685ef',borderRadius:type==='bar'?5:0,maxBarThickness:55,hoverBackgroundColor:'#0752a3'}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:extra.horizontal?'y':'x',plugins:{legend:{display:type==='doughnut',position:'right',labels:{boxWidth:12,font:{size:11}}},tooltip:{callbacks}},scales}
  });
}

function render(){const rows=filtered(),sales=sum(rows,'sales'),cost=sum(rows,'cost');$('sales').textContent=short(sales);$('cost').textContent=short(cost);$('profit').textContent=short(sales-cost);$('margin').textContent=sales?percent((sales-cost)/sales*100):'—';
// El filtro de año no elimina la referencia histórica necesaria para el tooltip interanual.
const allYear=grouped(filtered(true),r=>r.y),chosen=$('year').value,years=chosen==='all'?[...allYear.keys()].sort():[Number(chosen)];draw('annual','bar',years,years.map(y=>allYear.get(y)||0),{byYear:allYear});
const top=[...grouped(rows,r=>r.product).entries()].sort((a,b)=>b[1]-a[1]).slice(0,6);draw('products','bar',top.map(a=>a[0]),top.map(a=>a[1]),{horizontal:true});
const byMonth=grouped(rows,r=>r.m),ms=Array.from({length:12},(_,i)=>i+1);draw('monthly','bar',ms.map(m=>months[m-1]),ms.map(m=>byMonth.get(m)||0));
const country=[...grouped(rows,r=>r.country).entries()].sort((a,b)=>b[1]-a[1]);draw('countries','doughnut',country.map(a=>a[0]),country.map(a=>a[1]));$('status').textContent=`Datos cargados · ${new Intl.NumberFormat('es-EC').format(rows.length)} grupos de datos`;}
function cascade(){const country=$('country').value,category=$('category').value;const list=raw.filter(r=>(country==='all'||r.country===country)&&(category==='all'||r.category===category));options('product',[...new Set(list.map(r=>r.product))].sort(),'Todos los productos');render()}
async function load(){try{const response=await fetch('data.json?version='+Date.now(),{cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);const obj=await response.json();raw=obj.rows;meta=obj.meta;options('year',[...new Set(raw.map(r=>r.y))].sort(),'Todos los años');options('country',[...new Set(raw.map(r=>r.country))].sort(),'Todos los países');options('category',[...new Set(raw.map(r=>r.category))].sort(),'Todas las categorías');cascade();$('source').textContent=`Fuente: ${meta.source} · ${new Intl.NumberFormat('es-EC').format(meta.records)} registros originales · JSON generado ${new Date(meta.generated).toLocaleDateString('es-EC')}`;}catch(e){$('status').textContent='No se pudo cargar data.json: '+e.message;console.error(e)}}
for(const id of ['year','country','category','product'])$(id).addEventListener('change',id==='country'||id==='category'?cascade:render);$('reset').addEventListener('click',()=>{for(const id of ['year','country','category','product'])$(id).value='all';cascade()});load();
