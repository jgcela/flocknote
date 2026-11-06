import { Sidebar } from "@/components/sidebar";
import { requireTenant } from "@/lib/tenant";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, organization } = await requireTenant();

  return (
    <div className="lg:flex">
      <Sidebar churchName={organization.name} userName={user.name} />
      <main id="main" className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
