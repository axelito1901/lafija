-- =====================================================================
-- La Fija · esquema completo para Supabase (Postgres 15+)
-- Ejecutar entero en el SQL Editor de un proyecto nuevo.
-- Modelo: dueño → complejo → canchas. Reserva = jugador + complejo + cancha + fecha + horario.
-- Seguridad: Row Level Security en todas las tablas. Los avisos entre usuarios
-- (reserva nueva, pagos, cancelaciones, lista de espera, turnos fijos) los genera la base.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Configuración general ----------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null
);
insert into public.app_settings (key, value) values
  ('business', '{"model":"free","commissionPercent":5,"monthlyFeeCents":2500000}'),
  ('demo_payments', 'false')
on conflict (key) do nothing;

-- ---------- Perfiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('player','owner','admin')),
  name text not null default '',
  phone text not null default '',
  email text not null default '',
  active boolean not null default true,
  accepted_terms_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active)
$$;

-- Al crear el usuario en Auth se crea su perfil. Nadie puede registrarse como admin.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text := coalesce(new.raw_user_meta_data->>'role', 'player');
begin
  if r not in ('player','owner') then r := 'player'; end if;
  insert into public.profiles (id, role, name, phone, email, accepted_terms_at)
  values (new.id, r, coalesce(new.raw_user_meta_data->>'name', ''), coalesce(new.raw_user_meta_data->>'phone', new.phone, ''),
          coalesce(new.email, ''), nullif(new.raw_user_meta_data->>'accepted_terms_at', '')::timestamptz)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Solo un admin cambia roles o activa/desactiva cuentas.
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() nulo = editor SQL o service role (por ejemplo, para nombrar al primer admin)
  if auth.uid() is not null and not public.is_admin() and (new.role is distinct from old.role or new.active is distinct from old.active) then
    raise exception 'No podés cambiar el rol ni el estado de la cuenta.';
  end if;
  return new;
end $$;
drop trigger if exists guard_profile on public.profiles;
create trigger guard_profile before update on public.profiles for each row execute function public.guard_profile();

-- ---------- Complejos ----------
create table if not exists public.complexes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  city text not null default '',
  address text not null default '',
  lat double precision,
  lng double precision,
  phone text not null default '',
  whatsapp text not null default '',
  description text not null default '',
  services text[] not null default '{}',
  cover_url text not null default '',
  gallery jsonb not null default '[]',
  hours jsonb not null default '{"open":"10:00","close":"00:00","slotMinutes":60}',
  booking jsonb not null default '{"depositRequired":true,"depositType":"percent","depositPercent":30,"depositFixedCents":0,"allowFullPayment":true,"cancellationHours":6,"refundPolicy":"full","payWithinMinutes":30}',
  active boolean not null default true,
  public boolean not null default true,
  approval text not null default 'pending' check (approval in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create or replace function public.owns_complex(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.complexes where id = cid and owner_id = auth.uid())
$$;
create or replace function public.complex_visible(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.complexes where id = cid and active and public and approval = 'approved')
$$;

-- Un dueño no puede aprobarse ni activarse solo: eso lo hace un admin.
create or replace function public.guard_complex() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.approval := 'pending'; new.active := true; new.owner_id := auth.uid();
  else
    new.approval := old.approval; new.active := old.active; new.owner_id := old.owner_id;
  end if;
  return new;
end $$;
drop trigger if exists guard_complex on public.complexes;
create trigger guard_complex before insert or update on public.complexes for each row execute function public.guard_complex();

-- ---------- Canchas ----------
create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete cascade,
  name text not null,
  sport text not null default 'Fútbol 5',
  surface text not null default 'Sintético',
  covered boolean not null default false,
  lighting boolean not null default true,
  price_cents bigint not null default 0 check (price_cents >= 0),
  price_rules jsonb not null default '[]',
  description text not null default '',
  features text[] not null default '{}',
  photo text not null default '',
  status text not null default 'active' check (status in ('active','inactive','blocked')),
  created_at timestamptz not null default now()
);

