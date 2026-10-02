
let documentacionActual = null;

const DOCUMENTOS_BUCKET = 'documentos-reservas';
const TIPOS_DOCUMENTO = {
  FICHA: 'Ficha',
  REGLAMENTO: 'Reglamento',
  NOTIFICACION: 'Notificación',
  LISTA_INVITADOS: 'Lista de invitados'
};

function escDoc(v=''){
  return String(v)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function slugArchivo(nombre='archivo'){
  return String(nombre)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9._-]+/g,'_')
    .replace(/_+/g,'_')
    .slice(0,120);
}


function docFechaAR(fechaISO){
  if(!fechaISO) return '';
  const [y,m,d] = fechaISO.split('-');
  return `${d}/${m}/${y}`;
}

function sumarUnDiaISO(fechaISO){
  const d = new Date(`${fechaISO}T12:00:00`);
  d.setDate(d.getDate()+1);
  return [
    d.getFullYear(),
    String(d.getMonth()+1).padStart(2,'0'),
    String(d.getDate()).padStart(2,'0')
  ].join('-');
}

function fechaEgresoReserva(reserva){
  if(!reserva?.fecha) return '';
  if(!reserva.hora_inicio || !reserva.hora_fin) return reserva.fecha;
  return reserva.hora_fin <= reserva.hora_inicio
    ? sumarUnDiaISO(reserva.fecha)
    : reserva.fecha;
}

function nombreCompletoCliente(c){
  return [c?.apellido, c?.nombre].filter(Boolean).join(', ');
}

function nombreApellidoCliente(c){
  return [c?.nombre, c?.apellido].filter(Boolean).join(' ');
}

async function fetchFile(url,nombre){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`No se pudo cargar ${nombre}`);
  const blob = await r.blob();
  return new File([blob], nombre, {type:'application/pdf'});
}

async function fetchBytes(url,nombre){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`No se pudo cargar ${nombre}`);
  return await r.arrayBuffer();
}

function parseFechaHoraLocal(fechaISO,hora){
  const [y,m,d] = fechaISO.split('-').map(Number);
  const limpia = String(hora||'').slice(0,5)==='24:00' ? '00:00' : String(hora||'').slice(0,5);
  const [hh,mm] = limpia.split(':').map(Number);
  return new Date(y,m-1,d,hh,mm,0,0);
}

function fechaISOLocal(date){
  return [
    date.getFullYear(),
    String(date.getMonth()+1).padStart(2,'0'),
    String(date.getDate()).padStart(2,'0')
  ].join('-');
}

function horaLocal(date){
  return [
    String(date.getHours()).padStart(2,'0'),
    String(date.getMinutes()).padStart(2,'0')
  ].join(':');
}

function calcularIngresoEgreso(reserva){
  const inicio = parseFechaHoraLocal(reserva.fecha,reserva.hora_inicio);
  let fin = parseFechaHoraLocal(reserva.fecha,reserva.hora_fin);

  if(fin <= inicio){
    fin.setDate(fin.getDate()+1);
  }

  const ingreso = new Date(inicio.getTime() - 30*60*1000);
  const egreso = new Date(fin.getTime() + 30*60*1000);

  return {
    ingresoFecha: fechaISOLocal(ingreso),
    ingresoHora: horaLocal(ingreso),
    egresoFecha: fechaISOLocal(egreso),
    egresoHora: horaLocal(egreso)
  };
}

function crearDrawTop(page,font){
  const {height} = page.getSize();
  return (x,top,text,size=9.5,maxWidth=null)=>{
    let value = String(text ?? '');
    let fontSize = size;
    if(maxWidth){
      while(fontSize > 7 && font.widthOfTextAtSize(value,fontSize) > maxWidth){
        fontSize -= 0.25;
      }
    }
    page.drawText(value,{
      x,
      y:height-top,
      size:fontSize,
      font,
      color:PDFLib.rgb(0,0,0)
    });
  };
}

async function crearFichaReservaPDF(reserva,cliente){
  const template = await fetchBytes('../assets/documentos/salon_fiestas_ficha.pdf','ficha del salón');
  const pdfDoc = await PDFLib.PDFDocument.load(template);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  const drawTop = crearDrawTop(page,font);

  const {
    ingresoFecha,
    ingresoHora,
    egresoFecha,
    egresoHora
  } = calcularIngresoEgreso(reserva);

  drawTop(148,145,docFechaAR(reserva.fecha),9.5,92);
  drawTop(286,145,`${reserva.hora_inicio?.slice(0,5)||''} a ${reserva.hora_fin?.slice(0,5)||''}`,9.5,80);
  drawTop(452,145,String(reserva.cantidad_horas ?? ''),9.5,55);
  drawTop(107,158,reserva.tipo_evento || '',9.5,405);

  drawTop(168,279,nombreCompletoCliente(cliente),9.5,335);
  drawTop(105,294,cliente?.dni || '',9.5,150);
  drawTop(317,294,cliente?.telefono || '',9.5,170);
  drawTop(168,324,cliente?.email || '',9.5,330);

  drawTop(106,540,docFechaAR(ingresoFecha),9.5,150);
  drawTop(319,540,ingresoHora,9.5,120);

  drawTop(106,651,docFechaAR(egresoFecha),9.5,150);
  drawTop(319,651,egresoHora,9.5,120);

  const bytes = await pdfDoc.save();
  return new File(
    [bytes],
    `Ficha_Salon_AMUC_Reserva_${reserva.id || 'nueva'}.pdf`,
    {type:'application/pdf'}
  );
}

