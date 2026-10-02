let chartAlquileres=null;
let chartRecaudacion=null;
let chartMedios=null;
let reporteActual={pagos:[],reservas:[]};

function money(v){
  return new Intl.NumberFormat('es-AR',{
    style:'currency',
    currency:'ARS',
    maximumFractionDigits:0
  }).format(Number(v||0));
}

function esc(v=''){
  return String(v)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function fechaAR(v){
  if(!v)return '-';
  const d=String(v).slice(0,10);
  const [y,m,day]=d.split('-');
  return `${day}/${m}/${y}`;
}

function fechaHoraAR(v){
  if(!v)return '-';
  return new Intl.DateTimeFormat('es-AR',{
    dateStyle:'short',
    timeStyle:'short'
  }).format(new Date(v));
}

function isoLocal(d){
  return [
    d.getFullYear(),
    String(d.getMonth()+1).padStart(2,'0'),
    String(d.getDate()).padStart(2,'0')
  ].join('-');
}

function inicioDiaIso(fecha){
  return `${fecha}T00:00:00`;
}

function finDiaIso(fecha){
  return `${fecha}T23:59:59.999`;
}

function mesClaveDesdeFecha(fecha){
  return String(fecha||'').slice(0,7);
}

function mesClaveDesdeTimestamp(fecha){
  const d=new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function etiquetaMes(clave){
  const [y,m]=clave.split('-').map(Number);
  const t=new Intl.DateTimeFormat('es-AR',{month:'short',year:'2-digit'})
    .format(new Date(y,m-1,1));
  return t.replace('.','');
}

function rangoMeses(desde,hasta){
  const [yd,md]=desde.split('-').map(Number);
  const [yh,mh]=hasta.split('-').map(Number);
  const out=[];
  let y=yd,m=md;
  while(y<yh || (y===yh && m<=mh)){
    out.push(`${y}-${String(m).padStart(2,'0')}`);
    m++;
    if(m===13){m=1;y++;}
  }
  return out;
}

function normalizarMedio(v){
  const x=String(v||'Sin especificar').trim();
  return x || 'Sin especificar';
}

function mapConcepto(valor){
  return {
    SENA:'Seña',
    SALDO_TOTAL:'Pago total / saldo',
    PAGO_PARCIAL:'Pago parcial',
    OTRO:'Otro'
  }[valor] || valor || '-';
}

function destruirGraficos(){
  if(chartAlquileres){chartAlquileres.destroy();chartAlquileres=null;}
  if(chartRecaudacion){chartRecaudacion.destroy();chartRecaudacion=null;}
  if(chartMedios){chartMedios.destroy();chartMedios=null;}
}

function renderGraficos(desde,hasta,reservas,pagos){
  destruirGraficos();

  const meses=rangoMeses(desde.slice(0,7),hasta.slice(0,7));
  const alquileresMes=Object.fromEntries(meses.map(m=>[m,0]));
  const cobrosMes=Object.fromEntries(meses.map(m=>[m,0]));

  reservas.forEach(r=>{
    const k=mesClaveDesdeFecha(r.fecha);
    if(k in alquileresMes)alquileresMes[k]++;
  });

  pagos.forEach(p=>{
    const k=mesClaveDesdeTimestamp(p.fecha);
    if(k in cobrosMes)cobrosMes[k]+=Number(p.importe||0);
  });

  const labels=meses.map(etiquetaMes);

  chartAlquileres=new Chart(document.getElementById('alquileresChart'),{
    type:'bar',
    data:{
      labels,
      datasets:[{
        label:'Cantidad de alquileres',
        data:meses.map(m=>alquileresMes[m])
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{y:{beginAtZero:true,ticks:{precision:0}}}
    }
  });

  chartRecaudacion=new Chart(document.getElementById('recaudacionChart'),{
    type:'line',
    data:{
      labels,
      datasets:[{
        label:'Recaudación',
        data:meses.map(m=>cobrosMes[m]),
        tension:.25,
        fill:false
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{
        y:{
          beginAtZero:true,
          ticks:{callback:v=>money(v)}
        }
      }
    }
  });

  const medioMap={};
  pagos.forEach(p=>{
    const medio=normalizarMedio(p.medio_pago);
    medioMap[medio]=(medioMap[medio]||0)+Number(p.importe||0);
  });

  const medios=Object.keys(medioMap);
  chartMedios=new Chart(document.getElementById('mediosChart'),{
    type:'doughnut',
    data:{
      labels:medios.length?medios:['Sin cobros'],
      datasets:[{
        data:medios.length?medios.map(m=>medioMap[m]):[1]
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{position:'bottom'}
      }
    }
  });
}

function renderMedios(pagos){
  const grupos={};
  pagos.forEach(p=>{
    const medio=normalizarMedio(p.medio_pago);
    if(!grupos[medio])grupos[medio]={cantidad:0,total:0};
    grupos[medio].cantidad++;
    grupos[medio].total+=Number(p.importe||0);
  });

  const rows=Object.entries(grupos)
    .sort((a,b)=>b[1].total-a[1].total);

  const box=document.getElementById('mediosPagoTable');
  if(!rows.length){
    box.innerHTML='<p class="muted">No hay cobros en el período.</p>';
    return;
  }

  box.innerHTML=`<table>
    <thead><tr><th>Medio de pago</th><th>Operaciones</th><th>Total</th></tr></thead>
    <tbody>
      ${rows.map(([medio,v])=>`
        <tr>
          <td>${esc(medio)}</td>
          <td>${v.cantidad}</td>
          <td>${money(v.total)}</td>
        </tr>`).join('')}
    </tbody>
  </table>`;
}

function renderPagos(pagos){
  const box=document.getElementById('reportePagosTable');

  if(!pagos.length){
    box.innerHTML='<p class="muted">No hay cobros en el período seleccionado.</p>';
    return;
  }

  box.innerHTML=`<table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Reserva</th>
        <th>Cliente</th>
        <th>Evento</th>
        <th>Concepto</th>
        <th>Medio</th>
        <th>Importe</th>
      </tr>
    </thead>
    <tbody>
      ${pagos.map(p=>{
        const r=p.reservas||{};
        const c=r.clientes||{};
        const cliente=[c.nombre,c.apellido].filter(Boolean).join(' ')||'-';
        return `<tr>
          <td>${fechaHoraAR(p.fecha)}</td>
          <td>#${esc(r.id||'-')}</td>
          <td>${esc(cliente)}</td>
          <td>${esc(r.tipo_evento||'-')}<small>${fechaAR(r.fecha)}</small></td>
          <td>${esc(mapConcepto(p.concepto))}</td>
          <td>${esc(normalizarMedio(p.medio_pago))}</td>
          <td>${money(p.importe)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

async function cargarReporte(){
  const desde=document.getElementById('fechaDesde').value;
  const hasta=document.getElementById('fechaHasta').value;
  const msg=document.getElementById('reporteMensaje');

  if(!desde||!hasta){
    msg.textContent='Seleccioná fecha desde y fecha hasta.';
    msg.className='form-message error';
    return;
  }
  if(desde>hasta){
    msg.textContent='La fecha desde no puede ser posterior a la fecha hasta.';
    msg.className='form-message error';
    return;
  }

  msg.textContent='Generando reporte...';
  msg.className='form-message';

  const [reservasRes,pagosRes]=await Promise.all([
    supabaseClient
      .from('reservas')
      .select('id,fecha,tipo_evento,valor_total,estado,pagos(importe)')
      .gte('fecha',desde)
      .lte('fecha',hasta)
      .neq('estado','CANCELADA')
      .order('fecha',{ascending:true}),
    supabaseClient
      .from('pagos')
      .select('id,fecha,concepto,medio_pago,importe,reservas(id,fecha,tipo_evento,clientes(nombre,apellido))')
      .gte('fecha',inicioDiaIso(desde))
      .lte('fecha',finDiaIso(hasta))
      .order('fecha',{ascending:false})
  ]);

  if(reservasRes.error || pagosRes.error){
    const e=reservasRes.error||pagosRes.error;
    msg.textContent='No se pudo generar el reporte: '+e.message;
    msg.className='form-message error';
    return;
  }

  const reservas=reservasRes.data||[];
  const pagos=pagosRes.data||[];

  const totalContratado=reservas.reduce((s,r)=>s+Number(r.valor_total||0),0);
  const totalCobrado=pagos.reduce((s,p)=>s+Number(p.importe||0),0);

  // Saldo de los alquileres del período: toma todos los cobros ya asociados
  // a esas reservas, aunque el pago se haya hecho fuera del rango elegido.
  const saldoPendiente=reservas.reduce((s,r)=>{
    const pagado=(r.pagos||[]).reduce((a,p)=>a+Number(p.importe||0),0);
    return s+Math.max(0,Number(r.valor_total||0)-pagado);
  },0);

  document.getElementById('repAlquileres').textContent=reservas.length;
  document.getElementById('repContratado').textContent=money(totalContratado);
  document.getElementById('repCobrado').textContent=money(totalCobrado);
  document.getElementById('repSaldo').textContent=money(saldoPendiente);

  reporteActual={reservas,pagos,desde,hasta};

  renderGraficos(desde,hasta,reservas,pagos);
  renderMedios(pagos);
  renderPagos(pagos);

  msg.textContent=`Reporte generado del ${fechaAR(desde)} al ${fechaAR(hasta)}.`;
  msg.className='form-message success';
}

function csvEsc(v){
  const s=String(v??'');
  return `"${s.replaceAll('"','""')}"`;
}

function exportarCSV(){
  const pagos=reporteActual.pagos||[];
  if(!pagos.length){
    alert('No hay cobros para exportar en el período seleccionado.');
    return;
  }

  const rows=[
    ['Fecha','Reserva','Cliente','Fecha evento','Evento','Concepto','Medio de pago','Importe']
  ];

  pagos.forEach(p=>{
    const r=p.reservas||{};
    const c=r.clientes||{};
    rows.push([
      fechaHoraAR(p.fecha),
      r.id||'',
      [c.nombre,c.apellido].filter(Boolean).join(' '),
      fechaAR(r.fecha),
      r.tipo_evento||'',
      mapConcepto(p.concepto),
      normalizarMedio(p.medio_pago),
      Number(p.importe||0).toFixed(2)
    ]);
  });

  const csv='\ufeff'+rows.map(r=>r.map(csvEsc).join(';')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`Reporte_AMUC_${reporteActual.desde}_${reporteActual.hasta}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded',async()=>{
  const ctx=await requireSession();
  if(!ctx)return;

  const hoy=new Date();
  const primeroAnio=new Date(hoy.getFullYear(),0,1);

  document.getElementById('fechaDesde').value=isoLocal(primeroAnio);
  document.getElementById('fechaHasta').value=isoLocal(hoy);

  document.getElementById('generarReporteBtn').addEventListener('click',cargarReporte);
  document.getElementById('exportarCsvBtn').addEventListener('click',exportarCSV);

  await cargarReporte();
});
