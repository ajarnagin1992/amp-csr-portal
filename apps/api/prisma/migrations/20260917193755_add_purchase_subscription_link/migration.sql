-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "subscription_id" INTEGER;

-- CreateIndex
CREATE INDEX "purchases_subscription_id_idx" ON "purchases"("subscription_id");

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
