import { unsubscribeWithToken } from "@/lib/messaging/opt-out";

/** RFC 8058 one-click unsubscribe (List-Unsubscribe-Post), used by Gmail/Apple Mail. */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const done = await unsubscribeWithToken(token);
  return new Response(done ? "Unsubscribed" : "Invalid link", { status: done ? 200 : 400 });
}
