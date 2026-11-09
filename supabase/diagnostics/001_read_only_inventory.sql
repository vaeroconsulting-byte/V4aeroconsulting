-- V4 Aero Consulting: inventario read-only do schema Supabase/PostgreSQL.
-- Este arquivo contem exclusivamente SELECTs sobre catalogos e metadados.
-- Nao consulta linhas de negocio, auth.users, corpos de funcoes ou credenciais.
-- Execute no SQL Editor usando o papel autorizado para inspecionar o projeto.

-- 00. Contexto do executor e visibilidade basica.
-- Os resultados refletem current_user. Metadados ocultos por permissoes podem
-- aparecer como ausentes; ausencia de resultado nao prova ausencia no banco.
SELECT
  '00 - Contexto e limitacoes' AS section,
  current_database() AS database_name,
  current_user AS current_role,
  session_user AS session_role,
  current_setting('server_version') AS server_version,
  n.nspname AS schema_name,
  has_schema_privilege(current_user, n.oid, 'USAGE') AS can_use_schema,
  has_schema_privilege(current_user, n.oid, 'CREATE') AS can_create_in_schema
FROM pg_namespace n
WHERE n.nspname IN ('public', 'auth', 'extensions')
ORDER BY n.nspname;


-- 00A. Presenca dos papeis usados nas consultas de grants.
-- LEFT JOIN informa papeis ausentes sem interromper as consultas seguintes.
SELECT
  '00A - Papeis Supabase esperados' AS section,
  expected.role_name,
  CASE WHEN role_info.oid IS NULL THEN 'INEXISTENTE' ELSE 'EXISTE' END AS status,
  role_info.rolcanlogin AS can_login,
  role_info.rolsuper AS is_superuser,
  role_info.rolbypassrls AS bypasses_rls
FROM (
  VALUES ('anon'), ('authenticated'), ('service_role')
) AS expected(role_name)
LEFT JOIN pg_roles role_info ON role_info.rolname = expected.role_name
ORDER BY expected.role_name;


-- 01. Existencia e tipo dos objetos esperados no schema public.
-- LEFT JOIN garante uma linha informativa mesmo quando a tabela nao existe.
WITH expected_tables(table_name) AS (
  VALUES
    ('admin_users'),
    ('clients'),
    ('flight_requests'),
    ('quotes'),
    ('aircraft'),
    ('reservations'),
    ('activity_logs'),
    ('flight_request_idempotency')
)
SELECT
  '01 - Existencia das tabelas esperadas' AS section,
  'public.' || expected.table_name AS object_name,
  CASE WHEN relation.oid IS NULL THEN 'INEXISTENTE' ELSE 'EXISTE' END AS status,
  CASE relation.relkind
    WHEN 'r' THEN 'tabela'
    WHEN 'p' THEN 'tabela particionada'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'view materializada'
    WHEN 'f' THEN 'tabela estrangeira'
    WHEN 'S' THEN 'sequencia'
    ELSE relation.relkind::text
  END AS object_type,
  pg_get_userbyid(relation.relowner) AS owner,
  relation.relrowsecurity AS rls_enabled,
  relation.relforcerowsecurity AS force_rls
FROM expected_tables expected
LEFT JOIN pg_namespace schema_info
  ON schema_info.nspname = 'public'
LEFT JOIN pg_class relation
  ON relation.relnamespace = schema_info.oid
 AND relation.relname = expected.table_name
ORDER BY expected.table_name;


-- 02. Relacoes existentes no schema public.
-- Inclui relacoes publicas nao listadas como esperadas para revelar contexto.
SELECT
  '02 - Relacoes em public' AS section,
  schema_info.nspname AS schema_name,
  relation.relname AS relation_name,
  CASE relation.relkind
    WHEN 'r' THEN 'tabela'
    WHEN 'p' THEN 'tabela particionada'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'view materializada'
    WHEN 'f' THEN 'tabela estrangeira'
    WHEN 'S' THEN 'sequencia'
    ELSE relation.relkind::text
  END AS relation_type,
  pg_get_userbyid(relation.relowner) AS owner,
  relation.relrowsecurity AS rls_enabled,
  relation.relforcerowsecurity AS force_rls
