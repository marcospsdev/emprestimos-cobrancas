-- =====================================================
-- Migração: notificações push de vencimento
-- push_devices: cada aparelho (navegador ou app Android) que ativou os avisos.
-- notification_log: o que já foi enviado, para nunca mandar o mesmo aviso 2x.
-- Não apaga dados. Pode rodar mais de uma vez.
-- =====================================================
CREATE TABLE IF NOT EXISTS push_devices (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Token do Firebase Cloud Messaging deste aparelho.
  token        TEXT NOT NULL UNIQUE,
  platform     TEXT NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'android', 'ios')),
  device_label TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_devices_user ON push_devices(user_id);

ALTER TABLE push_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_devices_policy" ON push_devices;
CREATE POLICY "push_devices_policy" ON push_devices FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Um aviso por empréstimo, por tipo, por vencimento. Se o vencimento mudar
-- (ex.: pagou só os juros), o novo vencimento gera avisos novos.
CREATE TABLE IF NOT EXISTS notification_log (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  loan_id   UUID REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  kind      TEXT NOT NULL CHECK (kind IN ('vespera', 'dia')),
  due_date  DATE NOT NULL,
  sent_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (loan_id, kind, due_date)
);

-- Só a função do servidor (service role) escreve aqui; o app pode ler os próprios.
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notification_log_read" ON notification_log;
CREATE POLICY "notification_log_read" ON notification_log FOR SELECT USING (auth.uid() = user_id);

-- Cadastra (ou atualiza) o aparelho do usuário logado. Se o mesmo aparelho
-- estava em outra conta, passa a ser só desta (os avisos de uma conta não
-- podem chegar no aparelho de quem saiu dela).
CREATE OR REPLACE FUNCTION fn_register_push_device(p_token TEXT, p_platform TEXT, p_label TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login de novo.'; END IF;
  INSERT INTO push_devices (user_id, token, platform, device_label, last_seen_at)
  VALUES (auth.uid(), p_token, COALESCE(NULLIF(p_platform, ''), 'web'), p_label, NOW())
  ON CONFLICT (token) DO UPDATE
    SET user_id = auth.uid(), platform = EXCLUDED.platform,
        device_label = EXCLUDED.device_label, last_seen_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION fn_register_push_device(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fn_register_push_device(TEXT, TEXT, TEXT) TO authenticated;
