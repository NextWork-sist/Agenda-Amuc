# Agenda AMUC

Primera versión funcional del sistema de reservas del Salón de Fiestas AMUC.

## Incluye
- Login con Supabase Auth
- Perfil de usuario
- Dashboard
- Alta y listado de clientes
- Alta y listado de reservas
- Registro y listado de cobros
- Diseño responsive para PC y celular

## Publicación en GitHub Pages
1. Subir todos los archivos respetando la estructura de carpetas.
2. Ir a Settings > Pages.
3. En Build and deployment elegir "Deploy from a branch".
4. Seleccionar la rama `main` y carpeta `/ (root)`.
5. Guardar.

## Importante
El archivo `js/supabase.js` contiene únicamente la URL pública y la Publishable Key.
Nunca agregar una `secret key` ni una `service_role` al repositorio.
