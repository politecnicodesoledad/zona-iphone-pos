# Plan completo: Migración + Rediseño + Nuevas funciones

## 1. Conexión Supabase (TU proyecto)

Como solo tengo el **anon key**, no puedo crear las tablas desde aquí. Voy a:

- Conectar el cliente del frontend con tu URL + anon key (hardcoded, son claves públicas, seguro).
- Generar un archivo `SUPABASE_SETUP.sql` con TODO el schema (tablas, RLS, storage bucket, índices, grants) listo para pegar en **Supabase Dashboard → SQL Editor → Run**. Una sola ejecución, ~30 segundos.
- Implementar capa de datos dual: si Supabase responde, usa Supabase; si no, fallback a localStorage. Así nada se rompe mientras pegas el SQL.
- Botón **"Migrar datos locales a la nube"** en Configuración para subir lo que ya tienes en localStorage.

Tablas a crear: `zi_config` (singleton), `productos`, `ventas`, `gastos`, `clientes`, `proveedores`, `empleados`, `vendidos`, `locales`, `galeria_iphone`, `factura_counter`. Sin auth real todavía (login sigue por contraseña `zonaiphone2025` guardada en `zi_config`).

## 2. Contraseña

Cambio de `admin123` → `zonaiphone2025` (en `DEFAULT_CONFIG` y migración).

## 3. Rediseño admin (arreglar "cuadros mochos")

El problema en tu screenshot: el modal de producto se sale del viewport sin scroll interno y el botón "Guardar" queda cortado.

- Modales con `max-h-[90vh] overflow-y-auto` y footer sticky.
- Subir contraste: header del admin con fondo `--ink` (negro) en vez de blanco, sidebar ligeramente más oscura, bordes más definidos.
- Tarjetas (KPI, listas) con borde y sombra más marcados.

## 4. Rediseño página principal (contraste)

- Header con fondo negro sólido (`--ink`) + texto crema, en vez del blanco actual.
- Quitar el texto "Apple Premium Reseller".
- Hero con imagen editable desde Configuración (`cfg.heroImageUrl`).

## 5. Ficha de producto individual

Nueva ruta `/producto/$id`:
- Galería de imágenes grande, selector de color/almacenamiento.
- Botón "Comprar por WhatsApp" con mensaje pre-armado.
- Sección "Productos similares" abajo (mismo modelo o categoría).
- SEO con `head()`: título, descripción, og:image del producto.

## 6. Locales activar/desactivar

- Nueva tabla `locales` con `{id, nombre, activo}`.
- Sección en Configuración para gestionar locales (crear, renombrar, activar/desactivar).
- En NuevaVenta e Inventario, solo aparecen locales activos.

## 7. Galería de fotos de iPhone (curada)

- Archivo `src/lib/zi/galeria-iphone.ts` con ~40 URLs categorizadas por modelo (iPhone 11, 12, 13, 14, 15, 16, Pro, Pro Max) y color.
- En el formulario de producto: botón "Elegir de galería" abre un grid; click → se rellena `imagenUrl`.

## 8. Facturas con logo bien

- `pdf.ts`: cargar `cfg.logoUrl` como imagen (canvas → dataURL) y embebér en el PDF en la esquina superior izquierda.
- Mejorar layout: encabezado con logo + nombre tienda + dirección, tabla de productos limpia, total destacado, garantía y agradecimiento al pie.

## 9. UX selecciones bonitas

Reemplazo `<select>` nativos por componentes shadcn con animación suave y estilo dorado al hover en: NuevaVenta, Inventario (categoría, local, condición), Configuración.

---

## Detalles técnicos

**Stack:** Mantengo TanStack Router (router actual del template). Capa de datos abstracta en `src/lib/zi/db.ts` que envuelve Supabase + localStorage fallback.

**Archivos nuevos:**
- `src/integrations/supabase/zi-client.ts` — cliente con URL+anon hardcoded
- `src/lib/zi/db.ts` — capa unificada (reemplaza accesos directos del store)
- `src/lib/zi/galeria-iphone.ts` — catálogo de URLs curadas
- `src/routes/producto.$id.tsx` — ficha de producto
- `src/components/admin/Locales.tsx` (o se integra en Configuración)
- `SUPABASE_SETUP.sql` — schema completo para pegar en SQL Editor

**Archivos editados (rediseño):**
- `src/styles.css` — tokens de contraste
- `src/components/admin/AdminShell.tsx` — header oscuro
- `src/components/admin/ui.tsx` — Modal con scroll interno
- `src/components/admin/Inventario.tsx` — galería + selects bonitos
- `src/components/admin/Configuracion.tsx` — locales, hero image, migrar datos
- `src/routes/index.tsx` — header oscuro, hero editable, ficha link
- `src/lib/zi/pdf.ts` — logo embebido
- `src/lib/zi/store.ts` — password default, lectura desde Supabase

**Riesgo cero por:** capa dual (localStorage como fallback), tipos preservados, sin migración destructiva.

---

## Qué necesito de ti

Después de que apruebes este plan e implemente todo:
1. Vas a Supabase → SQL Editor → pegas el contenido de `SUPABASE_SETUP.sql` → Run.
2. Vuelves al panel → Configuración → "Migrar datos locales a la nube" (sube lo que ya tienes).

Listo. ¿Apruebo y empiezo?
