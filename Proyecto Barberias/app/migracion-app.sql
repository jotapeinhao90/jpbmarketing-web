-- App de barberos: acceso por barbería, plan de cobro y pagos.
-- Se aplica sobre la base del bot (barberia-demo). Son columnas nuevas: el bot sigue funcionando igual.
ALTER TABLE negocios ADD COLUMN acceso TEXT;                                   -- clave que usa el barbero para entrar
ALTER TABLE negocios ADD COLUMN plan_nombre TEXT NOT NULL DEFAULT 'Plan Fidelización';
ALTER TABLE negocios ADD COLUMN precio_mensual INTEGER NOT NULL DEFAULT 0;     -- CLP por ciclo
ALTER TABLE negocios ADD COLUMN precio_canje INTEGER NOT NULL DEFAULT 0;       -- CLP extra por cada canje (0 = no aplica)
ALTER TABLE negocios ADD COLUMN dia_corte INTEGER NOT NULL DEFAULT 1;          -- día del mes en que parte cada ciclo (1-28)
ALTER TABLE negocios ADD COLUMN inicio_servicio TEXT NOT NULL DEFAULT '';      -- YYYY-MM-DD: desde cuándo se cobra
ALTER TABLE negocios ADD COLUMN meta_clientes INTEGER NOT NULL DEFAULT 80;     -- clientes nuevos que se quieren fidelizar por mes
ALTER TABLE negocios ADD COLUMN meta_canjes INTEGER NOT NULL DEFAULT 10;       -- canjes por mes
ALTER TABLE negocios ADD COLUMN ticket_promedio INTEGER NOT NULL DEFAULT 0;    -- CLP de un corte (para estimar ventas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_negocios_acceso ON negocios (acceso) WHERE acceso IS NOT NULL;

CREATE TABLE IF NOT EXISTS pagos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio_id  TEXT NOT NULL,
  periodo     TEXT NOT NULL,           -- inicio del ciclo, YYYY-MM-DD
  monto       INTEGER NOT NULL,
  pagado_en   INTEGER NOT NULL,        -- epoch ms
  nota        TEXT NOT NULL DEFAULT '',
  UNIQUE (negocio_id, periodo)
);
