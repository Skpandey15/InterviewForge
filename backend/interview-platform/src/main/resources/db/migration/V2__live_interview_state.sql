-- Live (conversational) interview turns: tracks the current question index
-- and follow-ups used, mutated turn by turn while status = IN_PROGRESS.
ALTER TABLE interview_sessions
    ADD COLUMN live_state JSONB;
