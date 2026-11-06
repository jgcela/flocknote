# Fold — church management (working name)

Multi-tenant church management system: people & households, groups/ministries,
email/SMS broadcast logs and giving. Each church is an isolated tenant.

"Fold" is a placeholder product name; change it in `src/lib/brand.ts`.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript (strict)
- Prisma 6 + PostgreSQL
- Auth.js / NextAuth v4 (email + password, JWT sessions)
- Tailwind CSS 3

## Getting started

```bash
cp .env.example .env          # set DATABASE_URL and NEXTAUTH_SECRET
npm install                   # also runs `prisma generate`
npx prisma migrate dev        # creates tables and runs the seed
npm run dev
```

Demo logins created by the seed (password `demo-password-123`):

| Church            | Email                         |
| ----------------- | ----------------------------- |
| Grace Fellowship  | pastor@gracefellowship.test   |
| St. Mark's Parish | admin@stmarks.test            |

Or create a new church at `/signup`.

## How tenant isolation works

1. **Session** — every staff `User` belongs to exactly one `Organization`. The
   JWT carries `organizationId`; `requireTenant()` (`src/lib/tenant.ts`)
   re-checks the user against the database on every request.
2. **Scoped client** — pages only get `tenantDb(orgId)` (`src/lib/tenant-db.ts`),
   a Prisma extension that adds `organizationId` to every `where` and forces it
   on every create/upsert. The raw `prisma` client is reserved for sign-in,
   sign-up and background jobs.
3. **Database** — relations between tenant rows use composite foreign keys
   `(id, organizationId)`, so PostgreSQL rejects any row that references another
   church's data, even through the raw client.

Check it with `npx tsx scripts/verify-tenancy.ts` after seeding.

## Data model (prisma/schema.prisma)

| Area           | Models                                                             |
| -------------- | ------------------------------------------------------------------ |
| Tenants        | `Organization`, `User` (staff login, role OWNER/ADMIN/STAFF)        |
| People         | `Member`, `Household` (primary contact), `ParentalRelationship`, `CustomFieldDefinition` |
| Groups         | `Group` (with sub-groups), `GroupMembership` (per-channel subscription) |
| Communications | `Communication` (email/SMS broadcast), `CommunicationRecipient` (delivery log) |
| Giving         | `Fund` (general/campaign/designated, goal), `Contribution` (cents, tax year, method) |

Member custom attributes are stored as JSON on `Member.customAttributes`,
keyed by the church's `CustomFieldDefinition.key`.

## Accounts & sign-in security

- **Team** (`/settings/team`, owners and administrators only): invite people by
  email as Staff or Administrator, cancel pending invitations, change roles and
  remove access. Removed people are signed out on their next request; their row
  is kept so the messages they sent stay attributed. The owner can't be changed
  from this page.
- **Invitations and password resets** use single-use random tokens. Only a
  SHA-256 hash is stored. Invitations last 7 days, reset links 1 hour. Links are
  built from `APP_URL` (or `NEXTAUTH_URL`), never from the request's Host header.
  The "forgot password" form answers the same way whether or not the email
  exists.
- **After a password reset**, sessions that signed in before the change stop
  working (`User.passwordChangedAt` vs. the session's sign-in time).
- **Rate limits** (`src/lib/rate-limit.ts`, stored in the `AuthThrottle` table so
  they hold across server instances):

  | What                | Limit                                                    |
  | ------------------- | -------------------------------------------------------- |
  | Sign-in failures    | 5 per email+IP / 15 min · 20 per email / hour · 50 per IP / hour |
  | Reset emails        | 3 per email / hour · 10 per IP / hour                    |
  | New church sign-ups | 5 per IP / hour                                          |

  The client IP comes from `X-Forwarded-For`, so deploy behind a proxy that sets
  it (Vercel, Fly, nginx). Without one, a client can fake its IP and only the
  per-email limits apply.
- Until a real email provider is configured, account emails are printed to the
  server log (see `src/lib/messaging`).

## Forms

People, households and groups can be created, edited and deleted (groups are
archived instead). Shared pieces live in `src/components/form.tsx` and
`src/lib/form-state.ts`:

- Every server action calls `requireTenant()` and writes through `tenantDb`,
  and checks that any referenced household, parent or group belongs to the
  same church before saving.
- `ActionForm` submits in a transition, so fields are never cleared when
  validation fails; errors appear under each field and are announced.
- People with giving records can't be deleted (set them to Inactive instead).
  Deleting a household keeps its people and gifts, just unlinked.

## Scripts

| Command             | What it does                         |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Dev server                           |
| `npm run build`     | `prisma generate` + production build |
| `npm run typecheck` | `tsc --noEmit`                       |
| `npm run lint`      | ESLint                               |
| `npm run db:migrate`| Create/apply migrations (dev)        |
| `npm run db:deploy` | Apply migrations (production)        |
| `npm run db:seed`   | Load demo data                       |

## Not built yet

- Forms for funds and gifts; message composer and sending (no email/SMS
  provider is wired up yet); editing custom field definitions
- Staff invitations, password reset, login rate limiting
- Giving statements (PDF) and online payments
