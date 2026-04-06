import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

if (fs.existsSync(envPath)) {
  process.exit(0);
}

if (!fs.existsSync(examplePath)) {
  console.warn("ensure-env: .env.example missing, skipping.");
  process.exit(0);
}

fs.copyFileSync(examplePath, envPath);
console.log(
  "Created .env from .env.example — add FAL_KEY, AIMLAPI_KEY, and chat keys."
);
