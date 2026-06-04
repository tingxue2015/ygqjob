// ===== 限流中间件 =====

const rateLimit = require("express-rate-limit");

// 通用API限流：15分钟内最多600次请求
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "请求过于频繁，请15分钟后再试" }
});

// 登录/注册限流：15分钟内最多30次
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "操作过于频繁，请15分钟后再试" }
});

module.exports = { apiLimiter, authLimiter };
