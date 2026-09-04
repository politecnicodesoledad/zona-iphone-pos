-- =====================================================================
-- ZONA IPHONE — USUARIOS, ROLES (ADMIN / ASESOR) Y SEGURIDAD REAL (RLS)
-- =====================================================================
-- Ejecutar UNA vez en: Supabase Dashboard -> SQL Editor -> Run
-- No borra ningún dato existente. Solo agrega perfiles, roles y políticas.
-- Requisito previo: haber corrido SUPABASE_SETUP.sql
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. PERFILES (rol y estado por usuario de auth.users)
-- ---------------------------------------------------------------------
do $$ begin
  create type public.zi_rol as enum ('admin', 'asesor');
exception when duplicate_object then null; end $$;

create table if not exists public.zi_perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default '',
  email text not null default '',
  telefono text default '',
  rol public.zi_rol not null default 'asesor',
  activo boolean not null default true,
  comision_pct numeric not null default 0,      -- % sobre GANANCIA NETA
  creado_en timestamptz not null default now()
);

grant select, insert, update on public.zi_perfiles to authenticated;
grant all on public.zi_perfiles to service_role;
alter table public.zi_perfiles enable row level security;

-- Función SECURITY DEFINER: evita recursión en las políticas
create or replace function public.zi_es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.zi_perfiles
    where id = auth.uid() and rol = 'admin' and activo
  );
$$;
grant execute on function public.zi_es_admin() to authenticated;

create or replace function public.zi_activo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.zi_perfiles where id = auth.uid() and activo);
$$;
grant execute on function public.zi_activo() to authenticated;

drop policy if exists "perfiles_select" on public.zi_perfiles;
create policy "perfiles_select" on public.zi_perfiles
  for select to authenticated using (true);

drop policy if exists "perfiles_insert" on public.zi_perfiles;
create policy "perfiles_insert" on public.zi_perfiles
  for insert to authenticated
  with check (id = auth.uid() or public.zi_es_admin());

drop policy if exists "perfiles_update" on public.zi_perfiles;
create policy "perfiles_update" on public.zi_perfiles
  for update to authenticated
  using (public.zi_es_admin() or id = auth.uid())
  with check (public.zi_es_admin() or id = auth.uid());

-- ---------------------------------------------------------------------
-- 2. USUARIO ADMIN INICIAL — jhonolaya@gmail.com / diosconmigo
--    La contraseña se guarda SOLO como hash bcrypt dentro de auth.users.
-- ---------------------------------------------------------------------
do $$
declare uid uuid;
begin
  select id into uid from auth.users where email = 'jhonolaya@gmail.com';

  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      'jhonolaya@gmail.com', crypt('diosconmigo', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nombre":"Jhon Olaya"}'::jsonb, false, false
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text,
            format('{"sub":"%s","email":"%s","email_verified":true}', uid, 'jhonolaya@gmail.com')::jsonb,
            'email', now(), now(), now());
  end if;

  insert into public.zi_perfiles (id, nombre, email, rol, activo, comision_pct)
  values (uid, 'Jhon Olaya', 'jhonolaya@gmail.com', 'admin', true, 0)
  on conflict (id) do update set rol = 'admin', activo = true;
end $$;

-- ---------------------------------------------------------------------
-- 3. AUDITORÍA
-- ---------------------------------------------------------------------
create table if not exists public.zi_auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid default auth.uid(),
  usuario_email text,
  accion text not null,
  detalle jsonb default '{}'::jsonb,
  creado_en timestamptz not null default now()
);
grant select, insert on public.zi_auditoria to authenticated;
grant all on public.zi_auditoria to service_role;
alter table public.zi_auditoria enable row level security;

drop policy if exists "auditoria_insert" on public.zi_auditoria;
create policy "auditoria_insert" on public.zi_auditoria
  for insert to authenticated with check (usuario_id = auth.uid());

drop policy if exists "auditoria_select" on public.zi_auditoria;
create policy "auditoria_select" on public.zi_auditoria
  for select to authenticated using (public.zi_es_admin() or usuario_id = auth.uid());

create index if not exists zi_auditoria_fecha_idx on public.zi_auditoria (creado_en desc);

