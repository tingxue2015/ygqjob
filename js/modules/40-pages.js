/**
 * YGQ ģ�黯�ܹ� - ģ���嵥
 * 
 * ������:
 *   00-core �� 10-search �� 20-match �� 30-jobs �� 40-pages �� 50-entry
 * 
 * ����: node scripts/build.js
 * ���: js/app.js
 */
// ===== ҳ�浼��/·��/��ʼ��/ê�� =====
// ===== Page Navigation =====
function navigateTo(page) {
  state.currentPage = page;
  $$(".page").forEach(function(p){p.classList.remove("active");});
  $$(".nav-item").forEach(function(n){n.classList.remove("active");});
  var pageEl = $("#page-"+page);
  if(pageEl) pageEl.classList.add("active");
  var navEl = document.querySelector('.nav-item[data-page="'+page+'"]');
  if(navEl) navEl.classList.add("active");
  // Render page content
  if(page==="home"){
    state.jobPage = 1;
    if(state.currentView==="table") renderJobTable();
    else renderJobCards();
  }
  else if(page==="campus") renderCampusPage();
  else if(page==="referral") renderReferralPage();
  else if(page==="progress") renderProgressPage();
  else if(page==="resources") renderResourcesPage();
  else if(page==="resume") renderResumePage();
  else if(page==="wall") renderWallPage();
  else if(page==="reviews") renderReviewsPage();
  else if(page==="calculator") renderCalculatorPage();
  else if(page==="match") renderMatchPage();
  // Scroll to top
  document.getElementById("mainContent").scrollTop = 0;
  window.scrollTo(0,0);
}
