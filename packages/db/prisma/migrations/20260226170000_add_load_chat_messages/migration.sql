CREATE TABLE load_chat_messages (
  id uuid PRIMARY KEY,
  load_id uuid NOT NULL REFERENCES loads(id) ON UPDATE CASCADE ON DELETE CASCADE,
  sender_user_id uuid REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  sender_name text NOT NULL,
  message_text text NOT NULL,
  message_type text NOT NULL,
  target_scope text NOT NULL,
  target_user_id uuid REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  system_event text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_load_chat_messages_load_created_at
  ON load_chat_messages(load_id, created_at);

CREATE INDEX idx_load_chat_messages_target_user
  ON load_chat_messages(target_user_id);

CREATE TABLE load_chat_settings (
  load_id uuid PRIMARY KEY REFERENCES loads(id) ON UPDATE CASCADE ON DELETE CASCADE,
  protect_from_purge boolean NOT NULL DEFAULT false
);

CREATE TABLE load_chat_retention (
  load_id uuid PRIMARY KEY REFERENCES loads(id) ON UPDATE CASCADE ON DELETE CASCADE,
  purge_after timestamptz NOT NULL
);

CREATE INDEX idx_load_chat_retention_purge_after
  ON load_chat_retention(purge_after);

CREATE TABLE load_chat_reads (
  user_id uuid NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  load_id uuid NOT NULL REFERENCES loads(id) ON UPDATE CASCADE ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, load_id)
);

CREATE INDEX idx_load_chat_reads_load_user
  ON load_chat_reads(load_id, user_id);
