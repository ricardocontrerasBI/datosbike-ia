'use strict';
const $=id=>document.getElementById(id),charts={},months=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];let raw=[],meta={};
const usd=v=>'$ '+new Intl.NumberFormat('es-EC',{maximumFractionDigits:0}).format(v),short=v=>{const a=Math.abs(v);return a>=1e6?'$ '+new Intl.NumberFormat('es-EC',{maximumFractionDigits:2}).format(v/1e6)+' M':a>=1000?'$ '+new Intl.NumberFormat('es-EC',{maximumFractionDigits:1}).format(v/1000)+' mil':usd(v)},percent=v=>new Intl.NumberFormat('es-EC',{maximumFractionDigits:2}).format(v)+' %';
const sum=(arr,key)=>arr.reduce((s,r)=>s+(Number(r[key])||0),0);
function grouped(rows,key){const o=new Map();for(const r of rows){const k=key(r);o.set(k,(o.get(k)||0)+r.sales)}return o}
function options(id,values,all){const el=$(id),old=el.value;el.replaceChildren();for(const [v,t] of [['all',all],...values.map(v=>[String(v),String(v)])]){const opt=document.createElement('option');opt.value=v;opt.textContent=t;el.add(opt)}if([...el.options].some(o=>o.value===old))el.value=old}
function filtered(excludeYear=false){return raw.filter(r=>(excludeYear||$('year').value==='all'||String(r.y)===$('year').value)&&($('country').value==='all'||r.country===$('country').value)&&($('category').value==='all'||r.category===$('category').value)&&($('product').value==='all'||r.product===$('product').value))}
// Etiquetas monetarias dibujadas sobre las columnas y al final de las barras.
const moneyLabels={id:'moneyLabels',afterDatasetsDraw(chart,args,opts){if(!opts?.enabled)return;const ctx=chart.ctx,ds=chart.getDatasetMeta(0);ctx.save();ctx.font='10px Arial';ctx.fillStyle='#344761';for(let i=0;i<ds.data.length;i++){const bar=ds.data[i],v=chart.data.datasets[0].data[i];if(!v)continue;const label=short(v);ctx.textAlign=opts.horizontal?'left':'center';ctx.textBaseline='middle';const x=opts.horizontal?Math.min(bar.x+5,chart.chartArea.right-ctx.measureText(label).width):bar.x;const y=opts.horizontal?bar.y:Math.max(bar.y-9,chart.chartArea.top+8);ctx.fillText(label,x,y)}ctx.restore()}};
Chart.register(moneyLabels);
function draw(id,type,labels,values,extra={}) {
  if(charts[id]) charts[id].destroy();
  const horizontal=!!extra.horizontal, total=values.reduce((a,b)=>a+b,0);
  const callbacks={
    title:items=>items.length?String(labels[items[0].dataIndex]):'',
    label:ctx=>'Ventas: '+usd(Number(ctx.raw))+(type==='doughnut'?' · '+percent(total?Number(ctx.raw)/total*100:0):''),
    afterLabel:ctx=>{
      if(id!=='annual')return '';
      const year=Number(labels[ctx.dataIndex]),prior=extra.byYear.get(year-1);
      if(prior===undefined)return ['Variación USD: sin año anterior','Variación %: no comparable'];
      const diff=Number(ctx.raw)-prior,sign=diff>0?'+':'';
      return ['Variación USD: '+sign+usd(diff),'Variación %: '+(prior!==0?sign+percent(diff/prior*100):'No comparable')];
    }
  };
  // En Chart.js las etiquetas categóricas se representan mediante índices internos.
  // Nunca aplicar formato monetario a esos índices: usar getLabelForValue().
  const categoryTicks={autoSkip:id==='monthly',maxRotation:0,minRotation:0,
    callback:function(value){return this.getLabelForValue(value)}};
  const numericTicks={callback:value=>short(Number(value))};
  const scales=type==='doughnut'?{}:horizontal?{
    x:{beginAtZero:true,grid:{color:'#edf2f8'},ticks:numericTicks},
    y:{type:'category',grid:{display:false},ticks:{...categoryTicks,autoSkip:false,font:{size:10}}}
  }:{
    x:{type:'category',grid:{display:false},ticks:categoryTicks},
    y:{beginAtZero:true,grid:{color:'#edf2f8'},ticks:numericTicks,grace:'14%'}
  };
  charts[id]=new Chart($(id),{
    type,data:{labels,datasets:[{label:'Ventas',data:values,backgroundColor:type==='doughnut'?['#1685ef','#152b8f','#f27c42','#9222b7','#ed48a6','#7d5ce8']:'#1685ef',borderRadius:type==='bar'?5:0,maxBarThickness:55,hoverBackgroundColor:'#0752a3'}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:horizontal?'y':'x',
      layout:{padding:{top:id==='annual'||id==='monthly'?12:0,right:horizontal?48:0}},
      plugins:{legend:{display:type==='doughnut',position:'right',labels:{boxWidth:12,font:{size:11}}},tooltip:{callbacks},moneyLabels:{enabled:id==='annual'||id==='monthly',horizontal}},scales}
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
