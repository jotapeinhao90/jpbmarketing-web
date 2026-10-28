-- Recalcula cada pago demo según los clientes fidelizados creados antes del inicio de su ciclo:
-- Nivel 1 hasta 99 clientes, Nivel 2 desde 100 y Nivel 3 desde 300.
UPDATE pagos
SET monto = CASE
  WHEN (SELECT COUNT(*) FROM clientes WHERE negocio_id='jpb-demo' AND telefono LIKE '5690000%' AND codigo IS NOT NULL AND creado_en < CAST(strftime('%s', pagos.periodo) AS INTEGER)*1000) >= 300 THEN 120000
  WHEN (SELECT COUNT(*) FROM clientes WHERE negocio_id='jpb-demo' AND telefono LIKE '5690000%' AND codigo IS NOT NULL AND creado_en < CAST(strftime('%s', pagos.periodo) AS INTEGER)*1000) >= 100 THEN 85000
  ELSE 25000
END
WHERE negocio_id='jpb-demo' AND demo=1;
