import * as fs from "node:fs";
import * as path from "node:path";

const templatePath = path.join(process.cwd(), "manifest.template.json");
const outputPath = path.join(process.cwd(), "dist", "manifest.json");
const version = process.env.VERSION || "0.0.0";

let manifest: Record<string, unknown>;

try {
  const templateContent = fs.readFileSync(templatePath, "utf8");
  try {
    manifest = JSON.parse(templateContent) as Record<string, unknown>;
  } catch (error) {
    console.error(`Invalid JSON in manifest.template.json: ${(error as Error).message}`);
    process.exit(1);
  }
} catch (error) {
  console.error(`Failed to read manifest.template.json: ${(error as Error).message}`);
  process.exit(1);
}
manifest.version = version;

try {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
} catch (error) {
  console.error(`Failed to write manifest.json: ${(error as Error).message}`);
  process.exit(1);
}