FROM pg_class relation
JOIN pg_namespace schema_info ON schema_info.oid = relation.relnamespace
WHERE schema_info.nspname = 'public'
  AND relation.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
ORDER BY relation.relkind, relation.relname;


-- 03. Colunas das tabelas esperadas: tipo, nulabilidade, default e geracao.
-- Literais de texto em expressoes default sao mascarados para evitar revelar
-- valores embutidos. Colunas inexistentes nao causam erro.
WITH expected_tables(table_name) AS (
  VALUES
    ('admin_users'),
    ('clients'),
    ('flight_requests'),
    ('quotes'),
    ('aircraft'),
    ('reservations'),
    ('activity_logs'),
    ('flight_request_idempotency')
)
SELECT
  '03 - Colunas das tabelas esperadas' AS section,
  schema_info.nspname AS schema_name,
  relation.relname AS relation_name,
  attribute.attnum AS ordinal_position,
  attribute.attname AS column_name,
  format_type(attribute.atttypid, attribute.atttypmod) AS data_type,
  NOT attribute.attnotnull AS is_nullable,
  CASE
    WHEN default_info.adbin IS NULL THEN NULL
    ELSE regexp_replace(
      pg_get_expr(default_info.adbin, default_info.adrelid),
      $pattern$'([^']|'')*'$pattern$,
      $replacement$'[LITERAL REDACTED]'$replacement$,
      'g'
    )
  END AS default_or_generated_expression_redacted,
  attribute.attidentity AS identity_kind,
  attribute.attgenerated AS generated_kind
FROM expected_tables expected
JOIN pg_namespace schema_info ON schema_info.nspname = 'public'
JOIN pg_class relation
  ON relation.relnamespace = schema_info.oid
 AND relation.relname = expected.table_name
LEFT JOIN pg_attribute attribute
  ON attribute.attrelid = relation.oid
 AND attribute.attnum > 0
 AND NOT attribute.attisdropped
LEFT JOIN pg_attrdef default_info
  ON default_info.adrelid = attribute.attrelid
 AND default_info.adnum = attribute.attnum
WHERE relation.relkind IN ('r', 'p', 'f')
ORDER BY relation.relname, attribute.attnum;


-- 04. PRIMARY KEY, FOREIGN KEY, UNIQUE e CHECK das tabelas esperadas.
-- Definicoes com literais de texto mascarados; sem leitura de dados da tabela.
WITH expected_tables(table_name) AS (
  VALUES
    ('admin_users'),
    ('clients'),
    ('flight_requests'),
    ('quotes'),
    ('aircraft'),
    ('reservations'),
    ('activity_logs'),
    ('flight_request_idempotency')
)
SELECT
  '04 - Constraints das tabelas esperadas' AS section,
  schema_info.nspname AS schema_name,
  relation.relname AS relation_name,
  constraint_info.conname AS constraint_name,
  CASE constraint_info.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    ELSE constraint_info.contype::text
  END AS constraint_type,
  regexp_replace(
    pg_get_constraintdef(constraint_info.oid, true),
    $pattern$'([^']|'')*'$pattern$,
    $replacement$'[LITERAL REDACTED]'$replacement$,
    'g'
  ) AS definition_redacted,
  constraint_info.convalidated AS is_validated,
  constraint_info.condeferrable AS is_deferrable,
  constraint_info.condeferred AS initially_deferred
FROM expected_tables expected
JOIN pg_namespace schema_info ON schema_info.nspname = 'public'
JOIN pg_class relation
  ON relation.relnamespace = schema_info.oid
 AND relation.relname = expected.table_name
