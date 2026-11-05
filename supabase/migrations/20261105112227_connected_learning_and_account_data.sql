-- Server-owned quiz grading, study time and account-scoped application data.
-- The later XP ledger lacked cascades and otherwise blocks account deletion.
ALTER TABLE public.studydex_xp_events DROP CONSTRAINT studydex_xp_events_user_id_fkey;
ALTER TABLE public.studydex_xp_events ADD CONSTRAINT studydex_xp_events_user_id_fkey FOREIGN KEY(user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.studydex_xp_events DROP CONSTRAINT studydex_xp_events_pokemon_record_id_fkey;
ALTER TABLE public.studydex_xp_events ADD CONSTRAINT studydex_xp_events_pokemon_record_id_fkey FOREIGN KEY(pokemon_record_id) REFERENCES public.user_pokemon(id) ON DELETE CASCADE;
CREATE TABLE private.learning_quiz_runs (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id), buddy_id uuid NOT NULL REFERENCES public.user_pokemon(id) ON DELETE CASCADE,
  quiz_day date NOT NULL, attempt_number integer NOT NULL CHECK(attempt_number BETWEEN 1 AND 3),
  questions jsonb NOT NULL, answer_key jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '2 hours',
  submitted_at timestamptz, result jsonb, answers jsonb,
  UNIQUE(user_id,topic_id,quiz_day,attempt_number)
);
ALTER TABLE private.learning_quiz_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ADD COLUMN mode text NOT NULL DEFAULT 'flashcards' CHECK(mode IN ('flashcards','learn'));
ALTER TABLE public.study_sessions ADD COLUMN buddy_id uuid REFERENCES public.user_pokemon(id) ON DELETE SET NULL;
ALTER TABLE public.study_sessions ADD COLUMN xp_change integer NOT NULL DEFAULT 0;
ALTER TABLE public.pomodoro_blocks ADD COLUMN active_ms bigint NOT NULL DEFAULT 0 CHECK(active_ms>=0);
ALTER TABLE public.pomodoro_blocks ADD COLUMN running_since timestamptz;
CREATE TABLE public.topic_completions (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,topic_id)
);
CREATE TABLE public.todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK(char_length(btrim(title)) BETWEEN 1 AND 300), completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.topic_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
CREATE INDEX todos_owner_idx ON public.todos(user_id,created_at);
CREATE INDEX quiz_runs_owner_idx ON private.learning_quiz_runs(user_id);
CREATE INDEX quiz_runs_buddy_idx ON private.learning_quiz_runs(buddy_id);
CREATE INDEX quiz_attempts_topic_idx ON public.quiz_attempts(topic_id);
CREATE INDEX study_sessions_topic_idx ON public.study_sessions(topic_id);
CREATE INDEX study_sessions_buddy_idx ON public.study_sessions(buddy_id);
CREATE INDEX xp_events_buddy_idx ON public.studydex_xp_events(pokemon_record_id);
CREATE INDEX xp_events_daily_idx ON public.studydex_xp_events(user_id,reward_type,created_at);

-- Ownership is not permission to invent XP, levels or new owned Pokémon.
DROP POLICY IF EXISTS "insert own" ON public.user_pokemon;
DROP POLICY IF EXISTS "update own" ON public.user_pokemon;
REVOKE ALL ON public.user_pokemon FROM anon, authenticated;
GRANT SELECT ON public.user_pokemon TO authenticated;
REVOKE INSERT(id,user_id,pokemon_id,xp,level,is_selected,is_defeated,obtained_at),UPDATE(id,user_id,pokemon_id,xp,level,is_selected,is_defeated,obtained_at) ON public.user_pokemon FROM anon,authenticated;
REVOKE ALL ON private.learning_quiz_runs FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.study_sessions,public.pomodoro_blocks,public.quiz_attempts,public.quiz_attempt_answers,public.topic_completions,public.todos FROM anon,authenticated;
REVOKE ALL ON public.question_answers FROM anon,authenticated;
GRANT SELECT ON public.study_sessions,public.pomodoro_blocks,public.quiz_attempts,public.quiz_attempt_answers,public.topic_completions,public.todos TO authenticated;
GRANT ALL ON public.topic_completions,public.todos,private.learning_quiz_runs TO service_role;
CREATE POLICY own_study_history ON public.study_sessions FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY own_pomodoro_history ON public.pomodoro_blocks FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.study_sessions s WHERE s.id=session_id AND s.user_id=(SELECT auth.uid())));
CREATE POLICY own_quiz_history ON public.quiz_attempts FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY own_quiz_answers ON public.quiz_attempt_answers FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.quiz_attempts a WHERE a.id=attempt_id AND a.user_id=(SELECT auth.uid())));
CREATE POLICY own_topic_completions ON public.topic_completions FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY own_todos ON public.todos FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));

