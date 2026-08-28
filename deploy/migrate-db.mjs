import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

const db = drizzle(process.env.DATABASE_URL);
await migrate(db, { migrationsFolder: "drizzle" });
console.log("Migrations OK");
