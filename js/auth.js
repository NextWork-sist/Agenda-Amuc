
async function obtenerPerfilLogin(session){
  if(!session) return null;
  const {data:perfil,error}=await supabaseClient
    .from('perfiles')
    .select('nombre,apellido,rol,activo')
    .eq('id',session.user.id)
    .single();

  if(error || !perfil || !perfil.activo) return null;
  return perfil;
}

function destinoPorRol(perfil){
  return perfil?.rol==='SEGURIDAD'
    ? 'pages/seguridad.html'
    : 'pages/dashboard.html';
}

document.addEventListener('DOMContentLoaded',async()=>{
  const {data:{session}}=await supabaseClient.auth.getSession();

  if(session){
    const perfil=await obtenerPerfilLogin(session);
    if(perfil){
      location.href=destinoPorRol(perfil);
      return;
    }
    await supabaseClient.auth.signOut();
  }

  document.getElementById('loginForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const m=document.getElementById('loginMessage');
    m.textContent='Ingresando...';
    m.className='form-message';

    const {data,error}=await supabaseClient.auth.signInWithPassword({
      email:document.getElementById('email').value.trim(),
      password:document.getElementById('password').value
    });

    if(error){
      m.textContent='No se pudo iniciar sesión.';
      m.className='form-message error';
      return;
    }

    const perfil=await obtenerPerfilLogin(data.session);
    if(!perfil){
      await supabaseClient.auth.signOut();
      m.textContent='Tu usuario no tiene un perfil activo.';
      m.className='form-message error';
      return;
    }

    location.href=destinoPorRol(perfil);
  });
});
