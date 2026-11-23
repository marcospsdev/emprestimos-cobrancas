-- =====================================================
-- Migração: chave Pix para cobrança
-- Uma linha por usuário com a chave Pix, o banco e o nome do dono da conta.
-- Esses dados vão no fim da mensagem de "Cobrar" no WhatsApp.
-- Não apaga dados. Pode rodar mais de uma vez.
-- =====================================================

CREATE TABLE IF NOT EXISTS user_settings (
  user_id        UUID PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  -- cpf | cnpj | email | telefone | aleatoria
  pix_key_type   TEXT,
  -- Guardada já normalizada (só dígitos em CPF/CNPJ/telefone; minúsculo em e-mail/aleatória).
  pix_key        TEXT,
  pix_bank       TEXT,
  pix_holder     TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_pix_key_type_check;
ALTER TABLE user_settings ADD CONSTRAINT user_settings_pix_key_type_check
  CHECK (pix_key_type IS NULL OR pix_key_type IN ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria'));

-- Chave e tipo andam juntos (ou os dois, ou nenhum).
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_pix_pair_check;
ALTER TABLE user_settings ADD CONSTRAINT user_settings_pix_pair_check
  CHECK ((pix_key IS NULL) = (pix_key_type IS NULL));

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_settings_policy" ON user_settings;
CREATE POLICY "user_settings_policy" ON user_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
