# Agenda AMUC - V4

## Cambios incorporados

- Administradores pueden eliminar reservas y cobros desde la interfaz.
- El borrado está protegido también por RLS en Supabase.
- La seña se calcula automáticamente como el 20% del alquiler.
- "Pago total / saldo" calcula solamente el saldo restante y descuenta señas y pagos anteriores.
- Se mantienen pagos parciales opcionales.
- El selector de cobros muestra solo reservas con saldo pendiente.
- Una reserva desaparece del selector cuando queda totalmente abonada.
- El inicio muestra una alerta cuando un evento está dentro de los próximos 3 días y tiene saldo pendiente.
- Si el cliente tiene teléfono cargado, la alerta incluye un botón para preparar un mensaje de WhatsApp.

## Importante
Antes de publicar esta versión, ejecutar `actualizacion_supabase_v4.sql` en Supabase > SQL Editor.

La alerta es interna en Agenda AMUC. El botón de WhatsApp abre el mensaje preparado; el envío automático sin intervención requeriría una integración posterior con WhatsApp Business/Meta y una tarea programada.
