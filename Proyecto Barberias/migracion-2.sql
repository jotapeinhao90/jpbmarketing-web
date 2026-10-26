-- Fase 1b: ubicación en el mapa + zona de notas estratégicas + motivo de rechazo.
ALTER TABLE barberias ADD COLUMN lat REAL;
ALTER TABLE barberias ADD COLUMN lng REAL;
ALTER TABLE barberias ADD COLUMN geo TEXT NOT NULL DEFAULT '';           -- '' | exacta | aprox | manual
ALTER TABLE barberias ADD COLUMN enfoque TEXT NOT NULL DEFAULT '';       -- cómo enfocar la venta a esta barbería
ALTER TABLE barberias ADD COLUMN salio_bien TEXT NOT NULL DEFAULT '';
ALTER TABLE barberias ADD COLUMN salio_mal TEXT NOT NULL DEFAULT '';
ALTER TABLE barberias ADD COLUMN notas TEXT NOT NULL DEFAULT '';
ALTER TABLE barberias ADD COLUMN motivo_rechazo TEXT NOT NULL DEFAULT '';
