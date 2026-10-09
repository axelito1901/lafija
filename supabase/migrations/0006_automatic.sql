-- =====================================================================
-- La Fija · avisos automáticos para ahorrarle trabajo al complejo
--  · Recordatorio al jugador: 24 hs antes ("Mañana jugás") y 2 hs antes ("Tu partido es en un rato").
--  · Lista de espera con fila: el primero anotado tiene 10 minutos de ventaja; después se avisa al resto.
--  · Resumen semanal para el dueño: los lunes, con reservas, cobrado y ocupación de la semana anterior.
-- Son filas en public.notifications (si configuraste PUSH.md, llegan con la app cerrada).
-- Correr una vez en el SQL Editor, después de 0001–0005.
-- =====================================================================

alter table public.bookings add column if not exists remind_day_at timestamptz;
alter table public.bookings add column if not exists remind_hour_at timestamptz;
alter table public.waitlist add column if not exists freed_at timestamptz;

create or replace function public.booking_start(b public.bookings) returns timestamptz
language sql stable as $$
  select (b.booking_date + b.booking_time::time) at time zone 'America/Argentina/Buenos_Aires'
$$;

-- Lista de espera: al liberarse un horario, solo el primero de la fila recibe el aviso enseguida.
-- (Reemplaza el bucle de notify_booking, que avisaba a todos a la vez.)
create or replace function public.notify_booking() returns trigger
language plpgsql security definer set search_path = public as $$
declare c record; ct record; w record; whenx text; first_id uuid;
begin
  select * into c from public.complexes where id = new.complex_id;
  select * into ct from public.courts where id = new.court_id;
  whenx := to_char(new.booking_date, 'DD/MM') || ' ' || new.booking_time;
  if tg_op = 'INSERT' then
    if new.source = 'app' and new.player_id is not null and auth.uid() = new.player_id then
      perform public.add_notification(c.owner_id, 'booking_new', 'Nueva reserva', new.player_name || ' · ' || ct.name || ' · ' || whenx, new.id, new.complex_id, new.booking_date, null);
    end if;
    return new;
  end if;
  if new.paid_cents > old.paid_cents then
    perform public.add_notification(c.owner_id, 'payment', 'Pago recibido', new.player_name || ' · ' || ct.name || ' · ' || whenx, new.id, new.complex_id, new.booking_date, null);
    perform public.add_notification(new.player_id, 'payment_ok', case when new.paid_cents >= new.total_cents then 'Pago aprobado' else 'Seña pagada' end, c.name || ' · ' || ct.name || ' · ' || whenx, new.id, new.complex_id, new.booking_date, '/reservas');
  end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    if new.cancelled_by = 'player' then
      perform public.add_notification(c.owner_id, 'booking_cancelled', 'Reserva cancelada', new.player_name || ' canceló ' || ct.name || ' · ' || whenx, new.id, new.complex_id, new.booking_date, null);
    elsif new.player_id is not null and new.cancelled_by is distinct from 'system' then
      perform public.add_notification(new.player_id, 'booking_cancelled', 'El complejo canceló tu reserva', c.name || ' · ' || whenx, new.id, new.complex_id, new.booking_date, '/reservas');
    end if;
    update public.waitlist set freed_at = now()
      where court_id = new.court_id and slot_date = new.booking_date and slot_time = new.booking_time and notified_at is null and player_id is distinct from new.player_id;
    select id into first_id from public.waitlist
      where court_id = new.court_id and slot_date = new.booking_date and slot_time = new.booking_time and notified_at is null and player_id is distinct from new.player_id
      order by created_at limit 1;
    if first_id is not null then
      select * into w from public.waitlist where id = first_id;
      update public.waitlist set notified_at = now() where id = first_id;
      perform public.add_notification(w.player_id, 'waitlist', 'Se liberó tu horario', c.name || ' · ' || ct.name || ' · ' || whenx || '. Sos el primero en la fila: tenés 10 minutos antes que avisemos al resto.', null, new.complex_id, new.booking_date,
        '/complejo/' || c.slug || '/reservar?fecha=' || new.booking_date || '&cancha=' || new.court_id || '&hora=' || new.booking_time);
    end if;
  end if;
  return new;
end $$;

-- Genera los avisos pendientes. La llama el cron cada 10 minutos; es seguro llamarla de más.
create or replace function public.send_automatic_notices() returns integer
language plpgsql security definer set search_path = public as $$
declare
  r record; w record; c record; n integer := 0; left_h numeric; debt text; ar timestamp := (now() at time zone 'America/Argentina/Buenos_Aires');
  monday date; wk_from date; wk_to date; slots_day integer; open_m integer; close_m integer; booked integer; income bigint; tot integer; courts integer;
