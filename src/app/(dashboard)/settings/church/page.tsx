import type { Metadata } from "next";
import { PageHeader, SubNav } from "@/components/ui";
import { DEFAULT_RECEIPT_NOTE } from "@/lib/giving";
import { prisma } from "@/lib/db";
import { requireTeamManager } from "@/lib/tenant";
import { SETTINGS_NAV } from "../nav";
import { saveChurch } from "./actions";
import { ChurchForm } from "./church-form";

export const metadata: Metadata = { title: "Church details" };

export default async function ChurchSettingsPage() {
  const { organization } = await requireTeamManager();
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organization.id },
    select: { name: true, email: true, phone: true, address: true, taxId: true, receiptNote: true },
  });
  return (
    <>
      <PageHeader title="Settings" />
      <SubNav items={SETTINGS_NAV} current="/settings/church" />
      <ChurchForm action={saveChurch} values={org} defaultNote={DEFAULT_RECEIPT_NOTE} />
    </>
  );
}
