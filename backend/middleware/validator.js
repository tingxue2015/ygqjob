// ===== 输入校验与清洗中间件 =====

/**
 * 清洗字符串：移除HTML标签，trim，限制长度
 */
function sanitize(val) {
  if (val === null || val === undefined) return "";
  if (typeof val !== "string") val = String(val);
  return val.replace(/<[^>]*>/g, "").trim().slice(0, 200);
}

/**
 * 验证分页参数
 */
function validatePagination(page, pageSize) {
  let p = parseInt(page, 10) || 1;
  let ps = parseInt(pageSize, 10) || 20;
  if (p < 1) p = 1;
  if (ps < 1) ps = 1;
  if (ps > 100) ps = 100; // 单页最大100条
  return { page: p, pageSize: ps, skip: (p - 1) * ps };
}

/**
 * 请求体清洗中间件
 */
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === "object") {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === "string") {
        req.body[key] = sanitize(req.body[key]);
      }
    }
  }
  next();
}

module.exports = { sanitize, validatePagination, sanitizeBody };
