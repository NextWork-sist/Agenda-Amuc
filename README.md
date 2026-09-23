# Agenda AMUC - V6

## Cambio principal: disponibilidad de horarios

La verificación visual y el guardado ahora usan la misma función de Supabase.

Reglas:
- Superposición de horarios: BLOQUEADA siempre.
- Separación menor a 3 horas sin superposición: muestra:
  "Tiempo entre reservas menor a tres horas. ¿Desea agendar el turno de igual manera?"
  y permite continuar si el operador confirma.
- Separación de 3 horas o más: horario disponible.

## Instalación

1. Ejecutar `actualizacion_supabase_v6.sql` en Supabase > SQL Editor.
2. Reemplazar los archivos del repositorio por los incluidos en este ZIP.
3. Conservar aplicado el SQL de V5, porque su trigger es la protección final contra superposiciones simultáneas.

También se mantiene el último ajuste visual de la ficha del cliente.