CREATE FUNCTION private.learning_apply_xp(p_uid uuid,p_id uuid,p_buddy uuid,p_type text,p_delta integer,p_input jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.user_pokemon%rowtype; previous public.studydex_xp_events%rowtype; x integer; result jsonb; form jsonb;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_uid THEN RAISE EXCEPTION 'Account changed'; END IF;
  SELECT * INTO previous FROM public.studydex_xp_events WHERE user_id=p_uid AND event_id=p_id;
  IF FOUND THEN
    IF previous.reward_type<>p_type OR previous.pokemon_record_id<>p_buddy THEN RAISE EXCEPTION 'Activity already used'; END IF;
    RETURN previous.result||jsonb_build_object('duplicate',true);
  END IF;
  SELECT * INTO STRICT b FROM public.user_pokemon WHERE id=p_buddy AND user_id=p_uid FOR UPDATE;
  x:=greatest(0,least(250,b.xp+p_delta));
  UPDATE public.user_pokemon SET xp=x,is_defeated=(p_delta<0 AND x=0) WHERE id=b.id;
  form:=private.studydex_owned_pokemon(b.id,p_uid);
  UPDATE public.user_pokemon SET level=(form->>'level')::integer WHERE id=b.id;
  result:=jsonb_build_object('eventId',p_id,'rewardType',p_type,'pokemonRecordId',b.id,
    'pokemonName',form->>'name','delta',p_delta,'appliedDelta',x-b.xp,'xp',x,'level',(form->>'level')::integer,'duplicate',false);
  INSERT INTO public.studydex_xp_events(user_id,event_id,pokemon_record_id,reward_type,requested_delta,applied_delta,result,input_payload)
    VALUES(p_uid,p_id,b.id,p_type,p_delta,x-b.xp,result,p_input);
  RETURN result;
END $$;

CREATE FUNCTION private.learning_daily_progress() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=private.studydex_reward_uid(); d date:=(now() AT TIME ZONE 'Asia/Singapore')::date; start_at timestamptz:=d::timestamp AT TIME ZONE 'Asia/Singapore';
BEGIN RETURN jsonb_build_object('user_id',uid,'day',d,'timezone','Asia/Singapore','resets_at',(d+1)::timestamp AT TIME ZONE 'Asia/Singapore',
 'timer_rewards',(SELECT count(*) FROM public.studydex_xp_events WHERE user_id=uid AND reward_type='timer' AND requested_delta=10 AND created_at>=start_at AND created_at<start_at+interval '1 day'),
 'quiz_completions',(SELECT count(*) FROM public.quiz_attempts WHERE user_id=uid AND completed_at>=start_at AND completed_at<start_at+interval '1 day'),
 'study_completions',(SELECT count(*) FROM public.study_sessions WHERE user_id=uid AND status='completed' AND completed_at>=start_at AND completed_at<start_at+interval '1 day'));
END $$;

CREATE FUNCTION private.learning_start_quiz(p_topic_id uuid,p_request_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=private.studydex_reward_uid(); run private.learning_quiz_runs%rowtype; buddy uuid; qs jsonb; keys jsonb; used integer; d date:=(now() AT TIME ZONE 'Asia/Singapore')::date;
BEGIN
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.topics t JOIN public.profiles p ON p.school_level_id=t.level_id WHERE t.id=p_topic_id AND p.id=uid) THEN RAISE EXCEPTION 'Choose a topic for your school level'; END IF;
 SELECT * INTO run FROM private.learning_quiz_runs WHERE id=p_request_id;
 IF FOUND AND (run.user_id<>uid OR run.topic_id<>p_topic_id) THEN RAISE EXCEPTION 'Quiz belongs to another activity'; END IF;
 IF NOT FOUND THEN
   SELECT * INTO run FROM private.learning_quiz_runs WHERE user_id=uid AND topic_id=p_topic_id AND quiz_day=d AND submitted_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 1;
 END IF;
 IF run.id IS NULL THEN
   SELECT count(*) INTO used FROM private.learning_quiz_runs WHERE user_id=uid AND topic_id=p_topic_id AND quiz_day=d;
   IF used>=3 THEN RAISE EXCEPTION 'Three attempts used for this topic today. Try again after midnight Singapore time.'; END IF;
   SELECT id INTO buddy FROM public.user_pokemon WHERE user_id=uid AND is_selected AND NOT is_defeated;
   IF buddy IS NULL THEN RAISE EXCEPTION 'Select an active Pokemon before starting a quiz'; END IF;
   WITH selected AS MATERIALIZED (
     SELECT q.*,a.correct_option_id,a.explanation FROM public.questions q JOIN public.question_answers a ON a.question_id=q.id
     WHERE q.topic_id=p_topic_id AND q.question_purpose='quiz' AND btrim(q.question_text)<>''
       AND (SELECT count(*) FROM public.question_options o WHERE o.question_id=q.id) BETWEEN 2 AND 4
       AND EXISTS(SELECT 1 FROM public.question_options o WHERE o.id=a.correct_option_id AND o.question_id=q.id)
     ORDER BY random() LIMIT 5
   ) SELECT jsonb_agg(jsonb_build_object('id',s.id,'topic_id',s.topic_id,'question_text',s.question_text,
       'options',(SELECT jsonb_agg(jsonb_build_object('id',o.id,'question_id',o.question_id,'option_text',o.option_text,'option_order',o.option_order) ORDER BY o.option_order) FROM public.question_options o WHERE o.question_id=s.id))),
       jsonb_object_agg(s.id::text,jsonb_build_object('correct_option_id',s.correct_option_id,'explanation',s.explanation)) INTO qs,keys FROM selected s;
   IF qs IS NULL THEN RAISE EXCEPTION 'This topic has no graded quiz questions yet'; END IF;
   INSERT INTO private.learning_quiz_runs(id,user_id,topic_id,buddy_id,quiz_day,attempt_number,questions,answer_key)
     VALUES(p_request_id,uid,p_topic_id,buddy,d,used+1,qs,keys) RETURNING * INTO run;
 END IF;
 RETURN jsonb_build_object('user_id',uid,'run_id',run.id,'questions',run.questions,'result',run.result,'expires_at',run.expires_at,
   'attempt_number',run.attempt_number,'attempt_limit',3,'day',run.quiz_day);
END $$;

CREATE FUNCTION private.learning_submit_quiz(p_run_id uuid,p_answers jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=private.studydex_reward_uid(); run private.learning_quiz_runs%rowtype; q jsonb; selected uuid; correct integer:=0; total integer; pct integer; delta integer; lo integer; hi integer; low_xp integer; high_xp integer; xp jsonb; review jsonb:='[]';
BEGIN
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 SELECT * INTO STRICT run FROM private.learning_quiz_runs WHERE id=p_run_id AND user_id=uid FOR UPDATE;
 IF run.submitted_at IS NOT NULL THEN
   IF run.answers IS DISTINCT FROM p_answers THEN RAISE EXCEPTION 'This quiz was already submitted with different answers'; END IF;
   RETURN run.result||jsonb_build_object('duplicate',true);
 END IF;
 IF now()>run.expires_at THEN RAISE EXCEPTION 'This quiz expired. Start another attempt.'; END IF;
 total:=jsonb_array_length(run.questions);
 IF jsonb_typeof(p_answers)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(p_answers))<>total THEN RAISE EXCEPTION 'Answer every question once'; END IF;
 FOR q IN SELECT value FROM jsonb_array_elements(run.questions) LOOP
   selected:=(p_answers->>(q->>'id'))::uuid;
   IF selected IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(q->'options') o WHERE (o->>'id')::uuid=selected) THEN RAISE EXCEPTION 'Choose an option from this question'; END IF;
   IF selected=(run.answer_key->(q->>'id')->>'correct_option_id')::uuid THEN correct:=correct+1; END IF;
   review:=review||jsonb_build_array(jsonb_build_object('question_id',q->>'id','selected_option_id',selected,
     'correct_option_id',run.answer_key->(q->>'id')->>'correct_option_id','explanation',run.answer_key->(q->>'id')->>'explanation'));
 END LOOP;
 pct:=round(100.0*correct/total);
 IF pct=0 THEN delta:=5; ELSIF pct=100 THEN delta:=50;
 ELSE
   IF pct<=20 THEN lo:=1;hi:=20;low_xp:=5;high_xp:=10;
   ELSIF pct<=40 THEN lo:=21;hi:=40;low_xp:=11;high_xp:=20;
   ELSIF pct<=60 THEN lo:=41;hi:=60;low_xp:=21;high_xp:=30;
   ELSIF pct<=80 THEN lo:=61;hi:=80;low_xp:=31;high_xp:=40;
   ELSE lo:=81;hi:=99;low_xp:=41;high_xp:=50; END IF;
   delta:=round(low_xp+(pct-lo)::numeric*(high_xp-low_xp)/(hi-lo));
 END IF;
 xp:=private.learning_apply_xp(uid,run.id,run.buddy_id,'quiz',delta,jsonb_build_object('run',run.id));
 INSERT INTO public.quiz_attempts(id,user_id,topic_id,attempt_type,score,total_questions,xp_change,completed_at)
   VALUES(run.id,uid,run.topic_id,'quiz',correct,total,(xp->>'appliedDelta')::integer,now());
 INSERT INTO public.quiz_attempt_answers(attempt_id,question_id,selected_option_id)
   SELECT run.id,(r->>'question_id')::uuid,(r->>'selected_option_id')::uuid FROM jsonb_array_elements(review) r;
 UPDATE private.learning_quiz_runs SET submitted_at=now(),answers=p_answers,
   result=xp||jsonb_build_object('user_id',uid,'run_id',run.id,'correct',correct,'total',total,'scorePercent',pct,'review',review)
   WHERE id=run.id RETURNING result INTO xp;
 RETURN xp;
