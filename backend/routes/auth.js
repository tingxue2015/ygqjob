// ===== 认证 API：注册 / 登录 / JWT =====

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { sanitize } = require("../middleware/validator");

const JWT_SECRET = process.env.JWT_SECRET || "ygqjob_jwt_secret_change_me";
const JWT_EXPIRY = "7d";
const USERS_FILE = path.join(__dirname, "..", "data", "users.json");

// 加载/保存用户
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    }
  } catch (_) {}
  return [];
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

/**
 * POST /api/auth/register
 * Body: { username, password, phone }
 */
router.post("/register", async (req, res) => {
  try {
    const username = sanitize(req.body.username);
    const password = sanitize(req.body.password);
    const phone = sanitize(req.body.phone);

    // 校验
    if (!username || username.length < 2 || username.length > 30) {
      return res.status(400).json({ error: "用户名需2-30个字符" });
    }
    if (!password || password.length < 6 || password.length > 100) {
      return res.status(400).json({ error: "密码需6-100个字符" });
    }
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: "手机号格式不正确" });
    }

    const users = loadUsers();

    // 检查重复
    if (users.find(u => u.username === username)) {
      return res.status(409).json({ error: "用户名已被注册" });
    }
    if (phone && users.find(u => u.phone === phone)) {
      return res.status(409).json({ error: "手机号已被注册" });
    }

    // 哈希密码
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      username,
      phone: phone || "",
      passwordHash,
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    users.push(user);
    saveUsers(users);

    // 签发 JWT
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, username: user.username, phone: user.phone }
    });
  } catch (err) {
    console.error("[auth] 注册错误:", err);
    res.status(500).json({ error: "注册失败，请稍后再试" });
  }
});

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
router.post("/login", async (req, res) => {
  try {
    const username = sanitize(req.body.username);
    const password = sanitize(req.body.password);

    if (!username || !password) {
      return res.status(400).json({ error: "请输入用户名和密码" });
    }

    const users = loadUsers();
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    // 更新最后登录时间
    user.lastLogin = new Date().toISOString();
    saveUsers(users);

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, phone: user.phone }
    });
  } catch (err) {
    console.error("[auth] 登录错误:", err);
    res.status(500).json({ error: "登录失败，请稍后再试" });
  }
});

/**
 * GET /api/auth/me
 * 验证 JWT 并返回当前用户信息
 */
router.get("/me", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "未登录" });
    }
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const users = loadUsers();
    const user = users.find(u => u.id === decoded.userId);
    if (!user) return res.status(401).json({ error: "用户不存在" });

    res.json({
      success: true,
      user: { id: user.id, username: user.username, phone: user.phone }
    });
  } catch (err) {
    return res.status(401).json({ error: "登录已过期，请重新登录" });
  }
});

module.exports = router;
