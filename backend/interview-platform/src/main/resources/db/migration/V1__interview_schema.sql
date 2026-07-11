CREATE TABLE interview_sessions (
    id                UUID PRIMARY KEY,
    user_id           UUID         NOT NULL,
    technology        VARCHAR(80)  NOT NULL,
    level             VARCHAR(80)  NOT NULL,
    difficulty        VARCHAR(40)  NOT NULL,
    status            VARCHAR(20)  NOT NULL
        CHECK (status IN ('CONFIGURED', 'IN_PROGRESS', 'SUBMITTED', 'EVALUATING', 'EVALUATED', 'ABORTED')),
    questions         JSONB        NOT NULL,
    answers           JSONB,
    question_source   VARCHAR(80)  NOT NULL,
    overall_score     INT,
    passed            BOOLEAN,
    performance_label VARCHAR(80),
    evaluation        JSONB,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    submitted_at      TIMESTAMPTZ,
    evaluated_at      TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user ON interview_sessions (user_id, created_at DESC);

CREATE TABLE outbox_events (
    id           UUID PRIMARY KEY,
    aggregate_id VARCHAR(80)  NOT NULL,
    event_type   VARCHAR(120) NOT NULL,
    payload      JSONB        NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_unpublished ON outbox_events (created_at) WHERE published_at IS NULL;

CREATE TABLE processed_events (
    event_id     UUID PRIMARY KEY,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