END $$;

CREATE FUNCTION private.learning_study_action(p_session_id uuid,p_topic_id uuid,p_mode text,p_action text,p_block_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=private.studydex_reward_uid(); s public.study_sessions%rowtype; b public.pomodoro_blocks%rowtype; buddy uuid; n integer; delta integer:=0; xp jsonb:=NULL; ms bigint;
BEGIN
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 IF p_mode IS NULL OR p_action IS NULL OR p_mode NOT IN ('learn','flashcards') OR p_action NOT IN ('open','start','resume','reset','pause','heartbeat','complete_block','complete','abandon') THEN RAISE EXCEPTION 'Unsupported study action'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.topics t JOIN public.profiles p ON p.school_level_id=t.level_id WHERE t.id=p_topic_id AND p.id=uid) THEN RAISE EXCEPTION 'Choose a topic for your school level'; END IF;
 SELECT * INTO s FROM public.study_sessions WHERE id=p_session_id FOR UPDATE;
 IF NOT FOUND THEN
   IF p_action<>'open' THEN RAISE EXCEPTION 'Open a study session first'; END IF;
   SELECT id INTO buddy FROM public.user_pokemon WHERE user_id=uid AND is_selected AND NOT is_defeated;
   INSERT INTO public.study_sessions(id,user_id,topic_id,mode,buddy_id) VALUES(p_session_id,uid,p_topic_id,p_mode,buddy) RETURNING * INTO s;
 END IF;
 IF s.user_id<>uid OR s.topic_id<>p_topic_id OR s.mode<>p_mode THEN RAISE EXCEPTION 'Study session belongs to another activity'; END IF;
 SELECT * INTO b FROM public.pomodoro_blocks WHERE session_id=s.id ORDER BY block_number DESC LIMIT 1 FOR UPDATE;
 IF b.id IS NOT NULL AND b.focus_completed_at IS NULL AND b.running_since IS NOT NULL THEN
   ms:=least(30000,greatest(0,floor(extract(epoch FROM now()-b.running_since)*1000)::bigint));
   UPDATE public.pomodoro_blocks SET active_ms=least(1500000,active_ms+ms),focus_seconds=least(1500,(active_ms+ms)/1000),
     running_since=CASE WHEN p_action IN ('heartbeat','resume','start','complete_block') AND now()-b.running_since<=interval '30 seconds' THEN now() ELSE NULL END WHERE id=b.id RETURNING * INTO b;
 END IF;
 IF s.status<>'in_progress' AND p_action NOT IN ('open','complete','abandon') THEN RAISE EXCEPTION 'This study session is finished'; END IF;
 IF p_action='start' AND (b.id IS NULL OR b.focus_completed_at IS NOT NULL) THEN
   SELECT count(*)+1 INTO n FROM public.pomodoro_blocks WHERE session_id=s.id;
   IF n>4 THEN RAISE EXCEPTION 'Four focus blocks completed in this session. Start a new study session.'; END IF;
   IF s.buddy_id IS NULL THEN RAISE EXCEPTION 'Select a Pokemon before starting focus'; END IF;
   INSERT INTO public.pomodoro_blocks(id,session_id,block_number,focus_started_at,running_since) VALUES(p_block_id,s.id,n,now(),now()) RETURNING * INTO b;
 ELSIF p_action IN ('resume','start') AND b.id IS NOT NULL AND b.focus_completed_at IS NULL THEN
   UPDATE public.pomodoro_blocks SET running_since=now() WHERE id=b.id RETURNING * INTO b;
 ELSIF p_action IN ('pause','open','abandon','complete') AND b.id IS NOT NULL THEN
   UPDATE public.pomodoro_blocks SET running_since=NULL WHERE id=b.id RETURNING * INTO b;
 END IF;
 IF p_action='reset' AND b.id IS NOT NULL AND b.focus_completed_at IS NULL THEN
   UPDATE public.pomodoro_blocks SET active_ms=0,focus_seconds=0,running_since=NULL WHERE id=b.id RETURNING * INTO b;
 END IF;
 IF p_action='complete_block' AND b.id IS NOT NULL AND b.focus_completed_at IS NULL AND b.active_ms>=1500000 THEN
   IF (private.learning_daily_progress()->>'timer_rewards')::integer<4 THEN delta:=10; END IF;
   xp:=private.learning_apply_xp(uid,b.id,s.buddy_id,'timer',delta);
   UPDATE public.pomodoro_blocks SET focus_completed_at=now(),running_since=NULL,xp_earned=(xp->>'appliedDelta')::integer,xp_awarded_at=CASE WHEN (xp->>'appliedDelta')::integer>0 THEN now() END WHERE id=b.id RETURNING * INTO b;
 ELSIF p_action='complete_block' AND b.focus_completed_at IS NOT NULL THEN
   SELECT result INTO xp FROM public.studydex_xp_events WHERE user_id=uid AND event_id=b.id;
 END IF;
 IF p_action='complete' AND s.status='in_progress' THEN
   IF s.mode='flashcards' AND s.buddy_id IS NOT NULL THEN xp:=private.learning_apply_xp(uid,s.id,s.buddy_id,'flashcards',5); END IF;
   INSERT INTO public.topic_completions(user_id,topic_id) VALUES(uid,s.topic_id) ON CONFLICT DO NOTHING;
   UPDATE public.study_sessions SET status='completed',completed_at=now(),xp_change=coalesce((xp->>'appliedDelta')::integer,0) WHERE id=s.id RETURNING * INTO s;
 ELSIF p_action='complete' AND s.status='completed' THEN
   SELECT result INTO xp FROM public.studydex_xp_events WHERE user_id=uid AND event_id=s.id;
 ELSIF p_action='abandon' AND s.status='in_progress' THEN
   UPDATE public.study_sessions SET status=CASE WHEN EXISTS(SELECT 1 FROM public.pomodoro_blocks WHERE session_id=s.id AND focus_completed_at IS NOT NULL) THEN 'completed' ELSE 'abandoned' END,completed_at=now() WHERE id=s.id RETURNING * INTO s;
 END IF;
 RETURN jsonb_build_object('user_id',uid,'session',to_jsonb(s),'block',CASE WHEN b.id IS NOT NULL THEN to_jsonb(b) ELSE NULL END,'xp',xp,'daily',private.learning_daily_progress());
