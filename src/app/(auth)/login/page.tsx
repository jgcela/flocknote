import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  return <LoginForm registered={params.registered === "1"} callbackUrl={params.callbackUrl} />;
}
