CREATE TABLE users (
    id            UUID PRIMARY KEY,
    email         VARCHAR(200) NOT NULL UNIQUE,
    full_name     VARCHAR(120) NOT NULL,
    mobile        VARCHAR(30),
    password_hash VARCHAR(100) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('ADMIN', 'CANDIDATE')),
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (lower(email));
