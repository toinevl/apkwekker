import { TableClient, TableServiceClient, odata } from "@azure/data-tables";

const TABLE_NAME = "subscriptions";

export interface SubscriptionEntity {
  partitionKey: string; // kenteken (normalized)
  rowKey: string; // sha256(email) hex
  email: string;
  kenteken: string;
  apkDate: string; // ISO date or ''
  status: "pending" | "confirmed";
  confirmToken: string;
  unsubscribeToken: string;
  createdAt: string;
  confirmedAt: string;
  remindersSent: string; // comma list e.g. '60,30'
}

let client: TableClient | null = null;
let tableEnsured = false;

function connectionString(): string {
  const conn = process.env.STORAGE_CONNECTION;
  if (!conn) throw new Error("STORAGE_CONNECTION is not set");
  return conn;
}

export function getTableClient(): TableClient {
  if (!client) {
    client = TableClient.fromConnectionString(connectionString(), TABLE_NAME);
  }
  return client;
}

/** For tests. */
export function setTableClient(mock: TableClient | null): void {
  client = mock;
  tableEnsured = mock !== null;
}

export async function ensureTable(): Promise<void> {
  if (tableEnsured) return;
  const service = TableServiceClient.fromConnectionString(connectionString());
  try {
    await service.createTable(TABLE_NAME);
  } catch (err: unknown) {
    const code = (err as { statusCode?: number }).statusCode;
    if (code !== 409) throw err; // 409 = already exists
  }
  tableEnsured = true;
}

export async function findByToken(
  field: "confirmToken" | "unsubscribeToken",
  token: string
): Promise<SubscriptionEntity | null> {
  const table = getTableClient();
  const filter =
    field === "confirmToken"
      ? odata`confirmToken eq ${token}`
      : odata`unsubscribeToken eq ${token}`;
  const iter = table.listEntities<SubscriptionEntity>({ queryOptions: { filter } });
  for await (const entity of iter) {
    return entity;
  }
  return null;
}

export async function listConfirmed(): Promise<SubscriptionEntity[]> {
  const table = getTableClient();
  const results: SubscriptionEntity[] = [];
  const iter = table.listEntities<SubscriptionEntity>({
    queryOptions: { filter: odata`status eq ${"confirmed"}` },
  });
  for await (const entity of iter) {
    results.push(entity);
  }
  return results;
}
