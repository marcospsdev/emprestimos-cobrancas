-- =====================================================
-- Agendamento: roda a função de avisos todo dia às 8h (Fortaleza = 11h UTC).
-- Rode DEPOIS de publicar a Edge Function "notify-due-loans" e cadastrar o
-- secret CRON_SECRET nela. Troque <CRON_SECRET> abaixo pelo MESMO valor.
-- Pode rodar de novo (substitui o agendamento e o segredo).
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Guarda o segredo no Vault (criptografado), em vez de deixar no comando.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'notify_cron_secret') THEN
    PERFORM vault.update_secret(
      (SELECT id FROM vault.secrets WHERE name = 'notify_cron_secret'), '<CRON_SECRET>');
  ELSE
    PERFORM vault.create_secret('<CRON_SECRET>', 'notify_cron_secret');
  END IF;
END $$;

SELECT cron.unschedule('avisos-vencimento')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'avisos-vencimento');

SELECT cron.schedule(
  'avisos-vencimento',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hdamezaslyfdqjmlqcpv.supabase.co/functions/v1/notify-due-loans',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
