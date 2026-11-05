-- Quiz grading remains on the server; evolution is calculated by the Vue helper.
-- Apply after 20261105112227_connected_learning_and_account_data.sql.
-- Preparation does not award XP. Commit saves user_pokemon + attempt + ledger atomically.
BEGIN;

CREATE OR REPLACE FUNCTION private.learning_prepare_quiz_progression(p_run_id uuid,p_answers jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=private.studydex_reward_uid(); run private.learning_quiz_runs%rowtype; q jsonb; selected uuid; correct integer:=0; total integer; pct integer; delta integer; lo integer; hi integer; low_xp integer; high_xp integer; xp jsonb; review jsonb:='[]'; b public.user_pokemon%rowtype; species public.pokemon%rowtype;
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
 SELECT * INTO STRICT b FROM public.user_pokemon WHERE id=run.buddy_id AND user_id=uid;
 SELECT * INTO STRICT species FROM public.pokemon WHERE id=b.pokemon_id;
 RETURN jsonb_build_object('user_id',uid,'run_id',run.id,'correct',correct,'total',total,
   'scorePercent',pct,'delta',delta,'rewardType','quiz','review',review,'duplicate',false,
   'expected',jsonb_build_object('pokemon_id',b.pokemon_id,'xp',b.xp,'level',b.level),
   'originalPokemon',jsonb_build_object('ownedId',b.id,'name',species.name,'xp',b.xp,'level',b.level,
     'is_defeated',b.is_defeated,'static_img',species.sprite_url));
END $$;

CREATE OR REPLACE FUNCTION public.prepare_learning_quiz_progression(p_run_id uuid,p_answers jsonb)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
  SELECT private.learning_prepare_quiz_progression(p_run_id,p_answers)
$$;

CREATE OR REPLACE FUNCTION public.submit_learning_quiz_progression(
  p_run_id uuid,p_answers jsonb,p_expected jsonb,p_progression jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=private.studydex_reward_uid(); run private.learning_quiz_runs%rowtype;
  b public.user_pokemon%rowtype; graded jsonb; species uuid; receipt jsonb;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
  SELECT * INTO STRICT run FROM private.learning_quiz_runs WHERE id=p_run_id AND user_id=uid FOR UPDATE;
  graded:=private.learning_prepare_quiz_progression(p_run_id,p_answers);
  -- A lost response/retry returns the original receipt without applying XP again.
  IF (graded->>'duplicate')::boolean THEN RETURN graded; END IF;
  SELECT * INTO STRICT b FROM public.user_pokemon WHERE id=run.buddy_id AND user_id=uid FOR UPDATE;
  IF b.pokemon_id IS DISTINCT FROM (p_expected->>'pokemon_id')::uuid
     OR b.xp IS DISTINCT FROM (p_expected->>'xp')::integer
     OR b.level IS DISTINCT FROM (p_expected->>'level')::integer THEN
    RAISE EXCEPTION 'Your Pokémon changed during this quiz reward. Retry to calculate from its latest progress.';
  END IF;
  IF jsonb_typeof(p_progression) IS DISTINCT FROM 'object'
     OR (p_progression->>'pokemonRecordId')::uuid IS DISTINCT FROM b.id
     OR p_progression->>'rewardType' IS DISTINCT FROM 'quiz'
     OR (p_progression->>'delta')::integer IS DISTINCT FROM (graded->>'delta')::integer
     OR (p_progression->>'xp')::integer IS NULL OR (p_progression->>'xp')::integer NOT BETWEEN 0 AND 200
     OR (p_progression->>'level')::integer IS NULL OR (p_progression->>'level')::integer < 1
     OR (p_progression->>'appliedDelta')::integer IS NULL
     OR p_progression->'pokemon'->>'name' IS DISTINCT FROM p_progression->>'pokemonName'
     OR (p_progression->'pokemon'->>'xp')::integer IS DISTINCT FROM (p_progression->>'xp')::integer
     OR (p_progression->'pokemon'->>'level')::integer IS DISTINCT FROM (p_progression->>'level')::integer THEN
    RAISE EXCEPTION 'Invalid quiz Pokémon progress.';
  END IF;
  -- Persist the Vue plan. PokéAPI numeric IDs are never used as catalogue UUIDs.
  SELECT id INTO STRICT species FROM public.pokemon
    WHERE regexp_replace(lower(replace(replace(name,'♀','f'),'♂','m')),'[^a-z0-9]','','g')
      = regexp_replace(lower(p_progression->>'pokemonName'),'[^a-z0-9]','','g');
  UPDATE public.user_pokemon SET pokemon_id=species,xp=(p_progression->>'xp')::integer,
    level=(p_progression->>'level')::integer,
    is_defeated=coalesce((p_progression->'pokemon'->>'is_defeated')::boolean,false)
    WHERE id=b.id AND user_id=uid;
  receipt:=p_progression || (graded-'expected') || jsonb_build_object(
    'eventId',run.id,'pokemonRecordId',b.id,'duplicate',false);
  INSERT INTO public.studydex_xp_events(user_id,event_id,pokemon_record_id,reward_type,
    requested_delta,applied_delta,result,input_payload)
    VALUES(uid,run.id,b.id,'quiz',(graded->>'delta')::integer,
      (p_progression->>'appliedDelta')::integer,receipt,jsonb_build_object('run',run.id));
  INSERT INTO public.quiz_attempts(id,user_id,topic_id,attempt_type,score,total_questions,xp_change,completed_at)
    VALUES(run.id,uid,run.topic_id,'quiz',(graded->>'correct')::integer,(graded->>'total')::integer,
      (p_progression->>'appliedDelta')::integer,now());
  INSERT INTO public.quiz_attempt_answers(attempt_id,question_id,selected_option_id)
    SELECT run.id,(r->>'question_id')::uuid,(r->>'selected_option_id')::uuid
    FROM jsonb_array_elements(graded->'review') r;
  UPDATE private.learning_quiz_runs SET submitted_at=now(),answers=p_answers,result=receipt
    WHERE id=run.id;
  RETURN receipt;
END $$;

REVOKE ALL ON FUNCTION private.learning_prepare_quiz_progression(uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.prepare_learning_quiz_progression(uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.submit_learning_quiz_progression(uuid,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_learning_quiz_progression(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_learning_quiz_progression(uuid,jsonb,jsonb,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
