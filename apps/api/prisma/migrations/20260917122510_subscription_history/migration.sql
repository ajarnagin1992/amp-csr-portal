-- DropIndex
DROP INDEX "subscriptions_vehicle_id_key";

-- CreateIndex
CREATE INDEX "subscriptions_vehicle_id_created_at_idx" ON "subscriptions"("vehicle_id", "created_at");
