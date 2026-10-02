
let seguridadCtx=null;
let seguridadEventos=[];
let seguridadEventoActual=null;

function segEsc(v=''){
  return String(v)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function segFecha(v){
  if(!v)return '-';
  return new Intl.DateTimeFormat('es-AR').format(new Date(`${v}T12:00:00`));
}

function segFechaHora(v){
  if(!v)return '-';
  return new Intl.DateTimeFormat('es-AR',{
    dateStyle:'short',
    timeStyle:'short'
  }).format(new Date(v));
}

function segHora(v){
  return v ? String(v).slice(0,5) : '-';
}

function isoLocal(d){
  return [
    d.getFullYear(),
    String(d.getMonth()+1).padStart(2,'0'),
    String(d.getDate()).padStart(2,'0')
  ].join('-');
}

function sumarDias(fecha,dias){
  const x=new Date(`${fecha}T12:00:00`);
  x.setDate(x.getDate()+dias);
  return isoLocal(x);
}

function minutosAHora(minutos){
  let x=minutos;
  while(x<0)x+=1440;
  while(x>=1440)x-=1440;
  return `${String(Math.floor(x/60)).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`;
}

function horaAMinutos(h){
  const [hh,mm]=String(h||'00:00').slice(0,5).split(':').map(Number);
  return hh*60+mm;
}

function horariosOperativos(evento){
  const inicio=horaAMinutos(evento.hora_inicio);
  let fin=horaAMinutos(evento.hora_fin);
  if(fin<=inicio)fin+=1440;

  return {
    ingresoPrevisto:minutosAHora(inicio-30),
    egresoPrevisto:minutosAHora(fin+30)
  };
}

function nombreResponsable(e){
  return [e.cliente_nombre,e.cliente_apellido].filter(Boolean).join(' ')||'Sin responsable';
}

async function cargarEventosSeguridad(){
  const box=document.getElementById('securityEvents');
  box.innerHTML='<div class="panel"><p class="muted">Cargando eventos...</p></div>';

  const hoy=isoLocal(new Date());
  const rango=document.getElementById('securityRange').value;
  const hasta=rango==='HOY' ? hoy : sumarDias(hoy,Number(rango));

  const {data,error}=await supabaseClient.rpc('get_seguridad_eventos',{
    p_desde:hoy,
    p_hasta:hasta
  });

  if(error){
    box.innerHTML=`<div class="panel"><p class="error">${segEsc(error.message)}</p></div>`;
    return;
  }

  seguridadEventos=data||[];
  renderEventosSeguridad();
}

function renderEventosSeguridad(){
  const box=document.getElementById('securityEvents');

  if(!seguridadEventos.length){
    box.innerHTML='<div class="panel"><p class="muted">No hay eventos en el período seleccionado.</p></div>';
    return;
  }

  box.innerHTML=seguridadEventos.map(e=>{
    const op=horariosOperativos(e);
    return `
      <article class="security-event-card">
        <div class="security-event-date">
          <strong>${segFecha(e.fecha)}</strong>
          <span>${segHora(e.hora_inicio)} a ${segHora(e.hora_fin)}</span>
        </div>

        <div class="security-event-main">
          <span class="eyebrow">${segEsc(e.tipo_evento||'EVENTO')}</span>
          <h2>${segEsc(nombreResponsable(e))}</h2>
          <p>${Number(e.cantidad_personas||0)} personas · Ingreso previsto ${op.ingresoPrevisto}</p>
        </div>

        <div class="security-event-contact">
          ${e.telefono
            ? `<a class="btn btn-secondary" href="tel:${segEsc(e.telefono)}">📞 ${segEsc(e.telefono)}</a>`
            : '<span class="muted">Sin teléfono</span>'}
          <button type="button" class="btn btn-primary security-open-event" data-id="${e.id}">
            Ver evento
          </button>
        </div>
      </article>
    `;
  }).join('');

  box.querySelectorAll('.security-open-event').forEach(btn=>{
    btn.addEventListener('click',()=>abrirEventoSeguridad(Number(btn.dataset.id)));
  });
}

async function abrirEventoSeguridad(id){
  const e=seguridadEventos.find(x=>Number(x.id)===Number(id));
  if(!e)return;

  seguridadEventoActual=e;

  document.getElementById('securityModalTitle').textContent=e.tipo_evento||'Evento';
  document.getElementById('securityModalSubtitle').textContent=
    `${segFecha(e.fecha)} · ${segHora(e.hora_inicio)} a ${segHora(e.hora_fin)}`;

  renderDetalleEvento(e);

  document.getElementById('securityEventModal').classList.remove('hidden');
  document.getElementById('securityObservationText').value='';
  document.getElementById('securityObservationMessage').textContent='';

  await Promise.all([
    cargarRegistroOperativo(e.id),
    cargarListaInvitadosSeguridad(e.id),
    cargarObservacionesSeguridad(e.id)
  ]);
}

function renderDetalleEvento(e){
  const op=horariosOperativos(e);
  const detail=document.getElementById('securityEventDetail');

  detail.innerHTML=`
    <div class="security-detail-grid">
      <div><span>Responsable</span><strong>${segEsc(nombreResponsable(e))}</strong></div>
      <div><span>Teléfono</span><strong>${segEsc(e.telefono||'-')}</strong></div>
      <div><span>Evento</span><strong>${segEsc(e.tipo_evento||'-')}</strong></div>
      <div><span>Asistentes previstos</span><strong>${Number(e.cantidad_personas||0)}</strong></div>
      <div><span>Horario contratado</span><strong>${segHora(e.hora_inicio)} a ${segHora(e.hora_fin)}</strong></div>
      <div><span>Ingreso previsto</span><strong>${op.ingresoPrevisto}</strong></div>
      <div><span>Egreso previsto</span><strong>${op.egresoPrevisto}</strong></div>
      <div><span>Estado</span><strong>${segEsc(e.estado||'-')}</strong></div>
    </div>
  `;
}

async function cargarRegistroOperativo(reservaId){
  const box=document.getElementById('securityOperational');
  box.innerHTML='<p class="muted">Cargando...</p>';

  const {data,error}=await supabaseClient.rpc('get_seguridad_registro',{
    p_reserva_id:reservaId
  });

  if(error){
    box.innerHTML=`<p class="error">${segEsc(error.message)}</p>`;
    return;
  }

  const r=Array.isArray(data)?data[0]:data;
  const ingreso=r?.ingreso_real||null;
  const egreso=r?.egreso_real||null;

  box.innerHTML=`
    <div class="security-operational-grid">
      <div class="security-operation-card">
        <span>Ingreso real</span>
        <strong>${ingreso?segFechaHora(ingreso):'Sin registrar'}</strong>
        <small>${r?.ingreso_usuario_nombre?`Registrado por ${segEsc(r.ingreso_usuario_nombre)}`:''}</small>
        ${!ingreso?'<button type="button" id="registerEntryBtn" class="btn btn-primary">Registrar ingreso</button>':''}
      </div>
      <div class="security-operation-card">
        <span>Egreso real</span>
        <strong>${egreso?segFechaHora(egreso):'Sin registrar'}</strong>
        <small>${r?.egreso_usuario_nombre?`Registrado por ${segEsc(r.egreso_usuario_nombre)}`:''}</small>
        ${!egreso?'<button type="button" id="registerExitBtn" class="btn btn-secondary">Registrar egreso</button>':''}
      </div>
    </div>
  `;

  document.getElementById('registerEntryBtn')?.addEventListener('click',()=>registrarMovimiento('INGRESO'));
  document.getElementById('registerExitBtn')?.addEventListener('click',()=>registrarMovimiento('EGRESO'));
}

async function registrarMovimiento(tipo){
  if(!seguridadEventoActual)return;

  const texto=tipo==='INGRESO'
    ? '¿Registrar el ingreso real en este momento?'
    : '¿Registrar el egreso real en este momento?';

  if(!confirm(texto))return;

  const {error}=await supabaseClient.rpc('registrar_movimiento_seguridad',{
    p_reserva_id:seguridadEventoActual.id,
    p_tipo:tipo
  });

  if(error){
    alert('No se pudo registrar: '+error.message);
    return;
  }

  await cargarRegistroOperativo(seguridadEventoActual.id);
}

async function cargarListaInvitadosSeguridad(reservaId){
  const box=document.getElementById('securityGuestList');
  box.innerHTML='<p class="muted">Buscando lista de asistentes...</p>';

  const {data,error}=await supabaseClient.rpc('get_lista_invitados_seguridad',{
    p_reserva_id:reservaId
  });

  if(error){
    box.innerHTML=`<p class="error">${segEsc(error.message)}</p>`;
    return;
  }

  const doc=Array.isArray(data)?data[0]:data;

  if(!doc?.ruta_storage){
    box.innerHTML='<div class="security-doc-missing">⚠ La lista de invitados todavía no fue cargada.</div>';
    return;
  }

  box.innerHTML=`
    <div class="security-doc-ready">
      <div>
        <strong>✓ Lista de invitados disponible</strong>
        <small>${segEsc(doc.nombre_archivo||'Lista de invitados')}</small>
      </div>
      <button type="button" id="openGuestListBtn" class="btn btn-primary">Ver lista</button>
    </div>
  `;

  document.getElementById('openGuestListBtn').addEventListener('click',async()=>{
    const {data:urlData,error:urlError}=await supabaseClient.storage
      .from('documentos-reservas')
      .createSignedUrl(doc.ruta_storage,60*10);

    if(urlError || !urlData?.signedUrl){
      alert('No se pudo abrir la lista de invitados.');
      return;
    }

    window.open(urlData.signedUrl,'_blank','noopener');
  });
}

async function cargarObservacionesSeguridad(reservaId){
  const box=document.getElementById('securityObservations');
  box.innerHTML='<p class="muted">Cargando observaciones...</p>';

  const {data,error}=await supabaseClient.rpc('get_reserva_observaciones_seguridad',{
    p_reserva_id:reservaId
  });

  if(error){
    box.innerHTML=`<p class="error">${segEsc(error.message)}</p>`;
    return;
  }

  const rows=data||[];

  if(!rows.length){
    box.innerHTML='<p class="muted">Todavía no hay observaciones registradas.</p>';
    return;
  }

  box.innerHTML=rows.map(o=>`
    <div class="security-observation-item">
      <div class="security-observation-meta">
        <strong>${segEsc(o.usuario_nombre||'Usuario')}</strong>
        <span>${segFechaHora(o.created_at)}</span>
      </div>
      <p>${segEsc(o.observacion)}</p>
    </div>
  `).join('');
}

async function guardarObservacionSeguridad(e){
  e.preventDefault();

  if(!seguridadEventoActual)return;

  const input=document.getElementById('securityObservationText');
  const msg=document.getElementById('securityObservationMessage');
  const observacion=input.value.trim();

  if(!observacion){
    msg.textContent='Escribí una observación.';
    msg.className='form-message error';
    return;
  }

  msg.textContent='Guardando...';
  msg.className='form-message';

  const {error}=await supabaseClient
    .from('reserva_observaciones')
    .insert({
      reserva_id:seguridadEventoActual.id,
      usuario_id:seguridadCtx.session.user.id,
      observacion
    });

  if(error){
    msg.textContent='No se pudo guardar: '+error.message;
    msg.className='form-message error';
    return;
  }

  input.value='';
  msg.textContent='Observación registrada.';
  msg.className='form-message success';

  await cargarObservacionesSeguridad(seguridadEventoActual.id);
}

document.addEventListener('DOMContentLoaded',async()=>{
  const ctx=await requireSession({
    rolesPermitidos:['SEGURIDAD','ADMINISTRADOR','ADMINISTRACION'],
    permitirSeguridad:true
  });

  if(!ctx)return;
  seguridadCtx=ctx;

  document.getElementById('securityUserName').textContent=
    `${ctx.perfil.nombre||''} ${ctx.perfil.apellido||''}`.trim();

  document.getElementById('refreshSecurityBtn').addEventListener('click',cargarEventosSeguridad);
  document.getElementById('securityRange').addEventListener('change',cargarEventosSeguridad);
  document.getElementById('closeSecurityModal').addEventListener('click',()=>{
    document.getElementById('securityEventModal').classList.add('hidden');
  });

  document.getElementById('securityEventModal').addEventListener('click',e=>{
    if(e.target.id==='securityEventModal'){
      e.currentTarget.classList.add('hidden');
    }
  });

  document.getElementById('securityObservationForm').addEventListener('submit',guardarObservacionSeguridad);

  await cargarEventosSeguridad();
});
