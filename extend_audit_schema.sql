-- Agregar columnas faltantes al schema de audit_log
ALTER TABLE dbaudit.audit_log 
  ADD COLUMN IF NOT EXISTS application TEXT,
  ADD COLUMN IF NOT EXISTS client_addr TEXT,
  ADD COLUMN IF NOT EXISTS client_port INTEGER,
  ADD COLUMN IF NOT EXISTS schema_name TEXT,
  ADD COLUMN IF NOT EXISTS old_data JSONB,
  ADD COLUMN IF NOT EXISTS new_data JSONB,
  ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS error_msg TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms NUMERIC;

-- Verificar estructura
\d dbaudit.audit_log
