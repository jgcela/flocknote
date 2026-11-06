import { Prisma } from "@prisma/client";
import { prisma } from "./db";

/** Models that carry an `organizationId` column. */
const TENANT_MODELS = new Set<string>([
  "User",
  "Household",
  "Member",
  "ParentalRelationship",
  "CustomFieldDefinition",
  "Group",
  "GroupMembership",
  "Communication",
  "CommunicationRecipient",
  "Fund",
  "Contribution",
] satisfies Prisma.ModelName[]);

const WHERE_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
]);

type Args = Record<string, unknown>;

function withOrg(value: unknown, organizationId: string): Args {
  return { ...((value as Args | undefined) ?? {}), organizationId };
}

/**
 * Returns a Prisma client that is hard-scoped to one church.
 *
 * - Every read/update/delete on a tenant model gets `organizationId` added to
 *   its `where` (Prisma ≥5 allows extra filters on unique lookups).
 * - Every create/upsert has `organizationId` forced to this tenant, so a
 *   caller cannot write into another church even by passing a different id.
 * - Relations between tenant rows use composite (id, organizationId) foreign
 *   keys, so `include`/nested reads can never cross into another tenant.
 *
 * Write data with scalar foreign keys (`fundId: "..."`) rather than
 * `connect`, because Prisma does not allow mixing the two styles.
 */
export function tenantDb(organizationId: string) {
  if (!organizationId) throw new Error("tenantDb requires an organizationId");

  return prisma.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_MODELS.has(model)) return query(args);

          const a: Args = { ...((args as Args | undefined) ?? {}) };

          if (WHERE_OPERATIONS.has(operation)) {
            a.where = withOrg(a.where, organizationId);
          }

          switch (operation) {
            case "create":
              a.data = withOrg(a.data, organizationId);
              break;
            case "createMany":
            case "createManyAndReturn": {
              const rows = Array.isArray(a.data) ? a.data : [a.data];
              a.data = rows.map((row) => withOrg(row, organizationId));
              break;
            }
            case "upsert":
              a.where = withOrg(a.where, organizationId);
              a.create = withOrg(a.create, organizationId);
              a.update = { ...((a.update as Args | undefined) ?? {}) };
              delete (a.update as Args).organizationId;
              break;
            case "update":
            case "updateMany":
            case "updateManyAndReturn":
              // Never allow moving a row to another tenant.
              a.data = { ...((a.data as Args | undefined) ?? {}) };
              delete (a.data as Args).organizationId;
              break;
          }

          return query(a as typeof args);
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof tenantDb>;
