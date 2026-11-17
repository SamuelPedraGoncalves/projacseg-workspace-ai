-- Campos do negócio usados pelas regras (condições, datas de referência, responsável por campo).
-- Aditiva e anulável: não altera dados existentes. Não revisada para produção.
ALTER TABLE "DealSnapshot" ADD COLUMN "fields" JSONB;