-- ---------- Reservas ----------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  player_id uuid references public.profiles(id) on delete set null,
  player_name text not null default '',
  phone text not null default '',
  booking_date date not null,
  booking_time text not null check (booking_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  duration_min integer not null default 60,
  base_cents bigint not null default 0,
  discount_cents bigint not null default 0,
  promo_name text not null default '',
  total_cents bigint not null default 0,
  deposit_cents bigint not null default 0,
  paid_cents bigint not null default 0 check (paid_cents >= 0),
  refund_cents bigint not null default 0,
  payment_mode text not null default 'deposit',
  payment_status text not null default 'pending',
  pay_method text not null default '',
  status text not null default 'pending' check (status in ('pending','deposit_paid','confirmed','completed','cancelled','no_show')),
  source text not null default 'app',
  note text not null default '',
  series_id text,
  reminder_at timestamptz,
  lineup jsonb,
  expires_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by text,
  created_at timestamptz not null default now()
);
-- Un turno no puede tener dos reservas activas.
create unique index if not exists bookings_one_per_slot on public.bookings (court_id, booking_date, booking_time) where status <> 'cancelled';
create index if not exists bookings_by_complex_date on public.bookings (complex_id, booking_date);
create index if not exists bookings_by_player on public.bookings (player_id);

-- Un jugador solo puede crear su reserva sin pagos, y después solo cancelarla o cargar los equipos.
-- Los pagos los registra el webhook de Mercado Pago (service role) o el dueño.
create or replace function public.guard_booking() returns trigger
language plpgsql security definer set search_path = public as $$
declare demo boolean := coalesce((select (value)::text = 'true' from public.app_settings where key = 'demo_payments'), false);
begin
  if current_setting('lafija.system', true) = '1' then return new; end if;
  -- Una reserva pendiente que venció sin pagar libera el turno para quien reserve ahora.
  if tg_op = 'INSERT' then
    perform set_config('lafija.system', '1', true);
    update public.bookings set status = 'cancelled', cancelled_by = 'system', cancelled_at = now()
      where court_id = new.court_id and booking_date = new.booking_date and booking_time = new.booking_time
        and status = 'pending' and expires_at is not null and expires_at < now();
    perform set_config('lafija.system', '0', true);
  end if;
  if public.is_admin() or public.owns_complex(coalesce(new.complex_id, old.complex_id)) or auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if new.player_id is distinct from auth.uid() then raise exception 'Solo podés reservar a tu nombre.'; end if;
    if new.paid_cents > 0 and not demo then raise exception 'El pago se registra cuando Mercado Pago lo confirma.'; end if;
    if new.status not in ('pending','confirmed') then raise exception 'Estado inválido.'; end if;
    if not public.complex_visible(new.complex_id) then raise exception 'Este complejo no está disponible.'; end if;
    return new;
  end if;
  if old.player_id is distinct from auth.uid() then raise exception 'No es tu reserva.'; end if;
  if new.paid_cents > old.paid_cents and not demo then raise exception 'El pago se registra cuando Mercado Pago lo confirma.'; end if;
  if new.status is distinct from old.status and new.status <> 'cancelled' and not demo then raise exception 'Solo podés cancelar la reserva.'; end if;
  if (new.court_id, new.booking_date, new.booking_time, new.total_cents, new.complex_id)
     is distinct from (old.court_id, old.booking_date, old.booking_time, old.total_cents, old.complex_id) then
    raise exception 'No podés cambiar la cancha, el horario ni el precio.';
  end if;
  return new;
end $$;
drop trigger if exists guard_booking on public.bookings;
create trigger guard_booking before insert or update on public.bookings for each row execute function public.guard_booking();

-- Horarios ocupados de un complejo, sin datos personales (para mostrar disponibilidad a cualquiera).
create or replace function public.busy_slots(cid uuid, from_date date, to_date date)
returns table (court_id uuid, booking_date date, booking_time text, duration_min integer)
language sql stable security definer set search_path = public as $$
  select b.court_id, b.booking_date, b.booking_time, b.duration_min from public.bookings b
  where b.complex_id = cid and b.booking_date between from_date and to_date and public.complex_visible(cid)
    and b.status <> 'cancelled' and not (b.status = 'pending' and b.expires_at is not null and b.expires_at < now())
$$;

-- ---------- Bloqueos, promociones, reseñas, favoritos ----------
create table if not exists public.court_blocks (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  block_date date not null,
  block_time text not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (court_id, block_date, block_time)
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete cascade,
  name text not null default '',
  kind text not null default 'percent' check (kind in ('percent','fixed')),
  value bigint not null default 0,
  court_id uuid references public.courts(id) on delete cascade,
  time_from text not null default '',
  time_to text not null default '',
  date_from date,
  date_to date,
  only_today boolean not null default false,
  frequent_only boolean not null default false,
  min_bookings integer not null default 5,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  player_id uuid references public.profiles(id) on delete set null,
  player_name text not null default '',
  rating integer not null check (rating between 1 and 5),
  text text not null default '',
  hidden boolean not null default false,
  reported boolean not null default false,
  reply jsonb,
  created_at timestamptz not null default now()
);
-- El dueño solo puede responder; el jugador solo escribir la suya; el admin modera.
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
    if (new.rating, new.text, new.hidden, new.reported) is distinct from (old.rating, old.text, old.hidden, old.reported) then raise exception 'Solo podés responder.'; end if;
    return new;
  end if;
  raise exception 'No podés modificar esta reseña.';
