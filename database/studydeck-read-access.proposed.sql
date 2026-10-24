-- APPLIED on 24 October 2026 after the project owner's explicit approval.
-- Retained at the original proposal path as a record of the exact approved SQL.
-- Do not re-run: the nine policies already exist in the live database.
-- Enables read access for the StudyDeck frontend; never grants writes or XP.
-- Assumes the existing own-profile SELECT policy and grants remain in place.
-- All nine tables below already have RLS enabled (verified 23 October 2026).
-- Run as one transaction. Re-running fails safely if these policies exist.
begin;

grant select (id, name) on public.subjects to authenticated;
grant select (id, level_id, subject_id, name, description, topic_order)
  on public.topics to authenticated;
grant select (id, topic_id, goal_text, goal_order)
  on public.topic_learning_goals to authenticated;
grant select (id, topic_id, title, explanation_text, example_text, concept_order)
  on public.topic_concepts to authenticated;
grant select (id, topic_id, concept_id, front_text, back_text,
              front_image_path, back_image_path, card_order)
  on public.flashcards to authenticated;
grant select (id, topic_id, concept_id, question_text, question_type,
              difficulty, question_purpose, created_at)
  on public.questions to authenticated;
grant select (id, question_id, option_text, option_order)
  on public.question_options to authenticated;
grant select (id, user_id, pokemon_id, xp, level, is_selected)
  on public.user_pokemon to authenticated;
grant select (id, name, sprite_url) on public.pokemon to authenticated;

-- Subject names are a shared catalogue. Topic content is restricted below.
create policy studydeck_read_subject_names on public.subjects
  for select to authenticated using (true);

-- Read the caller's existing profile. A missing level matches no topics.
create policy studydeck_read_registered_level_topics on public.topics
  for select to authenticated
  using (level_id = (
    select profile.school_level_id from public.profiles as profile
    where profile.id = (select auth.uid())
  ));

-- These lookups are subject to the topics SELECT policy above.
create policy studydeck_read_level_goals on public.topic_learning_goals
  for select to authenticated
  using (exists (
    select 1 from public.topics as topic
    where topic.id = topic_learning_goals.topic_id
  ));

create policy studydeck_read_level_concepts on public.topic_concepts
  for select to authenticated
  using (exists (
    select 1 from public.topics as topic
    where topic.id = topic_concepts.topic_id
  ));

create policy studydeck_read_level_flashcards on public.flashcards
  for select to authenticated
  using (exists (
    select 1 from public.topics as topic
    where topic.id = flashcards.topic_id
  ));

create policy studydeck_read_level_questions on public.questions
  for select to authenticated
  using (exists (
    select 1 from public.topics as topic
    where topic.id = questions.topic_id
  ));

-- Options inherit the question's level restriction. No answer key is exposed.
create policy studydeck_read_level_options on public.question_options
  for select to authenticated
  using (exists (
    select 1 from public.questions as question
    where question.id = question_options.question_id
  ));

create policy studydeck_read_own_buddy on public.user_pokemon
  for select to authenticated using (user_id = (select auth.uid()));

create policy studydeck_read_pokemon_catalogue on public.pokemon
  for select to authenticated using (true);

-- Intentionally no access changes to question_answers, quiz_attempts,
-- quiz_attempt_answers, study_sessions, pomodoro_blocks, or user_packs.
-- No INSERT, UPDATE, DELETE, service keys, functions, or seed data.
commit;
