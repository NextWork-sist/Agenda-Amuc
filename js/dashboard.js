function money(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-AR').format(new Date(value + 'T12:00:00'));
}

document.addEventListener('DOMContentLoaded', async () => {
  const ctx = await requireSession();
  if (!ctx) return;

  document.getElementById('welcomeText').textContent =
    `Bienvenido, ${ctx.perfil.nombre} ${ctx.perfil.apellido || ''}`.trim();

  const [{ data: reservas }, { data: clientes }, { data: pagos }] = await Promise.all([
    supabaseClient.from('reservas').select('id, fecha, tipo_evento, valor_total, estado, clientes(nombre, apellido)').order('fecha', { ascending: true }),
    supabaseClient.from('clientes').select('id'),
    supabaseClient.from('pagos').select('importe')
  ]);

  const reservasList = reservas || [];
  const pagosList = pagos || [];

  document.getElementById('statReservas').textContent = reservasList.length;
  document.getElementById('statClientes').textContent = (clientes || []).length;
  document.getElementById('statTotalReservado').textContent =
    money(reservasList.reduce((sum, r) => sum + Number(r.valor_total || 0), 0));
  document.getElementById('statCobrado').textContent =
    money(pagosList.reduce((sum, p) => sum + Number(p.importe || 0), 0));

  const hoy = new Date().toISOString().slice(0, 10);
  const proximas = reservasList.filter(r => r.fecha >= hoy && r.estado !== 'CANCELADA').slice(0, 8);
  const box = document.getElementById('proximasReservas');

  if (!proximas.length) {
    box.innerHTML = '<p class="muted">Todavía no hay próximas reservas.</p>';
    return;
  }

  box.innerHTML = `
    <table>
      <thead><tr><th>Fecha</th><th>Cliente</th><th>Evento</th><th>Estado</th><th>Valor</th></tr></thead>
      <tbody>
        ${proximas.map(r => `
          <tr>
            <td>${formatDate(r.fecha)}</td>
            <td>${r.clientes ? `${r.clientes.nombre || ''} ${r.clientes.apellido || ''}` : '-'}</td>
            <td>${r.tipo_evento || '-'}</td>
            <td><span class="badge">${r.estado.replace('_', ' ')}</span></td>
            <td>${money(r.valor_total)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
});
