-- AlterTable
ALTER TABLE "jobs" ALTER COLUMN "is_closed" SET DEFAULT false,
ALTER COLUMN "is_deleted" SET DEFAULT false,
ALTER COLUMN "is_gas_at_lot" SET DEFAULT false,
ALTER COLUMN "is_water_at_lot" SET DEFAULT false,
ALTER COLUMN "is_electricity_at_lot" SET DEFAULT false,
ALTER COLUMN "is_sewer_at_lot" SET DEFAULT false;
