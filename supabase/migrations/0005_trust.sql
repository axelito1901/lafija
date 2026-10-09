-- =====================================================================
-- La Fija · calidad y confianza
--  · Insignia "Verificado": solo un admin puede ponerla o sacarla.
--  · Reportes: el jugador avisa un problema con su reserva; lo ven el dueño del complejo y los admins,
--    que responden y lo marcan resuelto. Los avisos entre ellos los genera la base.
-- Correr una vez en el SQL Editor, después de 0001.
-- =====================================================================

alter table public.complexes add column if not exists verified boolean not null default false;

-- Un dueño no puede aprobarse, activarse ni verificarse solo (se agrega "verified" a la protección existente).
create or replace function public.guard_complex() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.approval := 'pending'; new.active := true; new.owner_id := auth.uid(); new.verified := false;
  else
    new.approval := old.approval; new.active := old.active; new.owner_id := old.owner_id; new.verified := old.verified;
  end if;
  return new;
end $$;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  complex_id uuid not null references public.complexes(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  player_name text not null default '',
  kind text not null check (kind in ('closed','price','state','late','other')),
  text text not null default '' check (char_length(text) <= 400),
  status text not null default 'open' check (status in ('open','resolved')),
  response text not null default '' check (char_length(response) <= 300),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists reports_by_complex on public.reports (complex_id, status);
alter table public.reports enable row level security;

drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select using (player_id = auth.uid() or public.owns_complex(complex_id) or public.is_admin());
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert with check (player_id = auth.uid());
drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports for update using (public.owns_complex(complex_id) or public.is_admin()) with check (public.owns_complex(complex_id) or public.is_admin());
grant select, insert, update on public.reports to authenticated;

-- Reglas: el jugador solo reporta reservas propias; dueño y admin solo responden (no tocan lo que escribió el jugador).
create or replace function public.guard_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.bookings where id = new.booking_id and player_id = auth.uid() and complex_id = new.complex_id) then raise exception 'Solo podés avisar problemas de tus reservas.'; end if;
    new.status := 'open'; new.response := ''; new.resolved_at := null; new.player_name := coalesce((select name from public.profiles where id = auth.uid()), '');
    return new;
  end if;
  if (new.booking_id, new.complex_id, new.player_id, new.kind, new.text) is distinct from (old.booking_id, old.complex_id, old.player_id, old.kind, old.text) then raise exception 'Solo podés responder.'; end if;
  if new.status = 'resolved' and old.status = 'open' then new.resolved_at := now(); end if;
  return new;
end $$;
drop trigger if exists guard_report on public.reports;
create trigger guard_report before insert or update on public.reports for each row execute function public.guard_report();

-- Avisos: al dueño y a los admins cuando llega un reporte; al jugador cuando se resuelve.
create or replace function public.notify_report() returns trigger
language plpgsql security definer set search_path = public as $$
declare cx record; label text; msg text; a record;
begin
  select name, owner_id into cx from public.complexes where id = new.complex_id;
  label := case new.kind when 'closed' then 'estaba cerrado o no abrieron' when 'price' then 'me cobraron distinto' when 'state' then 'la cancha estaba en mal estado' when 'late' then 'nos hicieron esperar' else 'otro problema' end;
  if tg_op = 'INSERT' then
    msg := coalesce(nullif(split_part(new.player_name, ' ', 1), ''), 'Un jugador') || ' avisó: ' || label || ' (' || cx.name || ').';
    insert into public.notifications (user_id, type, title, text, booking_id, complex_id, link) values (cx.owner_id, 'report', 'Un jugador avisó un problema', msg, new.booking_id, new.complex_id, '/dueno/reservas');
    for a in select id from public.profiles where role = 'admin' and active loop
      insert into public.notifications (user_id, type, title, text, booking_id, complex_id, link) values (a.id, 'report', 'Nuevo reporte de un jugador', msg, new.booking_id, new.complex_id, '/admin/reportes');
    end loop;
  elsif new.status = 'resolved' and old.status = 'open' then
    insert into public.notifications (user_id, type, title, text, booking_id, complex_id, link) values (new.player_id, 'report_resolved', 'Respondieron tu reporte', coalesce(nullif(new.response, ''), 'El problema que avisaste quedó resuelto.'), new.booking_id, new.complex_id, '/reservas');
  end if;
  return new;
end $$;
drop trigger if exists notify_report on public.reports;
create trigger notify_report after insert or update on public.reports for each row execute function public.notify_report();
