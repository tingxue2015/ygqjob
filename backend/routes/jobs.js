// ===== 岗位搜索/过滤/分页 API =====

const express = require("express");
const router = express.Router();
const { sanitize, validatePagination } = require("../middleware/validator");

// 安全标签映射（白名单过滤）
const ALLOWED_FILTERS = {
  companyType: ["central", "local", "mixed"],
  recruitType: ["spring", "autumn", "makeup", "intern", "social", "high_end"],
  target: ["bachelor", "master", "doctor", "overseas", "social"],
  location: ["beijing", "shanghai", "guangzhou", "shenzhen", "chengdu", "wuhan", "hangzhou", "nanjing", "tianjin", "other"],
  appStatus: ["none", "applied", "no_response", "test", "interview", "offer", "done"]
};

/**
 * GET /api/jobs
 * 查询参数: q(搜索), companyType, industry, recruitType, target, location,
 *          appStatus, deadlineWithin, page(默认1), pageSize(默认20)
 */
router.get("/", (req, res) => {
  try {
    // 直接从全局数据获取（server.js exports）
    const allJobs = global._appJobs || [];
    let filtered = [...allJobs];

    const q = sanitize(req.query.q);
    const { page, pageSize, skip } = validatePagination(req.query.page, req.query.pageSize);

    // 关键词搜索
    if (q) {
      const kw = q.toLowerCase();
      filtered = filtered.filter(j =>
        (j.company && j.company.includes(kw)) ||
        (j.job && j.job.includes(kw)) ||
        (j.industry && j.industry.includes(kw)) ||
        (j.notes && j.notes.includes(kw))
      );
    }

    // 精确过滤
    for (const [key, allowed] of Object.entries(ALLOWED_FILTERS)) {
      const val = sanitize(req.query[key]);
      if (val && allowed.includes(val)) {
        filtered = filtered.filter(j => j[key] === val);
      }
    }

    // 行业模糊过滤
    const industry = sanitize(req.query.industry);
    if (industry && !ALLOWED_FILTERS.industry) {
      filtered = filtered.filter(j => j.industry && j.industry.includes(industry));
    }

    // 截止时间过滤
    const deadlineWithin = sanitize(req.query.deadlineWithin);
    if (deadlineWithin === "24h") {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      filtered = filtered.filter(j => j.deadline && j.deadline <= tomorrow);
    }

    // 排序：默认按更新时间降序
    filtered.sort((a, b) => (b.updateDate || "").localeCompare(a.updateDate || ""));

    // 分页
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const paged = filtered.slice(skip, skip + pageSize);

    res.json({
      success: true,
      data: paged,
      pagination: { page, pageSize, total, totalPages }
    });
  } catch (err) {
    console.error("[jobs] 查询错误:", err);
    res.status(500).json({ error: "查询失败" });
  }
});

/**
 * GET /api/jobs/:id
 */
router.get("/:id", (req, res) => {
  const allJobs = global._appJobs || [];
  const id = parseInt(req.params.id, 10);
  const job = allJobs.find(j => j.id === id);
  if (!job) return res.status(404).json({ error: "岗位不存在" });
  res.json({ success: true, data: job });
});

/**
 * GET /api/jobs/stats/summary
 * 返回筛选器可选项统计
 */
router.get("/stats/summary", (req, res) => {
  const allJobs = global._appJobs || [];
  const summary = {
    total: allJobs.length,
    companyTypes: [...new Set(allJobs.map(j => j.companyType))],
    industries: [...new Set(allJobs.map(j => j.industry).filter(Boolean))],
    recruitTypes: [...new Set(allJobs.map(j => j.recruitType))],
    targets: [...new Set(allJobs.map(j => j.target))],
    locations: [...new Set(allJobs.map(j => j.location))],
    updatedAt: new Date().toISOString()
  };
  res.json({ success: true, data: summary });
});

module.exports = router;
