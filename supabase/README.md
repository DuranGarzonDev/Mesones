# Configuración de Supabase

## Preparación inicial

1. Crea un proyecto de Supabase y aplica, en orden, los archivos de `migrations/`.
2. En **Authentication → URL Configuration**, define como **Site URL** la URL pública del portal y agrégala también a **Redirect URLs**.
3. Copia la URL y la **Publishable key** del proyecto a un archivo `.env` basado en `.env.example`.
4. En producción, configura esas mismas variables como secretos o variables del despliegue.

La Publishable key es apta para frontend; las políticas RLS son la barrera de autorización. Nunca uses una `secret key` ni `service_role` en este proyecto.

## Autorizar otro editor

1. Abre **Authentication → Users → Add user → Send invitation** e introduce el correo de la persona.
2. La persona debe abrir el mensaje de Supabase y establecer su contraseña.
3. Después de enviar la invitación, abre **SQL Editor** y ejecuta:

```sql
insert into public.editor_profiles (id, display_name, role, active)
select id, 'Nombre del editor', 'editor', true
from auth.users
where lower(email) = lower('persona@ejemplo.com')
on conflict (id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  active = excluded.active,
  updated_at = now();
```

Usa `editor` para un publicador normal o `admin` para identificar un administrador. Actualmente ambos pueden gestionar únicamente las noticias creadas por su propia cuenta; la diferencia de rol queda preparada para futuras funciones administrativas.

Para suspender el acceso sin eliminar el historial del usuario:

```sql
update public.editor_profiles
set active = false, updated_at = now()
where id = (
  select id from auth.users
  where lower(email) = lower('persona@ejemplo.com')
);
```
