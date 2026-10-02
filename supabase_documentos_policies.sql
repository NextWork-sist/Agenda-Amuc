-- Agenda AMUC - Legajo digital de reservas
-- Ejecutar una sola vez en Supabase PRODUCCIÓN.

-- 1) RLS para la tabla reserva_documentos
alter table public.reserva_documentos enable row level security;

drop policy if exists "Usuarios autenticados leen documentos de reservas" on public.reserva_documentos;
create policy "Usuarios autenticados leen documentos de reservas"
on public.reserva_documentos
for select
to authenticated
using (true);

drop policy if exists "Usuarios autenticados cargan documentos de reservas" on public.reserva_documentos;
create policy "Usuarios autenticados cargan documentos de reservas"
on public.reserva_documentos
for insert
to authenticated
with check (true);

drop policy if exists "Usuarios autenticados actualizan documentos de reservas" on public.reserva_documentos;
create policy "Usuarios autenticados actualizan documentos de reservas"
on public.reserva_documentos
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Usuarios autenticados eliminan documentos de reservas" on public.reserva_documentos;
create policy "Usuarios autenticados eliminan documentos de reservas"
on public.reserva_documentos
for delete
to authenticated
using (true);

-- 2) Storage privado: permisos sólo para usuarios autenticados.
-- El bucket debe llamarse exactamente: documentos-reservas

drop policy if exists "Usuarios autenticados leen documentos reservas storage" on storage.objects;
create policy "Usuarios autenticados leen documentos reservas storage"
on storage.objects
for select
to authenticated
using (bucket_id = 'documentos-reservas');

drop policy if exists "Usuarios autenticados cargan documentos reservas storage" on storage.objects;
create policy "Usuarios autenticados cargan documentos reservas storage"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'documentos-reservas');

drop policy if exists "Usuarios autenticados actualizan documentos reservas storage" on storage.objects;
create policy "Usuarios autenticados actualizan documentos reservas storage"
on storage.objects
for update
to authenticated
using (bucket_id = 'documentos-reservas')
with check (bucket_id = 'documentos-reservas');

drop policy if exists "Usuarios autenticados eliminan documentos reservas storage" on storage.objects;
create policy "Usuarios autenticados eliminan documentos reservas storage"
on storage.objects
for delete
to authenticated
using (bucket_id = 'documentos-reservas');
