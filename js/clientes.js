let clienteEditandoId=null;
let perfilClientes=null;
let clientesGlobal=[];

function escCliente(v=''){
  return String(v)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function puedeEditarClientes(){
  return ['ADMINISTRADOR','ADMINISTRACION'].includes(perfilClientes?.rol);
}

function limpiarFormularioCliente(){
  clienteEditandoId=null;
  const form=document.getElementById('clienteForm');
  form?.reset();
  document.getElementById('facturacionFields')?.classList.add('hidden');
  document.getElementById('clienteEditBanner')?.classList.add('hidden');
  document.getElementById('cancelarEdicionClienteBtn2')?.classList.add('hidden');
  const btn=document.getElementById('guardarClienteBtn');
  if(btn)btn.textContent='Guardar cliente';
  const msg=document.getElementById('clienteMessage');
  if(msg){msg.textContent='';msg.className='form-message';}
}

function cargarClienteEnFormulario(c){
  if(!puedeEditarClientes()){
    alert('Tu usuario no tiene permisos para editar clientes.');
    return;
  }

  clienteEditandoId=c.id;
  const panel=document.getElementById('clienteFormPanel');
  panel.classList.remove('hidden');

  document.getElementById('nombre').value=c.nombre||'';
  document.getElementById('apellido').value=c.apellido||'';
  document.getElementById('dni').value=c.dni||'';
  document.getElementById('telefono').value=c.telefono||'';
  document.getElementById('email').value=c.email||'';
  document.getElementById('direccion').value=c.direccion||'';
  document.getElementById('afiliado').checked=Boolean(c.afiliado);
  document.getElementById('requiere_factura').checked=Boolean(c.requiere_factura);
  document.getElementById('razon_social').value=c.razon_social||'';
  document.getElementById('cuit').value=c.cuit||'';
  document.getElementById('direccion_fiscal').value=c.direccion_fiscal||'';
  document.getElementById('condicion_iva').value=c.condicion_iva||'';
  document.getElementById('observaciones').value=c.observaciones||'';
  document.getElementById('facturacionFields').classList.toggle('hidden',!c.requiere_factura);

  document.getElementById('clienteEditBanner').classList.remove('hidden');
  document.getElementById('clienteEditNombre').textContent=`#${c.id} · ${c.nombre||''} ${c.apellido||''}`.trim();
  document.getElementById('cancelarEdicionClienteBtn2').classList.remove('hidden');
  document.getElementById('guardarClienteBtn').textContent='Guardar cambios';
  document.getElementById('clienteMessage').textContent='';

  panel.scrollIntoView({behavior:'smooth',block:'start'});
}

async function guardarCliente(e){
  e.preventDefault();
  const msg=document.getElementById('clienteMessage');
  const fact=document.getElementById('requiere_factura');

  const payload={
    nombre:document.getElementById('nombre').value.trim(),
    apellido:document.getElementById('apellido').value.trim()||null,
    dni:document.getElementById('dni').value.trim(),
    telefono:document.getElementById('telefono').value.trim()||null,
    email:document.getElementById('email').value.trim()||null,
    direccion:document.getElementById('direccion').value.trim()||null,
    afiliado:document.getElementById('afiliado').checked,
    requiere_factura:fact.checked,
    razon_social:fact.checked?(document.getElementById('razon_social').value.trim()||null):null,
    cuit:fact.checked?(document.getElementById('cuit').value.trim()||null):null,
    direccion_fiscal:fact.checked?(document.getElementById('direccion_fiscal').value.trim()||null):null,
    tipo_factura:fact.checked?'C':null,
    condicion_iva:fact.checked?(document.getElementById('condicion_iva').value.trim()||null):null,
    observaciones:document.getElementById('observaciones').value.trim()||null
  };

  if(!payload.nombre || !payload.dni){
    msg.textContent='Nombre y DNI son obligatorios.';
    msg.className='form-message error';
    return;
  }

  msg.textContent=clienteEditandoId?'Guardando cambios...':'Guardando cliente...';
  msg.className='form-message';

  let error=null;
  if(clienteEditandoId){
    ({error}=await supabaseClient.from('clientes').update(payload).eq('id',clienteEditandoId));
  }else{
    ({error}=await supabaseClient.from('clientes').insert(payload));
  }

  if(error){
    msg.textContent='Error: '+error.message;
    msg.className='form-message error';
    return;
  }

  const editado=Boolean(clienteEditandoId);
  limpiarFormularioCliente();
  const panel=document.getElementById('clienteFormPanel');
  panel.classList.add('hidden');
  await loadClientes();
  alert(editado?'Cliente actualizado correctamente.':'Cliente guardado correctamente.');
}

function renderClientes(data){
  const b=document.getElementById('clientesTable');
  if(!data?.length){
    b.innerHTML='<p class="muted">Sin clientes.</p>';
    return;
  }

  const editar=puedeEditarClientes();
  b.innerHTML=`<table class="clientes-table">
    <thead><tr>
      <th>Cliente</th>
      <th>DNI</th>
      <th>Condición</th>
      <th>Teléfono</th>
      <th>Documento</th>
      ${editar?'<th>Editar</th>':''}
    </tr></thead>
    <tbody>${data.map(c=>`<tr>
      <td>${escCliente(`${c.nombre||''} ${c.apellido||''}`.trim())}</td>
      <td>${escCliente(c.dni||'-')}</td>
      <td>${c.afiliado?'AFILIADO':'NO AFILIADO'}</td>
      <td>${escCliente(c.telefono||'-')}</td>
      <td>${c.requiere_factura?'Factura C':'Remito'}</td>
      ${editar?`<td><button type="button" class="btn btn-small btn-secondary editar-cliente-btn" data-id="${c.id}">✏️ Editar</button></td>`:''}
    </tr>`).join('')}</tbody>
  </table>`;

  b.querySelectorAll('.editar-cliente-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const c=data.find(x=>String(x.id)===String(btn.dataset.id));
      if(c)cargarClienteEnFormulario(c);
    });
  });
}

async function loadClientes(){
  const{data,error}=await supabaseClient
    .from('clientes')
    .select('*')
    .order('apellido',{ascending:true})
    .order('nombre',{ascending:true});

  const b=document.getElementById('clientesTable');
  if(error){
    b.innerHTML=`<p class="error">${escCliente(error.message)}</p>`;
    return;
  }
  clientesGlobal=data||[];
  renderClientes(clientesGlobal);
}

document.addEventListener('DOMContentLoaded',async()=>{
  const c=await requireSession();
  if(!c)return;
  perfilClientes=c.perfil;

  const panel=document.getElementById('clienteFormPanel');
  const fact=document.getElementById('requiere_factura');
  const ff=document.getElementById('facturacionFields');

  document.getElementById('toggleFormBtn').onclick=()=>{
    if(!panel.classList.contains('hidden') && clienteEditandoId){
      limpiarFormularioCliente();
      panel.classList.add('hidden');
      return;
    }
    if(panel.classList.contains('hidden')) limpiarFormularioCliente();
    panel.classList.toggle('hidden');
  };

  fact.onchange=()=>ff.classList.toggle('hidden',!fact.checked);
  document.getElementById('clienteForm').addEventListener('submit',guardarCliente);
  document.getElementById('cancelarEdicionClienteBtn')?.addEventListener('click',()=>{
    limpiarFormularioCliente();
    panel.classList.add('hidden');
  });
  document.getElementById('cancelarEdicionClienteBtn2')?.addEventListener('click',()=>{
    limpiarFormularioCliente();
    panel.classList.add('hidden');
  });

  await loadClientes();
});