end $$;
drop trigger if exists guard_review on public.reviews;
create trigger guard_review before insert or update on public.reviews for each row execute function public.guard_review();

create table if not exists public.favorites (
  player_id uuid not null references public.profiles(id) on delete cascade,
  complex_id uuid not null references public.complexes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player_id, complex_id)
);

-- ---------- Lista de espera y turnos fijos ----------
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  slot_date date not null,
  slot_time text not null,
  player_id uuid not null references public.profiles(id) on delete cascade,
  player_name text not null default '',
  phone text not null default '',
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.fixed_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  complex_id uuid not null references public.complexes(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  player_name text not null default '',
  phone text not null default '',
  weekday integer not null check (weekday between 0 and 6),
  slot_time text not null,
  weeks integer not null default 8 check (weeks between 1 and 26),
  start_date date not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created integer not null default 0,
  skipped jsonb not null default '[]',
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Avisos y notificaciones push ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  text text not null default '',
  booking_id uuid,
  complex_id uuid,
  date date,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_by_user on public.notifications (user_id, created_at desc);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

-- Avisos generados por la base (no dependen de que el otro usuario tenga la app abierta).
create or replace function public.add_notification(uid uuid, t text, ttl text, body text, bid uuid, cid uuid, d date, lnk text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, type, title, text, booking_id, complex_id, date, link)
  select uid, t, ttl, body, bid, cid, d, lnk where uid is not null
$$;

create or replace function public.notify_booking() returns trigger
language plpgsql security definer set search_path = public as $$
declare c record; ct record; w record; whenx text;
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
    -- Lista de espera: avisar a todos los anotados
    for w in select * from public.waitlist where court_id = new.court_id and slot_date = new.booking_date and slot_time = new.booking_time and notified_at is null and player_id is distinct from new.player_id loop
      update public.waitlist set notified_at = now() where id = w.id;
      perform public.add_notification(w.player_id, 'waitlist', 'Se liberó un horario', c.name || ' · ' || ct.name || ' · ' || whenx || '. Reservalo antes que otro.', null, new.complex_id, new.booking_date,
        '/complejo/' || c.slug || '/reservar?fecha=' || new.booking_date || '&cancha=' || new.court_id || '&hora=' || new.booking_time);
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists notify_booking on public.bookings;
create trigger notify_booking after insert or update on public.bookings for each row execute function public.notify_booking();

create or replace function public.notify_fixed() returns trigger
language plpgsql security definer set search_path = public as $$
declare c record; ct record; days text[] := array['domingos','lunes','martes','miércoles','jueves','viernes','sábados'];
begin
  select * into c from public.complexes where id = new.complex_id;
  select * into ct from public.courts where id = new.court_id;
  if tg_op = 'INSERT' then
    perform public.add_notification(c.owner_id, 'fixed_request', 'Pedido de turno fijo', new.player_name || ' · ' || days[new.weekday + 1] || ' ' || new.slot_time || ' · ' || ct.name || ' · ' || new.weeks || ' semanas', null, new.complex_id, null, '/dueno');
  elsif new.status <> old.status and new.status in ('approved','rejected') then
    perform public.add_notification(new.player_id, case when new.status = 'approved' then 'fixed_ok' else 'fixed_no' end,
      case when new.status = 'approved' then 'Turno fijo aprobado' else 'Turno fijo rechazado' end,
      c.name || ' · ' || days[new.weekday + 1] || ' ' || new.slot_time, null, new.complex_id, null, '/reservas');
  end if;
  return new;
end $$;
drop trigger if exists notify_fixed on public.fixed_requests;
create trigger notify_fixed after insert or update on public.fixed_requests for each row execute function public.notify_fixed();

-- Complejos nuevos: avisar a los admins para que los revisen.
create or replace function public.notify_new_complex() returns trigger
language plpgsql security definer set search_path = public as $$
declare a record;
begin
  for a in select id from public.profiles where role = 'admin' and active loop
    perform public.add_notification(a.id, 'complex_review', 'Complejo para revisar', new.name || ' · ' || new.city, null, new.id, null, '/admin/complejos');
  end loop;
  return new;
end $$;
drop trigger if exists notify_new_complex on public.complexes;
create trigger notify_new_complex after insert on public.complexes for each row execute function public.notify_new_complex();

create or replace function public.notify_complex_decision() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.approval is distinct from old.approval and new.approval in ('approved','rejected') then
    perform public.add_notification(new.owner_id, case when new.approval = 'approved' then 'complex_ok' else 'complex_no' end,
      case when new.approval = 'approved' then 'Tu complejo está publicado' else 'Tu complejo no fue aprobado' end,
      case when new.approval = 'approved' then new.name || ' ya aparece en las búsquedas.' else 'Escribinos desde Ayuda para ver qué falta.' end,
      null, new.id, null, '/dueno');
  end if;
  return new;
end $$;
drop trigger if exists notify_complex_decision on public.complexes;
create trigger notify_complex_decision after update on public.complexes for each row execute function public.notify_complex_decision();

-- Avisos en vivo (Supabase Realtime)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception when duplicate_object then null; end $$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.complexes enable row level security;
alter table public.courts enable row level security;
alter table public.bookings enable row level security;
alter table public.court_blocks enable row level security;
alter table public.promotions enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.waitlist enable row level security;
alter table public.fixed_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

create policy settings_read on public.app_settings for select using (true);
create policy settings_admin on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

create policy profiles_self on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy complexes_read on public.complexes for select using (
  (active and public and approval = 'approved') or owner_id = auth.uid() or public.is_admin());
create policy complexes_insert on public.complexes for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('owner','admin')));
create policy complexes_update on public.complexes for update using (owner_id = auth.uid() or public.is_admin());
create policy complexes_delete on public.complexes for delete using (public.is_admin());

