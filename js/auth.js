document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    window.location.href = 'pages/dashboard.html';
    return;
  }

  const form = document.getElementById('loginForm');
  const message = document.getElementById('loginMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    message.textContent = 'Ingresando...';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      message.textContent = 'No se pudo iniciar sesión. Verificá correo y contraseña.';
      message.className = 'form-message error';
      return;
    }

    window.location.href = 'pages/dashboard.html';
  });
});
