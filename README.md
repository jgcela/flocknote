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

## Deploying (Vercel + Neon)

1. Create a Postgres database on [Neon](https://neon.tech) (or Supabase) and
   copy its **direct** (non-pooled) connection string. It must end with
   `?sslmode=require`.
2. Import this repo in [Vercel](https://vercel.com/new). Framework preset:
   Next.js; leave build settings as they are.
3. Add environment variables in Vercel before the first deploy:
   - `DATABASE_URL`: the connection string from step 1
   - `NEXTAUTH_SECRET`: output of `openssl rand -base64 32`
   - `NEXTAUTH_URL`: the site URL, e.g. `https://your-app.vercel.app`
4. Deploy. Vercel runs `npm run vercel-build`, which applies pending
   migrations (`prisma migrate deploy`) before building.
5. Open `/signup` to create the first church. Demo data is not loaded in
   production; to load it anyway, run `npm run db:seed` locally with
   `DATABASE_URL` pointing at the production database.

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