END $$;

CREATE FUNCTION private.learning_save_todo(p_id uuid,p_title text,p_completed boolean,p_delete boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=private.studydex_reward_uid(); r public.todos%rowtype;
BEGIN
 IF p_delete THEN DELETE FROM public.todos WHERE id=p_id AND user_id=uid; RETURN jsonb_build_object('deleted',true,'user_id',uid); END IF;
 INSERT INTO public.todos(id,user_id,title,completed_at) VALUES(p_id,uid,btrim(p_title),CASE WHEN p_completed THEN now() END)
 ON CONFLICT(id) DO UPDATE SET title=excluded.title,completed_at=CASE WHEN p_completed THEN coalesce(public.todos.completed_at,now()) END WHERE public.todos.user_id=uid RETURNING * INTO r;
 IF r.id IS NULL THEN RAISE EXCEPTION 'This task belongs to another account'; END IF;
 RETURN to_jsonb(r);
END $$;

-- Public invoker wrappers expose only deliberately reviewed private operations.
CREATE FUNCTION public.start_learning_quiz(p_topic_id uuid,p_request_id uuid) RETURNS jsonb LANGUAGE sql SET search_path='' AS $$ SELECT private.learning_start_quiz(p_topic_id,p_request_id) $$;
CREATE FUNCTION public.submit_learning_quiz(p_run_id uuid,p_answers jsonb) RETURNS jsonb LANGUAGE sql SET search_path='' AS $$ SELECT private.learning_submit_quiz(p_run_id,p_answers) $$;
CREATE FUNCTION public.get_daily_learning_progress() RETURNS jsonb LANGUAGE sql SET search_path='' AS $$ SELECT private.learning_daily_progress() $$;
CREATE FUNCTION public.study_session_action(p_session_id uuid,p_topic_id uuid,p_mode text,p_action text,p_block_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql SET search_path='' AS $$ SELECT private.learning_study_action(p_session_id,p_topic_id,p_mode,p_action,p_block_id) $$;
CREATE FUNCTION public.save_learning_todo(p_id uuid,p_title text,p_completed boolean,p_delete boolean DEFAULT false) RETURNS jsonb LANGUAGE sql SET search_path='' AS $$ SELECT private.learning_save_todo(p_id,p_title,p_completed,p_delete) $$;

-- Quiz/timer/flashcard XP must go through the matching persisted activity.
-- Keep the existing Boss Battle endpoint compatible; boss grading is a separate flow.
ALTER FUNCTION public.award_studydex_xp(uuid,text,text,integer,integer,integer) RENAME TO legacy_award_studydex_xp;
REVOKE ALL ON FUNCTION public.legacy_award_studydex_xp(uuid,text,text,integer,integer,integer) FROM PUBLIC,anon,authenticated;
ALTER FUNCTION public.legacy_award_studydex_xp(uuid,text,text,integer,integer,integer) SET SCHEMA private;
CREATE FUNCTION public.award_studydex_xp(p_event_id uuid,p_pokemon_record_id text,p_reward_type text,p_correct integer DEFAULT NULL,p_total integer DEFAULT NULL,p_boss_health integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_reward_type IS DISTINCT FROM 'boss' THEN RAISE EXCEPTION 'Complete the saved activity to earn XP'; END IF;
 RETURN private.legacy_award_studydex_xp(p_event_id,p_pokemon_record_id,p_reward_type,p_correct,p_total,p_boss_health);
END $$;

CREATE FUNCTION private.learning_record_boss(p_session_id uuid,p_event_id uuid,p_health integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=private.studydex_reward_uid(); s public.study_sessions%rowtype; result jsonb;
BEGIN
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 SELECT * INTO STRICT s FROM public.study_sessions WHERE id=p_session_id AND user_id=uid;
 IF s.mode<>'flashcards' OR s.buddy_id IS NULL THEN RAISE EXCEPTION 'Return to your saved flashcard session first'; END IF;
 result:=private.legacy_award_studydex_xp(p_event_id,s.buddy_id::text,'boss',NULL,NULL,p_health);
 INSERT INTO public.quiz_attempts(id,user_id,topic_id,attempt_type,score,total_questions,xp_change)
 VALUES(p_event_id,uid,s.topic_id,'boss_battle',5-p_health,5,(result->>'appliedDelta')::integer) ON CONFLICT(id) DO NOTHING;
 RETURN result;
END $$;
CREATE FUNCTION public.record_learning_boss(p_session_id uuid,p_event_id uuid,p_health integer) RETURNS jsonb LANGUAGE sql SET search_path='' AS $$ SELECT private.learning_record_boss(p_session_id,p_event_id,p_health) $$;

DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature,n.nspname,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='private' AND p.proname LIKE 'learning_%') OR (n.nspname='public' AND p.proname IN ('start_learning_quiz','submit_learning_quiz','get_daily_learning_progress','study_session_action','save_learning_todo','record_learning_boss','award_studydex_xp')) LOOP
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
   IF f.proname<>'learning_apply_xp' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated,service_role',f.signature); END IF;
 END LOOP;
END $$;
-- Replace the old broad selection implementation with the reviewed owned-ID RPC.
CREATE OR REPLACE FUNCTION public.set_active_pokemon(p_row_id uuid) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$ BEGIN PERFORM private.studydex_select_user_pokemon(p_row_id); END $$;
REVOKE ALL ON FUNCTION public.set_active_pokemon(uuid) FROM PUBLIC,anon;
