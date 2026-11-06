"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ActionForm, Field, Fieldset, SelectField, TextField } from "@/components/form";
import type { FormState } from "@/lib/form-state";

export function ComposeForm({
  action,
  countAudience,
  groups,
  smsMax,
  warnings,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  countAudience: (channel: "EMAIL" | "SMS", groupId: string | null) => Promise<number>;
  groups: { value: string; label: string }[];
  smsMax: number;
  warnings: { email?: string; sms?: string };
}) {
  const [channel, setChannel] = useState<"EMAIL" | "SMS">("EMAIL");
  const [groupId, setGroupId] = useState("");
  const [length, setLength] = useState(0);
  const [count, setCount] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    startTransition(async () => {
      const n = await countAudience(channel, groupId || null);
      if (live) setCount(n);
    });
    return () => {
      live = false;
    };
  }, [channel, groupId, countAudience]);

  const warning = channel === "EMAIL" ? warnings.email : warnings.sms;
  const what = channel === "EMAIL" ? "email" : "text";

  return (
    <ActionForm
      action={action}
      submitLabel={count ? `Send ${what} to ${count} ${count === 1 ? "person" : "people"}` : `Send ${what}`}
      pendingLabel="Sending…"
      secondary={<Link href="/messages" className="btn-secondary no-underline">Cancel</Link>}
    >
      {({ errors = {} }) => (
        <>
          {warning ? <p role="note" className="rounded-xl bg-sky-50 px-4 py-3 text-sky-700">{warning}</p> : null}
          <Fieldset legend="Who gets it">
            <fieldset>
              <legend className="field-label">Send as</legend>
              <div className="flex flex-wrap gap-3">
                {(["EMAIL", "SMS"] as const).map((c) => (
                  <label key={c} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-2 px-4 py-2 font-semibold ${channel === c ? "border-clay-600 bg-clay-50" : "border-cream-300"}`}>
                    <input type="radio" name="channel" value={c} checked={channel === c} onChange={() => setChannel(c)} className="h-5 w-5 accent-clay-600" />
                    {c === "EMAIL" ? "Email" : "Text message"}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <SelectField
                name="groupId"
                label="Audience"
                options={groups}
                emptyLabel="Whole church"
                defaultValue={groupId}
                error={errors.groupId}
                hint="Only people who opted in to this kind of message are included."
              />
              {/* Mirror the select into state for the live count. */}
              <GroupWatcher onChange={setGroupId} />
              <p className="mt-2 font-semibold" aria-live="polite">
                {count === null ? "Counting…" : `${count} ${count === 1 ? "person" : "people"} will get this ${what}.`}
              </p>
            </div>
          </Fieldset>
          <Fieldset legend="Message">
            {channel === "EMAIL" ? <TextField name="subject" label="Subject" required error={errors.subject} /> : null}
            <Field id="body" label="Message" error={errors.body} hint={channel === "SMS" ? `${length}/${smsMax} characters. "Reply STOP to opt out." is added automatically.` : "Plain text. An unsubscribe link is added at the bottom."}>
              <textarea
                id="body"
                name="body"
                rows={channel === "SMS" ? 4 : 10}
                maxLength={channel === "SMS" ? smsMax : undefined}
                onChange={(e) => setLength(e.target.value.length)}
                aria-invalid={errors.body ? true : undefined}
                aria-describedby={errors.body ? "body-error" : "body-hint"}
                className={`field-input ${errors.body ? "border-clay-600" : ""}`}
              />
            </Field>
          </Fieldset>
        </>
      )}
    </ActionForm>
  );
}

/** Listens to the uncontrolled #groupId select (kept uncontrolled so ActionForm never resets it). */
function GroupWatcher({ onChange }: { onChange: (v: string) => void }) {
  useEffect(() => {
    const el = document.getElementById("groupId") as HTMLSelectElement | null;
    if (!el) return;
    const handler = () => onChange(el.value);
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, [onChange]);
  return null;
}
