-- Live/local Supabase smoke check. Two synthetic accounts, no Auth API/email.
-- All fixtures, XP, quiz answers, tasks and account deletions are rolled back.
BEGIN;
DO $$ DECLARE a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); topic uuid; BEGIN
 PERFORM set_config('studydex.check.a',a::text,true);
 PERFORM set_config('studydex.check.b',b::text,true);
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 (a,'connected-check-'||a||'@example.invalid','{"display_name":"Temporary database verification","school_level_number":3}'),
 (b,'connected-check-'||b||'@example.invalid','{"display_name":"Other temporary verification","school_level_number":3}');
 SELECT t.id INTO STRICT topic FROM public.topics t JOIN public.levels l ON l.id=t.level_id JOIN public.subjects s ON s.id=t.subject_id
 WHERE l.level_number=3 AND lower(s.name)='mathematics' AND EXISTS(SELECT 1 FROM public.questions q WHERE q.topic_id=t.id AND q.question_purpose='quiz') ORDER BY t.id LIMIT 1;
 PERFORM set_config('studydex.check.topic',topic::text,true);
 PERFORM set_config('studydex.check.session',gen_random_uuid()::text,true);
 PERFORM set_config('studydex.check.block',gen_random_uuid()::text,true);
 PERFORM set_config('request.jwt.claim.sub',a::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE q jsonb; answers jsonb; result jsonb; original jsonb;
 uid uuid:=current_setting('studydex.check.a')::uuid; topic uuid:=current_setting('studydex.check.topic')::uuid;
 session_id uuid:=current_setting('studydex.check.session')::uuid; block_id uuid:=current_setting('studydex.check.block')::uuid;
BEGIN
 PERFORM public.claim_starter(4);
 BEGIN UPDATE public.user_pokemon SET xp=9999 WHERE user_id=uid; RAISE EXCEPTION 'Direct progression writes were allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM public.question_answers; RAISE EXCEPTION 'Private answer-key reads were allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 q:=public.start_learning_quiz(topic,gen_random_uuid());
 IF q::text LIKE '%correct_option_id%' THEN RAISE EXCEPTION 'Start exposed answer keys'; END IF;
 SELECT jsonb_object_agg(item->>'id',item->'options'->0->>'id') INTO answers FROM jsonb_array_elements(q->'questions') item;
 result:=public.submit_learning_quiz((q->>'run_id')::uuid,answers);
 original:=public.submit_learning_quiz((q->>'run_id')::uuid,answers);
 IF original->>'duplicate'<>'true' OR (SELECT count(*) FROM public.quiz_attempts)<>1 THEN RAISE EXCEPTION 'Quiz persistence/replay failed'; END IF;
 PERFORM public.study_session_action(session_id,topic,'flashcards','open');
 PERFORM public.study_session_action(session_id,topic,'flashcards','start',block_id);
 result:=public.study_session_action(session_id,topic,'flashcards','complete_block');
 IF result->'block'->>'focus_completed_at' IS NOT NULL THEN RAISE EXCEPTION 'Premature timer reward'; END IF;
 PERFORM public.save_learning_todo(gen_random_uuid(),'A private verification task',false);
END $$;
RESET ROLE;
-- Only this transaction's synthetic block is fast-forwarded, never real users.
UPDATE public.pomodoro_blocks SET active_ms=1500000,focus_seconds=1500
 WHERE id=current_setting('studydex.check.block')::uuid AND session_id=current_setting('studydex.check.session')::uuid;
SET LOCAL ROLE authenticated;
DO $$ DECLARE result jsonb; BEGIN
 result:=public.study_session_action(current_setting('studydex.check.session')::uuid,current_setting('studydex.check.topic')::uuid,'flashcards','complete_block');
 IF (result->'xp'->>'delta')::integer<>10 THEN RAISE EXCEPTION 'Verified focus award failed'; END IF;
 PERFORM public.study_session_action(current_setting('studydex.check.session')::uuid,current_setting('studydex.check.topic')::uuid,'flashcards','complete');
 IF (public.get_daily_learning_progress()->>'timer_rewards')::integer<>1 THEN RAISE EXCEPTION 'Daily progress failed'; END IF;
 IF (SELECT count(*) FROM public.topic_completions)<>1 THEN RAISE EXCEPTION 'Completion persistence failed'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',current_setting('studydex.check.b'),true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('studydex.check.b'),'role','authenticated')::text,true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.todos)+(SELECT count(*) FROM public.quiz_attempts)+(SELECT count(*) FROM public.study_sessions)+(SELECT count(*) FROM public.pomodoro_blocks)<>0 THEN RAISE EXCEPTION 'Another account can read private activity'; END IF;
END $$;
RESET ROLE;
DELETE FROM auth.users WHERE id=current_setting('studydex.check.a')::uuid;
DO $$ DECLARE uid uuid:=current_setting('studydex.check.a')::uuid; BEGIN
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=uid) OR EXISTS(SELECT 1 FROM public.studydex_xp_events WHERE user_id=uid)
 OR EXISTS(SELECT 1 FROM public.todos WHERE user_id=uid) OR EXISTS(SELECT 1 FROM private.learning_quiz_runs WHERE user_id=uid)
 OR EXISTS(SELECT 1 FROM public.study_sessions WHERE user_id=uid) OR EXISTS(SELECT 1 FROM public.quiz_attempts WHERE user_id=uid)
 OR EXISTS(SELECT 1 FROM public.pomodoro_blocks WHERE session_id=current_setting('studydex.check.session')::uuid) THEN RAISE EXCEPTION 'Account cascade failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=current_setting('studydex.check.b')::uuid) THEN RAISE EXCEPTION 'Deletion touched another account'; END IF;
END $$;
ROLLBACK;
SELECT 'PASS: grading, replay, elapsed focus, daily totals, history, ownership and deletion cascade; all synthetic fixtures rolled back' AS verification;
