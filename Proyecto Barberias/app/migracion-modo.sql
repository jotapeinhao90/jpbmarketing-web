-- Separa los pagos reales de los pagos ficticios de la demo.
-- Todos los pagos existentes pertenecen actualmente a la demo.
CREATE TABLE pagos_nuevo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio_id TEXT NOT NULL,
  periodo TEXT NOT NULL,
  monto INTEGER NOT NULL,
  pagado_en INTEGER NOT NULL,
  nota TEXT NOT NULL DEFAULT '',
  demo INTEGER NOT NULL DEFAULT 0,
  UNIQUE (negocio_id, periodo, demo)
);

INSERT INTO pagos_nuevo (negocio_id, periodo, monto, pagado_en, nota, demo)
SELECT negocio_id, periodo, monto, pagado_en, nota, 1 FROM pagos;

DROP TABLE pagos;
ALTER TABLE pagos_nuevo RENAME TO pagos;

-- El plan real de jpb-demo queda sin configurar; el plan ficticio vive en el Worker.
UPDATE negocios
SET precio_mensual=0, precio_canje=0, dia_corte=1, inicio_servicio='',
    ticket_promedio=0, meta_canjes=10
WHERE id='jpb-demo';
