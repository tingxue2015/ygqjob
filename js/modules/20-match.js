/**
 * YGQ ??????? - ??????
 * 
 * ?????:
 *   00-core ? 10-search ? 20-match ? 30-jobs ? 40-pages ? 50-entry
 * 
 * ??: node scripts/build.js
 * ????: js/app.js
 */
// ===== AI?????????/?????????? =====
// ===== AI Job Matching Engine =====
var SCHOOL_985_LIST = ["清华大学","北京大学","浙江大学","上海交通大学","复旦大学","南京大学","中国科学技术大学","哈尔滨工业大学","西安交通大学","中国人民大学","北京航空航天大学","北京理工大学","中国农业大学","北京师范大学","南开大学","天津大学","大连理工大学","东北大学","吉林大学","同济大学","华东师范大学","东南大学","厦门大学","山东大学","武汉大学","华中科技大学","中南大学","中山大学","华南理工大学","四川大学","重庆大学","电子科技大学","西北工业大学"];
var SCHOOL_211_LIST = ["清华大学","北京大学","浙江大学","上海交通大学","复旦大学","南京大学","中国科学技术大学","哈尔滨工业大学","西安交通大学","北京交通大学","北京工业大学","北京科技大学","北京化工大学","北京邮电大学","北京林业大学","北京中医药大学","北京外国语大学","中国传媒大学","中央财经大学","对外经济贸易大学","中国政法大学","华北电力大学","东北师范大学","东北林业大学","华东理工大学","东华大学","上海外国语大学","上海财经大学","上海大学","南京航空航天大学","南京理工大学","中国矿业大学","河海大学","江南大学","南京农业大学","中国药科大学","南京师范大学","苏州大学"];
var SCHOOL_C9_LIST = ["清华大学","北京大学","浙江大学","上海交通大学","复旦大学","南京大学","中国科学技术大学","哈尔滨工业大学","西安交通大学"];
function getSchoolTier(schoolName) {
  if (!schoolName) return "other";
  for (var i = 0; i < SCHOOL_C9_LIST.length; i++) { if (schoolName.indexOf(SCHOOL_C9_LIST[i]) !== -1) return "c9"; }
  for (var i = 0; i < SCHOOL_985_LIST.length; i++) { if (schoolName.indexOf(SCHOOL_985_LIST[i]) !== -1) return "985"; }
  for (var i = 0; i < SCHOOL_211_LIST.length; i++) { if (schoolName.indexOf(SCHOOL_211_LIST[i]) !== -1) return "211"; }
  return "other";
}
function parseWallEduPattern(eduStr) {
  if (!eduStr) return "any";
  var s = eduStr.toLowerCase();
  if (s.indexOf("博士") !== -1 && s.indexOf("硕士") === -1 && s.indexOf("本科") === -1) return "phd";
  if (s.indexOf("博士") !== -1) return "phd_preferred";
  if (s.indexOf("硕士") !== -1 && s.indexOf("博士") === -1) return "master";
  if (s.indexOf("硕士") !== -1) return "master_preferred";
  if (s.indexOf("本科") !== -1) return "bachelor";
  return "any";
}
function getWallDataForCompany(companyName) {
  if (typeof DataService === "undefined") return [];
  var walls = DataService.getWalls();
  if (!walls || !walls.length) return [];
  return walls.filter(function(w) { return w.company === companyName; });
}
function calculateMatchScore(job, profile) {
  if (!profile) return null;
  var score = 0;
  var analysis = [];
  var walls = getWallDataForCompany(job.company);

  // 1. Target match (25 pts)
  var eduOrder = { bachelor: 1, master: 2, phd: 3 };
  var jobEdu = job.target;
  var userEdu = profile.education;
  if (jobEdu === userEdu) { score += 25; analysis.push({ text: "学历要求完全匹配", ok: true }); }
  else if (jobEdu === "social") { score += 18; analysis.push({ text: "社会招聘学历要求宽松", ok: true }); }
  else if (jobEdu === "overseas") { score += 10; analysis.push({ text: "仅限海外留学生，学历匹配度有限", ok: false }); }
  else if (eduOrder[jobEdu] && eduOrder[userEdu] && eduOrder[userEdu] >= eduOrder[jobEdu]) { score += 20; analysis.push({ text: "学历高于岗位要求", ok: true }); }
  else { score += 8; analysis.push({ text: "学历低于岗位要求", ok: false }); }
  // 2. Wall education pattern match (25 pts)
  if (walls.length > 0) {
    var totalWallCount = 0, eduScore = 0;
    walls.forEach(function(w) {
      var cnt = parseInt(w.count) || 1;
      totalWallCount += cnt;
      var pattern = parseWallEduPattern(w.education);
      if (pattern === userEdu) { eduScore += cnt * 25; }
      else if (pattern === userEdu + "_preferred") { eduScore += cnt * 20; }
      else if (pattern === "phd_preferred" && userEdu === "phd") { eduScore += cnt * 22; }
      else if (pattern === "master_preferred" && userEdu === "master") { eduScore += cnt * 22; }
      else if (pattern === "phd" && userEdu === "phd") { eduScore += cnt * 25; }
      else if (pattern === "master" && userEdu === "master") { eduScore += cnt * 25; }
      else if (pattern === "bachelor" && userEdu === "bachelor") { eduScore += cnt * 25; }
      else if (pattern === "any") { eduScore += cnt * 15; }
      else { eduScore += cnt * 5; }
    });
    var wallEduScore = totalWallCount > 0 ? Math.round(eduScore / totalWallCount) : 0;
    score += wallEduScore;
    if (wallEduScore >= 20) analysis.push({ text: "公示墙学历背景高度匹配", ok: true });
    else if (wallEduScore >= 10) analysis.push({ text: "公示墙学历背景基本匹配", ok: true });
    else analysis.push({ text: "公示墙学历匹配度较低", ok: false });
  } else {
    score += 12;
    analysis.push({ text: "暂无公示墙数据可供参考", ok: true });
  }
  // 3. School match from wall data (20 pts)
  if (walls.length > 0) {
    var totalSchoolCount = 0, schoolScore = 0;
    walls.forEach(function(w) {
      var cnt = parseInt(w.count) || 1;
      totalSchoolCount += cnt;
      var schools = (w.school || "").split(/[\/,，]/);
      var bestTier = "other";
      schools.forEach(function(s) { var t = getSchoolTier(s.trim()); if (t === "c9" || (t === "985" && bestTier !== "c9") || (t === "211" && bestTier === "other")) bestTier = t; });
      var tierOrder = { c9: 3, "985": 2, "211": 1, other: 0 };
      var userTierVal = tierOrder[profile.school] || 0;
      var wallTierVal = tierOrder[bestTier] || 0;
      if (userTierVal >= wallTierVal) { schoolScore += cnt * 20; }
      else if (userTierVal + 1 >= wallTierVal) { schoolScore += cnt * 12; }
      else { schoolScore += cnt * 4; }
    });
    var wallSchoolScore = totalSchoolCount > 0 ? Math.round(schoolScore / totalSchoolCount) : 0;
    score += wallSchoolScore;
    if (wallSchoolScore >= 18) analysis.push({ text: "公示墙院校层次高度匹配", ok: true });
    else if (wallSchoolScore >= 10) analysis.push({ text: "公示墙院校层次基本匹配", ok: true });
    else analysis.push({ text: "公示墙院校层次有差距", ok: false });
  } else {
    score += 10;
  }
  // 4. Major match (20 pts)
  if (profile.major && profile.major.trim()) {
    var majorKws = profile.major.toLowerCase().split(/[\s,，]+/);
    var jobText = (job.job + " " + (job.industry || "") + " " + (job.notes || "")).toLowerCase();
    var matchCount = 0;
    majorKws.forEach(function(kw) { if (kw && jobText.indexOf(kw) !== -1) matchCount++; });
    var majorRatio = majorKws.length > 0 ? matchCount / majorKws.length : 0;
    var majorScore = Math.round(majorRatio * 20);
    score += majorScore;
    if (majorRatio >= 0.5) analysis.push({ text: "专业高度相关", ok: true });
    else if (majorRatio > 0) analysis.push({ text: "专业部分相关", ok: true });
    else analysis.push({ text: "专业与岗位匹配度较低", ok: false });
  } else {
    score += 10;
    analysis.push({ text: "未填写专业信息", ok: true });
  }
  // 5. Company type bonus (10 pts)
  if (job.companyType === "central") { score += 8; }
  else if (job.companyType === "local") { score += 6; }
  else { score += 4; }
  score = Math.min(100, Math.max(0, Math.round(score)));
  var level = score >= 75 ? "high" : (score >= 50 ? "mid" : "low");
  return { score: score, level: level, analysis: analysis };
}
function loadUserProfile() {
  try {
    var raw = window.safeStorage.get("ygq_user_profile", null);
    if (raw) { state.userProfile = JSON.parse(raw); return state.userProfile; }
  } catch(e) { console.log("[Match] Failed to load user profile:", e); }
  return null;
}
function saveUserProfile(profile) {
  state.userProfile = profile;
  window.safeStorage.set("ygq_user_profile", JSON.stringify(profile));
}
function clearUserProfile() {
  state.userProfile = null;
  window.safeStorage.remove("ygq_user_profile");
}
