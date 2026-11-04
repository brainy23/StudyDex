-- proposed read-only preflight for project sbrteylcizwkzetcqdro.
-- no raw student records, answer keys or explanations leave the database.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '30s';
with scopes as (
  select c.oid, n.nspname as schema_name, c.relname as table_name,
    c.relrowsecurity, c.relforcerowsecurity
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in (
    'profiles','levels','subjects','topics','questions','question_options',
    'question_answers','quiz_attempts','quiz_attempt_answers','user_pokemon'
  ) and c.relkind in ('r','p')
), cols as (
  select s.schema_name, s.table_name, a.attname as column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
    a.attnotnull as not_null,
    pg_catalog.pg_get_expr(d.adbin,d.adrelid) as default_expression
  from scopes s join pg_catalog.pg_attribute a on a.attrelid=s.oid
  left join pg_catalog.pg_attrdef d on d.adrelid=s.oid and d.adnum=a.attnum
  where a.attnum>0 and not a.attisdropped
), cons as (
  select s.table_name, c.conname, c.contype, c.convalidated,
    pg_catalog.pg_get_constraintdef(c.oid) as definition
  from scopes s join pg_catalog.pg_constraint c on c.conrelid=s.oid
), perms as (
  select r.rolname, s.table_name, p.privilege,
    pg_catalog.has_table_privilege(r.oid,s.oid,p.privilege) as allowed
  from scopes s cross join pg_catalog.pg_roles r
  cross join (values ('select'),('insert'),('update'),('delete'),('truncate')) p(privilege)
  where r.rolname in ('anon','authenticated')
), column_perms as (
  select r.rolname,s.table_name,a.attname as column_name,
    pg_catalog.has_column_privilege(r.oid,s.oid,a.attnum,'select') as can_select,
    pg_catalog.has_column_privilege(r.oid,s.oid,a.attnum,'insert') as can_insert,
    pg_catalog.has_column_privilege(r.oid,s.oid,a.attnum,'update') as can_update
  from scopes s join pg_catalog.pg_attribute a on a.attrelid=s.oid
  cross join pg_catalog.pg_roles r
  where r.rolname in ('anon','authenticated') and a.attnum>0 and not a.attisdropped
    and s.table_name in ('question_answers','quiz_attempts','quiz_attempt_answers')
), funcs as (
  select n.nspname as schema_name,p.proname,
    pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
    pg_catalog.pg_get_function_result(p.oid) as result_type,
    p.prosecdef,p.provolatile,p.proconfig,
    md5(pg_catalog.pg_get_functiondef(p.oid)) as definition_md5,
    pg_catalog.has_function_privilege('anon',p.oid,'execute') as anon_execute,
    pg_catalog.has_function_privilege('authenticated',p.oid,'execute') as authenticated_execute
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','private') and
    (p.proname like '%quiz%' or p.proname in ('get_onboarding_status','save_onboarding_avatar'))
), usable as (
  select q.id,q.topic_id,q.question_purpose,q.difficulty,
    count(o.id) as option_count,
    count(distinct btrim(o.option_text)) as distinct_option_count,
    bool_and(btrim(o.option_text)<>'') as options_nonempty,
    bool_or(o.id=a.correct_option_id) as answer_matches_option,
    a.question_id is not null as has_answer,
    btrim(q.question_text)<>'' as question_nonempty
  from public.questions q
  left join public.question_options o on o.question_id=q.id
  left join public.question_answers a on a.question_id=q.id
  group by q.id,q.topic_id,q.question_purpose,q.difficulty,a.question_id
), distribution as (
  select l.level_number,s.name as subject,t.name as topic,u.question_purpose,
    count(*) as question_count,
    count(*) filter (where u.option_count between 2 and 4
      and u.option_count=u.distinct_option_count and u.options_nonempty
      and u.question_nonempty and u.has_answer and u.answer_matches_option) as gradable_count,
    count(*) filter (where u.difficulty=3) as difficulty_three_count
  from usable u join public.topics t on t.id=u.topic_id
  join public.levels l on l.id=t.level_id join public.subjects s on s.id=t.subject_id
  group by l.level_number,s.name,t.name,u.question_purpose
), fingerprints as (
  select 'profiles' as scope,count(*) as row_count,md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) as fingerprint from public.profiles t
  union all select 'levels',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.levels t
  union all select 'subjects',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.subjects t
  union all select 'topics',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.topics t
  union all select 'questions',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.questions t
  union all select 'question_options',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.question_options t
  union all select 'question_answers',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'' order by question_id),'')) from public.question_answers t
  union all select 'quiz_attempts',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.quiz_attempts t
  union all select 'quiz_attempt_answers',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.quiz_attempt_answers t
  union all select 'user_pokemon',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.user_pokemon t
), triggers as (
  select s.table_name,t.tgname,pg_catalog.pg_get_triggerdef(t.oid) as definition,
    md5(pg_catalog.pg_get_functiondef(t.tgfoid)) as function_md5
  from scopes s join pg_catalog.pg_trigger t on t.tgrelid=s.oid where not t.tgisinternal
)
select jsonb_build_object(
  'identity',jsonb_build_object('expected_project','sbrteylcizwkzetcqdro',
    'database',current_database(),'role',current_user,'version',current_setting('server_version'),
    'read_only',current_setting('transaction_read_only'),'captured_at',statement_timestamp()),
  'tables',(select coalesce(jsonb_agg(to_jsonb(s) order by table_name),'[]'::jsonb) from scopes s),
  'columns',(select coalesce(jsonb_agg(to_jsonb(c) order by table_name,column_name),'[]'::jsonb) from cols c),
  'constraints',(select coalesce(jsonb_agg(to_jsonb(c) order by table_name,conname),'[]'::jsonb) from cons c),
  'policies',(select coalesce(jsonb_agg(to_jsonb(p) order by tablename,policyname),'[]'::jsonb) from pg_catalog.pg_policies p where schemaname='public' and tablename in (select table_name from scopes)),
  'privileges',(select coalesce(jsonb_agg(to_jsonb(p) order by rolname,table_name,privilege),'[]'::jsonb) from perms p),
  'column_privileges',(select coalesce(jsonb_agg(to_jsonb(p) order by rolname,table_name,column_name),'[]'::jsonb) from column_perms p),
  'functions',(select coalesce(jsonb_agg(to_jsonb(f) order by schema_name,proname,arguments),'[]'::jsonb) from funcs f),
  'triggers',(select coalesce(jsonb_agg(to_jsonb(t) order by table_name,tgname),'[]'::jsonb) from triggers t),
  'new_session_table_absent',to_regclass('private.studydex_quiz_sessions') is null,
  'new_question_table_absent',to_regclass('private.studydex_quiz_session_questions') is null,
  'question_distribution',(select coalesce(jsonb_agg(to_jsonb(d) order by level_number,subject,topic,question_purpose),'[]'::jsonb) from distribution d),
  'fingerprints',(select jsonb_agg(to_jsonb(f) order by scope) from fingerprints f)
) as preflight;
commit;
