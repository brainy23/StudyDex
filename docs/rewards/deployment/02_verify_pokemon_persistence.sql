-- proposed read-only verification after the approved persistence installation.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '20s';
select jsonb_build_object(
  'read_only', current_setting('transaction_read_only'),
  'catalogue', (select jsonb_agg(jsonb_build_object('pokeapi_id', p.pokeapi_id, 'name', p.name, 'parent_pokeapi_id', parent.pokeapi_id) order by p.pokeapi_id)
    from public.pokemon p left join public.pokemon parent on parent.id = p.evolves_from_id),
  'counts', jsonb_build_object(
    'pokemon', (select count(*) from public.pokemon),
    'owned_pokemon', (select count(*) from public.user_pokemon),
    'packs', (select count(*) from public.user_packs),
    'reward_accounts', (select count(*) from private.studydex_reward_accounts),
    'receipts', (select count(*) from private.studydex_pack_receipts),
    'profiles', (select count(*) from public.profiles),
    'topics', (select count(*) from public.topics),
    'goals', (select count(*) from public.topic_learning_goals),
    'concepts', (select count(*) from public.topic_concepts),
    'flashcards', (select count(*) from public.flashcards),
    'questions', (select count(*) from public.questions),
    'options', (select count(*) from public.question_options)
  ),
  'integrity', jsonb_build_object(
    'cross_user_xp_recipients', (select count(*) from public.user_packs p join public.user_pokemon u on u.id = p.xp_recipient_id where p.user_id <> u.user_id),
    'cross_user_receipts', (select count(*) from private.studydex_pack_receipts r join public.user_packs p on p.id = r.pack_id where r.user_id <> p.user_id),
    'cross_user_starter_records', (select count(*) from private.studydex_reward_accounts a join public.user_pokemon u on u.id = a.starter_owned_id where a.user_id <> u.user_id),
    'multiple_selected_buddies', (select count(*) from (select user_id from public.user_pokemon where is_selected group by user_id having count(*) > 1) x)
  ),
  'rls', (select jsonb_agg(jsonb_build_object('schema', n.nspname, 'table', c.relname, 'enabled', c.relrowsecurity))
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where (n.nspname = 'public' and c.relname in ('pokemon', 'user_pokemon', 'user_packs'))
      or (n.nspname = 'private' and c.relname in ('studydex_reward_accounts', 'studydex_pack_receipts'))),
  'policies', (select jsonb_agg(to_jsonb(p)) from pg_catalog.pg_policies p
    where (schemaname = 'public' and tablename in ('pokemon', 'user_pokemon', 'user_packs'))
      or (schemaname = 'private' and tablename in ('studydex_reward_accounts', 'studydex_pack_receipts'))),
  'table_privileges', (select jsonb_agg(jsonb_build_object('role', r.role_name, 'table', t.table_name, 'privilege', p.privilege,
    'effective', has_table_privilege(r.role_name, 'public.' || t.table_name, p.privilege)))
    from (values ('anon'), ('authenticated')) r(role_name)
    cross join (values ('pokemon'), ('user_pokemon'), ('user_packs')) t(table_name)
    cross join (values ('select'), ('insert'), ('update'), ('delete'), ('truncate')) p(privilege)),
  'remaining_api_truncate_grants', (select count(*) from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join (values ('anon'), ('authenticated')) r(role_name)
    where n.nspname = 'public' and c.relkind in ('r', 'p') and has_table_privilege(r.role_name, c.oid, 'truncate')),
  'functions', (select jsonb_agg(jsonb_build_object('schema', n.nspname, 'name', p.proname,
    'security_definer', p.prosecdef, 'settings', p.proconfig,
    'anon_execute', has_function_privilege('anon', p.oid, 'execute'),
    'authenticated_execute', has_function_privilege('authenticated', p.oid, 'execute')))
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where (n.nspname = 'private' and p.proname like 'studydex_%')
      or (n.nspname = 'public' and p.proname in ('get_user_pokemon', 'select_user_pokemon', 'get_starter_status', 'claim_starter', 'get_reward_inventory', 'open_reward_pack')))
) as pokemon_persistence_verification;
commit;
