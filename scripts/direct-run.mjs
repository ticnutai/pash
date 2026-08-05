import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pendingPath = path.join(root, "public", "pending-migrations.json");

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(fs.readFileSync(file, "utf8").split(/\r?\n/)
    .filter(line => line && !line.trimStart().startsWith("#") && line.includes("="))
    .map(line => {
      const at = line.indexOf("=");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^['"]|['"]$/g, "")];
    }));
}

function readWindowsUserEnv(name) {
  if (process.platform !== "win32") return undefined;
  try {
    const output = execFileSync("reg.exe", ["query", "HKCU\\Environment", "/v", name], {
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const match = output.match(new RegExp(`${name}\\s+REG_(?:SZ|EXPAND_SZ)\\s+(.+)$`, "m"));
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

const env = {
  ...readEnvFile(path.join(root, ".env")),
  ...readEnvFile(path.join(root, ".env.migrations.local")),
  ...process.env,
};
const projectRef = env.VITE_SUPABASE_PROJECT_ID;
const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const adminEmail = env.MIGRATION_ADMIN_EMAIL || readWindowsUserEnv("MIGRATION_ADMIN_EMAIL");
const adminPassword = env.MIGRATION_ADMIN_PASSWORD || readWindowsUserEnv("MIGRATION_ADMIN_PASSWORD");

function requireConfig() {
  if (!projectRef || !supabaseUrl || !anonKey) throw new Error("Supabase project settings are missing from .env");
  if (!adminEmail || !adminPassword) {
    throw new Error("MIGRATION_ADMIN_EMAIL and MIGRATION_ADMIN_PASSWORD are not configured");
  }
}

function isDestructive(sql) {
  return /\b(DROP|TRUNCATE|DELETE)\b/i.test(sql.replace(/--.*$/gm, ""));
}

async function loginAdmin() {
  requireConfig();
  const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    signal: AbortSignal.timeout(30_000),
  });
  const login = await loginResponse.json().catch(() => ({}));
  if (!loginResponse.ok || !login.access_token) {
    throw new Error(login.msg || login.error_description || "Admin login failed");
  }
  return login.access_token;
}

async function execute(name, sql) {
  const accessToken = await loginAdmin();
  console.log(`Target project: ${projectRef}`);
  console.log(`Running migration: ${name}`);
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_safe_migration`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_migration_name: name, p_migration_sql: sql }),
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || `Supabase returned HTTP ${response.status}`);
  if (!body.success) throw new Error(body.error || "Migration RPC returned failure");
  console.log("Migration completed successfully");
  return body;
}

async function showHistory() {
  const accessToken = await loginAdmin();
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_migration_history`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || `Supabase returned HTTP ${response.status}`);
  console.log(`Target project: ${projectRef}`);
  console.table(body);
}

function migrationFile(relativePath) {
  const full = path.resolve(root, relativePath);
  const migrationsRoot = path.resolve(root, "supabase", "migrations") + path.sep;
  if (!full.startsWith(migrationsRoot)) throw new Error("Migration file must be inside supabase/migrations");
  if (!fs.existsSync(full)) throw new Error(`Migration file not found: ${relativePath}`);
  return full;
}

async function runPending() {
  requireConfig();
  if (!fs.existsSync(pendingPath)) return console.log("No pending-migrations.json found");
  const manifest = JSON.parse(fs.readFileSync(pendingPath, "utf8"));
  const pending = manifest.migrations.filter(item => item.status === "pending");
  console.log(`Pending migrations: ${pending.length}`);
  for (const item of pending) {
    try {
      const sql = item.file ? fs.readFileSync(migrationFile(item.file), "utf8") : item.sql;
      await execute(item.name, sql);
      item.status = "completed";
      item.executedAt = new Date().toISOString();
      delete item.errorMessage;
    } catch (error) {
      item.status = "failed";
      item.executedAt = new Date().toISOString();
      item.errorMessage = error instanceof Error ? error.message : String(error);
      fs.writeFileSync(pendingPath, JSON.stringify(manifest, null, 2) + "\n");
      throw error;
    }
    fs.writeFileSync(pendingPath, JSON.stringify(manifest, null, 2) + "\n");
  }
}

async function main() {
  const [command = "pending", value, name, flag] = process.argv.slice(2);
  if (command === "pending") return runPending();
  if (command === "history") return showHistory();
  if (command === "file") {
    if (!value) throw new Error("Usage: node scripts/direct-run.mjs file <supabase/migrations/file.sql>");
    const full = migrationFile(value);
    return execute(path.basename(full, ".sql"), fs.readFileSync(full, "utf8"));
  }
  if (command === "sql") {
    if (!value) throw new Error('Usage: node scripts/direct-run.mjs sql "SELECT ..." [name]');
    if (isDestructive(value) && flag !== "--allow-destructive") {
      throw new Error("Destructive SQL blocked; append --allow-destructive only after explicit approval");
    }
    return execute(name || `direct_${Date.now()}`, value);
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch(error => {
  console.error(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
