-- Read-only review of the signed-in user's completed quiz attempts.
-- Pending runs never expose answer keys. Prefer the original run snapshot so
-- subsequent curriculum edits do not change a completed attempt's review.
BEGIN;
CREATE OR REPLACE FUNCTION public.get_learning_quiz_review(p_attempt_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  uid uuid := auth.uid();
  attempt public.quiz_attempts%rowtype;
  run private.learning_quiz_runs%rowtype;
  quiz_name text;
  questions jsonb;
  review jsonb;
  notice text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to review your quiz.'; END IF;
  SELECT * INTO attempt FROM public.quiz_attempts
    WHERE id = p_attempt_id AND user_id = uid AND attempt_type = 'quiz';
  IF NOT FOUND THEN RAISE EXCEPTION 'This completed quiz could not be found.'; END IF;
  SELECT name INTO quiz_name FROM public.topics WHERE id = attempt.topic_id;
  SELECT * INTO run FROM private.learning_quiz_runs
    WHERE id = attempt.id AND user_id = uid AND submitted_at IS NOT NULL;
  IF FOUND THEN
    questions := run.questions;
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'question_id', q->>'id', 'selected_option_id', run.answers->>(q->>'id'),
      'correct_option_id', run.answer_key->(q->>'id')->>'correct_option_id',
      'explanation', run.answer_key->(q->>'id')->>'explanation') ORDER BY n), '[]'::jsonb)
    INTO review FROM jsonb_array_elements(run.questions) WITH ORDINALITY AS items(q,n);
  ELSE
    -- Older attempts predate run snapshots. Their saved selections can still be
    -- reviewed, but question/explanation text comes from the current catalogue.
    SELECT coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'question_text', q.question_text,
      'options', (SELECT jsonb_agg(jsonb_build_object('id', o.id, 'option_text', o.option_text)
        ORDER BY o.option_order) FROM public.question_options o WHERE o.question_id = q.id)) ORDER BY q.id), '[]'::jsonb),
      coalesce(jsonb_agg(jsonb_build_object('question_id', q.id,
        'selected_option_id', a.selected_option_id, 'correct_option_id', k.correct_option_id,
        'explanation', k.explanation) ORDER BY q.id), '[]'::jsonb)
    INTO questions, review FROM public.quiz_attempt_answers a
      JOIN public.questions q ON q.id = a.question_id
      LEFT JOIN public.question_answers k ON k.question_id = q.id
      WHERE a.attempt_id = attempt.id;
    notice := 'This older attempt uses the currently available question text and explanations. Some answers may be unavailable if the quiz content has changed.';
  END IF;
  RETURN jsonb_build_object('attemptId', attempt.id,
    'quizName', coalesce(quiz_name, 'Quiz'), 'correct', attempt.score,
    'total', attempt.total_questions, 'scorePercent', round(100.0 * attempt.score / nullif(attempt.total_questions, 0)),
    'completedAt', attempt.completed_at, 'questions', questions, 'review', review, 'notice', notice);
END;
$$;
REVOKE ALL ON FUNCTION public.get_learning_quiz_review(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_learning_quiz_review(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
