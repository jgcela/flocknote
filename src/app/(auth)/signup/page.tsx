import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Set up your church" };

export default function SignupPage() {
  return <SignupForm />;
}
