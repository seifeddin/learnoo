-- LRN-005 foundation: accounts, server-managed sessions and login throttling.
-- Permission/role tables are intentionally absent until the role model is decided.

CREATE TABLE users (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         text        NOT NULL,
    display_name  text        NOT NULL,
    password_hash text        NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    disabled_at   timestamptz,
    CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email)) AND email <> ''),
    CONSTRAINT users_email_length CHECK (char_length(email) <= 254),
    CONSTRAINT users_display_name_length CHECK (char_length(display_name) BETWEEN 1 AND 100),
    CONSTRAINT users_password_hash_argon2id CHECK (password_hash LIKE '$argon2id$%')
);

CREATE UNIQUE INDEX users_email_key ON users (email);

-- token_hash is SHA-256 of the random cookie token; the token itself is never stored.
CREATE TABLE sessions (
    token_hash          bytea       PRIMARY KEY CHECK (octet_length(token_hash) = 32),
    user_id             bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    csrf_token          text        NOT NULL,
    created_at          timestamptz NOT NULL,
    last_seen_at        timestamptz NOT NULL,
    idle_expires_at     timestamptz NOT NULL,
    absolute_expires_at timestamptz NOT NULL,
    CONSTRAINT sessions_expiry_order CHECK (idle_expires_at <= absolute_expires_at)
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_absolute_expires_at_idx ON sessions (absolute_expires_at);

-- One row per login attempt and throttle key. key_hash is SHA-256 of a
-- scoped key (normalized email or client address) so no raw identifier is stored.
CREATE TABLE login_attempts (
    id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key_hash     bytea       NOT NULL CHECK (octet_length(key_hash) = 32),
    attempted_at timestamptz NOT NULL
);

CREATE INDEX login_attempts_key_time_idx ON login_attempts (key_hash, attempted_at);
CREATE INDEX login_attempts_time_idx ON login_attempts (attempted_at);
