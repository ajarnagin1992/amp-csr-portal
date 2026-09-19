-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_vehicle_id_live_key" ON "subscriptions"("vehicle_id") WHERE (status IN ('ACTIVE', 'OVERDUE'));
