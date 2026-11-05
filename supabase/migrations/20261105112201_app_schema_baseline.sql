-- Existing StudyDex application schema. No student records or curriculum data.
-- Idempotent adoption baseline; Supabase supplies auth.* and API roles.
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
CREATE TABLE IF NOT EXISTS "public"."subjects" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL
);
ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."topics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "level_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "topic_order" integer
);
ALTER TABLE "public"."topics" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."profiles" (
  "id" uuid NOT NULL,
  "display_name" text NOT NULL,
  "school_level_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "avatar_choice" text DEFAULT 'prefer_not_to_say'::text NOT NULL
);
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."question_options" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "question_id" uuid NOT NULL,
  "option_text" text NOT NULL,
  "option_order" smallint NOT NULL
);
ALTER TABLE "public"."question_options" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."question_answers" (
  "question_id" uuid NOT NULL,
  "correct_option_id" uuid NOT NULL,
  "explanation" text
);
ALTER TABLE "public"."question_answers" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."study_sessions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "topic_id" uuid,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  "status" text DEFAULT 'in_progress'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."study_sessions" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."pomodoro_blocks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL,
  "block_number" smallint NOT NULL,
  "focus_started_at" timestamp with time zone,
  "focus_seconds" integer DEFAULT 0 NOT NULL,
  "focus_completed_at" timestamp with time zone,
  "break_seconds" integer DEFAULT 0 NOT NULL,
  "break_completed_at" timestamp with time zone,
  "xp_earned" integer DEFAULT 0 NOT NULL,
  "xp_awarded_at" timestamp with time zone
);
ALTER TABLE "public"."pomodoro_blocks" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."pokemon" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "pokeapi_id" integer NOT NULL,
  "name" text NOT NULL,
  "sprite_url" text,
  "evolves_from_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."pokemon" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."quiz_attempts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "topic_id" uuid NOT NULL,
  "attempt_type" text NOT NULL,
  "score" integer NOT NULL,
  "total_questions" integer NOT NULL,
  "xp_change" integer DEFAULT 0 NOT NULL,
  "completed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."quiz_attempts" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."quiz_attempt_answers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "attempt_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "selected_option_id" uuid NOT NULL,
  "answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."quiz_attempt_answers" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "private"."studydex_reward_accounts" (
  "user_id" uuid NOT NULL,
  "starter_pokemon_id" uuid,
  "starter_owned_id" uuid,
  "starter_claimed_at" timestamp with time zone,
  "pending_xp" integer DEFAULT 0 NOT NULL,
  "recovery_pack_id" uuid,
  "avatar_confirmed_at" timestamp with time zone
);
ALTER TABLE "private"."studydex_reward_accounts" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "private"."studydex_pack_receipts" (
  "pack_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "result" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "private"."studydex_pack_receipts" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."user_packs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "earned_at" timestamp with time zone DEFAULT now() NOT NULL,
  "opened_at" timestamp with time zone,
  "reward_type" text,
  "reward_pokemon_id" uuid,
  "xp_awarded" integer DEFAULT 0 NOT NULL,
  "xp_recipient_id" uuid
);
ALTER TABLE "public"."user_packs" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."levels" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "level_number" smallint NOT NULL,
  "name" text NOT NULL
);
ALTER TABLE "public"."levels" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."topic_learning_goals" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "topic_id" uuid NOT NULL,
  "goal_text" text NOT NULL,
  "goal_order" integer NOT NULL,
  "syllabus_reference" text
);
ALTER TABLE "public"."topic_learning_goals" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."topic_concepts" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "topic_id" uuid NOT NULL,
  "title" text NOT NULL,
  "explanation_text" text NOT NULL,
  "example_text" text NOT NULL,
  "concept_order" integer NOT NULL
);
ALTER TABLE "public"."topic_concepts" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."questions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "topic_id" uuid NOT NULL,
  "question_text" text NOT NULL,
  "question_type" text DEFAULT 'mcq'::text NOT NULL,
  "difficulty" smallint DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "concept_id" uuid,
  "question_purpose" text DEFAULT 'quiz'::text NOT NULL
);
ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."flashcards" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "topic_id" uuid NOT NULL,
  "front_text" text NOT NULL,
  "back_text" text NOT NULL,
  "front_image_path" text,
  "back_image_path" text,
  "card_order" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "concept_id" uuid
);
ALTER TABLE "public"."flashcards" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."user_pokemon" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "pokemon_id" uuid NOT NULL,
  "xp" integer DEFAULT 0 NOT NULL,
  "level" integer DEFAULT 1 NOT NULL,
  "is_selected" boolean DEFAULT false NOT NULL,
  "is_defeated" boolean DEFAULT false NOT NULL,
  "obtained_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "public"."user_pokemon" ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS "public"."studydex_xp_events" (
  "user_id" uuid NOT NULL,
  "event_id" uuid NOT NULL,
  "pokemon_record_id" uuid NOT NULL,
  "reward_type" text NOT NULL,
  "requested_delta" integer NOT NULL,
  "applied_delta" integer NOT NULL,
  "result" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "input_payload" jsonb
);
ALTER TABLE "public"."studydex_xp_events" ENABLE ROW LEVEL SECURITY;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='subjects'::regclass AND conname='subjects_name_key') THEN ALTER TABLE subjects ADD CONSTRAINT "subjects_name_key" UNIQUE (name); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='topics'::regclass AND conname='topics_pkey') THEN ALTER TABLE topics ADD CONSTRAINT "topics_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='topics'::regclass AND conname='unique_topic_per_level_subject') THEN ALTER TABLE topics ADD CONSTRAINT "unique_topic_per_level_subject" UNIQUE (level_id, subject_id, name); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='levels'::regclass AND conname='valid_level') THEN ALTER TABLE levels ADD CONSTRAINT "valid_level" CHECK (((level_number >= 1) AND (level_number <= 6))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='levels'::regclass AND conname='levels_pkey') THEN ALTER TABLE levels ADD CONSTRAINT "levels_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='levels'::regclass AND conname='levels_level_number_key') THEN ALTER TABLE levels ADD CONSTRAINT "levels_level_number_key" UNIQUE (level_number); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='subjects'::regclass AND conname='subjects_pkey') THEN ALTER TABLE subjects ADD CONSTRAINT "subjects_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='flashcards'::regclass AND conname='valid_card_order') THEN ALTER TABLE flashcards ADD CONSTRAINT "valid_card_order" CHECK ((card_order > 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='flashcards'::regclass AND conname='flashcards_pkey') THEN ALTER TABLE flashcards ADD CONSTRAINT "flashcards_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='flashcards'::regclass AND conname='unique_card_order_per_topic') THEN ALTER TABLE flashcards ADD CONSTRAINT "unique_card_order_per_topic" UNIQUE (topic_id, card_order); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='questions'::regclass AND conname='valid_question_type') THEN ALTER TABLE questions ADD CONSTRAINT "valid_question_type" CHECK ((question_type = ANY (ARRAY['mcq'::text, 'true_false'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='questions'::regclass AND conname='valid_difficulty') THEN ALTER TABLE questions ADD CONSTRAINT "valid_difficulty" CHECK (((difficulty >= 1) AND (difficulty <= 3))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='questions'::regclass AND conname='questions_pkey') THEN ALTER TABLE questions ADD CONSTRAINT "questions_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='question_options'::regclass AND conname='valid_option_order') THEN ALTER TABLE question_options ADD CONSTRAINT "valid_option_order" CHECK ((option_order > 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='question_options'::regclass AND conname='question_options_pkey') THEN ALTER TABLE question_options ADD CONSTRAINT "question_options_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='question_options'::regclass AND conname='unique_option_order') THEN ALTER TABLE question_options ADD CONSTRAINT "unique_option_order" UNIQUE (question_id, option_order); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='question_options'::regclass AND conname='unique_question_option_pair') THEN ALTER TABLE question_options ADD CONSTRAINT "unique_question_option_pair" UNIQUE (question_id, id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='question_answers'::regclass AND conname='question_answers_pkey') THEN ALTER TABLE question_answers ADD CONSTRAINT "question_answers_pkey" PRIMARY KEY (question_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='profiles'::regclass AND conname='profiles_pkey') THEN ALTER TABLE profiles ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='study_sessions'::regclass AND conname='study_sessions_status_check') THEN ALTER TABLE study_sessions ADD CONSTRAINT "study_sessions_status_check" CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'abandoned'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='study_sessions'::regclass AND conname='study_sessions_completion_check') THEN ALTER TABLE study_sessions ADD CONSTRAINT "study_sessions_completion_check" CHECK ((((status = 'completed'::text) AND (completed_at IS NOT NULL) AND (completed_at >= started_at)) OR ((status <> 'completed'::text) AND (completed_at IS NULL)))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='study_sessions'::regclass AND conname='study_sessions_pkey') THEN ALTER TABLE study_sessions ADD CONSTRAINT "study_sessions_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='pomodoro_blocks'::regclass AND conname='pomodoro_blocks_block_number_check') THEN ALTER TABLE pomodoro_blocks ADD CONSTRAINT "pomodoro_blocks_block_number_check" CHECK (((block_number >= 1) AND (block_number <= 4))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='pomodoro_blocks'::regclass AND conname='pomodoro_blocks_focus_seconds_check') THEN ALTER TABLE pomodoro_blocks ADD CONSTRAINT "pomodoro_blocks_focus_seconds_check" CHECK (((focus_seconds >= 0) AND (focus_seconds <= 1500))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='pomodoro_blocks'::regclass AND conname='pomodoro_blocks_break_seconds_check') THEN ALTER TABLE pomodoro_blocks ADD CONSTRAINT "pomodoro_blocks_break_seconds_check" CHECK (((break_seconds >= 0) AND (break_seconds <= 300))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='pomodoro_blocks'::regclass AND conname='pomodoro_blocks_xp_earned_check') THEN ALTER TABLE pomodoro_blocks ADD CONSTRAINT "pomodoro_blocks_xp_earned_check" CHECK ((xp_earned >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='pomodoro_blocks'::regclass AND conname='pomodoro_blocks_focus_completion_check') THEN ALTER TABLE pomodoro_blocks ADD CONSTRAINT "pomodoro_blocks_focus_completion_check" CHECK (((focus_completed_at IS NULL) OR ((focus_seconds = 1500) AND (focus_started_at IS NOT NULL) AND (focus_completed_at >= focus_started_at)))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='pomodoro_blocks'::regclass AND conname='pomodoro_blocks_break_completion_check') THEN ALTER TABLE pomodoro_blocks ADD CONSTRAINT "pomodoro_blocks_break_completion_check" CHECK (((break_completed_at IS NULL) OR ((break_seconds = 300) AND (focus_completed_at IS NOT NULL) AND (break_completed_at >= focus_completed_at)))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='pomodoro_blocks'::regclass AND conname='pomodoro_blocks_xp_award_check') THEN ALTER TABLE pomodoro_blocks ADD CONSTRAINT "pomodoro_blocks_xp_award_check" CHECK ((((xp_earned = 0) AND (xp_awarded_at IS NULL)) OR ((xp_earned > 0) AND (xp_awarded_at IS NOT NULL) AND (focus_completed_at IS NOT NULL) AND (xp_awarded_at >= focus_completed_at)))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='pomodoro_blocks'::regclass AND conname='pomodoro_blocks_pkey') THEN ALTER TABLE pomodoro_blocks ADD CONSTRAINT "pomodoro_blocks_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='pomodoro_blocks'::regclass AND conname='pomodoro_blocks_session_id_block_number_key') THEN ALTER TABLE pomodoro_blocks ADD CONSTRAINT "pomodoro_blocks_session_id_block_number_key" UNIQUE (session_id, block_number); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='pokemon'::regclass AND conname='pokemon_pokeapi_id_check') THEN ALTER TABLE pokemon ADD CONSTRAINT "pokemon_pokeapi_id_check" CHECK ((pokeapi_id > 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='pokemon'::regclass AND conname='pokemon_cannot_evolve_from_itself') THEN ALTER TABLE pokemon ADD CONSTRAINT "pokemon_cannot_evolve_from_itself" CHECK ((evolves_from_id IS DISTINCT FROM id)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='pokemon'::regclass AND conname='pokemon_pkey') THEN ALTER TABLE pokemon ADD CONSTRAINT "pokemon_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='pokemon'::regclass AND conname='pokemon_pokeapi_id_key') THEN ALTER TABLE pokemon ADD CONSTRAINT "pokemon_pokeapi_id_key" UNIQUE (pokeapi_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='pokemon'::regclass AND conname='pokemon_name_key') THEN ALTER TABLE pokemon ADD CONSTRAINT "pokemon_name_key" UNIQUE (name); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='user_pokemon'::regclass AND conname='user_pokemon_xp_check') THEN ALTER TABLE user_pokemon ADD CONSTRAINT "user_pokemon_xp_check" CHECK ((xp >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='user_pokemon'::regclass AND conname='user_pokemon_level_check') THEN ALTER TABLE user_pokemon ADD CONSTRAINT "user_pokemon_level_check" CHECK ((level >= 1)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='user_pokemon'::regclass AND conname='user_pokemon_pkey') THEN ALTER TABLE user_pokemon ADD CONSTRAINT "user_pokemon_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='user_pokemon'::regclass AND conname='user_pokemon_user_id_pokemon_id_key') THEN ALTER TABLE user_pokemon ADD CONSTRAINT "user_pokemon_user_id_pokemon_id_key" UNIQUE (user_id, pokemon_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='quiz_attempts'::regclass AND conname='quiz_attempts_attempt_type_check') THEN ALTER TABLE quiz_attempts ADD CONSTRAINT "quiz_attempts_attempt_type_check" CHECK ((attempt_type = ANY (ARRAY['quiz'::text, 'boss_battle'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='quiz_attempts'::regclass AND conname='quiz_attempts_score_check') THEN ALTER TABLE quiz_attempts ADD CONSTRAINT "quiz_attempts_score_check" CHECK ((score >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='quiz_attempts'::regclass AND conname='quiz_attempts_total_questions_check') THEN ALTER TABLE quiz_attempts ADD CONSTRAINT "quiz_attempts_total_questions_check" CHECK ((total_questions > 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='quiz_attempts'::regclass AND conname='valid_quiz_score') THEN ALTER TABLE quiz_attempts ADD CONSTRAINT "valid_quiz_score" CHECK ((score <= total_questions)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='quiz_attempts'::regclass AND conname='quiz_attempts_pkey') THEN ALTER TABLE quiz_attempts ADD CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='quiz_attempt_answers'::regclass AND conname='quiz_attempt_answers_pkey') THEN ALTER TABLE quiz_attempt_answers ADD CONSTRAINT "quiz_attempt_answers_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='quiz_attempt_answers'::regclass AND conname='unique_attempt_question') THEN ALTER TABLE quiz_attempt_answers ADD CONSTRAINT "unique_attempt_question" UNIQUE (attempt_id, question_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='user_packs'::regclass AND conname='user_packs_reward_type_check') THEN ALTER TABLE user_packs ADD CONSTRAINT "user_packs_reward_type_check" CHECK ((reward_type = ANY (ARRAY['pokemon'::text, 'xp'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='user_packs'::regclass AND conname='user_packs_xp_awarded_check') THEN ALTER TABLE user_packs ADD CONSTRAINT "user_packs_xp_awarded_check" CHECK ((xp_awarded >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='user_packs'::regclass AND conname='valid_pack_opening_time') THEN ALTER TABLE user_packs ADD CONSTRAINT "valid_pack_opening_time" CHECK (((opened_at IS NULL) OR (opened_at >= earned_at))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='user_packs'::regclass AND conname='valid_pack_reward') THEN ALTER TABLE user_packs ADD CONSTRAINT "valid_pack_reward" CHECK ((((opened_at IS NULL) AND (reward_type IS NULL) AND (reward_pokemon_id IS NULL) AND (xp_awarded = 0) AND (xp_recipient_id IS NULL)) OR ((opened_at IS NOT NULL) AND (reward_type IS NOT NULL) AND (reward_type = 'pokemon'::text) AND (reward_pokemon_id IS NOT NULL) AND (xp_awarded = 0) AND (xp_recipient_id IS NULL)) OR ((opened_at IS NOT NULL) AND (reward_type IS NOT NULL) AND (reward_type = 'xp'::text) AND (reward_pokemon_id IS NULL) AND (xp_awarded > 0) AND (xp_recipient_id IS NOT NULL)))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='user_packs'::regclass AND conname='user_packs_pkey') THEN ALTER TABLE user_packs ADD CONSTRAINT "user_packs_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='profiles'::regclass AND conname='profiles_display_name_valid') THEN ALTER TABLE profiles ADD CONSTRAINT "profiles_display_name_valid" CHECK (((char_length(btrim(display_name)) >= 1) AND (char_length(btrim(display_name)) <= 80))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='topic_learning_goals'::regclass AND conname='topic_learning_goals_goal_order_check') THEN ALTER TABLE topic_learning_goals ADD CONSTRAINT "topic_learning_goals_goal_order_check" CHECK ((goal_order > 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='topic_learning_goals'::regclass AND conname='topic_learning_goals_pkey') THEN ALTER TABLE topic_learning_goals ADD CONSTRAINT "topic_learning_goals_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='topic_learning_goals'::regclass AND conname='topic_learning_goals_topic_id_goal_order_key') THEN ALTER TABLE topic_learning_goals ADD CONSTRAINT "topic_learning_goals_topic_id_goal_order_key" UNIQUE (topic_id, goal_order); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='topic_concepts'::regclass AND conname='topic_concepts_concept_order_check') THEN ALTER TABLE topic_concepts ADD CONSTRAINT "topic_concepts_concept_order_check" CHECK ((concept_order > 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='topic_concepts'::regclass AND conname='topic_concepts_pkey') THEN ALTER TABLE topic_concepts ADD CONSTRAINT "topic_concepts_pkey" PRIMARY KEY (id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='topic_concepts'::regclass AND conname='topic_concepts_topic_id_concept_order_key') THEN ALTER TABLE topic_concepts ADD CONSTRAINT "topic_concepts_topic_id_concept_order_key" UNIQUE (topic_id, concept_order); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='topics'::regclass AND conname='topics_topic_order_check') THEN ALTER TABLE topics ADD CONSTRAINT "topics_topic_order_check" CHECK ((topic_order > 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='questions'::regclass AND conname='questions_question_purpose_check') THEN ALTER TABLE questions ADD CONSTRAINT "questions_question_purpose_check" CHECK ((question_purpose = ANY (ARRAY['quick_check'::text, 'quiz'::text, 'boss_battle'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='private.studydex_reward_accounts'::regclass AND conname='studydex_reward_accounts_pending_xp_check') THEN ALTER TABLE private.studydex_reward_accounts ADD CONSTRAINT "studydex_reward_accounts_pending_xp_check" CHECK ((pending_xp >= 0)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='private.studydex_reward_accounts'::regclass AND conname='starter_claim_consistent') THEN ALTER TABLE private.studydex_reward_accounts ADD CONSTRAINT "starter_claim_consistent" CHECK ((((starter_pokemon_id IS NULL) AND (starter_owned_id IS NULL) AND (starter_claimed_at IS NULL)) OR ((starter_pokemon_id IS NOT NULL) AND (starter_claimed_at IS NOT NULL)))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='private.studydex_reward_accounts'::regclass AND conname='studydex_reward_accounts_pkey') THEN ALTER TABLE private.studydex_reward_accounts ADD CONSTRAINT "studydex_reward_accounts_pkey" PRIMARY KEY (user_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='private.studydex_pack_receipts'::regclass AND conname='receipt_identity_consistent') THEN ALTER TABLE private.studydex_pack_receipts ADD CONSTRAINT "receipt_identity_consistent" CHECK ((((result ->> 'pack_id'::text) = (pack_id)::text) AND ((result ->> 'user_id'::text) = (user_id)::text))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='private.studydex_pack_receipts'::regclass AND conname='studydex_pack_receipts_pkey') THEN ALTER TABLE private.studydex_pack_receipts ADD CONSTRAINT "studydex_pack_receipts_pkey" PRIMARY KEY (pack_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='profiles'::regclass AND conname='profiles_avatar_choice_check') THEN ALTER TABLE profiles ADD CONSTRAINT "profiles_avatar_choice_check" CHECK ((avatar_choice = ANY (ARRAY['male'::text, 'female'::text, 'prefer_not_to_say'::text, 'female-classic'::text, 'male-classic'::text, 'female-1'::text, 'male-1'::text, 'female-2'::text, 'male-2'::text, 'female-3'::text, 'male-3'::text, 'female-4'::text, 'male-4'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='studydex_xp_events'::regclass AND conname='studydex_xp_events_pkey') THEN ALTER TABLE studydex_xp_events ADD CONSTRAINT "studydex_xp_events_pkey" PRIMARY KEY (user_id, event_id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='studydex_xp_events'::regclass AND conname='studydex_xp_events_reward_type_check') THEN ALTER TABLE studydex_xp_events ADD CONSTRAINT "studydex_xp_events_reward_type_check" CHECK ((reward_type = ANY (ARRAY['timer'::text, 'flashcards'::text, 'quiz'::text, 'boss'::text]))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='topics'::regclass AND conname='topics_subject_id_fkey') THEN ALTER TABLE topics ADD CONSTRAINT "topics_subject_id_fkey" FOREIGN KEY (subject_id) REFERENCES subjects(id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='topics'::regclass AND conname='topics_level_id_fkey') THEN ALTER TABLE topics ADD CONSTRAINT "topics_level_id_fkey" FOREIGN KEY (level_id) REFERENCES levels(id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='flashcards'::regclass AND conname='flashcards_topic_id_fkey') THEN ALTER TABLE flashcards ADD CONSTRAINT "flashcards_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE RESTRICT; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='questions'::regclass AND conname='questions_topic_id_fkey') THEN ALTER TABLE questions ADD CONSTRAINT "questions_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE RESTRICT; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='question_options'::regclass AND conname='question_options_question_id_fkey') THEN ALTER TABLE question_options ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='question_answers'::regclass AND conname='question_answers_question_id_fkey') THEN ALTER TABLE question_answers ADD CONSTRAINT "question_answers_question_id_fkey" FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='question_answers'::regclass AND conname='correct_option_matches_question') THEN ALTER TABLE question_answers ADD CONSTRAINT "correct_option_matches_question" FOREIGN KEY (question_id, correct_option_id) REFERENCES question_options(question_id, id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='profiles'::regclass AND conname='profiles_id_fkey') THEN ALTER TABLE profiles ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='profiles'::regclass AND conname='profiles_school_level_id_fkey') THEN ALTER TABLE profiles ADD CONSTRAINT "profiles_school_level_id_fkey" FOREIGN KEY (school_level_id) REFERENCES levels(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='private.studydex_reward_accounts'::regclass AND conname='studydex_reward_accounts_user_id_fkey') THEN ALTER TABLE private.studydex_reward_accounts ADD CONSTRAINT "studydex_reward_accounts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='private.studydex_reward_accounts'::regclass AND conname='studydex_reward_accounts_starter_pokemon_id_fkey') THEN ALTER TABLE private.studydex_reward_accounts ADD CONSTRAINT "studydex_reward_accounts_starter_pokemon_id_fkey" FOREIGN KEY (starter_pokemon_id) REFERENCES pokemon(id) ON DELETE RESTRICT; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='study_sessions'::regclass AND conname='study_sessions_user_id_fkey') THEN ALTER TABLE study_sessions ADD CONSTRAINT "study_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='study_sessions'::regclass AND conname='study_sessions_topic_id_fkey') THEN ALTER TABLE study_sessions ADD CONSTRAINT "study_sessions_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='private.studydex_reward_accounts'::regclass AND conname='studydex_reward_accounts_starter_owned_id_fkey') THEN ALTER TABLE private.studydex_reward_accounts ADD CONSTRAINT "studydex_reward_accounts_starter_owned_id_fkey" FOREIGN KEY (starter_owned_id) REFERENCES user_pokemon(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='pomodoro_blocks'::regclass AND conname='pomodoro_blocks_session_id_fkey') THEN ALTER TABLE pomodoro_blocks ADD CONSTRAINT "pomodoro_blocks_session_id_fkey" FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='pokemon'::regclass AND conname='pokemon_evolves_from_id_fkey') THEN ALTER TABLE pokemon ADD CONSTRAINT "pokemon_evolves_from_id_fkey" FOREIGN KEY (evolves_from_id) REFERENCES pokemon(id) ON DELETE RESTRICT; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='user_pokemon'::regclass AND conname='user_pokemon_user_id_fkey') THEN ALTER TABLE user_pokemon ADD CONSTRAINT "user_pokemon_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='user_pokemon'::regclass AND conname='user_pokemon_pokemon_id_fkey') THEN ALTER TABLE user_pokemon ADD CONSTRAINT "user_pokemon_pokemon_id_fkey" FOREIGN KEY (pokemon_id) REFERENCES pokemon(id) ON DELETE RESTRICT; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='quiz_attempts'::regclass AND conname='quiz_attempts_user_id_fkey') THEN ALTER TABLE quiz_attempts ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='quiz_attempts'::regclass AND conname='quiz_attempts_topic_id_fkey') THEN ALTER TABLE quiz_attempts ADD CONSTRAINT "quiz_attempts_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE RESTRICT; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='quiz_attempt_answers'::regclass AND conname='quiz_attempt_answers_attempt_id_fkey') THEN ALTER TABLE quiz_attempt_answers ADD CONSTRAINT "quiz_attempt_answers_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='quiz_attempt_answers'::regclass AND conname='quiz_attempt_answers_question_id_fkey') THEN ALTER TABLE quiz_attempt_answers ADD CONSTRAINT "quiz_attempt_answers_question_id_fkey" FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE RESTRICT; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='quiz_attempt_answers'::regclass AND conname='selected_option_matches_question') THEN ALTER TABLE quiz_attempt_answers ADD CONSTRAINT "selected_option_matches_question" FOREIGN KEY (question_id, selected_option_id) REFERENCES question_options(question_id, id) ON DELETE RESTRICT; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='user_packs'::regclass AND conname='user_packs_user_id_fkey') THEN ALTER TABLE user_packs ADD CONSTRAINT "user_packs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='user_packs'::regclass AND conname='user_packs_reward_pokemon_id_fkey') THEN ALTER TABLE user_packs ADD CONSTRAINT "user_packs_reward_pokemon_id_fkey" FOREIGN KEY (reward_pokemon_id) REFERENCES pokemon(id) ON DELETE RESTRICT; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='user_packs'::regclass AND conname='user_packs_xp_recipient_id_fkey') THEN ALTER TABLE user_packs ADD CONSTRAINT "user_packs_xp_recipient_id_fkey" FOREIGN KEY (xp_recipient_id) REFERENCES user_pokemon(id) ON DELETE RESTRICT; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='topic_learning_goals'::regclass AND conname='topic_learning_goals_topic_id_fkey') THEN ALTER TABLE topic_learning_goals ADD CONSTRAINT "topic_learning_goals_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='topic_concepts'::regclass AND conname='topic_concepts_topic_id_fkey') THEN ALTER TABLE topic_concepts ADD CONSTRAINT "topic_concepts_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='questions'::regclass AND conname='questions_concept_id_fkey') THEN ALTER TABLE questions ADD CONSTRAINT "questions_concept_id_fkey" FOREIGN KEY (concept_id) REFERENCES topic_concepts(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='flashcards'::regclass AND conname='flashcards_concept_id_fkey') THEN ALTER TABLE flashcards ADD CONSTRAINT "flashcards_concept_id_fkey" FOREIGN KEY (concept_id) REFERENCES topic_concepts(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='private.studydex_reward_accounts'::regclass AND conname='studydex_reward_accounts_recovery_pack_id_fkey') THEN ALTER TABLE private.studydex_reward_accounts ADD CONSTRAINT "studydex_reward_accounts_recovery_pack_id_fkey" FOREIGN KEY (recovery_pack_id) REFERENCES user_packs(id) ON DELETE SET NULL; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='private.studydex_pack_receipts'::regclass AND conname='studydex_pack_receipts_pack_id_fkey') THEN ALTER TABLE private.studydex_pack_receipts ADD CONSTRAINT "studydex_pack_receipts_pack_id_fkey" FOREIGN KEY (pack_id) REFERENCES user_packs(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='private.studydex_pack_receipts'::regclass AND conname='studydex_pack_receipts_user_id_fkey') THEN ALTER TABLE private.studydex_pack_receipts ADD CONSTRAINT "studydex_pack_receipts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE; END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='studydex_xp_events'::regclass AND conname='studydex_xp_events_user_id_fkey') THEN ALTER TABLE studydex_xp_events ADD CONSTRAINT "studydex_xp_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='studydex_xp_events'::regclass AND conname='studydex_xp_events_pokemon_record_id_fkey') THEN ALTER TABLE studydex_xp_events ADD CONSTRAINT "studydex_xp_events_pokemon_record_id_fkey" FOREIGN KEY (pokemon_record_id) REFERENCES user_pokemon(id); END IF; END $baseline$;
CREATE UNIQUE INDEX IF NOT EXISTS topics_roadmap_order_idx ON public.topics USING btree (level_id, subject_id, topic_order) WHERE (topic_order IS NOT NULL);
CREATE INDEX IF NOT EXISTS study_sessions_user_started_at_idx ON public.study_sessions USING btree (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS pokemon_evolves_from_idx ON public.pokemon USING btree (evolves_from_id);
CREATE INDEX IF NOT EXISTS quiz_attempts_user_completed_at_idx ON public.quiz_attempts USING btree (user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS quiz_attempt_answers_question_id_idx ON public.quiz_attempt_answers USING btree (question_id);
CREATE INDEX IF NOT EXISTS studydex_reward_accounts_starter_idx ON private.studydex_reward_accounts USING btree (starter_pokemon_id);
CREATE INDEX IF NOT EXISTS studydex_reward_accounts_owned_idx ON private.studydex_reward_accounts USING btree (starter_owned_id);
CREATE INDEX IF NOT EXISTS studydex_reward_accounts_recovery_idx ON private.studydex_reward_accounts USING btree (recovery_pack_id);
CREATE INDEX IF NOT EXISTS studydex_pack_receipts_user_idx ON private.studydex_pack_receipts USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_packs_user_earned_at_idx ON public.user_packs USING btree (user_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON public.questions USING btree (topic_id);
CREATE INDEX IF NOT EXISTS user_pokemon_user_idx ON public.user_pokemon USING btree (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS one_selected_pokemon_per_user_idx ON public.user_pokemon USING btree (user_id) WHERE (is_selected = true);
CREATE OR REPLACE FUNCTION private.create_registration_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  profile_name text;
  selected_level uuid;
begin
  profile_name := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1));
  if profile_name is null or char_length(profile_name) > 80 then
    raise exception 'Display name must contain between 1 and 80 characters';
  end if;

  if new.raw_user_meta_data ? 'school_level_number' then
    select id into selected_level from public.levels
    where level_number = (new.raw_user_meta_data ->> 'school_level_number')::smallint;
    if selected_level is null then
      raise exception 'Choose a valid Primary level';
    end if;
  end if;

  insert into public.profiles (id, display_name, school_level_id, avatar_choice)
  values (new.id, profile_name, selected_level, coalesce(new.raw_user_meta_data ->> 'avatar_choice', 'prefer_not_to_say'));
  return new;
end;
$function$
;
REVOKE ALL ON FUNCTION private.create_registration_profile() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.create_registration_profile() TO service_role;
CREATE OR REPLACE FUNCTION private.studydex_claim_starter(p_pokeapi_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := private.studydex_reward_uid(); species uuid; owned uuid;
  account private.studydex_reward_accounts%rowtype;
begin
  if p_pokeapi_id is null or p_pokeapi_id not in (1, 4, 7) then raise exception 'choose one of the three starters'; end if;
  perform 1 from public.profiles where id = uid for update;
  insert into private.studydex_reward_accounts(user_id) values (uid) on conflict (user_id) do nothing;
  select * into strict account from private.studydex_reward_accounts where user_id = uid for update;
  if account.starter_claimed_at is not null or exists (select 1 from public.user_pokemon where user_id = uid) then
    return jsonb_build_object('user_id', uid, 'claimed', true, 'already_claimed', true);
  end if;
  select id into species from public.pokemon where pokeapi_id = p_pokeapi_id and evolves_from_id is null;
  if species is null then raise exception 'starter catalogue is not ready'; end if;
  insert into public.user_pokemon(user_id, pokemon_id, xp, level, is_selected, is_defeated)
    values (uid, species, 0, 1, true, false) returning id into owned;
  update private.studydex_reward_accounts set starter_pokemon_id = species, starter_owned_id = owned,
    starter_claimed_at = now() where user_id = uid;
  return jsonb_build_object('user_id', uid, 'claimed', true, 'already_claimed', false,
    'pokemon', private.studydex_owned_pokemon(owned, uid));
end;
$function$
;
REVOKE ALL ON FUNCTION private.studydex_claim_starter(p_pokeapi_id integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.studydex_claim_starter(p_pokeapi_id integer) TO service_role, authenticated;
CREATE OR REPLACE FUNCTION private.studydex_ensure_recovery(uid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare existing_pack uuid; new_pack uuid;
begin
  if not exists (select 1 from public.user_pokemon where user_id = uid)
    or exists (select 1 from public.user_pokemon where user_id = uid and xp < 250)
    or not exists (select 1 from public.pokemon p where p.evolves_from_id is null
      and not exists (select 1 from public.user_pokemon u where u.user_id = uid and u.pokemon_id = p.id)) then return; end if;
  select a.recovery_pack_id into existing_pack from private.studydex_reward_accounts a
    join public.user_packs p on p.id = a.recovery_pack_id and p.user_id = uid and p.opened_at is null where a.user_id = uid;
  if existing_pack is not null then return; end if;
  insert into public.user_packs(user_id) values (uid) returning id into new_pack;
  update private.studydex_reward_accounts set recovery_pack_id = new_pack where user_id = uid;
end;
$function$
;
REVOKE ALL ON FUNCTION private.studydex_ensure_recovery(uid uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.studydex_ensure_recovery(uid uuid) TO service_role;
CREATE OR REPLACE FUNCTION private.studydex_get_onboarding_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := private.studydex_reward_uid();
  selected_avatar text;
  selected_level uuid;
  confirmed_at timestamptz;
  has_starter boolean;
begin
  select avatar_choice, school_level_id into strict selected_avatar, selected_level
    from public.profiles where id = uid;
  select avatar_confirmed_at into confirmed_at
    from private.studydex_reward_accounts where user_id = uid;
  has_starter := (private.studydex_get_starter_status() ->> 'claimed')::boolean;
  return jsonb_build_object(
    'user_id', uid, 'avatar_choice', selected_avatar, 'school_level_id', selected_level,
    'avatar_confirmed', confirmed_at is not null, 'starter_claimed', has_starter,
    'onboarding_complete', selected_level is not null and confirmed_at is not null and has_starter,
    'next_step', case when selected_level is null then 'account'
      when confirmed_at is null then 'avatar' when not has_starter then 'starter' else 'town' end
  );
end;
$function$
;
REVOKE ALL ON FUNCTION private.studydex_get_onboarding_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.studydex_get_onboarding_status() TO service_role, authenticated;
CREATE OR REPLACE FUNCTION private.studydex_get_reward_inventory()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := private.studydex_reward_uid(); result jsonb;
begin
  with unopened as materialized (
    select id, earned_at from public.user_packs where user_id = uid and opened_at is null
  ), first_packs as (select * from unopened order by earned_at, id limit 20)
  select jsonb_build_object('user_id', uid, 'unopened_count', (select count(*) from unopened),
    'packs', coalesce((select jsonb_agg(to_jsonb(p) order by p.earned_at, p.id) from first_packs p), '[]'::jsonb),
    'recent_results', coalesce((select jsonb_agg(r.result order by r.created_at desc)
      from (select receipt.result, receipt.created_at from private.studydex_pack_receipts receipt where receipt.user_id = uid order by receipt.created_at desc limit 5) r), '[]'::jsonb)) into result;
  return result;
end;
$function$
;
REVOKE ALL ON FUNCTION private.studydex_get_reward_inventory() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.studydex_get_reward_inventory() TO service_role, authenticated;
CREATE OR REPLACE FUNCTION private.studydex_get_starter_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := private.studydex_reward_uid();
begin
  return jsonb_build_object('user_id', uid, 'claimed',
    exists (select 1 from private.studydex_reward_accounts where user_id = uid and starter_claimed_at is not null)
    or exists (select 1 from public.user_pokemon where user_id = uid));
end;
$function$
;
REVOKE ALL ON FUNCTION private.studydex_get_starter_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.studydex_get_starter_status() TO service_role, authenticated;
CREATE OR REPLACE FUNCTION private.studydex_get_user_pokemon()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := private.studydex_reward_uid(); result jsonb;
begin
  select coalesce(jsonb_agg(private.studydex_owned_pokemon(p.id, uid)
    order by p.is_selected desc, p.obtained_at, p.id), '[]'::jsonb)
    into result from public.user_pokemon p where p.user_id = uid;
  return jsonb_build_object('user_id', uid, 'pokemon', result,
    'starter_claimed', exists (select 1 from private.studydex_reward_accounts where user_id = uid and starter_claimed_at is not null)
      or exists (select 1 from public.user_pokemon where user_id = uid),
    'pending_xp', coalesce((select pending_xp from private.studydex_reward_accounts where user_id = uid), 0));
end;
$function$
;
REVOKE ALL ON FUNCTION private.studydex_get_user_pokemon() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.studydex_get_user_pokemon() TO service_role, authenticated;
CREATE OR REPLACE FUNCTION private.studydex_open_reward_pack(p_pack_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := private.studydex_reward_uid(); pack public.user_packs%rowtype;
  drawn public.pokemon%rowtype; buddy public.user_pokemon%rowtype; existing uuid; acquired uuid;
  recovery uuid; must_be_new boolean; applied integer := 0; pending integer := 0; result jsonb;
begin
  perform 1 from public.profiles where id = uid for update;
  select * into pack from public.user_packs where id = p_pack_id and user_id = uid for update;
  if not found then raise exception 'choose one of your saved packs' using errcode = '42501'; end if;
  if pack.opened_at is not null then
    select r.result into result from private.studydex_pack_receipts r where r.pack_id = pack.id and r.user_id = uid;
    if result is null then raise exception 'saved pack result unavailable; please contact the team'; end if;
    return result;
  end if;
  if not exists (select 1 from public.user_pokemon where user_id = uid) then raise exception 'choose your starter first'; end if;
  insert into private.studydex_reward_accounts(user_id) values (uid) on conflict (user_id) do nothing;
  select recovery_pack_id into recovery from private.studydex_reward_accounts where user_id = uid for update;
  must_be_new := coalesce(recovery = pack.id, false)
    or not exists (select 1 from public.user_pokemon where user_id = uid and xp < 250);
  select p.* into drawn from public.pokemon p where p.evolves_from_id is null
    and (not must_be_new or not exists (select 1 from public.user_pokemon u where u.user_id = uid and u.pokemon_id = p.id))
    order by random() limit 1;
  if drawn.id is null then raise exception 'your collection is fully trained; this pack has not been used'; end if;
  select id into existing from public.user_pokemon where user_id = uid and pokemon_id = drawn.id;
  if existing is null then
    insert into public.user_pokemon(user_id, pokemon_id, xp, level, is_selected, is_defeated)
      values (uid, drawn.id, 0, 1, false, false) returning id into acquired;
    update public.user_packs set opened_at = greatest(now(), earned_at), reward_type = 'pokemon',
      reward_pokemon_id = drawn.id where id = pack.id;
    result := jsonb_build_object('user_id', uid, 'pack_id', pack.id, 'reward_type', 'pokemon',
      'xp_awarded', 0, 'xp_applied', 0, 'xp_pending', 0, 'owned_id', acquired);
  else
    select * into buddy from public.user_pokemon where user_id = uid and is_selected for update;
    if not found then raise exception 'select your buddy before opening this pack'; end if;
    applied := least(25, greatest(0, 250 - buddy.xp)); pending := 25 - applied;
    update public.user_pokemon set xp = xp + applied where id = buddy.id;
    update public.user_pokemon set level = (private.studydex_owned_pokemon(buddy.id, uid)->>'level')::integer where id = buddy.id;
    update private.studydex_reward_accounts set pending_xp = pending_xp + pending where user_id = uid;
    update public.user_packs set opened_at = greatest(now(), earned_at), reward_type = 'xp',
      xp_awarded = 25, xp_recipient_id = buddy.id where id = pack.id;
    result := jsonb_build_object('user_id', uid, 'pack_id', pack.id, 'reward_type', 'xp',
      'xp_awarded', 25, 'xp_applied', applied, 'xp_pending', pending, 'xp_recipient_id', buddy.id);
  end if;
  result := result || jsonb_build_object('pokemon', jsonb_build_object('id', drawn.id,
    'pokeapi_id', drawn.pokeapi_id, 'name', drawn.name, 'sprite_url', drawn.sprite_url));
  insert into private.studydex_pack_receipts(pack_id, user_id, result) values (pack.id, uid, result);
  perform private.studydex_ensure_recovery(uid);
  return result;
end;
$function$
;
REVOKE ALL ON FUNCTION private.studydex_open_reward_pack(p_pack_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.studydex_open_reward_pack(p_pack_id uuid) TO service_role, authenticated;
CREATE OR REPLACE FUNCTION private.studydex_owned_pokemon(owned_id uuid, student_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare owned public.user_pokemon%rowtype; base public.pokemon%rowtype;
  current_form public.pokemon%rowtype; stage_count integer; stage integer;
begin
  select * into strict owned from public.user_pokemon where id = owned_id and user_id = student_id;
  select * into strict base from public.pokemon where id = owned.pokemon_id;
  with recursive forms as (
    select p.id, 0 as depth from public.pokemon p where p.id = base.id
    union all
    select p.id, f.depth + 1 from forms f join public.pokemon p on p.evolves_from_id = f.id where f.depth < 2
  ) select max(depth) + 1 into stage_count from forms;
  stage := case when stage_count = 3 and owned.xp >= 175 then 2
    when stage_count = 3 and owned.xp >= 75 then 1
    when stage_count = 2 and owned.xp >= 125 then 1 else 0 end;
  with recursive forms as (
    select p.*, 0 as depth from public.pokemon p where p.id = base.id
    union all
    select p.*, f.depth + 1 from forms f join public.pokemon p on p.evolves_from_id = f.id where f.depth < 2
  ) select id, pokeapi_id, name, sprite_url, evolves_from_id, created_at into current_form
    from forms where depth = stage order by pokeapi_id limit 1;
  return jsonb_build_object(
    'owned_id', owned.id, 'pokemon_id', base.id, 'pokeapi_id', current_form.pokeapi_id,
    'original_pokeapi_id', base.pokeapi_id, 'name', current_form.name,
    'sprite_url', current_form.sprite_url, 'xp', owned.xp, 'level', stage + 1,
    'stage_count', stage_count, 'evolution_stage', stage, 'fully_trained', owned.xp >= 250,
    'is_selected', owned.is_selected, 'is_defeated', owned.is_defeated,
    'obtained_at', owned.obtained_at
  );
end;
$function$
;
REVOKE ALL ON FUNCTION private.studydex_owned_pokemon(owned_id uuid, student_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.studydex_owned_pokemon(owned_id uuid, student_id uuid) TO service_role;
CREATE OR REPLACE FUNCTION private.studydex_reward_uid()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'please log in' using errcode = '28000'; end if;
  if not exists (select 1 from public.profiles where id = uid) then
    raise exception 'your student profile is not ready';
  end if;
  return uid;
end;
$function$
;
REVOKE ALL ON FUNCTION private.studydex_reward_uid() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.studydex_reward_uid() TO service_role;
CREATE OR REPLACE FUNCTION private.studydex_save_onboarding_avatar(p_avatar_choice text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := private.studydex_reward_uid();
  selected_level uuid;
  has_starter boolean;
begin
  if p_avatar_choice is null or p_avatar_choice not in ('female-classic', 'male-classic', 'female-1', 'male-1', 'female-2', 'male-2', 'female-3', 'male-3', 'female-4', 'male-4') then
    raise exception 'choose one of the ten avatar styles' using errcode = '22023';
  end if;
  -- match the existing starter lock order: own profile first, reward account next.
  select school_level_id into selected_level from public.profiles where id = uid for update;
  if not found then raise exception 'your student profile is not ready'; end if;
  if selected_level is null then raise exception 'choose your primary level in account settings first'; end if;
  has_starter := (private.studydex_get_starter_status() ->> 'claimed')::boolean;
  insert into private.studydex_reward_accounts(user_id) values (uid)
    on conflict (user_id) do nothing;
  update public.profiles set avatar_choice = p_avatar_choice where id = uid;
  update private.studydex_reward_accounts
    set avatar_confirmed_at = coalesce(avatar_confirmed_at, now()) where user_id = uid;
  -- assemble from confirmed writes; do not use a stable read's earlier snapshot.
  return jsonb_build_object(
    'user_id', uid, 'avatar_choice', p_avatar_choice, 'school_level_id', selected_level,
    'avatar_confirmed', true, 'starter_claimed', has_starter,
    'onboarding_complete', has_starter,
    'next_step', case when has_starter then 'town' else 'starter' end
  );
end;
$function$
;
REVOKE ALL ON FUNCTION private.studydex_save_onboarding_avatar(p_avatar_choice text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.studydex_save_onboarding_avatar(p_avatar_choice text) TO service_role, authenticated;
CREATE OR REPLACE FUNCTION private.studydex_select_user_pokemon(p_owned_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid := private.studydex_reward_uid(); target public.user_pokemon%rowtype;
  pending integer; applied integer;
begin
  perform 1 from public.profiles where id = uid for update;
  select * into target from public.user_pokemon where id = p_owned_id and user_id = uid for update;
  if not found then raise exception 'choose a pokemon from your own collection' using errcode = '42501'; end if;
  update public.user_pokemon set is_selected = false where user_id = uid and is_selected;
  update public.user_pokemon set is_selected = true where id = target.id;
  select pending_xp into pending from private.studydex_reward_accounts where user_id = uid for update;
  applied := least(coalesce(pending, 0), greatest(0, 250 - target.xp));
  if applied > 0 then
    update public.user_pokemon set xp = xp + applied where id = target.id;
    update private.studydex_reward_accounts set pending_xp = pending_xp - applied where user_id = uid;
    update public.user_pokemon set level = (private.studydex_owned_pokemon(target.id, uid)->>'level')::integer where id = target.id;
  end if;
  perform private.studydex_ensure_recovery(uid);
  return private.studydex_get_user_pokemon();
end;
$function$
;
REVOKE ALL ON FUNCTION private.studydex_select_user_pokemon(p_owned_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.studydex_select_user_pokemon(p_owned_id uuid) TO service_role, authenticated;
CREATE OR REPLACE FUNCTION public.award_studydex_xp(p_event_id uuid, p_pokemon_record_id text, p_reward_type text, p_correct integer DEFAULT NULL::integer, p_total integer DEFAULT NULL::integer, p_boss_health integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_buddy public.user_pokemon%rowtype;
  v_previous public.studydex_xp_events%rowtype;
  v_record_id uuid;
  v_input jsonb;
  v_name text;
  v_delta integer;
  v_old_xp integer;
  v_xp integer;
  v_count integer;
  v_percent integer;
  v_low_percent integer;
  v_high_percent integer;
  v_low_xp integer;
  v_high_xp integer;
  v_day_start timestamptz;
  v_result jsonb;
begin
  if v_uid is null then raise exception 'Sign in before earning XP.'; end if;
  if p_event_id is null or nullif(btrim(p_pokemon_record_id), '') is null then
    raise exception 'An event ID and Pokemon record ID are required.';
  end if;
  v_record_id := p_pokemon_record_id::uuid;
  v_input := jsonb_build_object('correct', p_correct, 'total', p_total,
                               'bossHealth', p_boss_health);

  -- Serializes this user's awards and timer-limit checks.
  perform 1 from public.profiles where id = v_uid for update;
  if not found then raise exception 'Your profile was not found.'; end if;

  select * into v_previous from public.studydex_xp_events
    where user_id = v_uid and event_id = p_event_id;
  if found then
    if v_previous.pokemon_record_id <> v_record_id
       or v_previous.reward_type is distinct from p_reward_type then
      raise exception 'This event ID was already used for a different reward.';
    end if;
    -- Old rows have no input snapshot: return their original reward unchanged.
    if v_previous.input_payload is not null
       and v_previous.input_payload is distinct from v_input then
      raise exception 'This event ID was already used with different activity results.';
    end if;
    return v_previous.result || jsonb_build_object('duplicate', true);
  end if;

  select * into v_buddy from public.user_pokemon
    where id = v_record_id and user_id = v_uid for update;
  if not found then raise exception 'This Pokemon does not belong to you.'; end if;
  if v_buddy.is_selected is not true then
    raise exception 'Select this Pokemon as your buddy before earning XP.';
  end if;
  if v_buddy.is_defeated is true then
    raise exception 'Choose a buddy that is not defeated.';
  end if;

  if p_reward_type is distinct from 'quiz'
     and (p_correct is not null or p_total is not null) then
    raise exception 'Only quiz rewards accept correct and total.';
  end if;
  if p_reward_type is distinct from 'boss' and p_boss_health is not null then
    raise exception 'Only boss rewards accept remaining boss health.';
  end if;

  case p_reward_type
    when 'timer' then
      v_day_start := date_trunc('day', now() at time zone 'Asia/Singapore')
        at time zone 'Asia/Singapore';
      select count(*) into v_count from public.studydex_xp_events
        where user_id = v_uid and reward_type = 'timer' and requested_delta = 10
          and created_at >= v_day_start
          and created_at < v_day_start + interval '24 hours';
      v_delta := case when v_count < 4 then 10 else 0 end;
    when 'flashcards' then
      v_delta := 5;
    when 'boss' then
      if p_boss_health is null or p_boss_health not between 0 and 5 then
        raise exception 'Remaining boss health must be an integer from 0 to 5.';
      end if;
      v_delta := case when p_boss_health = 0 then 80 else -15 * p_boss_health end;
    when 'quiz' then
      if p_correct is null or p_total is null or p_total <= 0
         or p_correct < 0 or p_correct > p_total then
        raise exception 'Quiz requires total > 0 and correct between 0 and total.';
      end if;
      v_percent := round(100::numeric * p_correct / p_total)::integer;
      if v_percent = 0 then v_delta := 5;
      elsif v_percent = 100 then v_delta := 50;
      else
        if v_percent <= 20 then
          v_low_percent := 1; v_high_percent := 20; v_low_xp := 5; v_high_xp := 10;
        elsif v_percent <= 40 then
          v_low_percent := 21; v_high_percent := 40; v_low_xp := 11; v_high_xp := 20;
        elsif v_percent <= 60 then
          v_low_percent := 41; v_high_percent := 60; v_low_xp := 21; v_high_xp := 30;
        elsif v_percent <= 80 then
          v_low_percent := 61; v_high_percent := 80; v_low_xp := 31; v_high_xp := 40;
        else
          v_low_percent := 81; v_high_percent := 99; v_low_xp := 41; v_high_xp := 50;
        end if;
        v_delta := round(v_low_xp +
          (v_percent - v_low_percent)::numeric * (v_high_xp - v_low_xp)
          / (v_high_percent - v_low_percent))::integer;
      end if;
    else
      raise exception 'Unsupported reward type: %', p_reward_type;
  end case;

  v_old_xp := coalesce(v_buddy.xp, 0);
  v_xp := greatest(0, v_old_xp + v_delta);
  update public.user_pokemon set xp = v_xp where id = v_buddy.id;
  select name into v_name from public.pokemon where id = v_buddy.pokemon_id;
  v_result := jsonb_build_object(
    'eventId', p_event_id, 'rewardType', p_reward_type,
    'pokemonRecordId', v_buddy.id, 'pokemonName', v_name,
    'delta', v_delta, 'appliedDelta', v_xp - v_old_xp, 'xp', v_xp,
    'level', v_buddy.level, 'duplicate', false,
    'correct', p_correct, 'total', p_total, 'scorePercent', v_percent,
    'bossHealth', p_boss_health,
    'bossDefeated', case when p_reward_type = 'boss' then p_boss_health = 0 else null end,
    'rulesVersion', 2
  );
  insert into public.studydex_xp_events
    (user_id, event_id, pokemon_record_id, reward_type,
     requested_delta, applied_delta, result, input_payload)
  values (v_uid, p_event_id, v_buddy.id, p_reward_type,
          v_delta, v_xp - v_old_xp, v_result, v_input);
  return v_result;
end;
$function$
;
REVOKE ALL ON FUNCTION public.award_studydex_xp(p_event_id uuid, p_pokemon_record_id text, p_reward_type text, p_correct integer, p_total integer, p_boss_health integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_studydex_xp(p_event_id uuid, p_pokemon_record_id text, p_reward_type text, p_correct integer, p_total integer, p_boss_health integer) TO service_role, authenticated;
CREATE OR REPLACE FUNCTION public.claim_starter(p_pokeapi_id integer)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.studydex_claim_starter(p_pokeapi_id); $function$
;
REVOKE ALL ON FUNCTION public.claim_starter(p_pokeapi_id integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_starter(p_pokeapi_id integer) TO service_role, authenticated;
CREATE OR REPLACE FUNCTION public.get_onboarding_status()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select private.studydex_get_onboarding_status() $function$
;
REVOKE ALL ON FUNCTION public.get_onboarding_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_onboarding_status() TO service_role, authenticated;
CREATE OR REPLACE FUNCTION public.get_reward_inventory()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select private.studydex_get_reward_inventory(); $function$
;
REVOKE ALL ON FUNCTION public.get_reward_inventory() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_reward_inventory() TO service_role, authenticated;
CREATE OR REPLACE FUNCTION public.get_starter_status()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select private.studydex_get_starter_status(); $function$
;
REVOKE ALL ON FUNCTION public.get_starter_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_starter_status() TO service_role, authenticated;
CREATE OR REPLACE FUNCTION public.get_user_pokemon()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$ select private.studydex_get_user_pokemon(); $function$
;
REVOKE ALL ON FUNCTION public.get_user_pokemon() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_pokemon() TO service_role, authenticated;
CREATE OR REPLACE FUNCTION public.open_reward_pack(p_pack_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.studydex_open_reward_pack(p_pack_id); $function$
;
REVOKE ALL ON FUNCTION public.open_reward_pack(p_pack_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_reward_pack(p_pack_id uuid) TO service_role, authenticated;
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
CREATE OR REPLACE FUNCTION public.save_onboarding_avatar(p_avatar_choice text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.studydex_save_onboarding_avatar(p_avatar_choice) $function$
;
REVOKE ALL ON FUNCTION public.save_onboarding_avatar(p_avatar_choice text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_onboarding_avatar(p_avatar_choice text) TO service_role, authenticated;
CREATE OR REPLACE FUNCTION public.select_user_pokemon(p_owned_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select private.studydex_select_user_pokemon(p_owned_id); $function$
;
REVOKE ALL ON FUNCTION public.select_user_pokemon(p_owned_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.select_user_pokemon(p_owned_id uuid) TO service_role, authenticated;
CREATE OR REPLACE FUNCTION public.set_active_pokemon(p_row_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  update public.user_pokemon
    set is_selected = false
    where user_id = auth.uid() and is_selected = true;

  update public.user_pokemon
    set is_selected = true
    where id = p_row_id and user_id = auth.uid();

  if not found then
    raise exception 'Pokemon row not found or not owned by user';
  end if;
end;
$function$
;
REVOKE ALL ON FUNCTION public.set_active_pokemon(p_row_id uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_pokemon(p_row_id uuid) TO service_role, anon, authenticated;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subjects' AND policyname='studydeck_read_subject_names') THEN CREATE POLICY "studydeck_read_subject_names" ON "public"."subjects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='topics' AND policyname='studydeck_read_registered_level_topics') THEN CREATE POLICY "studydeck_read_registered_level_topics" ON "public"."topics" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((level_id = ( SELECT profile.school_level_id
   FROM profiles profile
  WHERE (profile.id = ( SELECT auth.uid() AS uid))))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can read their own profile') THEN CREATE POLICY "Users can read their own profile" ON "public"."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = id)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Users can update their own profile') THEN CREATE POLICY "Users can update their own profile" ON "public"."profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((( SELECT auth.uid() AS uid) = id)) WITH CHECK ((( SELECT auth.uid() AS uid) = id)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='question_options' AND policyname='studydeck_read_level_options') THEN CREATE POLICY "studydeck_read_level_options" ON "public"."question_options" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM questions question
  WHERE (question.id = question_options.question_id)))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pokemon' AND policyname='read pokemon') THEN CREATE POLICY "read pokemon" ON "public"."pokemon" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pokemon' AND policyname='studydeck_read_pokemon_catalogue') THEN CREATE POLICY "studydeck_read_pokemon_catalogue" ON "public"."pokemon" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_packs' AND policyname='studydex_read_own_packs') THEN CREATE POLICY "studydex_read_own_packs" ON "public"."user_packs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = user_id)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='levels' AND policyname='Anyone can read school levels') THEN CREATE POLICY "Anyone can read school levels" ON "public"."levels" AS PERMISSIVE FOR SELECT TO "anon","authenticated" USING (true); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='topic_learning_goals' AND policyname='studydeck_read_level_goals') THEN CREATE POLICY "studydeck_read_level_goals" ON "public"."topic_learning_goals" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM topics topic
  WHERE (topic.id = topic_learning_goals.topic_id)))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='topic_concepts' AND policyname='studydeck_read_level_concepts') THEN CREATE POLICY "studydeck_read_level_concepts" ON "public"."topic_concepts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM topics topic
  WHERE (topic.id = topic_concepts.topic_id)))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='questions' AND policyname='studydeck_read_level_questions') THEN CREATE POLICY "studydeck_read_level_questions" ON "public"."questions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM topics topic
  WHERE (topic.id = questions.topic_id)))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='flashcards' AND policyname='studydeck_read_level_flashcards') THEN CREATE POLICY "studydeck_read_level_flashcards" ON "public"."flashcards" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM topics topic
  WHERE (topic.id = flashcards.topic_id)))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_pokemon' AND policyname='insert own') THEN CREATE POLICY "insert own" ON "public"."user_pokemon" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = user_id)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_pokemon' AND policyname='studydeck_read_own_buddy') THEN CREATE POLICY "studydeck_read_own_buddy" ON "public"."user_pokemon" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid))); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_pokemon' AND policyname='update own') THEN CREATE POLICY "update own" ON "public"."user_pokemon" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id)); END IF; END $baseline$;
DO $baseline$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='studydex_xp_events' AND policyname='read_own_xp_events') THEN CREATE POLICY "read_own_xp_events" ON "public"."studydex_xp_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((( SELECT auth.uid() AS uid) = user_id)); END IF; END $baseline$;
GRANT INSERT ON "public"."subjects" TO "anon";
GRANT SELECT ON "public"."subjects" TO "anon";
GRANT UPDATE ON "public"."subjects" TO "anon";
GRANT DELETE ON "public"."subjects" TO "anon";
GRANT REFERENCES ON "public"."subjects" TO "anon";
GRANT TRIGGER ON "public"."subjects" TO "anon";
GRANT INSERT ON "public"."subjects" TO "authenticated";
GRANT SELECT ON "public"."subjects" TO "authenticated";
GRANT UPDATE ON "public"."subjects" TO "authenticated";
GRANT DELETE ON "public"."subjects" TO "authenticated";
GRANT REFERENCES ON "public"."subjects" TO "authenticated";
GRANT TRIGGER ON "public"."subjects" TO "authenticated";
GRANT INSERT ON "public"."subjects" TO "service_role";
GRANT SELECT ON "public"."subjects" TO "service_role";
GRANT UPDATE ON "public"."subjects" TO "service_role";
GRANT DELETE ON "public"."subjects" TO "service_role";
GRANT TRUNCATE ON "public"."subjects" TO "service_role";
GRANT REFERENCES ON "public"."subjects" TO "service_role";
GRANT TRIGGER ON "public"."subjects" TO "service_role";
GRANT INSERT ON "public"."topics" TO "anon";
GRANT SELECT ON "public"."topics" TO "anon";
GRANT UPDATE ON "public"."topics" TO "anon";
GRANT DELETE ON "public"."topics" TO "anon";
GRANT REFERENCES ON "public"."topics" TO "anon";
GRANT TRIGGER ON "public"."topics" TO "anon";
GRANT INSERT ON "public"."topics" TO "authenticated";
GRANT SELECT ON "public"."topics" TO "authenticated";
GRANT UPDATE ON "public"."topics" TO "authenticated";
GRANT DELETE ON "public"."topics" TO "authenticated";
GRANT REFERENCES ON "public"."topics" TO "authenticated";
GRANT TRIGGER ON "public"."topics" TO "authenticated";
GRANT INSERT ON "public"."topics" TO "service_role";
GRANT SELECT ON "public"."topics" TO "service_role";
GRANT UPDATE ON "public"."topics" TO "service_role";
GRANT DELETE ON "public"."topics" TO "service_role";
GRANT TRUNCATE ON "public"."topics" TO "service_role";
GRANT REFERENCES ON "public"."topics" TO "service_role";
GRANT TRIGGER ON "public"."topics" TO "service_role";
GRANT INSERT ON "public"."profiles" TO "service_role";
GRANT SELECT ON "public"."profiles" TO "service_role";
GRANT UPDATE ON "public"."profiles" TO "service_role";
GRANT DELETE ON "public"."profiles" TO "service_role";
GRANT TRUNCATE ON "public"."profiles" TO "service_role";
GRANT REFERENCES ON "public"."profiles" TO "service_role";
GRANT TRIGGER ON "public"."profiles" TO "service_role";
GRANT SELECT ON "public"."profiles" TO "authenticated";
GRANT INSERT ON "public"."question_options" TO "anon";
GRANT SELECT ON "public"."question_options" TO "anon";
GRANT UPDATE ON "public"."question_options" TO "anon";
GRANT DELETE ON "public"."question_options" TO "anon";
GRANT REFERENCES ON "public"."question_options" TO "anon";
GRANT TRIGGER ON "public"."question_options" TO "anon";
GRANT INSERT ON "public"."question_options" TO "authenticated";
GRANT SELECT ON "public"."question_options" TO "authenticated";
GRANT UPDATE ON "public"."question_options" TO "authenticated";
GRANT DELETE ON "public"."question_options" TO "authenticated";
GRANT REFERENCES ON "public"."question_options" TO "authenticated";
GRANT TRIGGER ON "public"."question_options" TO "authenticated";
GRANT INSERT ON "public"."question_options" TO "service_role";
GRANT SELECT ON "public"."question_options" TO "service_role";
GRANT UPDATE ON "public"."question_options" TO "service_role";
GRANT DELETE ON "public"."question_options" TO "service_role";
GRANT TRUNCATE ON "public"."question_options" TO "service_role";
GRANT REFERENCES ON "public"."question_options" TO "service_role";
GRANT TRIGGER ON "public"."question_options" TO "service_role";
GRANT INSERT ON "public"."question_answers" TO "anon";
GRANT SELECT ON "public"."question_answers" TO "anon";
GRANT UPDATE ON "public"."question_answers" TO "anon";
GRANT DELETE ON "public"."question_answers" TO "anon";
GRANT REFERENCES ON "public"."question_answers" TO "anon";
GRANT TRIGGER ON "public"."question_answers" TO "anon";
GRANT INSERT ON "public"."question_answers" TO "authenticated";
GRANT SELECT ON "public"."question_answers" TO "authenticated";
GRANT UPDATE ON "public"."question_answers" TO "authenticated";
GRANT DELETE ON "public"."question_answers" TO "authenticated";
GRANT REFERENCES ON "public"."question_answers" TO "authenticated";
GRANT TRIGGER ON "public"."question_answers" TO "authenticated";
GRANT INSERT ON "public"."question_answers" TO "service_role";
GRANT SELECT ON "public"."question_answers" TO "service_role";
GRANT UPDATE ON "public"."question_answers" TO "service_role";
GRANT DELETE ON "public"."question_answers" TO "service_role";
GRANT TRUNCATE ON "public"."question_answers" TO "service_role";
GRANT REFERENCES ON "public"."question_answers" TO "service_role";
GRANT TRIGGER ON "public"."question_answers" TO "service_role";
GRANT INSERT ON "public"."study_sessions" TO "anon";
GRANT SELECT ON "public"."study_sessions" TO "anon";
GRANT UPDATE ON "public"."study_sessions" TO "anon";
GRANT DELETE ON "public"."study_sessions" TO "anon";
GRANT REFERENCES ON "public"."study_sessions" TO "anon";
GRANT TRIGGER ON "public"."study_sessions" TO "anon";
GRANT INSERT ON "public"."study_sessions" TO "authenticated";
GRANT SELECT ON "public"."study_sessions" TO "authenticated";
GRANT UPDATE ON "public"."study_sessions" TO "authenticated";
GRANT DELETE ON "public"."study_sessions" TO "authenticated";
GRANT REFERENCES ON "public"."study_sessions" TO "authenticated";
GRANT TRIGGER ON "public"."study_sessions" TO "authenticated";
GRANT INSERT ON "public"."study_sessions" TO "service_role";
GRANT SELECT ON "public"."study_sessions" TO "service_role";
GRANT UPDATE ON "public"."study_sessions" TO "service_role";
GRANT DELETE ON "public"."study_sessions" TO "service_role";
GRANT TRUNCATE ON "public"."study_sessions" TO "service_role";
GRANT REFERENCES ON "public"."study_sessions" TO "service_role";
GRANT TRIGGER ON "public"."study_sessions" TO "service_role";
GRANT INSERT ON "public"."pomodoro_blocks" TO "anon";
GRANT SELECT ON "public"."pomodoro_blocks" TO "anon";
GRANT UPDATE ON "public"."pomodoro_blocks" TO "anon";
GRANT DELETE ON "public"."pomodoro_blocks" TO "anon";
GRANT REFERENCES ON "public"."pomodoro_blocks" TO "anon";
GRANT TRIGGER ON "public"."pomodoro_blocks" TO "anon";
GRANT INSERT ON "public"."pomodoro_blocks" TO "authenticated";
GRANT SELECT ON "public"."pomodoro_blocks" TO "authenticated";
GRANT UPDATE ON "public"."pomodoro_blocks" TO "authenticated";
GRANT DELETE ON "public"."pomodoro_blocks" TO "authenticated";
GRANT REFERENCES ON "public"."pomodoro_blocks" TO "authenticated";
GRANT TRIGGER ON "public"."pomodoro_blocks" TO "authenticated";
GRANT INSERT ON "public"."pomodoro_blocks" TO "service_role";
GRANT SELECT ON "public"."pomodoro_blocks" TO "service_role";
GRANT UPDATE ON "public"."pomodoro_blocks" TO "service_role";
GRANT DELETE ON "public"."pomodoro_blocks" TO "service_role";
GRANT TRUNCATE ON "public"."pomodoro_blocks" TO "service_role";
GRANT REFERENCES ON "public"."pomodoro_blocks" TO "service_role";
GRANT TRIGGER ON "public"."pomodoro_blocks" TO "service_role";
GRANT SELECT ON "public"."pokemon" TO "authenticated";
GRANT INSERT ON "public"."pokemon" TO "service_role";
GRANT SELECT ON "public"."pokemon" TO "service_role";
GRANT UPDATE ON "public"."pokemon" TO "service_role";
GRANT DELETE ON "public"."pokemon" TO "service_role";
GRANT TRUNCATE ON "public"."pokemon" TO "service_role";
GRANT REFERENCES ON "public"."pokemon" TO "service_role";
GRANT TRIGGER ON "public"."pokemon" TO "service_role";
GRANT INSERT ON "public"."quiz_attempts" TO "anon";
GRANT SELECT ON "public"."quiz_attempts" TO "anon";
GRANT UPDATE ON "public"."quiz_attempts" TO "anon";
GRANT DELETE ON "public"."quiz_attempts" TO "anon";
GRANT REFERENCES ON "public"."quiz_attempts" TO "anon";
GRANT TRIGGER ON "public"."quiz_attempts" TO "anon";
GRANT INSERT ON "public"."quiz_attempts" TO "authenticated";
GRANT SELECT ON "public"."quiz_attempts" TO "authenticated";
GRANT UPDATE ON "public"."quiz_attempts" TO "authenticated";
GRANT DELETE ON "public"."quiz_attempts" TO "authenticated";
GRANT REFERENCES ON "public"."quiz_attempts" TO "authenticated";
GRANT TRIGGER ON "public"."quiz_attempts" TO "authenticated";
GRANT INSERT ON "public"."quiz_attempts" TO "service_role";
GRANT SELECT ON "public"."quiz_attempts" TO "service_role";
GRANT UPDATE ON "public"."quiz_attempts" TO "service_role";
GRANT DELETE ON "public"."quiz_attempts" TO "service_role";
GRANT TRUNCATE ON "public"."quiz_attempts" TO "service_role";
GRANT REFERENCES ON "public"."quiz_attempts" TO "service_role";
GRANT TRIGGER ON "public"."quiz_attempts" TO "service_role";
GRANT INSERT ON "public"."quiz_attempt_answers" TO "anon";
GRANT SELECT ON "public"."quiz_attempt_answers" TO "anon";
GRANT UPDATE ON "public"."quiz_attempt_answers" TO "anon";
GRANT DELETE ON "public"."quiz_attempt_answers" TO "anon";
GRANT REFERENCES ON "public"."quiz_attempt_answers" TO "anon";
GRANT TRIGGER ON "public"."quiz_attempt_answers" TO "anon";
GRANT INSERT ON "public"."quiz_attempt_answers" TO "authenticated";
GRANT SELECT ON "public"."quiz_attempt_answers" TO "authenticated";
GRANT UPDATE ON "public"."quiz_attempt_answers" TO "authenticated";
GRANT DELETE ON "public"."quiz_attempt_answers" TO "authenticated";
GRANT REFERENCES ON "public"."quiz_attempt_answers" TO "authenticated";
GRANT TRIGGER ON "public"."quiz_attempt_answers" TO "authenticated";
GRANT INSERT ON "public"."quiz_attempt_answers" TO "service_role";
GRANT SELECT ON "public"."quiz_attempt_answers" TO "service_role";
GRANT UPDATE ON "public"."quiz_attempt_answers" TO "service_role";
GRANT DELETE ON "public"."quiz_attempt_answers" TO "service_role";
GRANT TRUNCATE ON "public"."quiz_attempt_answers" TO "service_role";
GRANT REFERENCES ON "public"."quiz_attempt_answers" TO "service_role";
GRANT TRIGGER ON "public"."quiz_attempt_answers" TO "service_role";
GRANT SELECT ON "public"."user_packs" TO "authenticated";
GRANT INSERT ON "public"."user_packs" TO "service_role";
GRANT SELECT ON "public"."user_packs" TO "service_role";
GRANT UPDATE ON "public"."user_packs" TO "service_role";
GRANT DELETE ON "public"."user_packs" TO "service_role";
GRANT TRUNCATE ON "public"."user_packs" TO "service_role";
GRANT REFERENCES ON "public"."user_packs" TO "service_role";
GRANT TRIGGER ON "public"."user_packs" TO "service_role";
GRANT INSERT ON "public"."levels" TO "service_role";
GRANT SELECT ON "public"."levels" TO "service_role";
GRANT UPDATE ON "public"."levels" TO "service_role";
GRANT DELETE ON "public"."levels" TO "service_role";
GRANT TRUNCATE ON "public"."levels" TO "service_role";
GRANT REFERENCES ON "public"."levels" TO "service_role";
GRANT TRIGGER ON "public"."levels" TO "service_role";
GRANT SELECT ON "public"."levels" TO "anon";
GRANT SELECT ON "public"."levels" TO "authenticated";
GRANT INSERT ON "public"."topic_learning_goals" TO "anon";
GRANT SELECT ON "public"."topic_learning_goals" TO "anon";
GRANT UPDATE ON "public"."topic_learning_goals" TO "anon";
GRANT DELETE ON "public"."topic_learning_goals" TO "anon";
GRANT REFERENCES ON "public"."topic_learning_goals" TO "anon";
GRANT TRIGGER ON "public"."topic_learning_goals" TO "anon";
GRANT INSERT ON "public"."topic_learning_goals" TO "authenticated";
GRANT SELECT ON "public"."topic_learning_goals" TO "authenticated";
GRANT UPDATE ON "public"."topic_learning_goals" TO "authenticated";
GRANT DELETE ON "public"."topic_learning_goals" TO "authenticated";
GRANT REFERENCES ON "public"."topic_learning_goals" TO "authenticated";
GRANT TRIGGER ON "public"."topic_learning_goals" TO "authenticated";
GRANT INSERT ON "public"."topic_learning_goals" TO "service_role";
GRANT SELECT ON "public"."topic_learning_goals" TO "service_role";
GRANT UPDATE ON "public"."topic_learning_goals" TO "service_role";
GRANT DELETE ON "public"."topic_learning_goals" TO "service_role";
GRANT TRUNCATE ON "public"."topic_learning_goals" TO "service_role";
GRANT REFERENCES ON "public"."topic_learning_goals" TO "service_role";
GRANT TRIGGER ON "public"."topic_learning_goals" TO "service_role";
GRANT INSERT ON "public"."topic_concepts" TO "anon";
GRANT SELECT ON "public"."topic_concepts" TO "anon";
GRANT UPDATE ON "public"."topic_concepts" TO "anon";
GRANT DELETE ON "public"."topic_concepts" TO "anon";
GRANT REFERENCES ON "public"."topic_concepts" TO "anon";
GRANT TRIGGER ON "public"."topic_concepts" TO "anon";
GRANT INSERT ON "public"."topic_concepts" TO "authenticated";
GRANT SELECT ON "public"."topic_concepts" TO "authenticated";
GRANT UPDATE ON "public"."topic_concepts" TO "authenticated";
GRANT DELETE ON "public"."topic_concepts" TO "authenticated";
GRANT REFERENCES ON "public"."topic_concepts" TO "authenticated";
GRANT TRIGGER ON "public"."topic_concepts" TO "authenticated";
GRANT INSERT ON "public"."topic_concepts" TO "service_role";
GRANT SELECT ON "public"."topic_concepts" TO "service_role";
GRANT UPDATE ON "public"."topic_concepts" TO "service_role";
GRANT DELETE ON "public"."topic_concepts" TO "service_role";
GRANT TRUNCATE ON "public"."topic_concepts" TO "service_role";
GRANT REFERENCES ON "public"."topic_concepts" TO "service_role";
GRANT TRIGGER ON "public"."topic_concepts" TO "service_role";
GRANT INSERT ON "public"."questions" TO "anon";
GRANT SELECT ON "public"."questions" TO "anon";
GRANT UPDATE ON "public"."questions" TO "anon";
GRANT DELETE ON "public"."questions" TO "anon";
GRANT REFERENCES ON "public"."questions" TO "anon";
GRANT TRIGGER ON "public"."questions" TO "anon";
GRANT INSERT ON "public"."questions" TO "authenticated";
GRANT SELECT ON "public"."questions" TO "authenticated";
GRANT UPDATE ON "public"."questions" TO "authenticated";
GRANT DELETE ON "public"."questions" TO "authenticated";
GRANT REFERENCES ON "public"."questions" TO "authenticated";
GRANT TRIGGER ON "public"."questions" TO "authenticated";
GRANT INSERT ON "public"."questions" TO "service_role";
GRANT SELECT ON "public"."questions" TO "service_role";
GRANT UPDATE ON "public"."questions" TO "service_role";
GRANT DELETE ON "public"."questions" TO "service_role";
GRANT TRUNCATE ON "public"."questions" TO "service_role";
GRANT REFERENCES ON "public"."questions" TO "service_role";
GRANT TRIGGER ON "public"."questions" TO "service_role";
GRANT INSERT ON "public"."flashcards" TO "anon";
GRANT SELECT ON "public"."flashcards" TO "anon";
GRANT UPDATE ON "public"."flashcards" TO "anon";
GRANT DELETE ON "public"."flashcards" TO "anon";
GRANT REFERENCES ON "public"."flashcards" TO "anon";
GRANT TRIGGER ON "public"."flashcards" TO "anon";
GRANT INSERT ON "public"."flashcards" TO "authenticated";
GRANT SELECT ON "public"."flashcards" TO "authenticated";
GRANT UPDATE ON "public"."flashcards" TO "authenticated";
GRANT DELETE ON "public"."flashcards" TO "authenticated";
GRANT REFERENCES ON "public"."flashcards" TO "authenticated";
GRANT TRIGGER ON "public"."flashcards" TO "authenticated";
GRANT INSERT ON "public"."flashcards" TO "service_role";
GRANT SELECT ON "public"."flashcards" TO "service_role";
GRANT UPDATE ON "public"."flashcards" TO "service_role";
GRANT DELETE ON "public"."flashcards" TO "service_role";
GRANT TRUNCATE ON "public"."flashcards" TO "service_role";
GRANT REFERENCES ON "public"."flashcards" TO "service_role";
GRANT TRIGGER ON "public"."flashcards" TO "service_role";
GRANT INSERT ON "public"."user_pokemon" TO "authenticated";
GRANT SELECT ON "public"."user_pokemon" TO "authenticated";
GRANT UPDATE ON "public"."user_pokemon" TO "authenticated";
GRANT INSERT ON "public"."user_pokemon" TO "service_role";
GRANT SELECT ON "public"."user_pokemon" TO "service_role";
GRANT UPDATE ON "public"."user_pokemon" TO "service_role";
GRANT DELETE ON "public"."user_pokemon" TO "service_role";
GRANT TRUNCATE ON "public"."user_pokemon" TO "service_role";
GRANT REFERENCES ON "public"."user_pokemon" TO "service_role";
GRANT TRIGGER ON "public"."user_pokemon" TO "service_role";
GRANT INSERT ON "public"."studydex_xp_events" TO "service_role";
GRANT SELECT ON "public"."studydex_xp_events" TO "service_role";
GRANT UPDATE ON "public"."studydex_xp_events" TO "service_role";
GRANT DELETE ON "public"."studydex_xp_events" TO "service_role";
GRANT TRUNCATE ON "public"."studydex_xp_events" TO "service_role";
GRANT REFERENCES ON "public"."studydex_xp_events" TO "service_role";
GRANT TRIGGER ON "public"."studydex_xp_events" TO "service_role";
GRANT SELECT ON "public"."studydex_xp_events" TO "authenticated";
GRANT SELECT ("avatar_choice") ON "public"."profiles" TO "authenticated";
GRANT UPDATE ("avatar_choice") ON "public"."profiles" TO "authenticated";
GRANT SELECT ("created_at") ON "public"."profiles" TO "authenticated";
GRANT SELECT ("display_name") ON "public"."profiles" TO "authenticated";
GRANT UPDATE ("display_name") ON "public"."profiles" TO "authenticated";
GRANT SELECT ("id") ON "public"."profiles" TO "authenticated";
GRANT SELECT ("school_level_id") ON "public"."profiles" TO "authenticated";
GRANT UPDATE ("school_level_id") ON "public"."profiles" TO "authenticated";
DROP TRIGGER IF EXISTS studydex_registration_profile ON auth.users;
CREATE TRIGGER studydex_registration_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.create_registration_profile();

