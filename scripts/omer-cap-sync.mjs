// Swap capacitor config → sync → restore
import { renameSync, copyFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";

const main = "capacitor.config.ts";
const backup = "capacitor.config.main.ts";
const omer = "capacitor.config.omer.ts";

try {
  renameSync(main, backup);
  copyFileSync(omer, main);
  execSync("npx cap sync android", { stdio: "inherit" });
} finally {
  try { unlinkSync(main); } catch {}
  renameSync(backup, main);
}
