-- CreateEnum
CREATE TYPE "UrgencyLevel" AS ENUM ('low', 'standard', 'medium', 'high');

-- AlterTable
ALTER TABLE "PickupRequest" ADD COLUMN     "urgency" "UrgencyLevel" NOT NULL DEFAULT 'standard';
