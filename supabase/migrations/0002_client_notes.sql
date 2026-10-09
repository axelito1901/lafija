-- La Fija · notas privadas del dueño sobre sus clientes. Migración aditiva: no modifica datos existentes.
create table if not exists public.client_notes (
  complex_id uuid not null references public.complexes(id) on delete cascade,
  client_key text not null,           -- celular normalizado o nombre (igual que en la app)
  note text not null default '' check (char_length(note) <= 500),
  updated_at timestamptz not null default now(),
  primary key (complex_id, client_key)
);
alter table public.client_notes enable row level security;
drop policy if exists client_notes_owner on public.client_notes;
create policy client_notes_owner on public.client_notes for all
  using (public.owns_complex(complex_id) or public.is_admin())
  with check (public.owns_complex(complex_id) or public.is_admin());
grant select, insert, update, delete on public.client_notes to authenticated;
