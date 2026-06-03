-- =====================================================================
-- ZONA IPHONE — Schema completo para Supabase
-- =====================================================================
-- Cómo usar:
--   1. Ve a https://supabase.com/dashboard → tu proyecto → SQL Editor
--   2. Pega TODO este archivo
--   3. Click "Run" (verde, abajo a la derecha)
--   4. Vuelve al panel admin → Configuración → "Sincronizar con la nube"
-- =====================================================================

-- Singleton de configuración
create extension if not exists pgcrypto;

create table if not exists public.zi_config (
  id text primary key default 'singleton',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Tabla genérica para colecciones serializadas (productos, ventas, etc.)
-- Modelo simple: cada fila representa una entidad completa como JSON.
create table if not exists public.zi_productos     (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.zi_otros         (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.zi_ventas        (id text primary key, data jsonb not null, fecha timestamptz, updated_at timestamptz default now());
create table if not exists public.zi_gastos        (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.zi_clientes      (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.zi_proveedores   (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.zi_empleados     (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.zi_vendidos      (id text primary key, data jsonb not null, updated_at timestamptz default now());

-- Locales configurables (la app también guarda el estado en zi_config para funcionar rápido en SPA)
create table if not exists public.zi_locales (
  id text primary key,
  nombre text not null,
  activo boolean not null default true,
  updated_at timestamptz default now()
);

create table if not exists public.zi_counters (
  name text primary key,
  value int not null default 1,
  updated_at timestamptz default now()
);

-- Galería custom de fotos (extra a los presets)
create table if not exists public.zi_galeria (
  id uuid primary key default gen_random_uuid(),
  modelo text not null,
  color text,
  url text not null,
  created_at timestamptz default now()
);

-- Índices útiles
create index if not exists zi_ventas_fecha_idx on public.zi_ventas (fecha desc);
create index if not exists zi_galeria_modelo_idx on public.zi_galeria (modelo);

-- =====================================================================
-- GRANTS (Data API)
-- =====================================================================
-- Sin auth real todavía: damos acceso público para leer/escribir desde el cliente.
-- Cuando agreguemos auth, se restringen los grants y se añaden políticas RLS.
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'zi_config','zi_productos','zi_otros','zi_ventas','zi_gastos',
      'zi_clientes','zi_proveedores','zi_empleados','zi_vendidos',
      'zi_counters','zi_galeria','zi_locales'
    ])
  loop
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    -- RLS abierta (mientras no haya auth real)
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "open_all" on public.%I', t);
    execute format($p$create policy "open_all" on public.%I for all using (true) with check (true)$p$, t);
  end loop;
end $$;

insert into public.zi_locales (id, nombre, activo)
values ('1', 'Local 1', true), ('2', 'Local 2', true)
on conflict (id) do nothing;

-- =====================================================================
-- LISTO ✓
-- Ahora vuelve al panel admin → Configuración → Sincronización con la nube
-- y presiona "Subir datos locales".
-- =====================================================================
