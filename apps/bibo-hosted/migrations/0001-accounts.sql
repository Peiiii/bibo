CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL, password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', legacy_allowed INTEGER NOT NULL DEFAULT 0,
  failures INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS account_sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id),
  expires_at INTEGER NOT NULL, kind TEXT NOT NULL DEFAULT 'native'
);
CREATE INDEX IF NOT EXISTS account_sessions_user ON account_sessions(user_id);
CREATE TABLE IF NOT EXISTS account_email_codes (
  email TEXT NOT NULL COLLATE NOCASE, purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, sent_at INTEGER NOT NULL,
  PRIMARY KEY(email, purpose)
);
