-- AlterTable
ALTER TABLE "CommunicationRecipient" ADD COLUMN     "claimToken" TEXT,
ADD COLUMN     "claimedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "CommunicationRecipient_providerMessageId_idx" ON "CommunicationRecipient"("providerMessageId");

-- CreateIndex
CREATE INDEX "CommunicationRecipient_communicationId_status_idx" ON "CommunicationRecipient"("communicationId", "status");
