-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "HouseholdRole" AS ENUM ('HEAD', 'SPOUSE', 'CHILD', 'OTHER_ADULT', 'OTHER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'VISITOR', 'INACTIVE', 'DECEASED');

-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('EMAIL', 'SMS', 'BOTH', 'NONE');

-- CreateEnum
CREATE TYPE "ParentalRelationshipType" AS ENUM ('PARENT', 'STEP_PARENT', 'GUARDIAN', 'GRANDPARENT');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('MINISTRY', 'SMALL_GROUP', 'CLASS', 'COMMITTEE', 'VOLUNTEER_TEAM', 'OTHER');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('MEMBER', 'LEADER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'BOUNCED', 'FAILED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "FundType" AS ENUM ('GENERAL', 'CAMPAIGN', 'DESIGNATED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CHECK', 'CARD', 'ACH', 'ONLINE', 'OTHER');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "homePhone" TEXT,
    "primaryContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "preferredName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "birthDate" DATE,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailOptIn" BOOLEAN NOT NULL DEFAULT true,
    "smsOptIn" BOOLEAN NOT NULL DEFAULT false,
    "preferredChannel" "ContactChannel" NOT NULL DEFAULT 'EMAIL',
    "unsubscribedAt" TIMESTAMP(3),
    "customAttributes" JSONB NOT NULL DEFAULT '{}',
    "householdId" TEXT,
    "householdRole" "HouseholdRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentalRelationship" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "type" "ParentalRelationshipType" NOT NULL DEFAULT 'PARENT',
    "isPrimaryGuardian" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentalRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "CustomFieldType" NOT NULL DEFAULT 'TEXT',
    "options" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "GroupType" NOT NULL DEFAULT 'MINISTRY',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "parentGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "status" "CommunicationStatus" NOT NULL DEFAULT 'DRAFT',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "groupId" TEXT,
    "sentById" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationRecipient" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "memberId" TEXT,
    "address" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fund" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "FundType" NOT NULL DEFAULT 'GENERAL',
    "isTaxDeductible" BOOLEAN NOT NULL DEFAULT true,
    "goalCents" INTEGER,
    "startsOn" DATE,
    "endsOn" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT,
    "householdId" TEXT,
    "fundId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "receivedOn" DATE NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'OTHER',
    "checkNumber" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_organizationId_key" ON "User"("id", "organizationId");

-- CreateIndex
CREATE INDEX "Household_organizationId_name_idx" ON "Household"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Household_id_organizationId_key" ON "Household"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Household_primaryContactId_organizationId_key" ON "Household"("primaryContactId", "organizationId");

-- CreateIndex
CREATE INDEX "Member_organizationId_lastName_firstName_idx" ON "Member"("organizationId", "lastName", "firstName");

-- CreateIndex
CREATE INDEX "Member_organizationId_householdId_idx" ON "Member"("organizationId", "householdId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_id_organizationId_key" ON "Member"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_organizationId_email_key" ON "Member"("organizationId", "email");

-- CreateIndex
CREATE INDEX "ParentalRelationship_organizationId_childId_idx" ON "ParentalRelationship"("organizationId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentalRelationship_parentId_childId_key" ON "ParentalRelationship"("parentId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_organizationId_key_key" ON "CustomFieldDefinition"("organizationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Group_id_organizationId_key" ON "Group"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_organizationId_name_key" ON "Group"("organizationId", "name");

-- CreateIndex
CREATE INDEX "GroupMembership_organizationId_memberId_idx" ON "GroupMembership"("organizationId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMembership_groupId_memberId_key" ON "GroupMembership"("groupId", "memberId");

-- CreateIndex
CREATE INDEX "Communication_organizationId_createdAt_idx" ON "Communication"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Communication_id_organizationId_key" ON "Communication"("id", "organizationId");

-- CreateIndex
CREATE INDEX "CommunicationRecipient_organizationId_memberId_idx" ON "CommunicationRecipient"("organizationId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationRecipient_communicationId_address_key" ON "CommunicationRecipient"("communicationId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "Fund_id_organizationId_key" ON "Fund"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Fund_organizationId_name_key" ON "Fund"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Contribution_organizationId_taxYear_idx" ON "Contribution"("organizationId", "taxYear");

-- CreateIndex
CREATE INDEX "Contribution_organizationId_memberId_taxYear_idx" ON "Contribution"("organizationId", "memberId", "taxYear");

-- CreateIndex
CREATE INDEX "Contribution_organizationId_fundId_idx" ON "Contribution"("organizationId", "fundId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_primaryContactId_organizationId_fkey" FOREIGN KEY ("primaryContactId", "organizationId") REFERENCES "Member"("id", "organizationId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_householdId_organizationId_fkey" FOREIGN KEY ("householdId", "organizationId") REFERENCES "Household"("id", "organizationId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ParentalRelationship" ADD CONSTRAINT "ParentalRelationship_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentalRelationship" ADD CONSTRAINT "ParentalRelationship_parentId_organizationId_fkey" FOREIGN KEY ("parentId", "organizationId") REFERENCES "Member"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentalRelationship" ADD CONSTRAINT "ParentalRelationship_childId_organizationId_fkey" FOREIGN KEY ("childId", "organizationId") REFERENCES "Member"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_parentGroupId_organizationId_fkey" FOREIGN KEY ("parentGroupId", "organizationId") REFERENCES "Group"("id", "organizationId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_groupId_organizationId_fkey" FOREIGN KEY ("groupId", "organizationId") REFERENCES "Group"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_memberId_organizationId_fkey" FOREIGN KEY ("memberId", "organizationId") REFERENCES "Member"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_groupId_organizationId_fkey" FOREIGN KEY ("groupId", "organizationId") REFERENCES "Group"("id", "organizationId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_sentById_organizationId_fkey" FOREIGN KEY ("sentById", "organizationId") REFERENCES "User"("id", "organizationId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CommunicationRecipient" ADD CONSTRAINT "CommunicationRecipient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationRecipient" ADD CONSTRAINT "CommunicationRecipient_communicationId_organizationId_fkey" FOREIGN KEY ("communicationId", "organizationId") REFERENCES "Communication"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationRecipient" ADD CONSTRAINT "CommunicationRecipient_memberId_organizationId_fkey" FOREIGN KEY ("memberId", "organizationId") REFERENCES "Member"("id", "organizationId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Fund" ADD CONSTRAINT "Fund_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_memberId_organizationId_fkey" FOREIGN KEY ("memberId", "organizationId") REFERENCES "Member"("id", "organizationId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_householdId_organizationId_fkey" FOREIGN KEY ("householdId", "organizationId") REFERENCES "Household"("id", "organizationId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_fundId_organizationId_fkey" FOREIGN KEY ("fundId", "organizationId") REFERENCES "Fund"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