JOIN pg_constraint constraint_info ON constraint_info.conrelid = relation.oid
WHERE constraint_info.contype IN ('p', 'f', 'u', 'c')
ORDER BY relation.relname, constraint_info.contype, constraint_info.conname;


-- 05. Indices das tabelas esperadas.
-- Literais de texto em indices de expressao/predicado sao mascarados.
WITH expected_tables(table_name) AS (
  VALUES
    ('admin_users'),
    ('clients'),
    ('flight_requests'),
    ('quotes'),
    ('aircraft'),
    ('reservations'),
    ('activity_logs'),
    ('flight_request_idempotency')
)
SELECT
  '05 - Indices das tabelas esperadas' AS section,
  schema_info.nspname AS schema_name,
  relation.relname AS relation_name,
  index_relation.relname AS index_name,
  index_info.indisprimary AS is_primary,
  index_info.indisunique AS is_unique,
  index_info.indisvalid AS is_valid,
  index_info.indisready AS is_ready,
  regexp_replace(
    pg_get_indexdef(index_info.indexrelid),
    $pattern$'([^']|'')*'$pattern$,
    $replacement$'[LITERAL REDACTED]'$replacement$,
    'g'
  ) AS definition_redacted
FROM expected_tables expected
JOIN pg_namespace schema_info ON schema_info.nspname = 'public'
JOIN pg_class relation
  ON relation.relnamespace = schema_info.oid
 AND relation.relname = expected.table_name
JOIN pg_index index_info ON index_info.indrelid = relation.oid
JOIN pg_class index_relation ON index_relation.oid = index_info.indexrelid
ORDER BY relation.relname, index_relation.relname;


-- 06. RLS e policies das tabelas esperadas.
-- LEFT JOIN apresenta tabelas existentes sem policies e nao falha para ausentes.
WITH expected_tables(table_name) AS (
  VALUES
    ('admin_users'),
    ('clients'),
    ('flight_requests'),
    ('quotes'),
    ('aircraft'),
    ('reservations'),
    ('activity_logs'),
    ('flight_request_idempotency')
)
SELECT
  '06 - RLS e policies' AS section,
  'public.' || expected.table_name AS expected_table,
  CASE WHEN relation.oid IS NULL THEN 'INEXISTENTE' ELSE 'EXISTE' END AS status,
  CASE relation.relkind
    WHEN 'r' THEN 'tabela'
    WHEN 'p' THEN 'tabela particionada'
    WHEN 'v' THEN 'view (RLS nao aplicavel)'
    WHEN 'm' THEN 'view materializada'
    WHEN 'f' THEN 'tabela estrangeira'
    ELSE relation.relkind::text
  END AS object_type,
  relation.relrowsecurity AS rls_enabled,
  relation.relforcerowsecurity AS force_rls,
  COALESCE(policy.polname, '(nenhuma policy encontrada)') AS policy_name,
  CASE policy.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
    ELSE NULL
  END AS command,
  CASE
    WHEN policy.oid IS NULL THEN NULL
    ELSE ARRAY(
      SELECT CASE
        WHEN policy_role.role_oid = 0 THEN 'PUBLIC'
        ELSE COALESCE(role_info.rolname, 'OID ' || policy_role.role_oid::text)
      END
      FROM unnest(policy.polroles) AS policy_role(role_oid)
      LEFT JOIN pg_roles role_info ON role_info.oid = policy_role.role_oid
    )
  END AS roles,
  CASE
    WHEN policy.polqual IS NULL THEN NULL
    ELSE regexp_replace(
      pg_get_expr(policy.polqual, policy.polrelid),
      $pattern$'([^']|'')*'$pattern$,
      $replacement$'[LITERAL REDACTED]'$replacement$,
      'g'
    )
  END AS using_expression_redacted,
  CASE
    WHEN policy.polwithcheck IS NULL THEN NULL
    ELSE regexp_replace(
      pg_get_expr(policy.polwithcheck, policy.polrelid),
      $pattern$'([^']|'')*'$pattern$,
      $replacement$'[LITERAL REDACTED]'$replacement$,
      'g'
    )
  END AS with_check_expression_redacted
