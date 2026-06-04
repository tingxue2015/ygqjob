// ===== 央国企招聘平台 - API客户端 =====
// 封装所有后端API调用，支持本地数据降级

const API = (function() {
  "use strict";

  // 自动检测API地址：同域部署时用相对路径
  var BASE_URL = (function() {
    if (window.location.hostname && window.location.hostname !== "") {
      return window.location.origin + "/api";
    }
    return "http://localhost:3000/api";
  })();

  var _token = localStorage.getItem("ygqjob_token") || null;
  var _online = false;

  // ============ 内部方法 ============
  function setToken(t) {
    _token = t;
    if (t) localStorage.setItem("ygqjob_token", t);
    else localStorage.removeItem("ygqjob_token");
  }

  function headers() {
    var h = { "Content-Type": "application/json" };
    if (_token) h["Authorization"] = "Bearer " + _token;
    return h;
  }

  async function request(method, path, body) {
    var opts = { method: method, headers: headers() };
    if (body) opts.body = JSON.stringify(body);
    try {
      var resp = await fetch(BASE_URL + path, opts);
      var data = await resp.json();
      if (!resp.ok) {
        if (resp.status === 401) { setToken(null); }
        throw new Error(data.error || "请求失败");
      }
      _online = true;
      return data;
    } catch (err) {
      _online = false;
      throw err;
    }
  }

  function get(path) { return request("GET", path); }
  function post(path, body) { return request("POST", path, body); }

  // ============ 认证 ============
  async function login(username, password) {
    var data = await post("/auth/login", { username: username, password: password });
    setToken(data.token);
    return data;
  }

  async function register(username, password, phone) {
    var data = await post("/auth/register", { username: username, password: password, phone: phone });
    setToken(data.token);
    return data;
  }

  async function getMe() {
    return await get("/auth/me");
  }

  function logout() {
    setToken(null);
  }

  function isLoggedIn() {
    return !!_token;
  }

  function getToken() {
    return _token;
  }

  // ============ 岗位 ============
  async function getJobs(params) {
    var qs = [];
    if (params) {
      for (var k in params) {
        if (params.hasOwnProperty(k) && params[k] !== null && params[k] !== undefined && params[k] !== "") {
          qs.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
        }
      }
    }
    var path = "/jobs" + (qs.length ? "?" + qs.join("&") : "");
    var data = await get(path);
    return data;
  }

  async function getJobById(id) {
    var data = await get("/jobs/" + id);
    return data;
  }

  async function getStats() {
    var data = await get("/jobs/stats/summary");
    return data;
  }

  // ============ 连接检测 ============
  async function checkConnection() {
    try {
      await get("/jobs/stats/summary");
      _online = true;
    } catch (_) {
      _online = false;
    }
    return _online;
  }

  function isOnline() {
    return _online;
  }

  function getBaseUrl() {
    return BASE_URL;
  }

  function setBaseUrl(url) {
    BASE_URL = url;
  }

  // ============ 公开接口 ============
  return {
    // 认证
    login: login,
    register: register,
    getMe: getMe,
    logout: logout,
    isLoggedIn: isLoggedIn,
    getToken: getToken,
    setToken: setToken,

    // 岗位
    getJobs: getJobs,
    getJobById: getJobById,
    getStats: getStats,

    // 工具
    checkConnection: checkConnection,
    isOnline: isOnline,
    getBaseUrl: getBaseUrl,
    setBaseUrl: setBaseUrl
  };
})();
