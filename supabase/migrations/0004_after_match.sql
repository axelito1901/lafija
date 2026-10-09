-- =====================================================================
-- La Fija · después del partido
--  · Aviso para calificar (30 minutos después de terminar) y para volver a jugar (3 días después).
--  · Etiquetas en las reseñas ("Cancha en buen estado", "Poca luz"…).
--  · Aviso al dueño cuando recibe una reseña y al jugador cuando el complejo le responde.
-- Los avisos son filas en public.notifications: si configuraste los avisos push (PUSH.md),
-- llegan también con la app cerrada. Correr una vez en el SQL Editor, después de 0001.
-- =====================================================================

alter table public.reviews add column if not exists tags text[] not null default '{}';
alter table public.bookings add column if not exists rate_notice_at timestamptz;
alter table public.bookings add column if not exists rebook_notice_at timestamptz;

-- Una reseña por partido.
create unique index if not exists reviews_one_per_booking on public.reviews (booking_id) where booking_id is not null;

-- El dueño solo puede responder: tampoco puede tocar las etiquetas.
create or replace function public.guard_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if new.player_id is distinct from auth.uid() then raise exception 'La reseña tiene que ser tuya.'; end if;
    if not exists (select 1 from public.bookings where id = new.booking_id and player_id = auth.uid()) then raise exception 'Solo podés reseñar canchas donde reservaste.'; end if;
    new.hidden := false; new.reported := false; new.reply := null;
    return new;
  end if;
  if public.owns_complex(old.complex_id) then
    if (new.rating, new.text, new.tags, new.hidden, new.reported) is distinct from (old.rating, old.text, old.tags, old.hidden, old.reported) then raise exception 'Solo podés responder.'; end if;
    return new;
  end if;
  raise exception 'No podés modificar esta reseña.';
end $$;

-- Hora de fin de una reserva (los horarios están en hora de Argentina).
create or replace function public.booking_end(b public.bookings) returns timestamptz
language sql stable as $$
  select ((b.booking_date + b.booking_time::time) at time zone 'America/Argentina/Buenos_Aires') + make_interval(mins => b.duration_min)
$$;

-- Genera los avisos pendientes. La llama el cron cada 10 minutos (ver abajo); es seguro llamarla de más.
create or replace function public.send_post_match_notices() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0; c record;
begin
  -- 1. "¿Cómo estuvo el partido?": entre 30 minutos y 72 horas después de terminar.
  for r in
    select b.* from public.bookings b
    where b.player_id is not null and b.status in ('confirmed','deposit_paid','completed') and b.rate_notice_at is null
      and public.booking_end(b) <= now() - interval '30 minutes' and public.booking_end(b) >= now() - interval '72 hours'
  loop
    update public.bookings set rate_notice_at = now() where id = r.id;
    if not exists (select 1 from public.reviews where booking_id = r.id) then
      select name into c from public.complexes where id = r.complex_id;
      insert into public.notifications (user_id, type, title, text, booking_id, complex_id, link)
      values (r.player_id, 'rate', '¿Cómo estuvo el partido?', 'Calificá ' || coalesce(c.name, 'el complejo') || ': son 10 segundos y ayudás a otros jugadores.', r.id, r.complex_id, '/reservas?calificar=' || r.id);
      n := n + 1;
    end if;
  end loop;
  -- 2. "¿Jugamos de nuevo?": entre 3 y 10 días después, si no tiene otra reserva en ese complejo.
  for r in
    select b.* from public.bookings b
    where b.player_id is not null and b.status in ('confirmed','deposit_paid','completed') and b.rebook_notice_at is null
      and public.booking_end(b) <= now() - interval '3 days' and public.booking_end(b) >= now() - interval '10 days'
  loop
    update public.bookings set rebook_notice_at = now() where id = r.id;
    if not exists (select 1 from public.bookings x where x.player_id = r.player_id and x.complex_id = r.complex_id and x.status in ('pending','deposit_paid','confirmed') and public.booking_end(x) > now()) then
      select name, slug into c from public.complexes where id = r.complex_id;
      insert into public.notifications (user_id, type, title, text, booking_id, complex_id, link)
      values (r.player_id, 'rebook', '¿Jugamos de nuevo?', 'Reservá otra vez en ' || coalesce(c.name, 'el complejo') || ' con un toque.', r.id, r.complex_id, '/complejo/' || c.slug || '/reservar?cancha=' || r.court_id);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.send_post_match_notices() from public, anon, authenticated;

-- Aviso al dueño por reseña nueva y al jugador cuando le responden.
create or replace function public.notify_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare cx record;
begin
  select name, slug, owner_id into cx from public.complexes where id = new.complex_id;
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, title, text, booking_id, complex_id, link)
    values (cx.owner_id, 'review_new', 'Nueva reseña: ' || repeat('★', new.rating), coalesce(nullif(new.player_name, ''), 'Un jugador') || ' calificó ' || cx.name || case when new.text <> '' then ': “' || left(new.text, 80) || '”' else '.' end, new.booking_id, new.complex_id, '/dueno/resenas');
  elsif new.reply is not null and new.reply is distinct from old.reply and new.player_id is not null then
    insert into public.notifications (user_id, type, title, text, complex_id, link)
    values (new.player_id, 'review_reply', 'El complejo te respondió', cx.name || ' respondió tu reseña.', new.complex_id, '/complejo/' || cx.slug);
  end if;
  return new;
end $$;
drop trigger if exists notify_review on public.reviews;
create trigger notify_review after insert or update on public.reviews for each row execute function public.notify_review();

-- Programar cada 10 minutos (Supabase trae pg_cron; si no está disponible, avisa y sigue).
do $$ begin
  create extension if not exists pg_cron;
  perform cron.unschedule('la-fija-post-partido') where exists (select 1 from cron.job where jobname = 'la-fija-post-partido');
  perform cron.schedule('la-fija-post-partido', '*/10 * * * *', 'select public.send_post_match_notices()');
exception when others then
  raise notice 'No se pudo programar el aviso automático (%). Activá la extensión pg_cron en Database → Extensions y volvé a correr este archivo.', sqlerrm;
end $$;