FROM expected_tables expected
LEFT JOIN pg_namespace schema_info ON schema_info.nspname = 'public'
LEFT JOIN pg_class relation
  ON relation.relnamespace = schema_info.oid
 AND relation.relname = expected.table_name
LEFT JOIN pg_policy policy
  ON policy.polrelid = relation.oid
 AND relation.relkind IN ('r', 'p')
ORDER BY expected.table_name, policy.polname;


-- 07. Grants declarados em tabelas, views, sequencias e demais relacoes publicas.
-- Exibe ACLs de todos os grantees, inclusive PUBLIC e papeis de aplicacao.
SELECT
  '07 - Grants de relacoes publicas' AS section,
  schema_info.nspname AS schema_name,
  relation.relname AS relation_name,
  CASE relation.relkind
    WHEN 'r' THEN 'tabela'
    WHEN 'p' THEN 'tabela particionada'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'view materializada'
    WHEN 'f' THEN 'tabela estrangeira'
    WHEN 'S' THEN 'sequencia'
    ELSE relation.relkind::text
  END AS relation_type,
  CASE
    WHEN privilege.grantee = 0 THEN 'PUBLIC'
    ELSE COALESCE(grantee.rolname, 'OID ' || privilege.grantee::text)
  END AS grantee,
  grantor.rolname AS grantor,
  privilege.privilege_type,
  privilege.is_grantable
FROM pg_class relation
JOIN pg_namespace schema_info ON schema_info.oid = relation.relnamespace
CROSS JOIN LATERAL aclexplode(
  COALESCE(
    relation.relacl,
    acldefault(
      CASE WHEN relation.relkind = 'S' THEN 'S'::"char" ELSE 'r'::"char" END,
      relation.relowner
    )
  )
) AS privilege
LEFT JOIN pg_roles grantee ON grantee.oid = privilege.grantee
LEFT JOIN pg_roles grantor ON grantor.oid = privilege.grantor
WHERE schema_info.nspname = 'public'
  AND relation.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
ORDER BY relation.relname, grantee, privilege.privilege_type;


-- 07A. Grants explicitos por coluna em relacoes publicas.
-- ACLs por coluna podem conceder acesso mesmo sem grant equivalente na tabela.
SELECT
  '07A - Grants por coluna' AS section,
  schema_info.nspname AS schema_name,
  relation.relname AS relation_name,
  attribute.attname AS column_name,
  CASE
    WHEN privilege.grantee = 0 THEN 'PUBLIC'
    ELSE COALESCE(grantee.rolname, 'OID ' || privilege.grantee::text)
  END AS grantee,
  grantor.rolname AS grantor,
  privilege.privilege_type,
  privilege.is_grantable
FROM pg_attribute attribute
JOIN pg_class relation ON relation.oid = attribute.attrelid
JOIN pg_namespace schema_info ON schema_info.oid = relation.relnamespace
CROSS JOIN LATERAL aclexplode(attribute.attacl) AS privilege
LEFT JOIN pg_roles grantee ON grantee.oid = privilege.grantee
LEFT JOIN pg_roles grantor ON grantor.oid = privilege.grantor
WHERE schema_info.nspname = 'public'
  AND relation.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND attribute.attnum > 0
  AND NOT attribute.attisdropped
ORDER BY relation.relname, attribute.attnum, grantee, privilege.privilege_type;


