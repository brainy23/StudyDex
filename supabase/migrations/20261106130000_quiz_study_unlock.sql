-- Quizzes unlock only after the signed-in student completes the topic in Study.
-- Keep the existing snapshot, retry, daily attempt and grading behavior.
BEGIN;
CREATE OR REPLACE FUNCTION private.learning_start_quiz(p_topic_id uuid,p_request_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=private.studydex_reward_uid(); run private.learning_quiz_runs%rowtype; buddy uuid; qs jsonb; keys jsonb; used integer; d date:=(now() AT TIME ZONE 'Asia/Singapore')::date;
BEGIN
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.topics t JOIN public.profiles p ON p.school_level_id=t.level_id WHERE t.id=p_topic_id AND p.id=uid) THEN RAISE EXCEPTION 'Choose a topic for your school level'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.topic_completions WHERE user_id=uid AND topic_id=p_topic_id) THEN
   RAISE EXCEPTION 'Complete this topic in Study to unlock its quiz.';
 END IF;
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
NOTIFY pgrst, 'reload schema';
COMMIT;
