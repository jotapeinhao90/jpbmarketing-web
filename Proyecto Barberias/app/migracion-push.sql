-- Notificaciones push: un dispositivo (navegador/teléfono) suscrito por fila, asociado a una barbería.
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint   TEXT PRIMARY KEY,
  negocio_id TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  creado_en  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_push_negocio ON push_subs (negocio_id);
