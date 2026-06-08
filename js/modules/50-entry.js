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