-- 07B. Privilegios efetivos por coluna para os papeis Supabase relevantes.
-- Mostra permissao de coluna concedida diretamente ou herdada de ACL de tabela.
SELECT
  '07B - Privilegios efetivos por coluna' AS section,
  schema_info.nspname AS schema_name,
  relation.relname AS relation_name,
  attribute.attname AS column_name,
  role_info.rolname AS role_name,
  has_column_privilege(role_info.oid, relation.oid, attribute.attnum, 'SELECT') AS can_select,
  has_column_privilege(role_info.oid, relation.oid, attribute.attnum, 'INSERT') AS can_insert,
  has_column_privilege(role_info.oid, relation.oid, attribute.attnum, 'UPDATE') AS can_update,
  has_column_privilege(role_info.oid, relation.oid, attribute.attnum, 'REFERENCES') AS can_reference
FROM pg_roles role_info
CROSS JOIN pg_class relation
JOIN pg_namespace schema_info ON schema_info.oid = relation.relnamespace
JOIN pg_attribute attribute ON attribute.attrelid = relation.oid
WHERE role_info.rolname IN ('anon', 'authenticated', 'service_role')
  AND schema_info.nspname = 'public'
  AND relation.relkind IN ('r', 'p', 'v', 'm', 'f')
  AND attribute.attnum > 0
  AND NOT attribute.attisdropped
ORDER BY relation.relname, attribute.attnum, role_info.rolname;


-- 08. Privilegios efetivos de anon, authenticated e service_role.
-- Tabelas e sequencias sao avaliadas com as funcoes de privilegio do catalogo.
SELECT
  '08 - Privilegios efetivos' AS section,
  schema_info.nspname AS schema_name,
  relation.relname AS relation_name,
  role_info.rolname AS role_name,
  CASE
    WHEN relation.relkind = 'S'
      THEN has_sequence_privilege(role_info.oid, relation.oid, 'SELECT')
    ELSE has_table_privilege(role_info.oid, relation.oid, 'SELECT')
  END AS can_select,
  CASE
    WHEN relation.relkind = 'S' THEN has_sequence_privilege(role_info.oid, relation.oid, 'USAGE')
    ELSE NULL
  END AS can_use_sequence,
  CASE
    WHEN relation.relkind = 'S' THEN NULL
    ELSE has_table_privilege(role_info.oid, relation.oid, 'INSERT')
  END AS can_insert,
  CASE
    WHEN relation.relkind = 'S' THEN has_sequence_privilege(role_info.oid, relation.oid, 'UPDATE')
    ELSE has_table_privilege(role_info.oid, relation.oid, 'UPDATE')
  END AS can_update,
  CASE
    WHEN relation.relkind = 'S' THEN NULL
    ELSE has_table_privilege(role_info.oid, relation.oid, 'DELETE')
  END AS can_delete,
  CASE
    WHEN relation.relkind = 'S' THEN NULL
    ELSE has_table_privilege(role_info.oid, relation.oid, 'TRUNCATE')
  END AS can_truncate,
  CASE
    WHEN relation.relkind = 'S' THEN NULL
    ELSE has_table_privilege(role_info.oid, relation.oid, 'REFERENCES')
  END AS can_reference,
  CASE
    WHEN relation.relkind = 'S' THEN NULL
    ELSE has_table_privilege(role_info.oid, relation.oid, 'TRIGGER')
  END AS can_trigger
FROM pg_roles role_info
CROSS JOIN pg_class relation
JOIN pg_namespace schema_info ON schema_info.oid = relation.relnamespace
WHERE role_info.rolname IN ('anon', 'authenticated', 'service_role')
  AND schema_info.nspname = 'public'
  AND relation.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
ORDER BY relation.relname, role_info.rolname;