async function crearReglamentoPDF(reserva){
  return await fetchFile(
    '../assets/documentos/reglamento_de_uso_salon_de_fiestas.pdf',
    `Reglamento_Uso_Salon_AMUC_Reserva_${reserva.id || 'nueva'}.pdf`
  );
}

async function crearListaInvitadosPDF(reserva,cliente){
  const template = await fetchBytes('../assets/documentos/lista_de_invitados80.pdf','lista de invitados');
  const pdfDoc = await PDFLib.PDFDocument.load(template);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  const drawTop = crearDrawTop(page,font);

  const {ingresoHora} = calcularIngresoEgreso(reserva);

  // Logo AMUC en el encabezado.
  try{
    const logoBytes = await fetchBytes('../assets/logo-amuc.jpg','logo AMUC');
    const logo = await pdfDoc.embedJpg(logoBytes);
    page.drawImage(logo,{
      x:20,
      y:page.getHeight()-58,
      width:40,
      height:40
    });
  }catch(err){
    console.warn('No se pudo insertar el logo en la lista de invitados.',err);
  }

  // Datos automáticos.
  drawTop(114,72,docFechaAR(reserva.fecha),9,66);
  drawTop(337,72,ingresoHora,9,90);
  drawTop(148,87,nombreApellidoCliente(cliente),9,116);
  drawTop(320,87,cliente?.telefono || '',9,98);

  const bytes = await pdfDoc.save();
  return new File(
    [bytes],
    `Lista_Invitados_AMUC_Reserva_${reserva.id || 'nueva'}.pdf`,
    {type:'application/pdf'}
  );
}

async function crearNotificacionPDF(reserva,cliente){
  const template = await fetchBytes('../assets/documentos/salon_fiestas_notificacion.pdf','notificación');
  const pdfDoc = await PDFLib.PDFDocument.load(template);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  const drawTop = crearDrawTop(page,font);

  // Firma del responsable queda libre para firma manuscrita.
  drawTop(165,459,nombreApellidoCliente(cliente),10.5,310);
  drawTop(165,492,cliente?.dni || '',10.5,190);
  drawTop(165,524,cliente?.telefono || '',10.5,210);
  drawTop(165,557,docFechaAR(reserva.fecha),10.5,150);

  const bytes = await pdfDoc.save();
  return new File(
    [bytes],
    `Notificacion_AMUC_Reserva_${reserva.id || 'nueva'}.pdf`,
    {type:'application/pdf'}
  );
}

