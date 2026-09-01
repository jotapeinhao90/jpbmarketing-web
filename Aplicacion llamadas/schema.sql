CREATE TABLE IF NOT EXISTS llamadas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendedor TEXT NOT NULL,
  telefono TEXT,
  empresa TEXT,
  contacto TEXT,
  resultado TEXT,
  proximo_paso TEXT,
  fecha_seguimiento TEXT,
  resumen TEXT,
  nota_original TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_llamadas_created_at ON llamadas(created_at);
CREATE INDEX IF NOT EXISTS idx_llamadas_vendedor ON llamadas(vendedor);
