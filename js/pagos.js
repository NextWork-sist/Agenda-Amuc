function money(value) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(value || 0));
}

document.addEventListener('DOMContentLoaded', async () => {
  const ctx = await requireSession();
  if (!ctx) return;

  const panel = document.getElementById('pagoFormPanel');
  document.getElementById('toggleFormBtn').addEventListener('click', () => panel.classList.toggle('hidden'));

  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('fecha').value = now.toISOString().slice(0,16);

  await loadReservasSelect();
  await loadPagos();

  document.getElementById('pagoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('pagoMessage');
    msg.textContent = 'Guardando...';

    const payload = {
      reserva_id: Number(document.getElementById('reserva_id').value),
      concepto: document.getElementById('concepto').value,
      medio_pago: document.getElementById('medio_pago').value,
      importe: Number(document.getElementById('importe').value),
      fecha: document.getElementById('fecha').value ? new Date(document.getElementById('fecha').value).toISOString() : new Date().toISOString(),
      observaciones: document.getElementById('observaciones').value.trim() || null
    };

    const { error } = await supabaseClient.from('pagos').insert(payload);
    if (error) {
      msg.textContent = 'Error al guardar: ' + error.message;
      msg.className = 'form-message error';
      return;
    }

    msg.textContent = 'Cobro registrado.';
    msg.className = 'form-message success';
    document.getElementById('pagoForm').reset();
    await loadPagos();
  });
});

async function loadReservasSelect() {
  const { data } = await supabaseClient
    .from('reservas')
    .select('id,fecha,tipo_evento,clientes(nombre,apellido)')
    .order('fecha', { ascending: false });

  document.getElementById('reserva_id').innerHTML =
    '<option value="">Seleccionar reserva</option>' +
    (data || []).map(r => {
      const cliente = r.clientes ? `${r.clientes.nombre || ''} ${r.clientes.apellido || ''}` : '';
      return `<option value="${r.id}">#${r.id} - ${r.fecha} - ${cliente} - ${r.tipo_evento || 'Evento'}</option>`;
    }).join('');
}

async function loadPagos() {
  const { data, error } = await supabaseClient
    .from('pagos')
    .select('id,fecha,concepto,medio_pago,importe,reservas(id,fecha,tipo_evento,clientes(nombre,apellido))')
    .order('fecha', { ascending: false });

  const box = document.getElementById('pagosTable');
  if (error) {
    box.innerHTML = `<p class="form-message error">${error.message}</p>`;
    return;
  }
  if (!data.length) {
    box.innerHTML = '<p class="muted">Todavía no hay cobros registrados.</p>';
    return;
  }

  box.innerHTML = `
    <table>
      <thead><tr><th>Fecha</th><th>Reserva</th><th>Cliente</th><th>Concepto</th><th>Medio</th><th>Importe</th></tr></thead>
      <tbody>
        ${data.map(p => {
          const r = p.reservas;
          const c = r && r.clientes ? `${r.clientes.nombre || ''} ${r.clientes.apellido || ''}` : '-';
          return `<tr>
            <td>${new Date(p.fecha).toLocaleString('es-AR')}</td>
            <td>#${r ? r.id : '-'}</td>
            <td>${c}</td>
            <td>${p.concepto || '-'}</td>
            <td>${p.medio_pago || '-'}</td>
            <td>${money(p.importe)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}
