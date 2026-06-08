const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MODULES_DIR = path.join(ROOT, "js", "modules");
const CSS_DIR = path.join(ROOT, "css", "modules");
const OUTPUT_JS = path.join(ROOT, "js", "app.js");
const OUTPUT_CSS = path.join(ROOT, "css", "style.css");

// ===== JS Build =====
const JS_MODULES = [
  "00-core.js",
  "10-search.js",
  "20-match.js",
  "30-jobs.js",
  "40-pages.js",
  "50-entry.js",
];

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
    // Strip file-level JSDoc comments and section markers (keep inner code)
    // Remove leading /** ... */ block
    content = content.replace(/^\/\*\*[\s\S]*?\*\/\s*/m, "");
    // Remove leading // ===== section markers
    content = content.replace(/^\/\/ =====.+?=====\s*/m, "");
    parts.push(content.trim());
    console.log(`  ${file}: ${content.length} chars`);
  }

  const combined = parts.join("\n");
  const output = `// ===== 央国企招聘平台 - 主应用逻辑 =====\n// 构建时间: ${new Date().toISOString()}\n// 模块: ${JS_MODULES.join(", ")}\n(function(){"use strict";\n${combined}\n})();\n`;

  // Write as UTF-8 with BOM (matching original behavior)
  fs.writeFileSync(OUTPUT_JS, "\uFEFF" + output, "utf-8");
  console.log(`[build] JS done: ${OUTPUT_JS} (${fs.statSync(OUTPUT_JS).size} bytes)`);
}

// ===== CSS Build =====
const CSS_MODULES = [
  "base.css",
  "layout.css",
  "components.css",
  "match.css",
  "pages.css",
];

function buildCSS() {
  console.log("[build] CSS modules...");
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

  if (parts.length === 0) {
    console.log("[build] No CSS modules found, skipping CSS build");
    return;
  }

  const combined = parts.join("\n\n");
  const output = `/* YGQ 央国企招聘平台 - 样式表 */\n/* 构建时间: ${new Date().toISOString()} */\n${combined}\n`;

  fs.writeFileSync(OUTPUT_CSS, "\uFEFF" + output, "utf-8");
  console.log(`[build] CSS done: ${OUTPUT_CSS} (${fs.statSync(OUTPUT_CSS).size} bytes)`);
}

// ===== Main =====
console.log("=== YGQ Build Tool ===");
console.log(`Root: ${ROOT}`);
buildJS();
buildCSS();
console.log("=== Build complete ===");

// Watch mode
if (process.argv.includes("--watch")) {
  console.log("[watch] Watching for changes...");
  const watchDirs = [MODULES_DIR];
  if (fs.existsSync(CSS_DIR)) watchDirs.push(CSS_DIR);
  
  watchDirs.forEach(dir => {
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith(".js") || filename.endsWith(".css"))) {
        console.log(`[watch] ${eventType}: ${filename}`);
        buildJS();
        if (filename.endsWith(".css")) buildCSS();
      }
    });
  });
}
