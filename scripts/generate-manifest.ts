import fs from "node:fs";
import path from "node:path";

const templatePath = path.join(process.cwd(), "manifest.template.json");
const outputPath = path.join(process.cwd(), "dist", "manifest.json");
const version = process.env.VERSION || "0.0.0";

const manifest = JSON.parse(fs.readFileSync(templatePath, "utf8")) as Record<string, unknown>;
manifest.version = version;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
