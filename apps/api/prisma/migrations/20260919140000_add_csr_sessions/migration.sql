-- CreateTable
CREATE TABLE "csr_sessions" (
    "id" SERIAL NOT NULL,
    "csr_user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "csr_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "csr_sessions_token_hash_key" ON "csr_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "csr_sessions_csr_user_id_idx" ON "csr_sessions"("csr_user_id");

-- AddForeignKey
ALTER TABLE "csr_sessions" ADD CONSTRAINT "csr_sessions_csr_user_id_fkey" FOREIGN KEY ("csr_user_id") REFERENCES "csr_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