create policy courts_read on public.courts for select using (public.complex_visible(complex_id) or public.owns_complex(complex_id) or public.is_admin());
create policy courts_write on public.courts for all using (public.owns_complex(complex_id) or public.is_admin()) with check (public.owns_complex(complex_id) or public.is_admin());

create policy bookings_read on public.bookings for select using (player_id = auth.uid() or public.owns_complex(complex_id) or public.is_admin());
create policy bookings_insert on public.bookings for insert with check (player_id = auth.uid() or public.owns_complex(complex_id) or public.is_admin());
create policy bookings_update on public.bookings for update using (player_id = auth.uid() or public.owns_complex(complex_id) or public.is_admin());
create policy bookings_delete on public.bookings for delete using (public.is_admin());

create policy blocks_read on public.court_blocks for select using (public.complex_visible(complex_id) or public.owns_complex(complex_id) or public.is_admin());
create policy blocks_write on public.court_blocks for all using (public.owns_complex(complex_id) or public.is_admin()) with check (public.owns_complex(complex_id) or public.is_admin());

create policy promos_read on public.promotions for select using ((active and public.complex_visible(complex_id)) or public.owns_complex(complex_id) or public.is_admin());
create policy promos_write on public.promotions for all using (public.owns_complex(complex_id) or public.is_admin()) with check (public.owns_complex(complex_id) or public.is_admin());

create policy reviews_read on public.reviews for select using (not hidden or public.owns_complex(complex_id) or public.is_admin());
create policy reviews_insert on public.reviews for insert with check (player_id = auth.uid());
create policy reviews_update on public.reviews for update using (public.owns_complex(complex_id) or public.is_admin());
create policy reviews_delete on public.reviews for delete using (public.is_admin());

create policy favorites_own on public.favorites for all using (player_id = auth.uid()) with check (player_id = auth.uid());

create policy waitlist_read on public.waitlist for select using (player_id = auth.uid() or public.owns_complex(complex_id) or public.is_admin());
create policy waitlist_insert on public.waitlist for insert with check (player_id = auth.uid());
create policy waitlist_delete on public.waitlist for delete using (player_id = auth.uid() or public.is_admin());

create policy fixed_read on public.fixed_requests for select using (player_id = auth.uid() or public.owns_complex(complex_id) or public.is_admin());
create policy fixed_insert on public.fixed_requests for insert with check (player_id = auth.uid() and status = 'pending');
create policy fixed_update on public.fixed_requests for update using (public.owns_complex(complex_id) or public.is_admin());

create policy notifications_own on public.notifications for select using (user_id = auth.uid());
create policy notifications_read_flag on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy push_own on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Datos públicos que necesita la app sin sesión (la ficha del complejo).
grant usage on schema public to anon, authenticated;
grant select on public.complexes, public.courts, public.court_blocks, public.promotions, public.reviews, public.app_settings to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.busy_slots(uuid, date, date) to anon, authenticated;
