-- OPTIONAL ROLLBACK. NOT APPLIED.
-- Removes only the nine read policies added on 24 October 2026.
-- RLS stays enabled. With no other read policies, affected rows become hidden.
-- Does not remove any data or change profile/account/reward policies.
-- Does not revoke table/column grants: their original grant state was not saved.
-- This restores the original RLS access barrier,
-- rather than claiming a byte-for-byte restoration of the privilege catalogue.
-- Review any policies added later before using this rollback.
begin;

drop policy if exists studydeck_read_level_options on public.question_options;
drop policy if exists studydeck_read_level_questions on public.questions;
drop policy if exists studydeck_read_level_flashcards on public.flashcards;
drop policy if exists studydeck_read_level_concepts on public.topic_concepts;
drop policy if exists studydeck_read_level_goals on public.topic_learning_goals;
drop policy if exists studydeck_read_registered_level_topics on public.topics;
drop policy if exists studydeck_read_own_buddy on public.user_pokemon;
drop policy if exists studydeck_read_pokemon_catalogue on public.pokemon;
drop policy if exists studydeck_read_subject_names on public.subjects;

commit;
