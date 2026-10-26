-- Plataforma de seguimiento de barberías (fase 1: prospección presencial).
CREATE TABLE IF NOT EXISTS barberias (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT NOT NULL,
  direccion     TEXT NOT NULL DEFAULT '',
  comuna        TEXT NOT NULL DEFAULT '',
  contacto      TEXT NOT NULL DEFAULT '',   -- persona con la que se habla (dueño, barbero)
  telefono      TEXT NOT NULL DEFAULT '',
  instagram     TEXT NOT NULL DEFAULT '',
  estado        TEXT NOT NULL DEFAULT 'por_visitar',
                -- por_visitar | contactada | interesada | demo | cliente | no_interesada
  proxima_accion TEXT NOT NULL DEFAULT '',
  proxima_fecha  TEXT NOT NULL DEFAULT '',  -- YYYY-MM-DD
  creado_en     INTEGER NOT NULL,
  actualizado_en INTEGER NOT NULL
);

-- Bitácora: cada visita, llamada o nota sobre una barbería.
CREATE TABLE IF NOT EXISTS visitas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  barberia_id INTEGER NOT NULL REFERENCES barberias(id) ON DELETE CASCADE,
  fecha       TEXT NOT NULL,                -- YYYY-MM-DD
  tipo        TEXT NOT NULL DEFAULT 'visita', -- visita | llamada | whatsapp | nota
  notas       TEXT NOT NULL DEFAULT '',     -- lo que dijeron
  creado_en   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_visitas_barberia ON visitas (barberia_id, fecha);
CREATE INDEX IF NOT EXISTS idx_barberias_proxima ON barberias (proxima_fecha);
