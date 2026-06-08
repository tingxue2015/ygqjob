// ===== YGQ - Built 2026-06-08T13:09:50.514Z =====
// Modules: 00-core.js, 10-search.js, 20-match.js, 30-jobs.js, 40-pages.js, 50-entry.js
(function(){"use strict";
window.safeStorage = (function() { try { var t='_t'; localStorage.setItem(t,'1'); localStorage.removeItem(t); } catch(e) { return { available:false, get:function(k,d){return d;}, set:function(){return false;}, remove:function(){} }; } return { available:true, get:function(k,d){try{var v=localStorage.getItem(k);return v!==null?v:d;}catch(e){return d;}}, set:function(k,v){try{localStorage.setItem(k,v);return true;}catch(e){return false;}}, remove:function(k){try{localStorage.removeItem(k);}catch(e){}} }; })();var state = {  currentPage: "home",  currentView: "table",  filters: { companyType:"all", recruitType:"all", target:"all", location:"all", deadline:"all", appStatus:"all" },  searchQuery: "", jobPage: 1, pageSize: 20, aiActive: false,  userProfile: null};var $ = function(s) { return document.querySelector(s); };var $$ = function(s) { return document.querySelectorAll(s); };var escapeHtml = (function() { var map = {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}; return function(s) { if (typeof s !== "string") return s; return s.replace(/[&<>"']/g, function(m) { return map[m]; }); }; })();var sanitizeUrl = function(u) { if (typeof u !== "string" || !u) return "#"; if (/^(https?:|mailto:|tel:|\/)/i.test(u)) return u; return "#"; };window.safeStorage = (function() { try { var t="_t"; localStorage.setItem(t,"1"); localStorage.removeItem(t); } catch(e) { return { available:false, get:function(k,d){return d;}, set:function(){return false;}, remove:function(){} }; } return { available:true, get:function(k,d){try{var v=localStorage.getItem(k);return v!==null?v:d;}catch(e){return d;}}, set:function(k,v){try{localStorage.setItem(k,v);return true;}catch(e){return false;}}, remove:function(k){try{localStorage.removeItem(k);}catch(e){}} }; })();function formatDate(d) { var dt = new Date(d); return dt.toLocaleDateString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit"}); }function daysUntil(d) { var t = new Date(d), n = new Date(); n.setHours(0,0,0,0); t.setHours(0,0,0,0); return Math.ceil((t-n)/86400000); }function dlClass(d) { if(d<0)return "expired"; if(d<=1)return "urgent"; if(d<=3)return "warning"; return ""; }function dlText(d) { if(d<0)return "已截止"; if(d===0)return "今天截止"; if(d===1)return "明天截止"; return "还剩 "+d+" 天"; }function ctLabel(t) { var m={central:"中央企业",local:"地方国企",mixed:"混合所有制"}; return m[t]||t; }function rtLabel(t) { var m={spring:"春招",autumn:"秋招",makeup:"补录",intern:"实习",senior:"高端引才"}; return m[t]||t; }function tgLabel(t) { var m={bachelor:"本科应届",master:"硕士应届",phd:"博士应届",overseas:"海外留学生",social:"社会人才"}; return m[t]||t; }function locLabel(l) { var m={beijing:"北京",shanghai:"上海",guangzhou:"广州",shenzhen:"深圳",chengdu:"成都",wuhan:"武汉",other:"其他"}; return m[l]||l; }function asLabel(s) { var m={none:"未投递",applied:"已投递",no_response:"未反馈",test:"笔试中",interview:"面试中",offer:"拟录用",done:"已结束"}; return m[s]||s; }function asBadge(s) { var m={none:"badge-gray",applied:"badge-blue",no_response:"badge-yellow",test:"badge-blue",interview:"badge-yellow",offer:"badge-green",done:"badge-gray"}; return m[s]||"badge-gray"; }function showToast(msg,type) { var c=$("#toastContainer"); if(!c)return; while(c.children.length>=3){c.firstChild.remove();} var t=document.createElement("div"); t.className="toast "+(type||""); t.textContent=msg; c.appendChild(t); setTimeout(function(){t.remove();},3000); }function debounce(fn,delay){var timer=null;return function(){var ctx=this,args=arguments;clearTimeout(timer);timer=setTimeout(function(){fn.apply(ctx,args);},delay);};}

// ===== AI-Powered Semantic Search =====function performAISearch(query) {  console.log("[AI-Search] performAISearch called, query:", query);  if (!query || !query.trim()) { console.log("[AI-Search] empty query, returning"); return; }  var trimmed = query.trim();  state.aiActive = false;  updateAIIndicator("loading");  var apiKey = "sk-72158da52cba4ababb36490d74bdcd67";  var systemPrompt = ["你是一个央国企招聘搜索意图理解助手。用户用自然语言描述求职意向，你需要解析出结构化的搜索过滤条件。","","## 输出字段（纯JSON，不包含markdown代码块）：","- companyType: 企业类型 central(央企)/local(地方国企)/mixed(混合所有制)/null","- recruitType: 招聘类型 spring(春招)/autumn(秋招)/makeup(补录)/intern(实习)/senior(高端引才)/null","- target: 招聘对象 bachelor(本科)/master(硕士)/phd(博士)/overseas(海外留学生)/social(社会人才)/null","- location: 工作地点 beijing/shanghai/guangzhou/shenzhen/chengdu/wuhan/other/null","- keywords: 搜索关键词数组(1-5个词),如[\"计算机\",\"算法\"]","- company: 指定企业(用户明确提到的企业名)/null","- industry: 行业偏好 金融/能源/军工/通信/制造/互联网/null","- salaryMin: 最低年薪期望(单位万,数字)/null","- excludeLocation: 排除的城市/null","- summary: 一句话总结用户意图的中文描述","","## 规则：","1. 排除词(不要/不去/除了XX) -> 填入excludeLocation","2. 硕士及以上 -> target=master, 本科即可 -> target=bachelor","3. 年薪XX万以上 -> 填入salaryMin","4. 明确提到公司名(如国家电网/中石油/中移动) -> 填入company","5. 春招/秋招 -> recruitType, 实习 -> intern","6. 找不到对应的字段留null,不要猜测","","## 示例输出：",'{"companyType":"central","target":"master","location":"beijing","keywords":["计算机","算法","AI"],"summary":"北京央企计算机算法岗"}','{"location":"shanghai","industry":"金融","salaryMin":30,"keywords":["金融科技","风控"],"summary":"上海金融科技岗(30万+)"}','{"company":"国家电网","keywords":["电气工程","运维"],"summary":"国家电网电气运维岗位"}'].join("\n");  fetch("https://api.deepseek.com/v1/chat/completions", {    method: "POST",    headers: {      "Content-Type": "application/json",      "Authorization": "Bearer " + apiKey    },    body: JSON.stringify({      model: "deepseek-chat",      messages: [        { role: "system", content: systemPrompt },        { role: "user", content: trimmed }      ],      temperature: 0,      max_tokens: 300    })  })  .then(function(r) {    console.log("[AI-Search] DeepSeek HTTP status:", r.status);    if (!r.ok) throw new Error("API error " + r.status);    return r.json();  })  .then(function(data) {    console.log("[AI-Search] DeepSeek response:", JSON.stringify(data).substring(0, 300));    var respContent = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";    var jsonMatch = respContent.match(/\{[\s\S]*\}/);    var parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};    console.log("[AI-Search] parsed filters:", JSON.stringify(parsed));    var validValues = {      companyType: ["central","local","mixed"],      recruitType: ["spring","autumn","makeup","intern","senior"],      target: ["bachelor","master","phd","overseas","social"],      location: ["beijing","shanghai","guangzhou","shenzhen","chengdu","wuhan","other"]    };    var filterKeys = Object.keys(validValues);    filterKeys.forEach(function(key) {      if (parsed[key] && validValues[key].indexOf(parsed[key]) !== -1) {        state.filters[key] = parsed[key];        updateFilterChipUI(key, parsed[key]);      }    });    state.aiActive = true;    if (Array.isArray(parsed.keywords) && parsed.keywords.length > 0) {      state.searchQuery = parsed.keywords.join(" ");    }    if (typeof parsed.company === "string" && parsed.company.trim()) {      state.searchQuery = parsed.company.trim() + " " + state.searchQuery;    }    if (typeof parsed.summary === "string" && parsed.summary.trim()) {      showToast("AI: " + parsed.summary, "ai-summary");    } else {      var parts = [];      if (parsed.companyType) parts.push(ctLabel(parsed.companyType));      if (parsed.target) parts.push(tgLabel(parsed.target));      if (parsed.location) parts.push(locLabel(parsed.location));      if (parsed.recruitType) parts.push(rtLabel(parsed.recruitType));      if (parts.length) showToast("AI识别: " + parts.join(" | "), "ai-summary");    }  })  .catch(function(err) {    console.error("[AI-Search] API error:", err);    state.searchQuery = trimmed;  })  .then(function() {    console.log("[AI-Search] finalizing, aiActive:", state.aiActive, "searchQuery:", state.searchQuery);    updateAIIndicator(state.aiActive ? "active" : "idle");    state.jobPage = 1;    if (state.currentView === "table") renderJobTable();    else renderJobCards();  });}function updateAIIndicator(status) {  var el = document.getElementById("aiSearchIndicator");  if (!el) { console.log("[AI-Search] aiSearchIndicator element not found"); return; }  el.className = "ai-indicator";  if (status === "loading") {    el.className = "ai-indicator loading";    el.innerHTML = '<span class="ai-spinner"></span><span>AI \u89e3\u6790\u4e2d...</span>';    el.style.display = "flex";  } else if (status === "active") {    el.className = "ai-indicator active";    el.innerHTML = '<i data-lucide="sparkles" class="ai-sparkle"></i><span>AI \u641c\u7d22</span>';    el.style.display = "flex";    if (typeof lucide !== "undefined") lucide.createIcons();  } else {    el.style.display = "none";  }}function updateFilterChipUI(filterName, value) {  var group = document.querySelector('.filter-chips[data-filter="' + filterName + '"]');  if (!group) return;  group.querySelectorAll(".chip").forEach(function(chip) {    chip.classList.toggle("active", chip.dataset.value === value);  });}function matchFilters(job) {  var f=state.filters;  if(state.searchQuery){    var text = (job.company + " " + job.job + " " + (job.industry||"") + " " + (job.notes||"") + " " + (job.location||"")).toLowerCase();    var kws = state.searchQuery.toLowerCase().split(/\s+/);    for (var i = 0; i < kws.length; i++) {      if (kws[i].length === 0) continue;      if (text.indexOf(kws[i]) === -1) {        if (kws[i] === "央企" && job.companyType === "central") continue;        if (kws[i] === "国企" && (job.companyType === "central" || job.companyType === "local")) continue;        if (kws[i] === "北京" && job.location === "beijing") continue;        if (kws[i] === "上海" && job.location === "shanghai") continue;        if (kws[i] === "广州" && job.location === "guangzhou") continue;        if (kws[i] === "深圳" && job.location === "shenzhen") continue;        if (kws[i] === "成都" && job.location === "chengdu") continue;        if (kws[i] === "武汉" && job.location === "wuhan") continue;        if (kws[i] === "硕士" && job.target === "master") continue;        if (kws[i] === "本科" && job.target === "bachelor") continue;        if (kws[i] === "博士" && job.target === "phd") continue;        return false;      }    }  }  if(f.companyType!=="all"&&job.companyType!==f.companyType)return false;  if(f.recruitType!=="all"&&job.recruitType!==f.recruitType)return false;  if(f.target!=="all"&&job.target!==f.target)return false;  if(f.location!=="all"&&job.location!==f.location)return false;  if(f.appStatus!=="all"&&job.appStatus!==f.appStatus)return false;  if(f.deadline!=="all"){ var d=daysUntil(job.deadline);    if(f.deadline==="24h"&&d>1)return false; if(f.deadline==="3d"&&d>3)return false; if(f.deadline==="7d"&&d>7)return false; if(f.deadline==="open"&&d<=7)return false; }  return true;}function renderPagination(total,totalPages,cur){  if(totalPages<=1)return "";  var h='<div class="pagination"><div class="pagination-info">显示 ' + ((cur-1)*state.pageSize+1) + '-' + Math.min(cur*state.pageSize,total) + ' / 共 ' + total + ' 条</div><div class="pagination-btns">';  h+='<button class="page-btn" data-page="'+(cur-1)+'"'+(cur<=1?' disabled':'')+'><i data-lucide="chevron-left"></i></button>';  var start=Math.max(1,cur-3); var end=Math.min(totalPages,cur+3);  if(start>1){h+='<button class="page-btn" data-page="1">1</button>'; if(start>2)h+='<span class="page-ellipsis">…</span>';}  for(var i=start;i<=end;i++)h+='<button class="page-btn'+(i===cur?' active':'')+'" data-page="'+i+'">'+i+'</button>';  if(end<totalPages){if(end<totalPages-1)h+='<span class="page-ellipsis">…</span>'; h+='<button class="page-btn" data-page="'+totalPages+'">'+totalPages+'</button>';}  h+='<button class="page-btn" data-page="'+(cur+1)+'"'+(cur>=totalPages?' disabled':'')+'><i data-lucide="chevron-right"></i></button>';  h+='</div></div>';  var jump='<div class="pagination-jump"><span>跳至</span><input type="number" class="page-jump-input" min="1" max="'+totalPages+'" value="'+cur+'" data-jump="true"><span>页</span><button class="btn btn-sm btn-primary page-jump-btn" data-jump-page="'+cur+'">GO</button></div>';  return h+jump;}

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

// ===== Match Page =====
function renderMatchPage() {
  var c = document.getElementById("matchContainer");
  if (!c) return;
  loadUserProfile();
  var profile = state.userProfile;
  var hasProfile = !!(profile && profile.education);
  var h = '<div class="match-layout">';
  // Left: Profile panel
  h += '<div class="match-profile-panel">';
  h += '<h3><i data-lucide="user-plus"></i>我的档案</h3>';
  if (hasProfile) {
    h += '<div class="match-profile-saved"><i data-lucide="check-circle" style="width:16px;height:16px"></i>已保存</div>';
  }
  h += '<div class="match-group"><label class="match-label">最高学历</label><select class="match-select" id="matchEdu"><option value="">请选择</option><option value="bachelor"' + (hasProfile && profile.education === "bachelor" ? " selected" : "") + '>本科</option><option value="master"' + (hasProfile && profile.education === "master" ? " selected" : "") + '>硕士</option><option value="phd"' + (hasProfile && profile.education === "phd" ? " selected" : "") + '>博士</option></select></div>';
  h += '<div class="match-group"><label class="match-label">毕业院校</label><select class="match-select" id="matchSchool"><option value="">请选择</option><option value="c9"' + (hasProfile && profile.school === "c9" ? " selected" : "") + '>C9院校</option><option value="985"' + (hasProfile && profile.school === "985" ? " selected" : "") + '>985院校</option><option value="211"' + (hasProfile && profile.school === "211" ? " selected" : "") + '>211院校</option><option value="other"' + (hasProfile && profile.school === "other" ? " selected" : "") + '>其他院校</option></select></div>';
  h += '<div class="match-group"><label class="match-label">所学专业</label><input type="text" class="match-input" id="matchMajor" placeholder="如：计算机科学与技术" value="' + (hasProfile && profile.major ? escapeHtml(profile.major) : "") + '" maxlength="60"><div class="match-tip">输入1-3个专业关键词提高准确度</div></div>';
  h += '<div class="match-btn-row">';
  h += '<button class="btn btn-primary" id="btnMatchStart"><i data-lucide="sparkles"></i>开始匹配</button>';
  if (hasProfile) h += '<button class="btn btn-ghost" id="btnMatchClear"><i data-lucide="trash-2"></i>清空档案</button>';
  h += '</div></div>';
  // Right: Results
  h += '<div class="match-results-panel" id="matchResults">';
  h += '<h3><i data-lucide="target"></i>匹配结果</h3>';
  if (hasProfile && profile._matchResults && profile._matchResults.length > 0) {
    profile._matchResults.forEach(function(mr, idx) {
      var job = mr.job;
      var sc = mr.score;
      var level = sc >= 75 ? "high" : (sc >= 50 ? "mid" : "low");
      h += '<div class="match-result-card' + (idx === 0 ? ' top-match' : '') + '">';
      h += '<div class="match-score-badge ' + level + '">' + sc + '%</div>';
      h += '<div class="match-result-header"><div class="company-logo">' + (job.logo || job.company.charAt(0)) + '</div><div><div class="mr-company">' + escapeHtml(job.company) + '</div><div class="mr-job">' + escapeHtml(job.job) + '</div></div></div>';
      h += '<div class="match-result-meta"><span>' + ctLabel(job.companyType) + '</span><span>' + rtLabel(job.recruitType) + '</span><span>' + tgLabel(job.target) + '</span><span>' + locLabel(job.location) + '</span></div>';
      if (mr.analysis && mr.analysis.length > 0) {
        h += '<div class="match-gap-analysis"><div class="gap-title">匹配分析</div>';
        mr.analysis.forEach(function(a) {
          h += '<div class="gap-item ' + (a.ok ? "match-yes" : "match-no") + '"><span class="gi-icon">' + (a.ok ? '\u2705' : '\u26A0') + '</span>' + a.text + '</div>';
        });
        h += '</div>';
      }
      h += '<div class="match-result-footer"><span style="font-size:12px;color:var(--gray-400)">匹配度 #' + (idx + 1) + '</span><a href="' + sanitizeUrl(job.applyUrl) + '" target="_blank" class="link-btn primary-link">投递</a></div>';
      h += '</div>';
    });
  } else {
    h += '<div class="match-empty"><i data-lucide="search"></i><p>请先填写左侧档案信息</p><p style="font-size:12px;color:var(--gray-400)">AI将基于公示墙数据为您推荐最匹配的央国企岗位</p></div>';
  }
  h += '</div></div>';
  c.innerHTML = h;
  if (typeof lucide !== "undefined") lucide.createIcons();
  // Bind events
  setTimeout(function() {
    var btnMatch = document.getElementById("btnMatchStart");
    var btnClear = document.getElementById("btnMatchClear");
    if (btnMatch) {
      btnMatch.addEventListener("click", function() {
        var edu = document.getElementById("matchEdu").value;
        var school = document.getElementById("matchSchool").value;
        var major = document.getElementById("matchMajor").value.trim();
        if (!edu) { showToast("请选择最高学历", "error"); return; }
        if (!school) { showToast("请选择毕业院校", "error"); return; }
        var profile = { education: edu, school: school, major: major };
        saveUserProfile(profile);
        var allJobs = getJobsData();
        var scored = [];
        allJobs.forEach(function(job) {
          var result = calculateMatchScore(job, profile);
          if (result) scored.push({ job: job, score: result.score, analysis: result.analysis });
        });
        scored.sort(function(a, b) { return b.score - a.score; });
        var top20 = scored.slice(0, 20);
        profile._matchResults = top20;
        saveUserProfile(profile);
        showToast("已分析 " + allJobs.length + " 个岗位", "success");
        renderMatchPage();
      });
    }
    if (btnClear) {
      btnClear.addEventListener("click", function() {
        clearUserProfile();
        showToast("档案已清空");
        renderMatchPage();
        if (state.currentPage === "home") { if (state.currentView === "table") renderJobTable(); else renderJobCards(); }
      });
    }
  }, 100);
}
function renderJobTable() {

  try { var filtered=getJobsData().filter(matchFilters); var total=filtered.length; var totalPages=Math.ceil(total/state.pageSize)||1; if(state.jobPage>totalPages)state.jobPage=totalPages; var paged=filtered.slice((state.jobPage-1)*state.pageSize, state.jobPage*state.pageSize); var w=$("#jobTableWrap"); var c=$("#resultCount"); if(c)c.innerHTML="共 <strong>"+total+"</strong> 条，第 <strong>"+state.jobPage+"</strong>/<strong>"+totalPages+"</strong> 页";

  var h='<div class="table-scroll"><table class="job-table"><thead><tr>';

  ["公司名称","公司类型","所属行业","招聘类型","招聘对象","工作地点","岗位","投递进度","更新时间","截止时间","相关链接","招聘公告","笔试/面试","公司规模","备注"].forEach(function(x){h+="<th>"+x+"</th>";});

  h+="</tr></thead><tbody>";

  paged.forEach(function(job){ var ds=daysUntil(job.deadline); var dc=dlClass(ds); var dt=dlText(ds);

    h+="<tr>";

    h+='<td class="col-company"><span class="company-logo-inline">'+job.logo+'</span><span class="cell-text">'+escapeHtml(job.company)+(job.isNew?' <span class="badge-new">NEW</span>':'')+'</span></td>';

    h+='<td class="col-type"><span class="badge badge-blue">'+ctLabel(job.companyType)+'</span></td>';

    h+='<td class="col-industry"><span class="cell-text">'+(job.industry||'--')+'</span></td><td class="col-recruit"><span class="cell-text">'+rtLabel(job.recruitType)+'</span></td><td class="col-target"><span class="cell-text">'+tgLabel(job.target)+'</span></td><td class="col-location"><span class="cell-text">'+locLabel(job.location)+'</span></td>';

    h+='<td class="col-job"><span class="cell-text"><strong>'+escapeHtml(job.job)+'</strong></span></td>';

    h+='<td class="col-status"><span class="badge '+asBadge(job.appStatus)+'">'+asLabel(job.appStatus)+'</span></td>';

    h+='<td class="col-update"><span class="cell-text">'+formatDate(job.updateDate)+'</span></td>';

    h+='<td class="col-deadline"><span class="deadline-countdown '+dc+'"><i data-lucide="clock"></i>'+dt+'</span></td>';

    h+='<td class="col-links"><a href="'+sanitizeUrl(job.officialUrl)+'" target="_blank" class="link-btn" title="官网">官网</a> <a href="'+sanitizeUrl(job.applyUrl)+'" target="_blank" class="link-btn primary-link" title="报名入口"><i data-lucide="send"></i>报名</a></td>';

    h+='<td class="col-announce"><a href="'+sanitizeUrl(job.officialUrl)+'" target="_blank" class="link-btn" title="查看招聘公告"><i data-lucide="file-text"></i>公告</a></td>';

    h+='<td class="col-exam"><span class="cell-text">'+escapeHtml(job.examInfo||'--')+'</span></td><td class="col-size"><span class="cell-text">'+escapeHtml(job.companySize||'--')+'</span></td><td class="col-notes">';

    if(job.welfare&&job.welfare.length){ var wl=Array.isArray(job.welfare)?job.welfare:job.welfare.split(",").map(function(x){return x.trim().replace(/^["']+|["']+$/g,"");}); h+='<div class="welfare-tags">'; wl.slice(0,3).forEach(function(w){h+='<span class="welfare-tag">'+escapeHtml(w)+'</span>';}); h+='</div>'; }

    if(job.notes)h+='<div class="cell-text" style="font-size:11px;color:var(--gray-500);margin-top:2px">'+escapeHtml(job.notes||'')+'</div>';

    if (hasProfile) { var ms = calculateMatchScore(job, state.userProfile); if (ms) { var ml = ms.level; h += "<td class=\"col-match\"><span class=\"match-col-badge " + ml + "\">" + ms.score + "%</span></td>"; } else { h += "<td class=\"col-match\"><span class=\"match-col-badge none\">--</span></td>"; } }

    h+="</td></tr>";

  });;

  h+="</tbody></table></div>"; h+=renderPagination(total,totalPages,state.jobPage); w.innerHTML=h; if(typeof lucide!=="undefined")lucide.createIcons();

  } catch(e) { console.error("renderJobTable error:", e); var w=$("#jobTableWrap"); if(w) w.innerHTML="<div style=\"padding:40px;text-align:center;color:#b91c1c\"><h3>表格渲染失败</h3><p>"+e.message+"</p><p>请刷新页面或联系技术支持</p></div>"; }

}

function renderJobCards() {

  try { var filtered=getJobsData().filter(matchFilters); var total=filtered.length; var totalPages=Math.ceil(total/state.pageSize)||1; if(state.jobPage>totalPages)state.jobPage=totalPages; var paged=filtered.slice((state.jobPage-1)*state.pageSize, state.jobPage*state.pageSize); var w=$("#jobTableWrap"); var c=$("#resultCount"); if(c)c.innerHTML="共 <strong>"+total+"</strong> 条，第 <strong>"+state.jobPage+"</strong>/<strong>"+totalPages+"</strong> 页";

  var h='<div class="card-grid">';

  paged.forEach(function(job){ var ds=daysUntil(job.deadline); var dc=dlClass(ds); var dt=dlText(ds);

    h+='<div class="job-card">';

    h+='<div class="job-card-header"><div class="company-logo">'+job.logo+'</div><div><div style="font-weight:600;color:var(--gray-900)">'+escapeHtml(job.company)+(job.isNew?" <span class=\"badge-new\">NEW</span>":"")+'</div><div style="font-size:12px;color:var(--gray-500)">'+escapeHtml(job.industry)+'</div></div></div>';

    h+='<div class="job-card-body">';

    h+='<div><span class="field-label">岗位</span><span class="field-value">'+escapeHtml(job.job)+'</span></div>';

    h+='<div><span class="field-label">公司类型</span><span class="field-value">'+ctLabel(job.companyType)+'</span></div>';

    h+='<div><span class="field-label">工作地点</span><span class="field-value">'+locLabel(job.location)+'</span></div>';

    h+='<div><span class="field-label">招聘类型</span><span class="field-value">'+rtLabel(job.recruitType)+'</span></div>';

    h+='<div><span class="field-label">招聘对象</span><span class="field-value">'+tgLabel(job.target)+'</span></div>';

    h+='<div><span class="field-label">投递进度</span><span class="field-value"><span class="badge '+asBadge(job.appStatus)+'">'+asLabel(job.appStatus)+'</span></span></div>';

    h+='</div>';

    if(job.welfare&&job.welfare.length){ var wl=Array.isArray(job.welfare)?job.welfare:job.welfare.split(",").map(function(x){return x.trim().replace(/^["']+|["']+$/g,"");}); h+='<div class="welfare-tags" style="margin-top:10px">'; wl.forEach(function(w){h+='<span class="welfare-tag">'+escapeHtml(w)+'</span>';}); h+='</div>'; }

    var hasCP = !!(state.userProfile && state.userProfile.education); if (hasCP) { var cms = calculateMatchScore(job, state.userProfile); if (cms) { h += "<div class=\"match-indicator " + cms.level + "\"><i data-lucide=\"target\" style=\"width:14px;height:14px\"></i>匹配度 " + cms.score + "%</div>"; } }

    h+='<div class="job-card-footer">';

    h+='<span class="deadline-countdown '+dc+'"><i data-lucide="clock"></i>'+dt+'</span>';

    h+='<div style="display:flex;gap:6px"><a href="'+sanitizeUrl(job.applyUrl)+'" target="_blank" class="link-btn primary-link">报名</a></div>';

    h+='</div></div>';

  });

  h+="</div>"; h+=renderPagination(total,totalPages,state.jobPage); w.innerHTML=h; if(typeof lucide!=="undefined")lucide.createIcons();

  } catch(e) { console.error("renderJobCards error:", e); var w=$("#jobTableWrap"); if(w) w.innerHTML="<div style=\"padding:40px;text-align:center;color:#b91c1c\"><h3>卡片渲染失败</h3><p>"+e.message+"</p><p>请刷新页面或联系技术支持</p></div>"; }

}

function renderCampusPage() {

  var g=$("#campusGrid"); if(!g)return;

  var jobs=getJobsData().filter(function(j){return j.recruitType==="spring"||j.recruitType==="autumn"||j.recruitType==="makeup"||j.recruitType==="intern";});

  var h="";

  jobs.forEach(function(job){ var ds=daysUntil(job.deadline); var dc=dlClass(ds);

    h+='<div class="campus-card">';

    h+='<div class="cc-header"><div class="company-logo">'+job.logo+'</div><div><div style="font-weight:600">'+escapeHtml(job.company)+'</div><div style="font-size:12px;color:var(--gray-500)">'+escapeHtml(job.industry)+" · "+ctLabel(job.companyType)+'</div></div></div>';

    h+='<div style="font-size:15px;font-weight:600;margin-bottom:8px">'+escapeHtml(job.job)+'</div>';

    h+='<div class="cc-degree">🎓 '+job.graduateYear+" · "+job.degree+'</div>';

    h+='<div class="cc-tags"><span class="cc-badge">'+rtLabel(job.recruitType)+'</span><span class="cc-badge">'+locLabel(job.location)+'</span><span class="cc-badge">'+tgLabel(job.target)+'</span></div>';

    h+='<div class="cc-deadline"><i data-lucide="clock"></i><span class="'+dc+'" style="font-weight:600">'+dlText(ds)+'</span></div>';

    h+='<div style="display:flex;gap:6px;margin-top:12px"><a href="'+sanitizeUrl(job.applyUrl)+'" target="_blank" class="link-btn primary-link">立即报名</a><a href="'+sanitizeUrl(job.officialUrl)+'" target="_blank" class="link-btn">官网</a></div>';

    h+="</div>";

  });

  g.innerHTML=h; if(typeof lucide!=="undefined")lucide.createIcons();

}

function renderReferralPage() {

  var g=$("#referralGrid"); if(!g)return;

  var h='<div class="card-grid">';

  DataService.getReferrals().forEach(function(ref){

    h+='<div class="referral-card">';

    h+='<div class="ref-header"><div class="ref-avatar">'+ref.referrer.charAt(0)+'</div><div><div class="ref-company">'+ref.company+'</div><div class="ref-department">'+ref.department+" · "+ref.position+'</div></div></div>';

    h+='<div class="ref-code"><span class="code-text">'+ref.code+'</span><button class="btn btn-sm btn-outline copy-btn" data-code="'+ref.code+'">复制</button></div>';

    h+='<div class="ref-footer"><span>内推人：'+ref.referrer+'</span><span>已帮助 200+ 人</span></div></div>';

  });

  h+="</div>"; g.innerHTML=h;

  g.querySelectorAll(".copy-btn").forEach(function(btn){ btn.addEventListener("click",function(){ var code=this.dataset.code; navigator.clipboard.writeText(code).then(function(){showToast("内推码 "+code+" 已复制到剪贴板","success");}).catch(function(){showToast("复制失败，请手动复制","error");}); }); });

}

function renderProgressPage() {

  var b=$("#kanbanBoard"); if(!b)return;

  var cols=[{key:"pending",title:"待处理",cls:"col-pending"},{key:"passed",title:"简历通过",cls:"col-passed"},{key:"test",title:"笔试中",cls:"col-test"},{key:"interview",title:"面试中",cls:"col-interview"},{key:"offer",title:"拟录用",cls:"col-offer"},{key:"done",title:"已结束",cls:"col-done"}];

  var h="";

  cols.forEach(function(col){ var items=DataService.getProgress()[col.key]||[];

    h+='<div class="kanban-col '+col.cls+'">';

    h+='<div class="kanban-col-header"><span class="kanban-col-title">'+col.title+'</span><span class="kanban-count">'+items.length+'</span></div>';

    h+='<div class="kanban-col-body">';

    items.forEach(function(item){ var ds=daysUntil(item.deadline); var dc=dlClass(ds);

      h+='<div class="kanban-card"><div class="kc-company">'+item.company+'</div><div class="kc-job">'+item.job+'</div>';

      h+='<div class="kc-meta"><i data-lucide="calendar"></i>'+formatDate(item.date)+'</div>';

      h+='<div class="kc-deadline '+dc+'"><i data-lucide="clock"></i>'+dlText(ds)+'</div>';

      if(item.action)h+='<div class="kc-actions"><span class="badge badge-yellow">'+item.action+'</span></div>';

      h+="</div>";

    });

    h+="</div></div>";

  });

  b.innerHTML=h; if(typeof lucide!=="undefined")lucide.createIcons();

}

function renderResourcesPage() {

  var g=$("#resourcesGrid"); if(!g)return; var h="";

  DataService.getResources().forEach(function(res){

    var icon="book-open"; if(res.cover==="c3")icon="file-text"; else if(res.cover==="c4")icon="message-square"; else if(res.cover==="c5")icon="video";

    h+='<div class="resource-card"><div class="resource-cover '+res.cover+'"><i data-lucide="'+icon+'"></i></div><div class="resource-body">';

    h+="<h4>"+res.title+"</h4><p>"+res.desc+"</p>";

    h+='<div class="resource-meta"><span class="badge badge-blue">'+res.category+'</span><span class="downloads"><i data-lucide="download"></i>'+res.downloads.toLocaleString()+'</span></div>';

    h+='<button class="btn btn-primary" style="margin-top:10px;width:100%;justify-content:center"><i data-lucide="download"></i>下载资料</button></div></div>';

  });

  g.innerHTML=h; if(typeof lucide!=="undefined")lucide.createIcons();

}

function renderResumePage() {

  var l=$("#resumeLayout"); if(!l)return;

  l.innerHTML='<div class="resume-sidebar"><div class="resume-panel"><h4>📄 我的简历</h4><div class="resume-list"><div class="resume-item"><span class="ri-name">技术类简历</span><span class="ri-date">2026-05-30</span></div><div class="resume-item"><span class="ri-name">行政管培类简历</span><span class="ri-date">2026-05-28</span></div></div><button class="btn btn-primary" style="width:100%;margin-top:12px;justify-content:center"><i data-lucide="plus"></i>新建简历</button></div><div class="resume-panel"><h4>📅 面试日历</h4><div style="font-size:13px;color:var(--gray-500)"><div style="padding:8px;margin:4px 0;background:var(--warning-light);border-radius:6px">6/5 14:00 中国航天科技 - 笔试</div><div style="padding:8px;margin:4px 0;background:var(--warning-light);border-radius:6px">6/8 09:00 中国船舶集团 - 笔试</div><div style="padding:8px;margin:4px 0;background:var(--primary-bg);border-radius:6px">6/12 10:00 中国中化集团 - 面试</div></div><button class="btn btn-ghost btn-sm" style="margin-top:8px"><i data-lucide="calendar-plus"></i>同步至手机日历</button></div></div><div class="resume-preview"><div style="text-align:center"><i data-lucide="file-text" style="width:48px;height:48px;margin-bottom:12px;color:var(--gray-300)"></i><div>选择左侧简历进行预览</div><button class="btn btn-outline" style="margin-top:16px"><i data-lucide="upload"></i>上传 PDF 简历</button></div></div>';

  if(typeof lucide!=="undefined")lucide.createIcons();

}

function renderWallPage() {

  var g=$("#wallGrid"); if(!g)return; var h="";

  DataService.getWalls().forEach(function(w){

    h+='<div class="wall-card"><div class="wall-header"><span class="wall-company">'+w.company+'</span><span class="wall-date">公示日期：'+w.date+'</span></div>';

    h+='<table class="wall-table"><tr><td>部门</td><td>'+w.dept+'</td></tr><tr><td>岗位</td><td>'+w.job+'</td></tr><tr><td>学历分布</td><td>'+w.education+'</td></tr><tr><td>毕业院校</td><td>'+w.school+'</td></tr><tr><td>录用人数</td><td><strong>'+w.count+'人</strong></td></tr></table></div>';

  });

  g.innerHTML=h;

}

function renderReviewsPage() {

  var g=$("#reviewsGrid"); if(!g)return; var h="";

  DataService.getReviews().forEach(function(r){

    var stars=""; for(var i=1;i<=5;i++)stars+='<i data-lucide="star" class="star'+(i>r.rating?" empty":"")+'"></i>';

    var tags=""; r.tags.forEach(function(t){tags+='<span class="review-tag '+t.c+'">'+t.t+"</span>";});

    h+='<div class="review-card"><div class="review-header"><span class="review-company">'+r.company+'</span><div class="review-rating">'+stars+'</div></div>';

    h+='<div class="review-body">'+r.content+'</div><div class="review-tags">'+tags+'</div>';

    h+='<div class="review-footer"><span>匿名用户</span><span>·</span><span>'+r.date+'</span></div></div>';

  });

  g.innerHTML=h; if(typeof lucide!=="undefined")lucide.createIcons();

}

function renderCalculatorPage() {

  var p=$("#calculatorPanel"); if(!p)return;

  p.innerHTML='<div class="calc-group"><label class="calc-label">目标城市</label><select class="calc-select" id="calcCity"><option value="beijing">北京</option><option value="shanghai">上海</option><option value="shenzhen">深圳</option><option value="guangzhou">广州</option></select></div><div class="calc-group"><label class="calc-label">学历</label><select class="calc-select" id="calcEdu"><option value="bachelor">本科</option><option value="master">硕士</option><option value="phd">博士</option></select></div><div class="calc-group"><label class="calc-label">毕业院校</label><select class="calc-select" id="calcSchool"><option value="c9">C9联盟</option><option value="985">985工程</option><option value="211">211工程</option><option value="other">其他</option></select></div><div class="calc-group"><label class="calc-label">目标企业类型</label><select class="calc-select" id="calcCompany"><option value="central">中央企业</option><option value="local">地方国企</option><option value="other">其他</option></select></div><button class="btn btn-primary" id="calcBtn" style="width:100%;justify-content:center;padding:14px">计算落户积分</button><div class="calc-result" id="calcResult" style="display:none"><div class="score" id="calcScore">0</div><div class="score-label">预计积分</div><div class="score-detail"><span class="sd-label">学历积分</span><span class="sd-value" id="sd-edu">0</span><span class="sd-label">院校积分</span><span class="sd-value" id="sd-school">0</span><span class="sd-label">企业积分</span><span class="sd-value" id="sd-company">0</span><span class="sd-label">基础积分</span><span class="sd-value">+20</span></div><div class="verdict" id="calcVerdict"></div></div>';

  setTimeout(function(){

    var b=$("#calcBtn"); if(!b)return;

    b.addEventListener("click",function(){

      var city=$("#calcCity").value; var edu=$("#calcEdu").value; var school=$("#calcSchool").value; var company=$("#calcCompany").value;

      var eSc={bachelor:15,master:26,phd:37}; var sSc={c9:15,"985":12,"211":8,other:3}; var cSc={central:10,local:6,other:2};

      var th={beijing:60,shanghai:72,shenzhen:50,guangzhou:50};

      var total=20+(eSc[edu]||0)+(sSc[school]||0)+(cSc[company]||0);

      var threshold=th[city]||60; var pass=total>=threshold;

      $("#calcResult").style.display="block"; $("#calcScore").textContent=total;

      $("#sd-edu").textContent=eSc[edu]||0; $("#sd-school").textContent=sSc[school]||0; $("#sd-company").textContent=cSc[company]||0;

      var v=$("#calcVerdict");

      if(pass){v.textContent="🎉 预计达到落户积分线（"+threshold+"分），建议关注目标企业公示信息";v.style.background="var(--success-light)";v.style.color="var(--success)";}

      else{v.textContent="⚠️ 预计未达到落户积分线（差 "+(threshold-total)+"分），建议提升学历或选择积分政策更宽松的城市";v.style.background="var(--warning-light)";v.style.color="var(--warning)";}

    });

  },100);

}

// ===== Page Navigation =====function navigateTo(page) {  state.currentPage = page;  $$(".page").forEach(function(p){p.classList.remove("active");});  $$(".nav-item").forEach(function(n){n.classList.remove("active");});  var pageEl = $("#page-"+page);  if(pageEl) pageEl.classList.add("active");  var navEl = document.querySelector('.nav-item[data-page="'+page+'"]');  if(navEl) navEl.classList.add("active");  // Render page content  if(page==="home"){ state.jobPage = 1; if(state.currentView==="table") renderJobTable(); else renderJobCards(); }  else if(page==="campus") renderCampusPage();  else if(page==="referral") renderReferralPage();  else if(page==="progress") renderProgressPage();  else if(page==="resources") renderResourcesPage();  else if(page==="resume") renderResumePage();  else if(page==="wall") renderWallPage();  else if(page==="reviews") renderReviewsPage();  else if(page==="calculator") renderCalculatorPage();  else if(page==="match") renderMatchPage();  // Scroll to top  document.getElementById("mainContent").scrollTop = 0;  window.scrollTo(0,0);}

/**
 * YGQ 央国企招聘平台 - 应用入口模块
 *
 * 模块加载顺序:
 *   00-core.js -> 10-search.js -> 20-match.js -> 30-jobs.js -> 40-pages.js -> 50-entry.js
 *
 * 构建: node scripts/build.js
 * 输出: js/app.js
 */

// ====================================================================
// 后台API数据同步函数
// ====================================================================
var _apiAvailable = false;

async function syncJobsFromAPI() {
  try {
    var resp = await API.getJobs({ pageSize: 2000 });
    if (resp && resp.success && resp.data && resp.data.length > 0) {
      if (typeof DataService !== "undefined" && DataService.importJobs) {
        DataService.importJobs(resp.data);
      }
      _apiAvailable = true;
      console.log("[API] 同步 " + resp.data.length + " 条岗位数据到DataService");
      updateLiveStats();
      updateLiveIndicator();
      if (state.currentPage === "home") {
        state.jobPage = 1;
        if (state.currentView === "table") renderJobTable();
        else renderJobCards();
      }
      return true;
    }
  } catch (e) {
    console.log("[API] 后端未连接，使用本地数据");
    _apiAvailable = false;
  }
  return false;
}

function getJobsData() {
  if (typeof DataService !== "undefined") {
    var data = DataService.getJobs();
    if (data && data.length > 0) return data;
  }
  return window.mockJobs || [];
}

// ====================================================================
// 应用初始化入口
// ====================================================================
function init() {
  var dataScript = document.createElement("script");
  dataScript.src = "js/data.js?v=202606081551";
  dataScript.onload = function() {
    _initCore();
  };
  dataScript.onerror = function() {
    console.error("data.js 加载失败，使用备用数据源");
    _initCore();
  };
  document.head.appendChild(dataScript);
}

// ====================================================================
// 核心初始化逻辑
// ====================================================================
function _initCore() {
  // 检查API连接并同步数据
  syncJobsFromAPI().then(function(ok) {
    if (ok) console.log("[API] 数据同步完成");
  });

  // Sidebar navigation
  $$(".nav-item").forEach(function(item) {
    item.addEventListener("click", function(e) {
      e.preventDefault();
      var page = this.dataset.page;
      navigateTo(page);
    });
  });

  // View toggle (table/cards)
  $$(".view-toggle").forEach(function(btn) {
    btn.addEventListener("click", function() {
      $$(".view-toggle").forEach(function(b) { b.classList.remove("active"); });
      this.classList.add("active");
      state.currentView = this.dataset.view;
      if (state.currentPage === "home") {
        state.jobPage = 1;
        if (state.currentView === "table") renderJobTable();
        else renderJobCards();
      }
    });
  });

  // Filter chips
  $$(".filter-chips").forEach(function(group) {
    var filterName = group.dataset.filter;
    group.querySelectorAll(".chip").forEach(function(chip) {
      chip.addEventListener("click", function() {
        group.querySelectorAll(".chip").forEach(function(c) { c.classList.remove("active"); });
        this.classList.add("active");
        state.filters[filterName] = this.dataset.value;
        if (state.currentPage === "home") {
          state.jobPage = 1;
          if (state.currentView === "table") renderJobTable();
          else renderJobCards();
        }
      });
    });
  });

  // Reset filters button
  var resetBtn = $("#resetFilters");
  if (resetBtn) {
    resetBtn.addEventListener("click", function() {
      state.filters = {
        companyType: "all", recruitType: "all", target: "all",
        location: "all", deadline: "all", appStatus: "all"
      };
      state.jobPage = 1;
      state.searchQuery = "";
      state.aiActive = false;
      updateAIIndicator("idle");
      $("#mainSearch").value = "";
      $$(".filter-chips").forEach(function(group) {
        group.querySelectorAll(".chip").forEach(function(chip, idx) {
          chip.classList.toggle("active", idx === 0);
        });
      });
      if (state.currentView === "table") renderJobTable();
      else renderJobCards();
    });
  }

  // Search input handling
  var searchInput = $("#mainSearch");
  if (searchInput) {
    // Debounced input for live search
    searchInput.addEventListener("input", debounce(function() {
      state.searchQuery = this.value.trim();
      if (state.currentPage === "home") {
        state.jobPage = 1;
        if (state.currentView === "table") renderJobTable();
        else renderJobCards();
      }
      // Show dropdown with suggestions
      var dd = $("#searchDropdown");
      if (!dd) return;
      if (state.searchQuery.length < 1) { dd.classList.remove("show"); return; }
      var q = state.searchQuery.toLowerCase();
      var matches = getJobsData().filter(function(j) {
        return (j.company + j.job).toLowerCase().indexOf(q) !== -1;
      }).slice(0, 6);
      if (matches.length === 0) { dd.classList.remove("show"); return; }
      var hh = "";
      matches.forEach(function(m) {
        hh += '<div class="search-dropdown-item" data-company="' + escapeHtml(m.company) + '">'
          + escapeHtml(m.company) + ' - <span class="match">' + escapeHtml(m.job) + '</span></div>';
      });
      dd.innerHTML = hh;
      dd.classList.add("show");
      dd.querySelectorAll(".search-dropdown-item").forEach(function(item) {
        item.addEventListener("click", function() {
          searchInput.value = this.dataset.company;
          state.searchQuery = this.dataset.company;
          dd.classList.remove("show");
          state.jobPage = 1;
          if (state.currentView === "table") renderJobTable();
          else renderJobCards();
        });
      });
    }, 300));

    // Enter key triggers AI semantic search
    searchInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        console.log("[AI-Search] Enter key pressed in search input");
        e.preventDefault();
        var dd = $("#searchDropdown");
        if (dd) dd.classList.remove("show");
        performAISearch(this.value);
      }
    });

    searchInput.addEventListener("blur", function() {
      setTimeout(function() { $("#searchDropdown").classList.remove("show"); }, 200);
    });
  }

  // Search button triggers AI semantic search
  var searchBtn = document.querySelector(".search-btn");
  if (searchBtn) {
    searchBtn.addEventListener("click", function(e) {
      console.log("[AI-Search] Search button clicked");
      e.preventDefault();
      var input = $("#mainSearch");
      if (input) performAISearch(input.value);
    });
  }

  // Hot tags
  $$(".hot-tags .tag").forEach(function(tag) {
    tag.addEventListener("click", function() {
      var val = this.textContent.trim();
      console.log("[AI-Search] Hot tag clicked:", val);
      searchInput.value = val;
      searchInput.scrollIntoView({ behavior: "smooth" });
      performAISearch(val);
    });
  });

  // Campus page tabs
  $$(".page-tabs .tab").forEach(function(tab) {
    tab.addEventListener("click", function() {
      var parent = this.parentElement;
      parent.querySelectorAll(".tab").forEach(function(t) { t.classList.remove("active"); });
      this.classList.add("active");
      var sub = this.dataset.sub;
      var g = $("#campusGrid");
      if (!g) return;
      var jobs = getJobsData().filter(function(j) {
        return j.recruitType === "spring" || j.recruitType === "autumn"
          || j.recruitType === "makeup" || j.recruitType === "intern";
      });
      if (sub === "campus") jobs = jobs.filter(function(j) { return j.recruitType !== "intern"; });
      if (sub === "intern") jobs = jobs.filter(function(j) { return j.recruitType === "intern"; });
      var h = "";
      jobs.forEach(function(job) {
        var ds = daysUntil(job.deadline);
        var dc = dlClass(ds);
        h += '<div class="campus-card">';
        h += '<div class="cc-header"><div class="company-logo">' + job.logo + '</div><div><div style="font-weight:600">'
          + escapeHtml(job.company) + '</div><div style="font-size:12px;color:var(--gray-500)">'
          + escapeHtml(job.industry) + " | " + ctLabel(job.companyType) + '</div></div></div>';
        h += '<div style="font-size:15px;font-weight:600;margin-bottom:8px">' + escapeHtml(job.job) + '</div>';
        h += '<div class="cc-degree">' + job.graduateYear + " | " + job.degree + '</div>';
        h += '<div class="cc-tags"><span class="cc-badge">' + rtLabel(job.recruitType) + '</span>'
          + '<span class="cc-badge">' + locLabel(job.location) + '</span>'
          + '<span class="cc-badge">' + tgLabel(job.target) + '</span></div>';
        h += '<div class="cc-deadline"><i data-lucide="clock"></i><span class="' + dc + '" style="font-weight:600">'
          + dlText(ds) + '</span></div>';
        h += '<div style="display:flex;gap:6px;margin-top:12px"><a href="' + sanitizeUrl(job.applyUrl)
          + '" target="_blank" class="link-btn primary-link">立即报名</a><a href="'
          + sanitizeUrl(job.officialUrl) + '" target="_blank" class="link-btn">官网</a></div></div>';
      });
      g.innerHTML = h;
      if (typeof lucide !== "undefined") lucide.createIcons();
    });
  });

  // Mobile menu button
  var menuBtn = document.createElement("button");
  menuBtn.className = "mobile-menu-btn";
  menuBtn.innerHTML = '<i data-lucide="menu"></i>';
  document.body.appendChild(menuBtn);
  menuBtn.addEventListener("click", function() {
    document.getElementById("sidebar").classList.toggle("open");
  });
  if (typeof lucide !== "undefined") lucide.createIcons();

  // Pagination event delegation
  var tableWrap = $("#jobTableWrap");
  if (tableWrap) {
    tableWrap.addEventListener("click", function(e) {
      var btn = e.target.closest(".page-btn");
      if (!btn || btn.disabled) return;
      var page = parseInt(btn.dataset.page);
      if (page >= 1) {
        state.jobPage = page;
        if (state.currentView === "table") renderJobTable();
        else renderJobCards();
      }
    });
    tableWrap.addEventListener("keydown", function(e) {
      if (e.target.classList.contains("page-jump-input") && e.key === "Enter") {
        var page = parseInt(e.target.value);
        var totalPages = Math.ceil(getJobsData().filter(matchFilters).length / state.pageSize) || 1;
        if (page >= 1 && page <= totalPages) {
          state.jobPage = page;
          if (state.currentView === "table") renderJobTable();
          else renderJobCards();
        }
      }
    });
    tableWrap.addEventListener("click", function(e) {
      var jumpBtn = e.target.closest(".page-jump-btn");
      if (!jumpBtn) return;
      var input = jumpBtn.parentElement.querySelector(".page-jump-input");
      if (!input) return;
      var page = parseInt(input.value);
      var totalPages = Math.ceil(getJobsData().filter(matchFilters).length / state.pageSize) || 1;
      if (page >= 1 && page <= totalPages) {
        state.jobPage = page;
        if (state.currentView === "table") renderJobTable();
        else renderJobCards();
      }
    });
  }

  // ---- 动态数据初始化（带错误处理） ----
  try {
    if (typeof DataService === "undefined") throw new Error("DataService模块未加载，请检查data-service.js");
    DataService.init();
    var initCheck = getJobsData();
    if (!initCheck || initCheck.length === 0) {
      console.warn("DataService初始化成功但无数据，请检查data.js是否正确加载");
    } else {
      console.log("DataService已加载 " + initCheck.length + " 条岗位数据");
    }
    DataService.startAutoRefresh();

    // 监听数据刷新事件
    DataService.addListener(function(type, changes) {
      if (type === "refresh") {
        updateLiveStats();
        updateLiveIndicator();
        if (state.currentPage === "home") {
          if (state.currentView === "table") renderJobTable();
          else renderJobCards();
        }
        if (changes && changes.newJobs > 0) {
          showToast("发现 " + changes.newJobs + " 个新招聘岗位！", "success");
          updateNewBadge();
        }
      }
    });

    // 监听"标记已读"
    DataService.addListener(function(type) {
      if (type === "seen") updateNewBadge();
    });

  } catch (e) {
    console.error("数据初始化失败:", e.message, e.stack);
    var tw = document.getElementById("jobTableWrap");
    if (tw) {
      tw.innerHTML = '<div style="padding:40px;text-align:center;color:#b91c1c"><h3>数据加载失败</h3><p>'
        + escapeHtml(e.message) + '</p><p>请检查浏览器控制台(F12)了解更多信息</p></div>';
    }
    if (window._hideLoader) window._hideLoader();
    return;
  }

  // ---- 刷新按钮 ----
  var refreshBtn = $("#btnRefresh");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", function() {
      var btn = this;
      btn.disabled = true;
      btn.classList.add("refreshing");
      DataService.refresh();
      showToast("数据刷新完成", "success");
      updateLiveStats();
      updateLiveIndicator();
      if (state.currentPage === "home") {
        if (state.currentView === "table") renderJobTable();
        else renderJobCards();
      }
      setTimeout(function() {
        btn.disabled = false;
        btn.classList.remove("refreshing");
      }, 1000);
    });
  }

  // ---- 新消息徽标清除 ----
  var newBadge = $("#newBadge");
  if (newBadge) {
    newBadge.addEventListener("click", function() {
      DataService.markAllSeen();
    });
  }

  // ---- 实时数据定时刷新（每30秒） ----
  setInterval(function() {
    if (state.currentPage === "home") {
      updateLiveIndicator();
    }
  }, 30000);

  // 初始更新
  updateLiveStats();
  updateLiveIndicator();
  updateNewBadge();

  // 加载用户档案用于匹配显示
  loadUserProfile();

  // AI Search version marker (临时调试标记，3秒后自动消失)
  console.log("[AI-Search] App initialized v2026-06-08");
  var versionMarker = document.createElement("div");
  versionMarker.id = "ai-version-marker";
  versionMarker.style.cssText = "position:fixed;bottom:4px;right:4px;background:#10b981;color:#fff;padding:2px 8px;border-radius:4px;font-size:10px;z-index:99999;font-family:monospace";
  versionMarker.textContent = "AI Search v3";
  document.body.appendChild(versionMarker);
  setTimeout(function() {
    versionMarker.style.opacity = "0";
    versionMarker.style.transition = "opacity 1s";
    setTimeout(function() {
      if (versionMarker.parentNode) versionMarker.remove();
    }, 1500);
  }, 3000);

  // 隐藏加载动画并渲染首页
  if (window._hideLoader) window._hideLoader();
  renderJobTable();
}

// ====================================================================
// 动态UI辅助函数
// ====================================================================
function updateLiveStats() {
  var stats = DataService.getStats();
  var els = {
    total: $("#statTotal"),
    open: $("#statOpen"),
    urgent: $("#statUrgent"),
    progress: $("#statProgress")
  };
  if (els.total) els.total.textContent = stats.total;
  if (els.open) els.open.textContent = stats.open;
  if (els.urgent) els.urgent.textContent = stats.urgent;
  if (els.progress) els.progress.textContent = stats.progress;
}

function updateLiveIndicator() {
  var el = $("#liveIndicator");
  if (!el) return;
  var t = DataService.getLastRefreshTime();
  if (!t) {
    el.innerHTML = '<span class="live-dot offline"></span>数据加载中...';
    return;
  }
  var now = new Date();
  var diff = Math.floor((now - t) / 1000);
  var timeStr;
  if (diff < 10) timeStr = "刚刚";
  else if (diff < 60) timeStr = diff + "秒前";
  else if (diff < 3600) timeStr = Math.floor(diff / 60) + "分钟前";
  else timeStr = Math.floor(diff / 3600) + "小时前";
  el.innerHTML = '<span class="live-dot online"></span>实时数据 - ' + timeStr + ' 更新';
}

function updateNewBadge() {
  var badge = $("#newBadge");
  if (!badge) return;
  var count = DataService.getNewCount();
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = "flex";
    badge.classList.add("pulse");
  } else {
    badge.style.display = "none";
    badge.classList.remove("pulse");
  }
}

// ====================================================================
// 加载器管理
// ====================================================================
(function() {
  var loader = document.getElementById("page-loader");
  var timeoutMsg = document.getElementById("loader-timeout-msg");
  if (loader) {
    setTimeout(function() {
      if (loader.style.display !== "none" && timeoutMsg) {
        timeoutMsg.style.display = "block";
      }
    }, 12000);
    window._hideLoader = function() {
      if (loader) { loader.style.display = "none"; }
    };
  }
})();

// ====================================================================
// 应用启动
// ====================================================================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// ====================================================================
// 全局错误处理
// ====================================================================
window.showToast = showToast;

window.onerror = function(msg, url, line, col, err) {
  console.error("[GlobalError]", msg, "at", url, ":", line, ":", col);
  var tw = document.getElementById("jobTableWrap");
  if (tw && !tw.innerHTML.trim()) {
    tw.innerHTML = '<div style="padding:40px;text-align:center;color:#b91c1c"><h3>页面出现了意外错误</h3><p>'
      + (err ? err.message : msg) + '</p><p>请刷新页面后重试</p>'
      + '<button class="btn btn-primary" onclick="location.reload()" style="margin-top:16px">刷新页面</button></div>';
  }
  return false;
};

// ====================================================================
// 内存清理（页面卸载时）
// ====================================================================
window.addEventListener("beforeunload", function() {
  if (typeof DataService !== "undefined") {
    DataService.stopAutoRefresh();
  }
  var highestId = setTimeout(function() {}, 0);
  for (var i = 0; i <= highestId; i++) {
    clearTimeout(i);
    clearInterval(i);
  }
});
})();
