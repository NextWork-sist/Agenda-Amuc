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


## V7 - Seña 50%
- La seña pasa a ser del 50% del valor total del alquiler.
- El importe se calcula automáticamente al seleccionar Seña.
- El pago total descuenta la seña y cualquier pago previo, cobrando solo el saldo restante.
- No requiere cambios nuevos en Supabase respecto de la V6.


## V8 - Documentación automática al reservar

Al guardar una reserva:
- Se genera automáticamente `Salon_fiestas_ficha` con:
  - fecha del evento,
  - horario de inicio y fin,
  - cantidad de horas,
  - motivo,
  - apellido y nombre del responsable,
  - DNI,
  - teléfono,
  - correo electrónico,
  - fecha/hora de ingreso,
  - fecha/hora de egreso.
- Si el evento termina al día siguiente, la fecha de egreso se calcula automáticamente.
- El Reglamento de Uso se entrega sin modificaciones.
- En celulares compatibles, el botón "Compartir archivos" adjunta ambos PDF al menú nativo de compartir, donde puede elegirse WhatsApp, correo, etc.
- En navegadores sin soporte para compartir archivos, se pueden descargar ambos PDF y se ofrecen accesos a WhatsApp/correo para preparar el mensaje.

No requiere cambios nuevos en Supabase.


## V9 - Correcciones

1. Reservas:
   - Se corrigió el botón Eliminar.
   - Solo funciona para perfiles ADMINISTRADOR.
   - Solicita confirmación antes de borrar.
   - Los pagos asociados se eliminan por la relación ON DELETE CASCADE ya existente.

2. Ficha del salón:
   - Los datos completados automáticamente se imprimen 1 punto más grandes.

3. Ingreso y egreso:
   - Ingreso = 30 minutos antes del comienzo contratado.
   - Egreso = 30 minutos después del final contratado.
   - El cálculo ajusta automáticamente la fecha si se cruza la medianoche.
   - Ejemplo: alquiler 21:00 a 05:00 -> ingreso 20:30 / egreso 05:30 del día siguiente.

No requiere un SQL nuevo si ya se ejecutó `actualizacion_supabase_v4.sql`.


## V10 - Corrección botón eliminar reservas

- Se eliminó el `onclick` embebido del botón de papelera.
- Cada botón se vincula ahora mediante `addEventListener` después de renderizar la tabla.
- Se agrega confirmación, estado visual durante el borrado y aviso de éxito/error.
- Sigue restringido exclusivamente al rol ADMINISTRADOR.

No requiere SQL nuevo si ya se ejecutó la política de borrado de V4.


## V11 - Solicitudes WhatsApp
- Nueva pestaña Solicitudes WhatsApp.
- Estados: Pendiente, En revisión, Convertida y Descartada.
- Acciones: Tomar, Ver conversación, Crear reserva y Descartar.
- Crear reserva lleva los datos disponibles a la pantalla de Reservas.
- Dashboard muestra cantidad de solicitudes pendientes.
- Usa las tablas WhatsApp ya creadas en Supabase. No requiere SQL nuevo.


## V12 - Reportes
Se agregó `pages/reportes.html` y `js/reportes.js`.
Incluye:
- filtro Desde / Hasta;
- cantidad de alquileres y total contratado según fecha del evento;
- total cobrado según fecha efectiva del pago;
- saldo pendiente de las reservas del período;
- discriminación por medio de pago;
- gráficos mensuales de alquileres y recaudación;
- gráfico de distribución por medio de pago;
- tabla de movimientos;
- exportación CSV.
No requiere cambios en Supabase para esta versión.


## Ajuste PDF v2
El reporte PDF quedó reducido a:
- Página 1: Resumen general con Cantidad de alquileres, Total cobrado y Saldo pendiente.
- Página siguiente: Detalle de cobros.
Se eliminaron del PDF las tres páginas de gráficos.
Los gráficos continúan visibles dentro de la pestaña Reportes del sistema.


