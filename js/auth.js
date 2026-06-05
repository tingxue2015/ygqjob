// ===== 央国企招聘平台 - 认证模块 =====
(function(){
var ss = window.safeStorage || { get:function(k,d){return localStorage.getItem(k)||d;}, set:function(k,v){try{localStorage.setItem(k,v);return true;}catch(e){return false;}}, remove:function(k){try{localStorage.removeItem(k);}catch(e){}} };
"use strict";

// ===== Auth State =====
var currentUser = null;

async function loadUser() {
  try {
    // 优先尝试从API恢复会话
    if (typeof API !== "undefined" && API.isLoggedIn && API.isLoggedIn()) {
      try {
        var apiUser = await API.getMe();
        if (apiUser && apiUser.success && apiUser.user) {
          currentUser = { account: apiUser.user.username, phone: apiUser.user.phone || "" };
          saveUser();
          return;
        }
      } catch(e) { API.logout(); }
    }
    // 降级：本地存储恢复
    var saved = ss.get("soe_user");
    if (saved) { currentUser = JSON.parse(saved); }
    var remember = ss.get("soe_remember");
    if (remember === "true" && !currentUser) {
      var remAcc = ss.get("soe_remembered_account");
      if (remAcc) {
        var users = JSON.parse(ss.get("soe_users") || "{}");
        currentUser = users[remAcc] || null;
      }
    }
  } catch(e) { currentUser = null; }
}

function saveUser() {
  if (currentUser) {
    ss.set("soe_user", JSON.stringify(currentUser));
  } else {
    ss.remove("soe_user");
  }
}

async function hashPassword(password) {
  try {
    var encoder = new TextEncoder();
    var data = encoder.encode("soe_salt_v2::" + password);
    var hashBuffer = await crypto.subtle.digest("SHA-256", data);
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function(b) { return b.toString(16).padStart(2, "0"); }).join("");
  } catch(e) {
    console.error("密码哈希失败:", e);
    return null;
  }
}
function updateAuthUI() {
  var btnLogin = document.getElementById("btnLogin");
  var userInfo = document.getElementById("userInfo");
  var userAvatar = document.getElementById("userAvatar");
  var userNameDisplay = document.getElementById("userNameDisplay");
  var userPhoneDisplay = document.getElementById("userPhoneDisplay");

  if (currentUser) {
    if (btnLogin) btnLogin.style.display = "none";
    if (userInfo) userInfo.style.display = "block";
    if (userAvatar) userAvatar.textContent = (currentUser.account || currentUser.phone).charAt(0).toUpperCase();
    if (userNameDisplay) userNameDisplay.textContent = currentUser.account || currentUser.phone;
    if (userPhoneDisplay) userPhoneDisplay.textContent = currentUser.phone ? currentUser.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2") : "";
  } else {
    if (btnLogin) btnLogin.style.display = "flex";
    if (userInfo) userInfo.style.display = "none";
  }
}

// ===== Modal Management =====
function openModal(id) {
  document.getElementById("modalOverlay").classList.add("show");
  var modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("show");
  modal.querySelectorAll(".form-error").forEach(function(el){ el.textContent = ""; });
  modal.querySelectorAll(".form-input").forEach(function(el){ el.classList.remove("error"); });
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function closeModal(id) {
  document.getElementById("modalOverlay").classList.remove("show");
  var modal = document.getElementById(id);
  if (modal) modal.classList.remove("show");
}

function closeAllModals() {
  document.getElementById("modalOverlay").classList.remove("show");
  document.querySelectorAll(".modal.show").forEach(function(m){ m.classList.remove("show"); });
}

// ===== Validation =====
function showFieldError(id, msg) {
  var el = document.getElementById(id + "Error");
  if (el) el.textContent = msg;
  var input = document.getElementById(id);
  if (input) { if (msg) input.classList.add("error"); else input.classList.remove("error"); }
}

function clearAllErrors(prefix) {
  ["Phone","SmsCode","Account","Password","Password2","Account","Password","Agree"].forEach(function(suffix){
    showFieldError(prefix + suffix, "");
  });
}

function validatePhone(phone) {
  if (!phone) return "请输入手机号";
  if (!/^1[3-9]\d{9}$/.test(phone)) return "请输入正确的手机号";
  return "";
}

function validateSmsCode(code) {
  if (!code) return "请输入验证码";
  if (!/^\d{6}$/.test(code)) return "请输入6位数字验证码";
  return "";
}

function validateAccount(account) {
  if (!account) return "请设置账号";
  if (account.length < 6) return "账号至少6位";
  if (!/^[a-zA-Z0-9_]+$/.test(account)) return "账号只能包含字母、数字和下划线";
  return "";
}

function validatePassword(pw) {
  if (!pw) return "请设置密码";
  if (pw.length < 6) return "密码至少6位";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return "密码需包含字母和数字";
  return "";
}

// ===== SMS Verification =====
var smsTimer = null;
var smsCountdown = 0;
var currentSmsCode = null;

function startSmsCountdown(btn) {
  smsCountdown = 60;
  btn.disabled = true;
  btn.classList.add("counting");
  updateSmsButton(btn);

  smsTimer = setInterval(function(){
    smsCountdown--;
    updateSmsButton(btn);
    if (smsCountdown <= 0) {
      clearInterval(smsTimer);
      smsTimer = null;
      btn.disabled = false;
      btn.classList.remove("counting");
      btn.textContent = "重新获取";
    }
  }, 1000);
}

function updateSmsButton(btn) {
  if (smsCountdown > 0) {
    btn.textContent = smsCountdown + "s 后重发";
  }
}

function generateSmsCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ===== Login =====
async function handleLogin() {
  clearAllErrors("login");
  var account = document.getElementById("loginAccount").value.trim();
  var password = document.getElementById("loginPassword").value;
  var remember = document.getElementById("rememberMe").checked;
  var valid = true;

  if (!account) { showFieldError("loginAccount", "请输入手机号或账号"); valid = false; }
  if (!password) { showFieldError("loginPassword", "请输入密码"); valid = false; }
  if (!valid) return;

  // 优先尝试后端API登录
  var apiOk = false;
  try {
    if (typeof API !== "undefined" && API.login) {
      var apiResp = await API.login(account, password);
      if (apiResp && apiResp.success) {
        currentUser = { account: apiResp.user.username, phone: apiResp.user.phone || "" };
        apiOk = true;
      }
    }
  } catch(e) { console.log("[Auth] API登录失败，降级到本地"); }

  if (apiOk) {
    saveUser();
    if (remember) { ss.set("soe_remember", "true"); ss.set("soe_remembered_account", account); }
    else { ss.remove("soe_remember"); ss.remove("soe_remembered_account"); }
    closeAllModals(); updateAuthUI();
    window.showToast("登录成功！", "success"); return;
  }

  // 降级：本地存储登录
  // Check users storage
  var users = {};
  try { users = JSON.parse(ss.get("soe_users") || "{}"); } catch(e) {}
  var hashedInput = await hashPassword(password);
  if (!hashedInput) { showFieldError("loginPassword", "系统错误，请稍后再试"); return; }
  var foundKey = null;
  var foundUser = null;
  Object.keys(users).forEach(function(key){
    var u = users[key];
    if (u.account === account || u.phone === account) {
      if ((u.passwordHash && u.passwordHash === hashedInput) || (!u.passwordHash && u.password === password)) {
        foundKey = key; foundUser = u;
        if (!u.passwordHash) { u.passwordHash = hashedInput; u.password = null; try { ss.set("soe_users", JSON.stringify(users)); } catch(e) {} }
      }
    }
  });
  if (!foundUser) { showFieldError("loginPassword", "账号或密码错误"); return; }
  currentUser = { account: foundUser.account, phone: foundUser.phone };
  saveUser();
  if (remember) { ss.set("soe_remember", "true"); ss.set("soe_remembered_account", foundKey); }
  else { ss.remove("soe_remember"); ss.remove("soe_remembered_account"); }
  closeAllModals(); updateAuthUI();
  window.showToast("登录成功，欢迎回来！", "success");
}

// ===== Register =====
async function handleRegister() {
  clearAllErrors("reg");
  var phone = document.getElementById("regPhone").value.trim();
  var smsCode = document.getElementById("regSmsCode").value.trim();
  var account = document.getElementById("regAccount").value.trim();
  var password = document.getElementById("regPassword").value;
  var password2 = document.getElementById("regPassword2").value;
  var agreeTerms = document.getElementById("agreeTerms").checked;
  var valid = true;

  var err = validatePhone(phone); if (err) { showFieldError("regPhone", err); valid = false; }
  if (!currentSmsCode) { showFieldError("regSmsCode", "请先获取验证码"); valid = false; }
  else { err = validateSmsCode(smsCode); if (err) { showFieldError("regSmsCode", err); valid = false; } }
  if (smsCode !== currentSmsCode) { showFieldError("regSmsCode", "验证码错误"); valid = false; }
  err = validateAccount(account); if (err) { showFieldError("regAccount", err); valid = false; }
  err = validatePassword(password); if (err) { showFieldError("regPassword", err); valid = false; }
  if (password !== password2) { showFieldError("regPassword2", "两次输入的密码不一致"); valid = false; }
  if (!agreeTerms) { showFieldError("agree", "请阅读并同意用户协议和隐私政策"); valid = false; }

  if (!valid) return;

  // 优先尝试后端API注册
  var apiOk = false;
  try {
    if (typeof API !== "undefined" && API.register) {
      var apiResp = await API.register(account, password, phone);
      if (apiResp && apiResp.success) { apiOk = true; }
    }
  } catch(e) { console.log("[Auth] API注册失败，降级到本地"); }

  // 降级：本地存储注册
  if (!apiOk) {
  // Check if user already exists
  var users = {};
  try { users = JSON.parse(ss.get("soe_users") || "{}"); } catch(e) {}
  var existsKey = null;
  Object.keys(users).forEach(function(key){
    var u = users[key];
    if (u.account === account) existsKey = account;
    if (u.phone === phone) existsKey = phone;
  });
  if (existsKey) {
    showFieldError("regPhone", "该手机号或账号已被注册");
    return;
  }

  // Hash password before storing
  var hashedPw = await hashPassword(password);
  if (!hashedPw) { showFieldError("regPassword", "系统错误，请稍后再试"); return; }

  // Save user with hashed password
  var userKey = account;
  users[userKey] = { account: account, phone: phone, passwordHash: hashedPw, password: null, registeredAt: new Date().toISOString() };
  try { ss.set("soe_users", JSON.stringify(users)); } 
  catch(e) { 
    if (e.name === "QuotaExceededError") { showFieldError("regPhone", "浏览器存储空间不足"); return; }
    throw e;
  }
  } // end if (!apiOk)

  // Auto login
  currentUser = { account: account, phone: phone };
  saveUser();
  ss.remove("soe_remember");
  ss.remove("soe_remembered_account");
  currentSmsCode = null;

  closeAllModals();
  updateAuthUI();
  window.showToast("注册成功！已自动登录", "success");
}

// ===== Logout =====
function handleLogout() {
  if (typeof API !== "undefined" && API.logout) { API.logout(); }
  currentUser = null;
  saveUser();
  ss.remove("soe_remember");
  ss.remove("soe_remembered_account");
  document.getElementById("userDropdown").classList.remove("show");
  updateAuthUI();
  window.showToast("已退出登录", "");
}

// ===== Password Toggle =====
function togglePassword(btn) {
  var targetId = btn.dataset.target;
  var input = document.getElementById(targetId);
  if (!input) return;
  var icon = btn.querySelector("i");
  if (input.type === "password") {
    input.type = "text";
    if (icon) icon.setAttribute("data-lucide", "eye");
  } else {
    input.type = "password";
    if (icon) icon.setAttribute("data-lucide", "eye-off");
  }
  if (typeof lucide !== "undefined") lucide.createIcons({ icons: { "eye": icon, "eye-off": icon } });
}

// ===== Init Auth =====
function initAuth() {
  loadUser().then(function() { updateAuthUI(); }).catch(function() { updateAuthUI(); });

  // Login button click
  var btnLogin = document.getElementById("btnLogin");
  if (btnLogin) {
    btnLogin.addEventListener("click", function(){ openModal("loginModal"); });
  }

  // User avatar click -> toggle dropdown
  var userAvatar = document.getElementById("userAvatar");
  if (userAvatar) {
    userAvatar.addEventListener("click", function(e){
      e.stopPropagation();
      document.getElementById("userDropdown").classList.toggle("show");
    });
  }

  // Close dropdown on outside click
  document.addEventListener("click", function(){
    var dd = document.getElementById("userDropdown");
    if (dd) dd.classList.remove("show");
  });

  // Modal close buttons
  document.querySelectorAll(".modal-close").forEach(function(btn){
    btn.addEventListener("click", function(){
      closeModal(this.dataset.close);
    });
  });

  // Overlay click to close
  document.getElementById("modalOverlay").addEventListener("click", function(){
    closeAllModals();
  });

  // Prevent modal clicks from bubbling to overlay
  document.getElementById("loginModal").addEventListener("click", function(e){ e.stopPropagation(); });
  document.getElementById("registerModal").addEventListener("click", function(e){ e.stopPropagation(); });

  // Switch between login/register
  document.getElementById("switchToRegister").addEventListener("click", function(e){
    e.preventDefault();
    closeModal("loginModal");
    openModal("registerModal");
  });
  document.getElementById("switchToLogin").addEventListener("click", function(e){
    e.preventDefault();
    closeModal("registerModal");
    openModal("loginModal");
  });

  // Password toggles
  document.querySelectorAll(".password-toggle").forEach(function(btn){
    btn.addEventListener("click", function(){ togglePassword(this); });
  });

  // SMS send button
  var btnSendSms = document.getElementById("btnSendSms");
  if (btnSendSms) {
    btnSendSms.addEventListener("click", function(){
      var phone = document.getElementById("regPhone").value.trim();
      var err = validatePhone(phone);
      showFieldError("regPhone", err);
      if (err) return;

      currentSmsCode = generateSmsCode();
      startSmsCountdown(this);
      window.showToast("验证码已发送至 " + phone + "（演示模式：" + currentSmsCode + "）", "success");
    });
  }

  // Login submit
  document.getElementById("btnLoginSubmit").addEventListener("click", handleLogin);
  document.getElementById("loginPassword").addEventListener("keydown", function(e){
    if (e.key === "Enter") handleLogin();
  });

  // Register submit
  document.getElementById("btnRegisterSubmit").addEventListener("click", handleRegister);

  // Logout
  document.getElementById("btnLogout").addEventListener("click", handleLogout);

  // Dropdown items
  document.getElementById("btnMyApps").addEventListener("click", function(e){
    e.preventDefault();
    document.getElementById("userDropdown").classList.remove("show");
    document.querySelector('.nav-item[data-page="progress"]').click();
  });
  document.getElementById("btnSettings").addEventListener("click", function(e){
    e.preventDefault();
    document.getElementById("userDropdown").classList.remove("show");
    window.showToast("账号设置功能开发中", "");
  });
  document.getElementById("btnMyFavs").addEventListener("click", function(e){
    e.preventDefault();
    document.getElementById("userDropdown").classList.remove("show");
    window.showToast("收藏功能开发中", "");
  });
}

// Start auth
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuth);
} else {
  initAuth();
}

})();




