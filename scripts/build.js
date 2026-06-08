const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MODULES_DIR = path.join(ROOT, "js", "modules");
const CSS_DIR = path.join(ROOT, "css", "modules");
const OUTPUT_JS = path.join(ROOT, "js", "app.js");
const OUTPUT_CSS = path.join(ROOT, "css", "style.css");

const JS_MODULES = [
  "00-core.js",
  "10-search.js",
  "20-match.js",
  "30-jobs.js",
  "40-pages.js",
  "50-entry.js",
];

function cleanModule(content) {
  // Remove leading JSDoc block comment
  content = content.replace(/^\/\*\*[\s\S]*?\*\/\r?\n?/, "");
  
  // Remove leading section marker lines that are JUST markers (not inline with code)
  let lines = content.split(/\r?\n/);
  while (lines.length > 0) {
    let first = lines[0];
    // If the line is purely a marker: // ======== (no code after the markers)
    if (/^\/\/\s*={5,}\s*$/.test(first.trim())) {
      lines.shift();
      continue;
    }
    // If the line starts with a section marker immediately followed by code
    // e.g. "// ===== Section =====function foo() {"
    // Strip just the marker prefix, keep the code
    let m = first.match(/^\/\/\s*={3,}[^=\n]*={3,}\s*/);
    if (m && m[0].length < 120) {
      lines[0] = first.substring(m[0].length);
      // Don't shift - just trimmed the prefix
      break;
    }
    break;
  }
  return lines.join("\n").trim();
}

function buildJS() {
  console.log("[build] JS modules...");
  let parts = [];
  for (const file of JS_MODULES) {
    const filepath = path.join(MODULES_DIR, file);
    if (!fs.existsSync(filepath)) {
      console.error(`[build] ERROR: Missing module: ${file}`);
      process.exit(1);
    }
    let content = fs.readFileSync(filepath, "utf-8");
    content = cleanModule(content);
    parts.push(content);
    console.log(`  ${file}: ${content.length} chars`);
  }

  const combined = parts.join("\n\n");
  const output = `// ===== YGQ - Built ${new Date().toISOString()} =====
// Modules: ${JS_MODULES.join(", ")}
(function(){"use strict";
${combined}
})();
`;

  fs.writeFileSync(OUTPUT_JS, output, "utf-8");
  console.log(`[build] JS done: ${OUTPUT_JS} (${fs.statSync(OUTPUT_JS).size} bytes)`);
}

function buildCSS() {
  console.log("[build] CSS modules...");
  const CSS_MODULES = ["base.css", "layout.css", "components.css", "match.css", "pages.css"];
  let parts = [];
  for (const file of CSS_MODULES) {
    const filepath = path.join(CSS_DIR, file);
    if (!fs.existsSync(filepath)) {
      console.warn(`[build] CSS module not found: ${file}, skipping`);
      continue;
    }
    let content = fs.readFileSync(filepath, "utf-8");
    parts.push(`/* ===== ${file} ===== */\n${content.trim()}`);
    console.log(`  ${file}: ${content.length} chars`);
  }
  if (parts.length === 0) { console.log("[build] No CSS modules, skipping"); return; }
  const combined = parts.join("\n\n");
  const output = `/* YGQ - Built ${new Date().toISOString()} */\n${combined}\n`;
  fs.writeFileSync(OUTPUT_CSS, output, "utf-8");
  console.log(`[build] CSS done: ${OUTPUT_CSS} (${fs.statSync(OUTPUT_CSS).size} bytes)`);
}

console.log("=== YGQ Build Tool ===");
console.log(`Root: ${ROOT}`);
buildJS();
buildCSS();
console.log("=== Build complete ===");
