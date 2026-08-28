import path from "node:path";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

/**
 * Apply pending Drizzle migrations at startup (prod image ships apps/api/drizzle/).
 */
export async function runMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.warn("[Database] DATABASE_URL unset — skipping migrations");
    return;
  }

  const migrationsFolder = path.join(process.cwd(), "apps/api/drizzle");
  const connection = await mysql.createConnection(databaseUrl);
  const db = drizzle(connection);

  try {
    await migrate(db, { migrationsFolder });
    console.log("[Database] Migrations up to date");
  } finally {
    await connection.end();
  }
}
