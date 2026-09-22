function money(value) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value || 0));
}
function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-AR').format(new Date(value + 'T12:00:00'));
}

document.addEventListener('DOMContentLoaded', async () => {
  const ctx = await requireSession();
  if (!ctx) return;

  const panel = document.getElementById('reservaFormPanel');
  document.getElementById('toggleFormBtn').addEventListener('click', () => panel.classList.toggle('hidden'));

  await loadClientesSelect();
  await loadReservas();

  document.getElementById('reservaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('reservaMessage');
    msg.textContent = 'Guardando...';

    const payload = {
      cliente_id: Number(document.getElementById('cliente_id').value),
      fecha: document.getElementById('fecha').value,
      hora_inicio: document.getElementById('hora_inicio').value || null,
      hora_fin: document.getElementById('hora_fin').value || null,
      tipo_evento: document.getElementById('tipo_evento').value.trim() || null,
      cantidad_personas: Number(document.getElementById('cantidad_personas').value || 0),
      valor_total: Number(document.getElementById('valor_total').value || 0),
      estado: document.getElementById('estado').value,
      observaciones: document.getElementById('observaciones').value.trim() || null
    };

    const { error } = await supabaseClient.from('reservas').insert(payload);
    if (error) {
      msg.textContent = 'Error al guardar: ' + error.message;
      msg.className = 'form-message error';
      return;
    }

    msg.textContent = 'Reserva guardada.';
    msg.className = 'form-message success';
    document.getElementById('reservaForm').reset();
    await loadReservas();
  });
});

async function loadClientesSelect() {
  const { data } = await supabaseClient.from('clientes').select('id,nombre,apellido').order('apellido');
  const sel = document.getElementById('cliente_id');
  sel.innerHTML = '<option value="">Seleccionar cliente</option>' +
    (data || []).map(c => `<option value="${c.id}">${c.nombre} ${c.apellido || ''}</option>`).join('');
}

async function loadReservas() {
  const { data, error } = await supabaseClient
    .from('reservas')
    .select('id,fecha,hora_inicio,hora_fin,tipo_evento,cantidad_personas,valor_total,estado,clientes(nombre,apellido)')
    .order('fecha', { ascending: false });

  const box = document.getElementById('reservasTable');
  if (error) {
    box.innerHTML = `<p class="form-message error">${error.message}</p>`;
    return;
  }
  if (!data.length) {
    box.innerHTML = '<p class="muted">Todavía no hay reservas registradas.</p>';
    return;
  }
  box.innerHTML = `
    <table>
      <thead><tr><th>Fecha</th><th>Cliente</th><th>Evento</th><th>Horario</th><th>Personas</th><th>Estado</th><th>Valor</th></tr></thead>
      <tbody>
        ${data.map(r => `<tr>
          <td>${formatDate(r.fecha)}</td>
          <td>${r.clientes ? `${r.clientes.nombre || ''} ${r.clientes.apellido || ''}` : '-'}</td>
          <td>${r.tipo_evento || '-'}</td>
          <td>${r.hora_inicio ? r.hora_inicio.slice(0,5) : '-'} / ${r.hora_fin ? r.hora_fin.slice(0,5) : '-'}</td>
          <td>${r.cantidad_personas || 0}</td>
          <td><span class="badge">${r.estado.replace('_',' ')}</span></td>
          <td>${money(r.valor_total)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}