-- ---------------------------------------------------------------------
-- 4. CIERRES DE COMISIONES (mes en curso / cerrado)
-- ---------------------------------------------------------------------
create table if not exists public.zi_comisiones (
  id text primary key,                    -- '<uuid asesor>-YYYY-MM'
  asesor_id uuid references auth.users(id) on delete cascade,
  periodo text not null,                  -- 'YYYY-MM'
  ganancia_neta numeric not null default 0,
  porcentaje numeric not null default 0,
  comision numeric not null default 0,
  estado text not null default 'en_curso',-- en_curso | cerrado | pagado
  cerrado_en timestamptz,
  updated_at timestamptz not null default now()
);
grant select on public.zi_comisiones to authenticated;
grant insert, update, delete on public.zi_comisiones to authenticated;
grant all on public.zi_comisiones to service_role;
alter table public.zi_comisiones enable row level security;

drop policy if exists "comisiones_select" on public.zi_comisiones;
create policy "comisiones_select" on public.zi_comisiones
  for select to authenticated using (public.zi_es_admin() or asesor_id = auth.uid());

drop policy if exists "comisiones_write" on public.zi_comisiones;
create policy "comisiones_write" on public.zi_comisiones
  for all to authenticated using (public.zi_es_admin()) with check (public.zi_es_admin());

-- ---------------------------------------------------------------------
-- 5. VENTAS POR ASESOR — columna de propiedad + RLS real
-- ---------------------------------------------------------------------
alter table public.zi_ventas add column if not exists asesor_id uuid;
create index if not exists zi_ventas_asesor_idx on public.zi_ventas (asesor_id);

-- Las ventas históricas (sin asesor) quedan visibles solo para ADMIN.
drop policy if exists "open_all" on public.zi_ventas;

drop policy if exists "ventas_select" on public.zi_ventas;
create policy "ventas_select" on public.zi_ventas
  for select to authenticated
  using (public.zi_es_admin() or asesor_id = auth.uid());

drop policy if exists "ventas_insert" on public.zi_ventas;
create policy "ventas_insert" on public.zi_ventas
  for insert to authenticated
  with check (public.zi_activo() and (public.zi_es_admin() or asesor_id = auth.uid()));

drop policy if exists "ventas_update" on public.zi_ventas;
create policy "ventas_update" on public.zi_ventas
  for update to authenticated
  using (public.zi_es_admin() or asesor_id = auth.uid())
  with check (public.zi_es_admin() or asesor_id = auth.uid());

drop policy if exists "ventas_delete" on public.zi_ventas;
create policy "ventas_delete" on public.zi_ventas
  for delete to authenticated using (public.zi_es_admin());

-- ---------------------------------------------------------------------
-- 6. RESTO DE TABLAS — solo usuarios autenticados y activos
--    (costos, inventario, gastos, empleados, etc. = ADMIN escribe,
--     ASESOR solo lee lo necesario para vender)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  -- Lectura para cualquier usuario activo; escritura solo ADMIN
  for t in select unnest(array['zi_productos','zi_otros','zi_locales','zi_galeria','zi_config']) loop
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select on public.%I to anon', t);   -- página pública (solo lectura)
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "open_all" on public.%I', t);
    execute format('drop policy if exists "%s_read" on public.%I', t, t);
    execute format('create policy "%s_read" on public.%I for select using (true)', t, t);
    execute format('drop policy if exists "%s_write" on public.%I', t, t);
    execute format($p$create policy "%1$s_write" on public.%1$I for all to authenticated using (public.zi_es_admin()) with check (public.zi_es_admin())$p$, t);
  end loop;

  -- Datos sensibles: solo ADMIN (ni lectura para asesores ni para anónimos)
  for t in select unnest(array['zi_gastos','zi_empleados','zi_proveedores','zi_vendidos']) loop
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "open_all" on public.%I', t);
    execute format('drop policy if exists "%s_admin" on public.%I', t, t);
    execute format($p$create policy "%1$s_admin" on public.%1$I for all to authenticated using (public.zi_es_admin()) with check (public.zi_es_admin())$p$, t);
  end loop;

  -- Clientes: asesor puede crear y ver clientes (necesario para vender)
  for t in select unnest(array['zi_clientes','zi_deletions','zi_counters']) loop
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "open_all" on public.%I', t);
    execute format('drop policy if exists "%s_auth" on public.%I', t, t);
    execute format($p$create policy "%1$s_auth" on public.%1$I for all to authenticated using (public.zi_activo()) with check (public.zi_activo())$p$, t);
  end loop;
end $$;

-- El contador de facturas debe seguir funcionando para asesores
grant execute on function public.zi_next_factura() to authenticated;
revoke execute on function public.zi_next_factura() from anon;

-- =====================================================================
-- LISTO ✓  Entra a /pos con jhonolaya@gmail.com / diosconmigo
-- Cambia la contraseña desde el panel (Usuarios) apenas ingreses.
-- =====================================================================