function descargarArchivo(file){
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

async function prepararArchivosReserva(){
  if(!documentacionActual) throw new Error('No hay una reserva seleccionada.');
  if(documentacionActual.files) return documentacionActual.files;

  const [ficha,reglamento,listaInvitados,notificacion] = await Promise.all([
    crearFichaReservaPDF(documentacionActual.reserva,documentacionActual.cliente),
    crearReglamentoPDF(documentacionActual.reserva),
    crearListaInvitadosPDF(documentacionActual.reserva,documentacionActual.cliente),
    crearNotificacionPDF(documentacionActual.reserva,documentacionActual.cliente)
  ]);

  documentacionActual.files = [ficha,reglamento,listaInvitados,notificacion];
  return documentacionActual.files;
}

async function compartirArchivosReserva(){
  try{
    const files = await prepararArchivosReserva();
    const r = documentacionActual.reserva;
    const c = documentacionActual.cliente;
    const text = `Reserva Salón AMUC - ${docFechaAR(r.fecha)} - ${r.hora_inicio?.slice(0,5)} a ${r.hora_fin?.slice(0,5)} - ${nombreCompletoCliente(c)}`;

    if(navigator.share && navigator.canShare && navigator.canShare({files})){
      await navigator.share({
        title:'Documentación reserva Salón AMUC',
        text,
        files
      });
      return;
    }

    files.forEach(descargarArchivo);
    alert('Este navegador no permite adjuntar archivos desde la web. Los cuatro PDF fueron descargados para que puedas adjuntarlos en WhatsApp o correo.');
  }catch(err){
    console.error(err);
    alert('No se pudieron preparar los documentos: '+err.message);
  }
}

async function descargarFichaReserva(){
  try{
    const [ficha] = await prepararArchivosReserva();
    descargarArchivo(ficha);
  }catch(err){ alert(err.message); }
}

async function descargarReglamentoReserva(){
  try{
    const [,reglamento] = await prepararArchivosReserva();
    descargarArchivo(reglamento);
  }catch(err){ alert(err.message); }
}

async function descargarListaInvitadosReserva(){
  try{
    const [,,lista] = await prepararArchivosReserva();
    descargarArchivo(lista);
  }catch(err){ alert(err.message); }
}

async function descargarNotificacionReserva(){
  try{
    const [,,,notificacion] = await prepararArchivosReserva();
    descargarArchivo(notificacion);
  }catch(err){ alert(err.message); }
}

function textoMensajeReserva(){
  const r=documentacionActual.reserva;
  const c=documentacionActual.cliente;
  const fechaSalida=docFechaAR(fechaEgresoReserva(r));
  return `Hola ${c?.nombre||''}. Te enviamos la documentación correspondiente a tu reserva del Salón de Fiestas AMUC para el ${docFechaAR(r.fecha)}, de ${r.hora_inicio?.slice(0,5)} a ${r.hora_fin?.slice(0,5)} hs. Egreso: ${fechaSalida} ${r.hora_fin?.slice(0,5)} hs.`;
}

async function whatsappReserva(){
  const mensaje=encodeURIComponent(textoMensajeReserva());
  const tel=String(documentacionActual?.cliente?.telefono||'').replace(/\D/g,'');
  const url=tel ? `https://wa.me/${tel}?text=${mensaje}` : `https://wa.me/?text=${mensaje}`;
  window.open(url,'_blank');
}

function correoReserva(){
  const c=documentacionActual?.cliente||{};
  const r=documentacionActual?.reserva||{};
  const to=c.email||'';
  const subject=encodeURIComponent(`Documentación reserva Salón AMUC - ${docFechaAR(r.fecha)}`);
  const body=encodeURIComponent(textoMensajeReserva() + '\n\nSe adjuntan ficha del evento, reglamento de uso, lista de invitados y notificación.');
  window.location.href=`mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
}


async function cargarDocumentosAdjuntos(){
  const reservaId=documentacionActual?.reserva?.id;
  const box=document.getElementById('documentosAdjuntosLista');
  if(!reservaId || !box) return;

  box.innerHTML='<p class="muted">Cargando documentación adjunta...</p>';

  const {data,error}=await supabaseClient
    .from('reserva_documentos')
    .select('id,reserva_id,tipo_documento,nombre_archivo,ruta_storage,created_at,updated_at')
    .eq('reserva_id',reservaId)
    .order('tipo_documento');

  if(error){
    box.innerHTML=`<p class="error">No se pudo cargar la documentación adjunta: ${escDoc(error.message)}</p>`;
    return;
  }

  const mapa={};
  (data||[]).forEach(d=>mapa[d.tipo_documento]=d);

  const orden=['FICHA','REGLAMENTO','NOTIFICACION','LISTA_INVITADOS'];

  box.innerHTML=orden.map(tipo=>{
    const d=mapa[tipo];
    return `
      <div class="doc-upload-card ${d?'uploaded':'pending'}">
        <div class="doc-upload-info">
          <span class="eyebrow">${escDoc(TIPOS_DOCUMENTO[tipo])}</span>
          <strong>${d?'Adjuntado':'Pendiente'}</strong>
          <small>${d?escDoc(d.nombre_archivo):'PDF, JPG, JPEG o PNG'}</small>
        </div>
        <div class="doc-upload-actions">
          ${d?`<button type="button" class="btn btn-small btn-secondary doc-ver-btn" data-tipo="${tipo}">Ver</button>`:''}
          <button type="button" class="btn btn-small ${d?'btn-secondary':'btn-primary'} doc-cargar-btn" data-tipo="${tipo}">
            ${d?'Reemplazar':'Cargar'}
          </button>
          <input
            type="file"
            class="hidden doc-file-input"
            data-tipo="${tipo}"
            accept="application/pdf,image/jpeg,image/png"
          >
        </div>
      </div>
    `;
  }).join('');

  box.querySelectorAll('.doc-cargar-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      box.querySelector(`.doc-file-input[data-tipo="${btn.dataset.tipo}"]`)?.click();
    });
  });

  box.querySelectorAll('.doc-file-input').forEach(input=>{
    input.addEventListener('change',async()=>{
      const file=input.files?.[0];
      if(!file) return;
      await subirDocumentoReserva(input.dataset.tipo,file,mapa[input.dataset.tipo]||null);
      input.value='';
    });
  });

  box.querySelectorAll('.doc-ver-btn').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      const d=mapa[btn.dataset.tipo];
      if(d) await verDocumentoAdjunto(d);
    });
  });
}

async function subirDocumentoReserva(tipo,file,existente=null){
  const reservaId=documentacionActual?.reserva?.id;
  if(!reservaId){
    alert('Primero debe existir una reserva guardada.');
    return;
  }

  const permitidos=['application/pdf','image/jpeg','image/png'];
  if(!permitidos.includes(file.type)){
    alert('Formato no permitido. Utilizá PDF, JPG, JPEG o PNG.');
    return;
  }

  const maxBytes=10*1024*1024;
  if(file.size>maxBytes){
    alert('El archivo supera el máximo de 10 MB.');
    return;
  }

  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const nombreSeguro=slugArchivo(file.name||'documento');
  const ruta=`reserva_${reservaId}/${tipo.toLowerCase()}/${stamp}_${nombreSeguro}`;

  const confirmar=existente
    ? confirm(`Ya existe ${TIPOS_DOCUMENTO[tipo]}. ¿Desea reemplazarlo?`)
    : true;
  if(!confirmar) return;

  const {error:uploadError}=await supabaseClient.storage
    .from(DOCUMENTOS_BUCKET)
    .upload(ruta,file,{
      cacheControl:'3600',
      upsert:false,
      contentType:file.type
    });

  if(uploadError){
    alert('No se pudo cargar el archivo: '+uploadError.message);
    return;
  }

  let dbError=null;

  if(existente){
    const {error}=await supabaseClient
      .from('reserva_documentos')
      .update({
        nombre_archivo:file.name,
        ruta_storage:ruta,
        updated_at:new Date().toISOString()
      })
      .eq('id',existente.id);
    dbError=error;
  }else{
    const {error}=await supabaseClient
      .from('reserva_documentos')
      .insert({
        reserva_id:reservaId,
        tipo_documento:tipo,
        nombre_archivo:file.name,
        ruta_storage:ruta
      });
    dbError=error;
  }

  if(dbError){
    await supabaseClient.storage.from(DOCUMENTOS_BUCKET).remove([ruta]);
    alert('El archivo se cargó pero no pudo vincularse a la reserva: '+dbError.message);
    return;
  }

  if(existente?.ruta_storage && existente.ruta_storage!==ruta){
    await supabaseClient.storage
      .from(DOCUMENTOS_BUCKET)
      .remove([existente.ruta_storage]);
  }

  await cargarDocumentosAdjuntos();
}

async function verDocumentoAdjunto(doc){
  const {data,error}=await supabaseClient.storage
    .from(DOCUMENTOS_BUCKET)
    .createSignedUrl(doc.ruta_storage,60*10);

  if(error || !data?.signedUrl){
    alert('No se pudo abrir el documento: '+(error?.message||'URL no disponible'));
    return;
  }

  window.open(data.signedUrl,'_blank','noopener');
}

function mostrarDocumentosReserva(reserva,cliente){
  documentacionActual={reserva,cliente,files:null};

  const panel=document.getElementById('documentosReservaPanel');
  const resumen=document.getElementById('documentosReservaResumen');
  if(!panel||!resumen) return;

  resumen.innerHTML=`
    <div><span>Reserva</span><strong>#${reserva.id}</strong></div>
    <div><span>Cliente</span><strong>${nombreCompletoCliente(cliente)}</strong></div>
    <div><span>Evento</span><strong>${docFechaAR(reserva.fecha)} · ${reserva.hora_inicio?.slice(0,5)} a ${reserva.hora_fin?.slice(0,5)}</strong></div>
    <div><span>Documentos para entregar</span><strong>4 PDF</strong><small>Ficha + Reglamento + Lista de invitados + Notificación</small></div>
  `;
  panel.classList.remove('hidden');
  cargarDocumentosAdjuntos();
  panel.scrollIntoView({behavior:'smooth',block:'start'});
}

document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('compartirArchivosBtn')?.addEventListener('click',compartirArchivosReserva);
  document.getElementById('descargarFichaBtn')?.addEventListener('click',descargarFichaReserva);
  document.getElementById('descargarReglamentoBtn')?.addEventListener('click',descargarReglamentoReserva);
  document.getElementById('descargarListaInvitadosBtn')?.addEventListener('click',descargarListaInvitadosReserva);
  document.getElementById('descargarNotificacionBtn')?.addEventListener('click',descargarNotificacionReserva);
  document.getElementById('whatsappMensajeBtn')?.addEventListener('click',whatsappReserva);
  document.getElementById('correoMensajeBtn')?.addEventListener('click',correoReserva);
});