begin
  -- 1. Recordatorios al jugador.
  for r in
    select b.*, public.booking_start(b) as start_at from public.bookings b
    where b.player_id is not null and b.status in ('confirmed','deposit_paid')
      and public.booking_start(b) > now() and public.booking_start(b) <= now() + interval '24 hours'
      and (b.remind_hour_at is null or b.remind_day_at is null)
  loop
    left_h := extract(epoch from (r.start_at - now())) / 3600;
    select cx.name as cname, ct.name as tname into c from public.complexes cx, public.courts ct where cx.id = r.complex_id and ct.id = r.court_id;
    debt := case when r.total_cents - r.paid_cents > 0 then ' Resta pagar $' || replace(to_char((r.total_cents - r.paid_cents) / 100, 'FM999,999,999'), ',', '.') || ' en la cancha.' else '' end;
    if left_h <= 2 and r.remind_hour_at is null then
      update public.bookings set remind_hour_at = now(), remind_day_at = coalesce(remind_day_at, now()) where id = r.id;
      insert into public.notifications (user_id, type, title, text, booking_id, complex_id, date, link)
      values (r.player_id, 'reminder', 'Tu partido es en un rato', c.cname || ' · ' || c.tname || ' · hoy a las ' || r.booking_time || '.' || debt || ' ¡Ya andá saliendo!', r.id, r.complex_id, r.booking_date, '/reservas');
      n := n + 1;
    elsif left_h > 3 and r.remind_day_at is null then
      update public.bookings set remind_day_at = now() where id = r.id;
      insert into public.notifications (user_id, type, title, text, booking_id, complex_id, date, link)
      values (r.player_id, 'reminder', case when r.booking_date = ar::date then 'Hoy jugás' else 'Mañana jugás' end, c.cname || ' · ' || c.tname || ' · ' || r.booking_time || '.' || debt || ' Si no podés ir, cancelá con tiempo para que otro lo aproveche.', r.id, r.complex_id, r.booking_date, '/reservas');
      n := n + 1;
    end if;
  end loop;

  -- 2. Lista de espera: pasada la ventaja de 10 minutos, avisar al resto si el horario sigue libre.
  for w in
    select * from public.waitlist where notified_at is null and freed_at is not null and freed_at <= now() - interval '10 minutes'
  loop
    update public.waitlist set notified_at = now() where id = w.id;
    if not exists (select 1 from public.bookings b where b.court_id = w.court_id and b.booking_date = w.slot_date and b.booking_time = w.slot_time and b.status in ('pending','deposit_paid','confirmed','completed')) then
      select cx.name as cname, cx.slug as slug, ct.name as tname into c from public.complexes cx, public.courts ct where cx.id = w.complex_id and ct.id = w.court_id;
      insert into public.notifications (user_id, type, title, text, complex_id, date, link)
      values (w.player_id, 'waitlist', 'Se liberó un horario', c.cname || ' · ' || c.tname || ' · ' || to_char(w.slot_date, 'DD/MM') || ' ' || w.slot_time || '. Reservalo antes que otro.', w.complex_id, w.slot_date,
        '/complejo/' || c.slug || '/reservar?fecha=' || w.slot_date || '&cancha=' || w.court_id || '&hora=' || w.slot_time);
      n := n + 1;
    end if;
  end loop;

  -- 3. Resumen semanal: los lunes desde las 8, de la semana anterior (lunes a domingo). Una vez por complejo y semana.
  if extract(dow from ar) = 1 and ar::time >= '08:00' then
    monday := ar::date; wk_from := monday - 7; wk_to := monday - 1;
    for c in select * from public.complexes where active loop
      continue when exists (select 1 from public.notifications where user_id = c.owner_id and type = 'weekly' and complex_id = c.id and date = monday);
      select count(*), coalesce(sum(paid_cents), 0) into booked, income from public.bookings
        where complex_id = c.id and booking_date between wk_from and wk_to and status in ('confirmed','deposit_paid','completed');
      continue when not exists (select 1 from public.bookings where complex_id = c.id);
      select count(*) into courts from public.courts where complex_id = c.id and status = 'active';
      open_m := split_part(c.hours->>'open', ':', 1)::int * 60 + split_part(c.hours->>'open', ':', 2)::int;
      close_m := split_part(c.hours->>'close', ':', 1)::int * 60 + split_part(c.hours->>'close', ':', 2)::int;
      if close_m <= open_m then close_m := close_m + 1440; end if;
      slots_day := greatest(1, (close_m - open_m) / greatest(30, coalesce((c.hours->>'slotMinutes')::int, 60)));
      tot := greatest(1, courts * slots_day * 7);
      insert into public.notifications (user_id, type, title, text, complex_id, date, link)
      values (c.owner_id, 'weekly', 'Tu semana en ' || c.name,
        booked || case when booked = 1 then ' reserva' else ' reservas' end || ' · $' || replace(to_char(income / 100, 'FM999,999,999'), ',', '.') || ' cobrados · ' || least(100, round(booked * 100.0 / tot)) || '% de ocupación.',
        c.id, monday, '/dueno/estadisticas');
      n := n + 1;
    end loop;
  end if;
  return n;
end $$;
revoke all on function public.send_automatic_notices() from public, anon, authenticated;

do $$ begin
  create extension if not exists pg_cron;
  perform cron.unschedule('la-fija-automaticos') where exists (select 1 from cron.job where jobname = 'la-fija-automaticos');
  perform cron.schedule('la-fija-automaticos', '*/10 * * * *', 'select public.send_automatic_notices()');
exception when others then
  raise notice 'No se pudo programar el aviso automático (%). Activá la extensión pg_cron en Database → Extensions y volvé a correr este archivo.', sqlerrm;
end $$;
