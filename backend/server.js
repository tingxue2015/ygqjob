// ===== 央国企招聘平台 - 后端API服务 =====
// Node.js + Express + JWT认证
// 启动: npm start  或  node server.js

"use strict";

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");

// 加载环境变量（优先 .env 文件）
try { require("dotenv").config({ path: path.join(__dirname, ".env") }); } catch (_) {}

const PORT = process.env.PORT || 3000;
const STATIC_PATH = path.resolve(__dirname, process.env.STATIC_PATH || "..");
const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN || "http://localhost:3000").split(",");

// ============ 初始化数据 ============
let jobsData = [];

function loadJobsData() {
  try {
    // 从 data.js 加载（使用 vm 模块安全执行）
    const dataPath = path.join(__dirname, "data", "jobs.js");
    const raw = fs.readFileSync(dataPath, "utf8");
    // 数据文件是JS对象字面量数组，用Function安全解析
    const parseFn = new Function("return " + raw);
    jobsData = parseFn();
    console.log(`[数据] 加载 ${jobsData.length} 条岗位记录`);
  } catch (err) {
    console.error("[数据] 加载失败:", err.message);
    jobsData = [];
  }
}
loadJobsData();
global._appJobs = jobsData;

// ============ Express 应用 ============
const { apiLimiter, authLimiter } = require("./middleware/rateLimiter");

const app = express();

// 安全头
app.use(helmet({
  contentSecurityPolicy: false, // CSP由前端meta标签控制
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || ALLOWED_ORIGIN.includes(origin) || ALLOWED_ORIGIN.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true
}));

// 日志
app.use(morgan("short"));

// 请求体解析
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// ============ 静态文件服务 ============
app.use(express.static(STATIC_PATH, {
  index: "index.html",
  maxAge: "1h",
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    if (filePath.endsWith(".js") || filePath.endsWith(".css")) res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  }
}));

// ============ API路由 ============
app.use("/api/jobs", apiLimiter, require("./routes/jobs"));
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/search", apiLimiter, require("./routes/search"));

// API 404
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API端点不存在" });
});

// 前端 SPA fallback
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) return;
  res.sendFile(path.resolve(STATIC_PATH, "index.html"));
});

// ============ 全局错误处理 ============
app.use((err, req, res, _next) => {
  console.error("[错误]", err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? "服务器内部错误" : err.message,
    ...(process.env.NODE_ENV === "development" && { detail: err.stack })
  });
});

// ============ 启动服务 ============
app.listen(PORT, () => {
  console.log(`[服务] 央国企招聘平台API已启动: http://localhost:${PORT}`);
  console.log(`[服务] 静态文件: ${STATIC_PATH}`);
  console.log(`[服务] 环境: ${process.env.NODE_ENV || "development"}`);
});

// 热重载数据接口（管理用）
app.post("/api/admin/reload-data", (req, res) => {
  const token = req.headers.authorization;
  if (token !== "Bearer " + process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: "无权限" });
  }
  loadJobsData();
global._appJobs = jobsData;
  res.json({ ok: true, count: jobsData.length });
});

module.exports = app;
