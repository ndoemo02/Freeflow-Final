type MetadataRecord = Record<string, unknown>;

export type AccessUser = {
  id?: string | null;
  email?: string | null;
  user_metadata?: MetadataRecord | null;
  app_metadata?: MetadataRecord | null;
} | null | undefined;

const WORKSPACE_ALLOWLIST_EMAILS = new Set([
  "ndoemo02@gmail.com",
]);

const WORKSPACE_FLAG_KEYS = [
  "workspace_access",
  "workspace_full_access",
  "ops_access",
  "staff_access",
  "is_staff",
  "is_admin",
];

function normalizeEmail(email?: string | null): string {
  return String(email || "").trim().toLowerCase();
}

function isObjectRecord(value: unknown): value is MetadataRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readFlagCandidate(meta: MetadataRecord, key: string): unknown {
  if (key in meta) return meta[key];

  const containers = ["flags", "permissions", "access", "workspace"];
  for (const containerKey of containers) {
    const container = meta[containerKey];
    if (isObjectRecord(container) && key in container) {
      return container[key];
    }
  }

  return undefined;
}

function isTruthyFlag(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
  }
  return false;
}

export function hasWorkspaceAccessFlag(user: AccessUser): boolean {
  if (!user?.id) return false;

  const userMeta = isObjectRecord(user.user_metadata) ? user.user_metadata : {};
  const appMeta = isObjectRecord(user.app_metadata) ? user.app_metadata : {};

  return WORKSPACE_FLAG_KEYS.some((key) => {
    const fromUserMeta = readFlagCandidate(userMeta, key);
    if (isTruthyFlag(fromUserMeta)) return true;
    const fromAppMeta = readFlagCandidate(appMeta, key);
    return isTruthyFlag(fromAppMeta);
  });
}

export function canAccessWorkspacePanels(user: AccessUser): boolean {
  if (!user?.id) return false;

  const email = normalizeEmail(user.email);
  if (email && WORKSPACE_ALLOWLIST_EMAILS.has(email)) {
    return true;
  }

  return hasWorkspaceAccessFlag(user);
}

