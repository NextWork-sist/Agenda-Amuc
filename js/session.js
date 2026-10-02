
async function requireSession(opciones={}){
  const {rolesPermitidos=null, permitirSeguridad=false}=opciones;

  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session){
    location.href='../index.html';
    return null;
  }

  const {data:perfil,error}=await supabaseClient
    .from('perfiles')
    .select('nombre,apellido,rol,activo')
    .eq('id',session.user.id)
    .single();

  if(error || !perfil || !perfil.activo){
    await supabaseClient.auth.signOut();
    alert('Tu usuario no tiene un perfil activo.');
    location.href='../index.html';
    return null;
  }

  // Un usuario de Seguridad no entra a las pantallas administrativas.
  if(perfil.rol==='SEGURIDAD' && !permitirSeguridad){
    location.href='seguridad.html';
    return null;
  }

  if(Array.isArray(rolesPermitidos) && !rolesPermitidos.includes(perfil.rol)){
    location.href=perfil.rol==='SEGURIDAD'?'seguridad.html':'dashboard.html';
    return null;
  }

  const roleEl=document.getElementById('userRole');
  if(roleEl) roleEl.textContent=perfil.rol;

  const logout=document.getElementById('logoutBtn');
  if(logout){
    logout.addEventListener('click',async()=>{
      await supabaseClient.auth.signOut();
      location.href='../index.html';
    });
  }

  return {session,perfil};
}
