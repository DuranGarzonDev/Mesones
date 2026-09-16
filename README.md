# Mesones

Portal institucional y de noticias de la **Institución Educativa Rural Los Mesones**, Teorama, Norte de Santander.

## Características

- Diseño responsive y accesible orientado a una entidad educativa rural.
- Noticias públicas por categoría y lectura en detalle.
- Panel editorial con autenticación por correo y contraseña.
- Publicación, edición y gestión de borradores propios, con carga optimizada de imágenes.
- Menú de perfil editorial visible al iniciar sesión.
- Sección WebColegios preparada para incorporar el enlace oficial.
- PostgreSQL, Auth y Storage mediante Supabase.
- Seguridad con Row Level Security (RLS): el público solo lee publicaciones; únicamente editores autorizados escriben.
- Despliegue automatizado en GitHub Pages.

## Desarrollo local

Requiere Node.js 22 o superior.

```bash
npm install
copy .env.example .env
npm run dev
```

Sin variables de Supabase, el sitio funciona en modo demostración de solo lectura. Para activar el módulo editorial, sigue [la guía de Supabase](supabase/README.md).

Para habilitar el acceso a WebColegios, coloca su URL HTTPS oficial en `school.webColegiosUrl` dentro de `src/config.js`. Mientras esté vacía, el botón permanece deshabilitado y no dirige a una dirección provisional.

## Variables de entorno

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxx
```

La Publishable key es pública por diseño y está protegida por RLS. No agregues claves `secret` ni `service_role` al frontend, al repositorio o a GitHub Pages.

## Comandos

| Comando | Función |
|---|---|
| `npm run dev` | Servidor local con recarga automática |
| `npm run check` | Análisis estático con ESLint |
| `npm run build` | Compilación de producción |
| `npm run preview` | Vista previa del build |

## Base de datos

La migración [001_initial_schema.sql](supabase/migrations/001_initial_schema.sql) crea:

- `articles`: noticias, borradores y metadatos editoriales.
- `editor_profiles`: lista explícita de usuarios autorizados.
- `news-images`: bucket público de portadas, con escritura restringida por usuario.
- índices, validaciones, triggers y políticas RLS.

## Despliegue

El workflow `.github/workflows/pages.yml` compila y publica la rama `main`. En el repositorio de GitHub configura:

1. **Settings → Secrets and variables → Actions**: agrega las dos variables indicadas.
2. **Settings → Pages → Source**: selecciona **GitHub Actions**.

## Licencia y contenido

El código fuente se publica para uso de la institución. Los logos, fotografías y contenidos institucionales pertenecen a sus respectivos titulares.
