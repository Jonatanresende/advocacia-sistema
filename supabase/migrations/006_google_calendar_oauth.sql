-- Migration: 006_google_calendar_oauth.sql
-- Adiciona suporte a integração OAuth2 com Google Calendar e vinculação de eventos

ALTER TABLE office_config
  ADD COLUMN IF NOT EXISTS google_client_id          text,
  ADD COLUMN IF NOT EXISTS google_client_secret      text,
  ADD COLUMN IF NOT EXISTS google_refresh_token      text,
  ADD COLUMN IF NOT EXISTS google_calendar_id        text,
  ADD COLUMN IF NOT EXISTS google_calendar_enabled   boolean NOT NULL DEFAULT false;

ALTER TABLE agendamentos_adv
  ADD COLUMN IF NOT EXISTS google_event_id   text,
  ADD COLUMN IF NOT EXISTS google_event_url  text;
