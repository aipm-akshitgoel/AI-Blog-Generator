const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPersistedUuid(value?: string | null): boolean {
  return Boolean(value && UUID_RE.test(value));
}

/** Drop client-only ids (e.g. `local-123`) before writing to Supabase. */
export function stripNonPersistedId<T extends { id?: string }>(record: T): T {
  if (!record.id || isPersistedUuid(record.id)) return record;
  const { id: _removed, ...rest } = record;
  return rest as T;
}
