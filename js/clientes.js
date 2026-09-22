document.addEventListener('DOMContentLoaded', async () => {
  const ctx = await requireSession();
  if (!ctx) return;

  const panel = document.getElementById('clienteFormPanel');
  document.getElementById('toggleFormBtn').addEventListener('click', () => panel.classList.toggle('hidden'));

  const form = document.getElementById('clienteForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('clienteMessage');
    msg.textContent = 'Guardando...';

    const payload = {
      nombre: document.getElementById('nombre').value.trim(),
      apellido: document.getElementById('apellido').value.trim() || null,
      dni: document.getElementById('dni').value.trim() || null,
      telefono: document.getElementById('telefono').value.trim() || null,
      email: document.getElementById('email').value.trim() || null,
      direccion: document.getElementById('direccion').value.trim() || null,
      observaciones: document.getElementById('observaciones').value.trim() || null
    };

    const { error } = await supabaseClient.from('clientes').insert(payload);
    if (error) {
      msg.textContent = 'Error al guardar: ' + error.message;
      msg.className = 'form-message error';
      return;
    }

    msg.textContent = 'Cliente guardado.';
    msg.className = 'form-message success';
    form.reset();
    await loadClientes();
  });

  await loadClientes();
});

async function loadClientes() {
  const { data, error } = await supabaseClient.from('clientes').select('*').order('created_at', { ascending: false });
  const box = document.getElementById('clientesTable');
  if (error) {
    box.innerHTML = `<p class="form-message error">${error.message}</p>`;
    return;
  }
  if (!data.length) {
    box.innerHTML = '<p class="muted">Todavía no hay clientes registrados.</p>';
    return;
  }
  box.innerHTML = `
    <table>
      <thead><tr><th>Cliente</th><th>DNI/CUIT</th><th>Teléfono</th><th>Email</th></tr></thead>
      <tbody>
        ${data.map(c => `<tr>
          <td>${c.nombre || ''} ${c.apellido || ''}</td>
          <td>${c.dni || '-'}</td>
          <td>${c.telefono || '-'}</td>
          <td>${c.email || '-'}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}
