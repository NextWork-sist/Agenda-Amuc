async function requireSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = '../index.html';
    return null;
  }

  const { data: perfil, error } = await supabaseClient
    .from('perfiles')
    .select('nombre, apellido, rol, activo')
    .eq('id', session.user.id)
    .single();

  if (error || !perfil || !perfil.activo) {
    await supabaseClient.auth.signOut();
    alert('Tu usuario no tiene un perfil activo en Agenda AMUC.');
    window.location.href = '../index.html';
    return null;
  }

  const roleEl = document.getElementById('userRole');
  if (roleEl) roleEl.textContent = perfil.rol;

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      window.location.href = '../index.html';
    });
  }

  return { session, perfil };
}
