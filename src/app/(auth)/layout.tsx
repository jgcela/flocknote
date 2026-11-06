import { Logo } from "@/components/logo";
import { PRODUCT_TAGLINE } from "@/lib/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo />
        <p className="mt-3 text-bark-700">{PRODUCT_TAGLINE}</p>
      </div>
      <div className="card w-full max-w-md p-8">{children}</div>
    </main>
  );
}