## V13 - Factura C / Remito y comprobantes de cobro
Cambios:
- Clientes: si requiere factura se registra Factura C; si no requiere factura, se muestra Remito.
- Se eliminan las opciones de Factura B en la interfaz.
- Cobros: se agregan Tipo de comprobante (Recibo C / Factura C) y Número de comprobante.
- Al elegir una reserva, el tipo sugerido es Factura C si el cliente requiere factura y Recibo C en caso contrario.
- El listado de cobros y los reportes muestran tipo y número de comprobante.
- El PDF de reportes incluye el comprobante en el detalle de cobros.

Requiere que en Supabase producción existan:
- pagos.tipo_comprobante
- pagos.numero_comprobante


## V14 - Buscador de comprobantes
En la pestaña Cobros se agregó búsqueda por número de Recibo C o Factura C.
- acepta número completo o parcial;
- ignora espacios, guiones, puntos y barras al comparar;
- permite buscar con botón o tecla Enter;
- botón Limpiar restaura todos los movimientos.
No requiere cambios adicionales en Supabase.


## V15 - Documentación adicional
Se incorporaron:
- Lista de invitados: logo AMUC + fecha del evento + hora de ingreso + responsable + teléfono.
- Notificación: aclaración + DNI + teléfono + fecha del evento.
El botón Compartir archivos ahora prepara 4 PDF: ficha, reglamento, lista de invitados y notificación.
La firma del responsable en la notificación queda libre.
La hora de ingreso se calcula 30 minutos antes del horario de inicio, igual que en la ficha.


## V16 - Legajo digital por reserva
Se agregó documentación adjunta permanente para cada evento:
- Ficha
- Reglamento
- Notificación
- Lista de invitados

Acepta PDF, JPG/JPEG y PNG, hasta 10 MB por archivo.
Cada documento queda vinculado al ID de la reserva en `reserva_documentos` y almacenado en el bucket privado `documentos-reservas`.
Desde la lista de reservas se agregó el botón "Documentos", que permite abrir el legajo de cualquier evento.
Cada tipo muestra estado Pendiente / Adjuntado y permite Ver / Reemplazar.

Antes de usar esta versión ejecutar `supabase_documentos_policies.sql` en Supabase producción.


## V17 - Panel exclusivo de Seguridad
Se agregó `pages/seguridad.html`.

Funciones:
- Login redirige automáticamente al rol SEGURIDAD a su panel.
- Seguridad no accede a Dashboard, Reservas, Clientes, Cobros ni Reportes.
- Vista de eventos de hoy / próximos 7 / próximos 30 días.
- Datos visibles: fecha, horario, tipo de evento, responsable, teléfono y cantidad de asistentes.
- Ingreso previsto y egreso previsto calculados con 30 minutos de margen.
- Acceso de sólo lectura a la Lista de Invitados cargada en el legajo.
- Registro de ingreso real y egreso real con fecha/hora y usuario automáticos.
- Observaciones inmutables vinculadas al evento y al usuario autenticado.

Antes de usarlo ejecutar `supabase_seguridad_v17.sql` en Supabase producción.
Después crear cada usuario en Authentication y su perfil correspondiente con rol `SEGURIDAD`.


## V18 - Finalización a las 00:00
- El campo Hora fin acepta expresamente `00:00`.
- Se agregó un botón rápido `00:00` junto al campo de hora final.
- `00:00` se interpreta como medianoche del día siguiente cuando la hora de inicio es anterior.
- Ejemplo: 18:00 a 00:00 = 6 horas exactas.
- El mismo criterio se mantiene para disponibilidad, superposición, ficha y egreso operativo.


## V19 - Edición completa y buscador de reservas
- Se agregó botón Editar en cada reserva para ADMINISTRADOR y ADMINISTRACION.
- La edición permite modificar cliente asociado, fecha, horario, tipo de evento, cantidad de personas, estado y observaciones.
- Horas, valor/hora y total se recalculan automáticamente.
- La validación de disponibilidad excluye la propia reserva mientras se edita.
- Se agregó búsqueda por:
  - N° de reserva.
  - N° de Recibo C / Factura C.
  - DNI del cliente.
- La búsqueda por DNI devuelve todas las reservas asociadas a ese cliente.
- No requiere cambios adicionales en Supabase.
