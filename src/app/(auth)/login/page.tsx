import type { Metadata } from "next";
import { LoginForm, type LoginNotice } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

type Params = { registered?: string; invited?: string; reset?: string; expired?: string; callbackUrl?: string };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const notice = (["registered", "invited", "reset", "expired"] as const).find((k) => params[k] === "1") as LoginNotice | undefined;
  return <LoginForm notice={notice} callbackUrl={params.callbackUrl} />;
}
