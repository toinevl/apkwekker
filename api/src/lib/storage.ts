import { TableClient, TableServiceClient, odata } from "@azure/data-tables";

const SUBSCRIPTIONS_TABLE = "subscriptions";
const RUNS_TABLE = "runs";

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

let subscriptionsClient: TableClient | null = null;
let runsClient: TableClient | null = null;
let subscriptionsEnsured = false;
let runsEnsured = false;

function connectionString(): string {
  const conn = process.env.STORAGE_CONNECTION;
  if (!conn) throw new Error("STORAGE_CONNECTION is not set");
  return conn;
}

export function getTableClient(): TableClient {
  if (!subscriptionsClient) {
    subscriptionsClient = TableClient.fromConnectionString(connectionString(), SUBSCRIPTIONS_TABLE);
  }
  return subscriptionsClient;
}

export function getRunsTableClient(): TableClient {
  if (!runsClient) {
    runsClient = TableClient.fromConnectionString(connectionString(), RUNS_TABLE);
  }
  return runsClient;
}

/** For tests. */
export function setTableClient(mock: TableClient | null): void {
  subscriptionsClient = mock;
  subscriptionsEnsured = mock !== null;
}

/** For tests: inject a mock runs table client. */
export function setRunsTableClient(mock: TableClient | null): void {
  runsClient = mock;
  runsEnsured = mock !== null;
}

export async function ensureTable(): Promise<void> {
  if (subscriptionsEnsured) return;
  const service = TableServiceClient.fromConnectionString(connectionString());
  try {
    await service.createTable(SUBSCRIPTIONS_TABLE);
  } catch (err: unknown) {
    const code = (err as { statusCode?: number }).statusCode;
    if (code !== 409) throw err; // 409 = already exists
  }
  subscriptionsEnsured = true;
}

export async function ensureRunsTable(): Promise<void> {
  if (runsEnsured) return;
  const service = TableServiceClient.fromConnectionString(connectionString());
  try {
    await service.createTable(RUNS_TABLE);
  } catch (err: unknown) {
    const code = (err as { statusCode?: number }).statusCode;
    if (code !== 409) throw err; // 409 = already exists
  }
  runsEnsured = true;
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
