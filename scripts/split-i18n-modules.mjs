import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src/i18n");
const locales = ["ko", "en", "ja"];
const modules = [
  "common",
  "controlCenter",
  "settings",
  "llm",
  "character",
  "perception",
  "report",
  "companion",
  "persona",
];

for (const locale of locales) {
  const basePath = path.join(root, locale, "base.ts");
  const source = fs.readFileSync(basePath, "utf8");
  const match = source.match(/export const base: AppLocale = (\{[\s\S]*\});/);
  if (!match) {
    throw new Error(`Could not parse ${basePath}`);
  }

  const objectLiteral = match[1];
  const value = Function(`"use strict"; return (${objectLiteral});`)();

  for (const moduleName of modules) {
    const modulePath = path.join(root, locale, `${moduleName}.ts`);
    const moduleSource = `import type { ${capitalize(moduleName)}Messages } from "../modules/${moduleName}";\n\nexport const ${moduleName}: ${capitalize(moduleName)}Messages = ${serialize(value[moduleName], 0)};\n`;
    fs.writeFileSync(modulePath, moduleSource);
  }

  const indexSource = `import type { AppLocale } from "../types";
${modules.map((name) => `import { ${name} } from "./${name}";`).join("\n")}

export const locale: AppLocale = {
${modules.map((name) => `  ${name},`).join("\n")}
};
`;
  fs.writeFileSync(path.join(root, locale, "index.ts"), indexSource);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function serialize(value, indent) {
  const pad = " ".repeat(indent);
  const nextPad = " ".repeat(indent + 2);

  if (value === null) return "null";
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => serialize(item, indent + 2)).join(", ")}]`;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return "{}";
  }

  return `{\n${entries
    .map(
      ([key, nested]) =>
        `${nextPad}${/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)}: ${serialize(nested, indent + 2)},`,
    )
    .join("\n")}\n${pad}}`;
}

console.log("Split i18n locale modules.");
