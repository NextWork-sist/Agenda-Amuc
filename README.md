# Agenda AMUC - V5

## Cambio principal: disponibilidad del salón

Se incorporan tres reglas:

1. **Superposición de horarios:** IMPOSIBLE.
   - Si ya existe una reserva de 09:00 a 12:00, no se puede crear otra que ocupe ninguna parte de ese horario.
   - El control se hace en la página y también mediante un trigger en Supabase.

2. **Separación recomendada:** 3 horas.
   - Si una nueva reserva queda a menos de 3 horas de otra, aparece una advertencia.
   - El usuario puede confirmar y guardar igualmente.

3. **Tres horas o más:**
   - El sistema informa que el horario está disponible y guarda normalmente.

También contempla reservas que terminan después de medianoche.

## Instalación

1. Ejecutar `actualizacion_supabase_v5.sql` en Supabase -> SQL Editor.
2. Subir/reemplazar los archivos del proyecto en GitHub.
3. Probar los siguientes casos:
   - Existente 09:00-12:00 / nueva 11:00-13:00 -> debe bloquear.
   - Existente 09:00-12:00 / nueva 13:00-15:00 -> debe advertir (1 hora de separación) y permitir confirmar.
   - Existente 09:00-12:00 / nueva 15:00-17:00 -> debe permitir sin advertencia.
   - Existente 21:00-02:00 / nueva 01:00-04:00 del día siguiente -> debe bloquear.
