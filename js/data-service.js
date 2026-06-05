// ===== 央国企招聘平台 - 动态数据服务层 =====
// 模拟实时API，提供自动刷新、新职位推送、状态变更等功能
// 当接入真实后端API时，只需替换本模块

const DataService = (function() {
  "use strict";

  // ---- 核心数据存储 ----
  var _jobs = [];
  var _referrals = [];
  var _resources = [];
  var _walls = [];
  var _reviews = [];
  var _progress = {};
  var _initialized = false;

  // ---- 动态状态 ----
  var _newItemIds = [];        // 本次刷新周期内新增的职位ID
  var _lastRefreshTime = null; // 上次刷新时间戳
  var _refreshTimer = null;    // 自动刷新定时器
  var _refreshInterval = 30000; // 默认30秒刷新一次
  var _version = 1;            // 数据版本号
  var _listeners = [];         // 数据变更监听器

  // ---- 职位状态流转表 ----
  var _statusFlow = ["none","applied","no_response","test","interview","offer","done"];

  // ---- 新职位模板 ----
  var _newJobTemplates = [
    {company:"中国核工业集团有限公司",logo:"中核",companyType:"central",industry:"核工业",recruitType:"makeup",target:"master",location:"beijing",job:"核反应堆工程设计工程师",welfare:["北京落户","事业编制","专项津贴"],notes:"核工程/热能与动力工程，博士优先",regulator:"国资委",fortune:"世界500强",graduateYear:"2026届",degree:"硕士及以上",verified:true},
    {company:"中国中车股份有限公司",logo:"中车",companyType:"central",industry:"轨道交通",recruitType:"autumn",target:"bachelor",location:"beijing",job:"高铁电气系统研发工程师",welfare:["六险二金","员工宿舍","年终奖"],notes:"电气工程/自动化专业",regulator:"国资委",fortune:"世界500强",graduateYear:"2026届",degree:"本科及以上",verified:true},
    {company:"中国广核集团有限公司",logo:"中广核",companyType:"central",industry:"清洁能源",recruitType:"spring",target:"master",location:"shenzhen",job:"核电安全分析工程师",welfare:["深圳落户","核电补贴","人才房"],notes:"核科学与技术相关专业",regulator:"国资委",fortune:"世界500强",graduateYear:"2026届",degree:"硕士及以上",verified:true},
    {company:"中国长江三峡集团有限公司",logo:"三峡",companyType:"central",industry:"水利水电",recruitType:"spring",target:"master",location:"wuhan",job:"水电工程规划设计",welfare:["武汉落户","项目分红","培训深造"],notes:"水利工程/土木工程专业",regulator:"国资委",fortune:"中国500强",graduateYear:"2026届",degree:"硕士及以上",verified:true},
    {company:"中国稀土集团有限公司",logo:"稀土",companyType:"central",industry:"新材料",recruitType:"makeup",target:"phd",location:"other",job:"稀土材料研发科学家",welfare:["科研经费","安家费","事业编制"],notes:"材料科学/化学，博士学历",regulator:"国资委",fortune:"中国500强",graduateYear:"2026届",degree:"博士",verified:true},
    {company:"中国融通资产管理集团有限公司",logo:"融通",companyType:"central",industry:"综合投资",recruitType:"autumn",target:"master",location:"beijing",job:"资产管理与投资分析",welfare:["北京落户","绩效奖金","六险二金"],notes:"金融/经济/管理类硕士",regulator:"国资委",fortune:"世界500强",graduateYear:"2026届",degree:"硕士及以上",verified:true},
    {company:"北京控股集团有限公司",logo:"北控",companyType:"local",industry:"城市服务",recruitType:"intern",target:"bachelor",location:"beijing",job:"智慧城市运营管理实习生",welfare:["实习补贴","转正机会","导师制"],notes:"计算机/信息管理相关专业",regulator:"北京市国资委",fortune:"中国500强",graduateYear:"2027届",degree:"本科及以上",verified:true},
    {company:"上海电气集团股份有限公司",logo:"上电",companyType:"local",industry:"装备制造",recruitType:"autumn",target:"master",location:"shanghai",job:"智能制造系统集成工程师",welfare:["上海落户","人才公寓","股权激励"],notes:"自动化/机械工程/计算机",regulator:"上海市国资委",fortune:"中国500强",graduateYear:"2026届",degree:"硕士及以上",verified:true},
    {company:"深圳能源集团股份有限公司",logo:"深能",companyType:"local",industry:"清洁能源",recruitType:"spring",target:"bachelor",location:"shenzhen",job:"新能源项目开发专员",welfare:["深圳落户","项目提成","住房补贴"],notes:"能源/环境工程专业",regulator:"深圳市国资委",fortune:"中国500强",graduateYear:"2026届",degree:"本科及以上",verified:true},
    {company:"广州汽车集团股份有限公司",logo:"广汽",companyType:"local",industry:"汽车制造",recruitType:"autumn",target:"master",location:"guangzhou",job:"智能驾驶系统工程师",welfare:["广州落户","购车优惠","研发奖金"],notes:"车辆工程/计算机视觉/AI",regulator:"广州市国资委",fortune:"世界500强",graduateYear:"2026届",degree:"硕士及以上",verified:true},
    {company:"四川省投资集团有限责任公司",logo:"川投",companyType:"local",industry:"能源投资",recruitType:"makeup",target:"bachelor",location:"chengdu",job:"能源产业投资分析师",welfare:["成都落户","绩效工资","定期体检"],notes:"金融/能源经济专业",regulator:"四川省国资委",fortune:"中国500强",graduateYear:"2026届",degree:"本科及以上",verified:true},
    {company:"山东重工集团有限公司",logo:"山重",companyType:"local",industry:"装备制造",recruitType:"spring",target:"bachelor",location:"other",job:"重型机械设计工程师",welfare:["五险一金","技能培训","住房补贴"],notes:"机械工程/车辆工程",regulator:"山东省国资委",fortune:"中国500强",graduateYear:"2026届",degree:"本科及以上",verified:true},
    {company:"中国矿产资源集团有限公司",logo:"矿产",companyType:"central",industry:"矿产资源",recruitType:"autumn",target:"master",location:"other",job:"资源勘探与评估工程师",welfare:["专项津贴","野外补助","安家费"],notes:"地质/矿业工程专业",regulator:"国资委",fortune:"世界500强",graduateYear:"2026届",degree:"硕士及以上",verified:true},
    {company:"中国物流集团有限公司",logo:"中物",companyType:"central",industry:"现代物流",recruitType:"autumn",target:"bachelor",location:"shanghai",job:"智慧供应链管理专员",welfare:["上海落户","交通补贴","年终奖"],notes:"物流管理/供应链/计算机",regulator:"国资委",fortune:"中国500强",graduateYear:"2026届",degree:"本科及以上",verified:true},
    {company:"中国检验认证(集团)有限公司",logo:"中检",companyType:"central",industry:"检验认证",recruitType:"spring",target:"master",location:"guangzhou",job:"国际认证审核员",welfare:["国际出差","专业认证","住房补贴"],notes:"化学/材料/质量管理专业",regulator:"国资委",fortune:"中国500强",graduateYear:"2026届",degree:"硕士及以上",verified:true}
  ];

  // ---- 初始化 ----
  function init() {
    if (_initialized) return;
    // 深拷贝静态数据
    _jobs = JSON.parse(JSON.stringify(window.mockJobs || [])).filter(function(j){ return j != null; });
    _referrals = JSON.parse(JSON.stringify(window.mockReferrals || []));
    _resources = JSON.parse(JSON.stringify(window.mockResources || []));
    _walls = JSON.parse(JSON.stringify(window.mockWalls || []));
    _reviews = JSON.parse(JSON.stringify(window.mockReviews || []));
    _progress = JSON.parse(JSON.stringify(window.mockProgress || {}));
    _lastRefreshTime = new Date();
    _initialized = true;
  }

  // ---- 公共API ----

  /** 获取所有职位 */
  function getJobs() {
    if (!_initialized) init();
    return _jobs.filter(function(j) { return j != null; });
  }

  /** 获取内推数据 */
  function getReferrals() {
    if (!_initialized) init();
    return _referrals;
  }

  /** 获取资料包 */
  function getResources() {
    if (!_initialized) init();
    return _resources;
  }

  /** 获取公示墙 */
  function getWalls() {
    if (!_initialized) init();
    return _walls;
  }

  /** 获取评价 */
  function getReviews() {
    if (!_initialized) init();
    return _reviews;
  }

  /** 获取进度看板 */
  function getProgress() {
    if (!_initialized) init();
    return _progress;
  }

  /** 获取新增职位ID列表 */
  function getNewItemIds() {
    return _newItemIds.slice();
  }

  /** 获取新增职位数量 */
  function getNewCount() {
    return _newItemIds.length;
  }

  /** 标记所有新职位为已读 */
  function markAllSeen() {
    _newItemIds = [];
    _notifyListeners("seen");
  }

  /** 获取最后刷新时间 */
  function getLastRefreshTime() {
    return _lastRefreshTime;
  }

  /** 获取数据版本号 */
  function getVersion() {
    return _version;
  }

  /** 设置刷新间隔（毫秒）*/
  function setRefreshInterval(ms) {
    _refreshInterval = Math.max(5000, ms);
    if (_refreshTimer) {
      stopAutoRefresh();
      startAutoRefresh();
    }
  }

  /** 获取刷新间隔 */
  function getRefreshInterval() {
    return _refreshInterval;
  }

  // ---- 模拟数据刷新 ----

  /** 执行一次数据刷新（模拟API请求） */
  function refresh() {
    if (!_initialized) init();
    var changes = { newJobs: 0, statusUpdates: 0, deadlineUpdates: 0 };

    // 1. 随机更新一些职位状态（模拟流程前进）
    var statusCandidates = _jobs.filter(function(j) { return j != null; }).filter(function(j) {
      var idx = _statusFlow.indexOf(j.appStatus);
      return idx >= 0 && idx < _statusFlow.length - 1;
    });
    var statusCount = Math.min(Math.floor(Math.random() * 3) + 1, statusCandidates.length);
    for (var i = 0; i < statusCount; i++) {
      var job = statusCandidates[Math.floor(Math.random() * statusCandidates.length)];
      var curIdx = _statusFlow.indexOf(job.appStatus);
      if (curIdx >= 0 && curIdx < _statusFlow.length - 1) {
        job.appStatus = _statusFlow[curIdx + 1];
        job.updateDate = _todayStr();
        changes.statusUpdates++;
      }
    }

    // 2. 随机将一些即将到期的职位延长或缩短截止时间
    var urgent = _jobs.filter(function(j) { return j != null && j.appStatus !== "done"; });
    var dlCount = Math.min(Math.floor(Math.random() * 2), urgent.length);
    for (var j = 0; j < dlCount; j++) {
      var jb = urgent[Math.floor(Math.random() * urgent.length)];
      jb.updateDate = _todayStr();
      changes.deadlineUpdates++;
    }

    // 3. 随机添加新职位（模拟新发布的招聘公告）
    var newCount = Math.random() < 0.4 ? 0 : (Math.floor(Math.random() * 3) + 1);
    var shuffled = _newJobTemplates.sort(function() { return Math.random() - 0.5; });
    for (var k = 0; k < newCount; k++) {
      var tmpl = shuffled[k % shuffled.length];
      var newId = _jobs.length + 1;
      var locations = ["beijing","shanghai","guangzhou","shenzhen","chengdu","wuhan","other"];
      var statuses = ["none","applied","none","none"];
      var now = new Date();
      var futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 40) + 10);
      var newJob = {
        id: newId,
        company: tmpl.company,
        logo: tmpl.logo,
        companyType: tmpl.companyType,
        industry: tmpl.industry,
        recruitType: tmpl.recruitType,
        target: tmpl.target,
        location: locations[Math.floor(Math.random() * locations.length)],
        job: tmpl.job,
        appStatus: statuses[Math.floor(Math.random() * statuses.length)],
        updateDate: _todayStr(),
        deadline: futureDate.toISOString().split("T")[0],
        officialUrl: "https://" + tmpl.company.replace(/[（(].*?[）)]/g,"").replace(/集团.*/,"") + ".com",
        applyUrl: "https://" + tmpl.company.replace(/[（(].*?[）)]/g,"").replace(/集团.*/,"").replace(/有限|股份/g,"").toLowerCase().replace(/\s/g,"") + ".zhiye.com",
        announcement: tmpl.company + now.getFullYear() + "年招聘公告",
        examInfo: "行测+专业笔试+半结构化面试",
        companySize: (Math.floor(Math.random() * 19 + 1) * 10000) + "+人",
        welfare: tmpl.welfare || ["五险一金","绩效奖金"],
        notes: tmpl.notes || "",
        regulator: tmpl.regulator || "国资委",
        fortune: tmpl.fortune || "中国500强",
        graduateYear: tmpl.graduateYear || "2026届",
        degree: tmpl.degree || "本科及以上",
        verified: true,
        isNew: true
      };
      _jobs.unshift(newJob);
      _newItemIds.push(newId);
      changes.newJobs++;
    }

    _lastRefreshTime = new Date();
    _version++;
    _notifyListeners("refresh", changes);
    return changes;
  }

  // ---- 自动刷新 ----

  function startAutoRefresh() {
    stopAutoRefresh();
    _refreshTimer = setInterval(function() {
      refresh();
    }, _refreshInterval);
  }

  function stopAutoRefresh() {
    if (_refreshTimer) {
      clearInterval(_refreshTimer);
      _refreshTimer = null;
    }
  }

  // ---- 监听器 ----

  function addListener(fn) {
    if (typeof fn === "function" && _listeners.indexOf(fn) === -1) {
      _listeners.push(fn);
    }
  }

  function removeListener(fn) {
    _listeners = _listeners.filter(function(l) { return l !== fn; });
  }

  function _notifyListeners(type, data) {
    _listeners.forEach(function(fn) {
      try { fn(type, data); } catch(e) { /* ignore */ }
    });
  }

  // ---- 工具 ----

  function _todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  /** 获取统计信息 */
  function getStats() {
    if (!_initialized) init();
    var today = new Date();
    today.setHours(0,0,0,0);
    var validJobs = _jobs.filter(function(j) { return j != null; });
    var total = validJobs.length;
    var open = validJobs.filter(function(j) { return j.appStatus !== "done"; }).length;
    var urgent = validJobs.filter(function(j) {
      var d = new Date(j.deadline); d.setHours(0,0,0,0);
      var diff = Math.ceil((d - today) / 86400000);
      return diff >= 0 && diff <= 3 && j.appStatus !== "done";
    }).length;
    var progress = validJobs.filter(function(j) {
      return j.appStatus === "test" || j.appStatus === "interview" || j.appStatus === "offer";
    }).length;
    return { total: total, open: open, urgent: urgent, progress: progress, newCount: _newItemIds.length, version: _version };
  }


  /** 从外部导入岗位数据（用于API同步） */
  function importJobs(jobs) {
    if (jobs && Array.isArray(jobs) && jobs.length > 0) {
      _jobs = JSON.parse(JSON.stringify(jobs)).filter(function(j) { return j != null; });
      _lastRefreshTime = new Date();
      _version++;
      _initialized = true;
    }
  }
  // ---- 公开接口 ----
  return {
    init: init,
    getJobs: getJobs,
    getReferrals: getReferrals,
    getResources: getResources,
    getWalls: getWalls,
    getReviews: getReviews,
    getProgress: getProgress,
    getNewItemIds: getNewItemIds,
    getNewCount: getNewCount,
    markAllSeen: markAllSeen,
    importJobs: importJobs,
    getLastRefreshTime: getLastRefreshTime,
    getVersion: getVersion,
    getStats: getStats,
    setRefreshInterval: setRefreshInterval,
    getRefreshInterval: getRefreshInterval,
    refresh: refresh,
    startAutoRefresh: startAutoRefresh,
    stopAutoRefresh: stopAutoRefresh,
    addListener: addListener,
    removeListener: removeListener
  };

})();



