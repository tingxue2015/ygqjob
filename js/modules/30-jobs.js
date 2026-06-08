/**
 * YGQ ??????? - ??????
 * 
 * ?????:
 *   00-core ? 10-search ? 20-match ? 30-jobs ? 40-pages ? 50-entry
 * 
 * ??: node scripts/build.js
 * ????: js/app.js
 */
// ===== ??????????????????? =====
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

  try {
  var hasProfile = !!(state.userProfile && state.userProfile.education); var filtered=getJobsData().filter(matchFilters); var total=filtered.length; var totalPages=Math.ceil(total/state.pageSize)||1; if(state.jobPage>totalPages)state.jobPage=totalPages; var paged=filtered.slice((state.jobPage-1)*state.pageSize, state.jobPage*state.pageSize); var w=$("#jobTableWrap"); var c=$("#resultCount"); if(c)c.innerHTML="共 <strong>"+total+"</strong> 条，第 <strong>"+state.jobPage+"</strong>/<strong>"+totalPages+"</strong> 页";

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
