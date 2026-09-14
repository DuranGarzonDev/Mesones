# Configuración de Supabase

1. Crea un proyecto de Supabase y ejecuta `migrations/001_initial_schema.sql` en **SQL Editor**.
2. En **Authentication → Users**, crea la cuenta del primer editor. No habilites registro público.
3. Copia el UUID del usuario y autorízalo desde SQL Editor:

```sql
insert into public.editor_profiles (id, display_name, role)
values ('UUID_DEL_USUARIO', 'Nombre del editor', 'admin');
```

4. Copia la URL y la **Publishable key** del proyecto a un archivo `.env` basado en `.env.example`.
5. En producción, configura esas mismas variables como secretos/variables del despliegue.

La Publishable key es apta para frontend; las políticas RLS son la barrera de autorización. Nunca uses una `secret key` ni `service_role` en este proyecto.