-- 09. Funcoes e procedures da aplicacao no schema public.
-- Nao seleciona prosrc, definicao SQL, corpo ou valores padrao dos argumentos.
SELECT
  '09 - Funcoes publicas' AS section,
  schema_info.nspname AS schema_name,
  routine.proname AS routine_name,
  CASE routine.prokind
    WHEN 'f' THEN 'function'
    WHEN 'p' THEN 'procedure'
    WHEN 'a' THEN 'aggregate'
    WHEN 'w' THEN 'window function'
    ELSE routine.prokind::text
  END AS routine_kind,
  pg_get_function_identity_arguments(routine.oid) AS identity_arguments,
  pg_get_function_result(routine.oid) AS result_type,
  language_info.lanname AS language,
  CASE WHEN routine.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_mode,
  COALESCE(
    (
      SELECT string_agg(configuration.setting, '; ')
      FROM unnest(routine.proconfig) AS configuration(setting)
      WHERE configuration.setting LIKE 'search_path=%'
    ),
    '(nao definido explicitamente)'
  ) AS search_path_setting,
  pg_get_userbyid(routine.proowner) AS owner
FROM pg_proc routine
JOIN pg_namespace schema_info ON schema_info.oid = routine.pronamespace
JOIN pg_language language_info ON language_info.oid = routine.prolang
WHERE schema_info.nspname = 'public'
  AND routine.prokind IN ('f', 'p', 'a', 'w')
ORDER BY routine.proname, identity_arguments;


-- 10. Grants EXECUTE declarados para funcoes e procedures publicas.
-- Mostra PUBLIC, papeis Supabase e papeis customizados com ACL explicita.
SELECT
  '10 - Grants EXECUTE' AS section,
  schema_info.nspname AS schema_name,
  routine.proname AS routine_name,
  pg_get_function_identity_arguments(routine.oid) AS identity_arguments,
  CASE
    WHEN privilege.grantee = 0 THEN 'PUBLIC'
    ELSE COALESCE(grantee.rolname, 'OID ' || privilege.grantee::text)
  END AS grantee,
  grantor.rolname AS grantor,
  privilege.privilege_type,
  privilege.is_grantable
FROM pg_proc routine
JOIN pg_namespace schema_info ON schema_info.oid = routine.pronamespace
CROSS JOIN LATERAL aclexplode(
  COALESCE(routine.proacl, acldefault('f', routine.proowner))
) AS privilege
LEFT JOIN pg_roles grantee ON grantee.oid = privilege.grantee
LEFT JOIN pg_roles grantor ON grantor.oid = privilege.grantor
WHERE schema_info.nspname = 'public'
  AND routine.prokind IN ('f', 'p', 'a', 'w')
  AND privilege.privilege_type = 'EXECUTE'
ORDER BY routine.proname, identity_arguments, grantee;


-- 11. Default privileges que afetam objetos futuros.
-- O resultado e por papel criador, escopo de schema e papel destinatario.
SELECT
  '11 - Default privileges' AS section,
  owner_role.rolname AS owner_role,
  CASE
    WHEN default_acl.defaclnamespace = 0 THEN '(global)'
    ELSE schema_info.nspname
  END AS schema_scope,
  CASE default_acl.defaclobjtype
    WHEN 'r' THEN 'tabelas'
    WHEN 'S' THEN 'sequencias'
    WHEN 'f' THEN 'funcoes'
    WHEN 'T' THEN 'tipos'
    WHEN 'n' THEN 'schemas'
    ELSE default_acl.defaclobjtype::text
  END AS object_type,
  CASE
    WHEN privilege.grantee = 0 THEN 'PUBLIC'
    ELSE COALESCE(grantee.rolname, 'OID ' || privilege.grantee::text)
  END AS grantee,
  grantor.rolname AS grantor,
  privilege.privilege_type,
  privilege.is_grantable
FROM pg_default_acl default_acl
JOIN pg_roles owner_role ON owner_role.oid = default_acl.defaclrole
LEFT JOIN pg_namespace schema_info ON schema_info.oid = default_acl.defaclnamespace
CROSS JOIN LATERAL aclexplode(default_acl.defaclacl) AS privilege
LEFT JOIN pg_roles grantee ON grantee.oid = privilege.grantee
LEFT JOIN pg_roles grantor ON grantor.oid = privilege.grantor
ORDER BY owner_role.rolname, schema_scope, object_type, grantee;


