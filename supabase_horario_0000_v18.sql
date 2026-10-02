-- Agenda AMUC V18 - Soporte explícito para finalización 00:00
-- Las funciones existentes ya interpretan hora_fin <= hora_inicio como finalización al día siguiente.
-- Este archivo vuelve a dejar esa lógica asegurada en la función de disponibilidad y trigger.

create or replace function public.check_reservation_availability(
  p_fecha date,
  p_hora_inicio time,
  p_hora_fin time,
  p_exclude_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_start timestamp;
  new_end timestamp;
  r record;
  existing_start timestamp;
  existing_end timestamp;
  gap_minutes numeric;
  min_gap numeric := null;
  nearest_id bigint := null;
begin
  if p_fecha is null or p_hora_inicio is null or p_hora_fin is null then
    return jsonb_build_object('status','incomplete');
  end if;

  new_start := p_fecha + p_hora_inicio;
  new_end := p_fecha + p_hora_fin;

  if new_end <= new_start then
    new_end := new_end + interval '1 day';
  end if;

  for r in
    select id, fecha, hora_inicio, hora_fin
    from public.reservas
    where estado <> 'CANCELADA'
      and fecha is not null
      and hora_inicio is not null
      and hora_fin is not null
      and (p_exclude_id is null or id <> p_exclude_id)
  loop
    existing_start := r.fecha + r.hora_inicio;
    existing_end := r.fecha + r.hora_fin;

    if existing_end <= existing_start then
      existing_end := existing_end + interval '1 day';
    end if;

    if new_start < existing_end and new_end > existing_start then
      return jsonb_build_object(
        'status','overlap',
        'reservation_id',r.id
      );
    end if;

    if new_end <= existing_start then
      gap_minutes := extract(epoch from (existing_start - new_end)) / 60.0;
    elsif existing_end <= new_start then
      gap_minutes := extract(epoch from (new_start - existing_end)) / 60.0;
    else
      gap_minutes := null;
    end if;

    if gap_minutes is not null and gap_minutes >= 0 then
      if min_gap is null or gap_minutes < min_gap then
        min_gap := gap_minutes;
        nearest_id := r.id;
      end if;
    end if;
  end loop;

  if min_gap is not null and min_gap < 180 then
    return jsonb_build_object(
      'status','warning',
      'gap_minutes',round(min_gap),
      'reservation_id',nearest_id
    );
  end if;

  return jsonb_build_object('status','available');
end;
$$;

revoke all on function public.check_reservation_availability(date,time,time,bigint) from public;
grant execute on function public.check_reservation_availability(date,time,time,bigint) to authenticated;


create or replace function public.prevent_reservation_overlap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_start timestamp;
  new_end timestamp;
  conflict_id bigint;
begin
  if new.estado = 'CANCELADA' then
    return new;
  end if;

  if new.fecha is null or new.hora_inicio is null or new.hora_fin is null then
    return new;
  end if;

  new_start := new.fecha + new.hora_inicio;
  new_end := new.fecha + new.hora_fin;

  if new_end <= new_start then
    new_end := new_end + interval '1 day';
  end if;

  select r.id
    into conflict_id
  from public.reservas r
  where r.id <> coalesce(new.id, -1)
    and r.estado <> 'CANCELADA'
    and r.fecha is not null
    and r.hora_inicio is not null
    and r.hora_fin is not null
    and tsrange(
      r.fecha + r.hora_inicio,
      (r.fecha + r.hora_fin) +
        case when r.hora_fin <= r.hora_inicio then interval '1 day' else interval '0 day' end,
      '[)'
    ) && tsrange(new_start, new_end, '[)')
  limit 1;

  if conflict_id is not null then
    raise exception 'SUPERPOSICION_RESERVA: el horario se superpone con la reserva ID %', conflict_id
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_reservation_overlap on public.reservas;

create trigger trg_prevent_reservation_overlap
before insert or update of fecha, hora_inicio, hora_fin, estado
on public.reservas
for each row
execute function public.prevent_reservation_overlap();