-- 12. Triggers nao internos nas tabelas esperadas.
-- Nao exibe argumentos de trigger nem corpos das funcoes acionadas.
WITH expected_tables(table_name) AS (
  VALUES
    ('admin_users'),
    ('clients'),
    ('flight_requests'),
    ('quotes'),
    ('aircraft'),
    ('reservations'),
    ('activity_logs'),
    ('flight_request_idempotency')
)
SELECT
  '12 - Triggers nao internos' AS section,
  schema_info.nspname AS schema_name,
  relation.relname AS relation_name,
  trigger_info.tgname AS trigger_name,
  CASE
    WHEN (trigger_info.tgtype & 2) <> 0 THEN 'BEFORE'
    WHEN (trigger_info.tgtype & 64) <> 0 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END AS timing,
  array_to_string(
    array_remove(
      ARRAY[
        CASE WHEN (trigger_info.tgtype & 4) <> 0 THEN 'INSERT' END,
        CASE WHEN (trigger_info.tgtype & 8) <> 0 THEN 'DELETE' END,
        CASE WHEN (trigger_info.tgtype & 16) <> 0 THEN 'UPDATE' END,
        CASE WHEN (trigger_info.tgtype & 32) <> 0 THEN 'TRUNCATE' END
      ],
      NULL
    ),
    ', '
  ) AS events,
  (trigger_info.tgtype & 1) <> 0 AS is_row_trigger,
  CASE trigger_info.tgenabled
    WHEN 'O' THEN 'origin'
    WHEN 'D' THEN 'disabled'
    WHEN 'R' THEN 'replica'
    WHEN 'A' THEN 'always'
    ELSE trigger_info.tgenabled::text
  END AS enabled_mode,
  function_schema.nspname AS function_schema,
  trigger_function.proname AS function_name,
  pg_get_function_identity_arguments(trigger_function.oid) AS function_arguments,
  trigger_function.prosecdef AS function_is_security_definer
FROM expected_tables expected
JOIN pg_namespace schema_info ON schema_info.nspname = 'public'
JOIN pg_class relation
  ON relation.relnamespace = schema_info.oid
 AND relation.relname = expected.table_name
JOIN pg_trigger trigger_info ON trigger_info.tgrelid = relation.oid
JOIN pg_proc trigger_function ON trigger_function.oid = trigger_info.tgfoid
JOIN pg_namespace function_schema ON function_schema.oid = trigger_function.pronamespace
WHERE relation.relkind IN ('r', 'p')
  AND NOT trigger_info.tgisinternal
ORDER BY relation.relname, trigger_info.tgname;


-- 13. Relacionamentos por chave estrangeira no schema public.
-- Inclui destino fora de public quando uma tabela publica o referenciar.
SELECT
  '13 - Relacionamentos por FK em public' AS section,
  source_schema.nspname AS source_schema,
  source_relation.relname AS source_table,
  constraint_info.conname AS foreign_key_name,
  target_schema.nspname AS target_schema,
  target_relation.relname AS target_table,
  regexp_replace(
    pg_get_constraintdef(constraint_info.oid, true),
    $pattern$'([^']|'')*'$pattern$,
    $replacement$'[LITERAL REDACTED]'$replacement$,
    'g'
  ) AS relationship_definition_redacted
FROM pg_constraint constraint_info
JOIN pg_class source_relation ON source_relation.oid = constraint_info.conrelid
JOIN pg_namespace source_schema ON source_schema.oid = source_relation.relnamespace
JOIN pg_class target_relation ON target_relation.oid = constraint_info.confrelid
JOIN pg_namespace target_schema ON target_schema.oid = target_relation.relnamespace
WHERE constraint_info.contype = 'f'
  AND source_schema.nspname = 'public'
ORDER BY source_relation.relname, constraint_info.conname;
