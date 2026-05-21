let currentUser = null;
let vendors = [];
let assessments = [];
let questionSections = [];
let activeAssessment = null;
let activeAnswers = [];
let isLoggingOut = false;

const departmentLikeStatuses = ["Approved for Department Review", "Under Department Review", "Under Final Review", "Report Generated"];

function routeForRole(role){if(role==="vendor")return"vendor.html";if(role==="employee")return"employee.html";if(["it","infosec","management","dpo","hr","compliance"].includes(role))return"department.html";return"login.html";}
function escapeHTML(value){return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");}
function showToast(message){const t=document.getElementById("toast");t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600);}
function statusClass(status){if(status==="Rejected")return"status rejected";if(status==="Report Generated")return"status report";if(status==="Returned to Vendor")return"status returned";return"status";}
async function api(url, options={}){
  const isForm = options.body instanceof FormData;
  const response = await fetch(url,{...options,credentials:"same-origin",headers:isForm ? (options.headers||{}) : {"Content-Type":"application/json",...(options.headers||{})}});
  let data=null;try{data=await response.json();}catch(_error){}
  if(!response.ok) throw new Error(data?.message || "Request failed.");
  return data;
}
function lockDashboardBackButton(){
  const url=window.location.href;
  history.replaceState({locked:true},"",url);
  for(let i=0;i<8;i++) history.pushState({locked:true},"",url);
  window.addEventListener("popstate",()=>{if(!isLoggingOut) history.pushState({locked:true},"",url);});
}

async function boot(){
  try{currentUser=await api("/me"); if(currentUser.role!=="vendor") return window.location.replace(routeForRole(currentUser.role));}
  catch(_error){return window.location.replace("login.html");}
  document.getElementById("accountName").textContent=currentUser.full_name || "Vendor";
  document.getElementById("avatar").textContent=(currentUser.full_name||"V").charAt(0).toUpperCase();
  const bank=await api("/question-bank"); questionSections=bank.vendor_sections || [];
  setupEvents();
  lockDashboardBackButton();
  await loadDashboard();
}

function setupEvents(){
  document.querySelectorAll("[data-page]").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));
  document.getElementById("refreshBtn").addEventListener("click",loadDashboard);
  document.getElementById("companyForm").addEventListener("submit",saveCompany);
  document.getElementById("createAssessmentForm").addEventListener("submit",createAssessment);
  document.getElementById("assessmentSelect").addEventListener("change",()=>openAssessment(document.getElementById("assessmentSelect").value));
  document.getElementById("saveDraftBtn").addEventListener("click",()=>saveForm(false));
  document.getElementById("submitDueDiligenceBtn").addEventListener("click",()=>saveForm(true));
  document.getElementById("profileShortcut").addEventListener("click",()=>{closeMenu();showPage("company");});
  document.getElementById("helpBtn").addEventListener("click",()=>showToast("Fill company info, create an assessment, answer all questions, upload PDFs, then submit."));
  document.getElementById("accountToggle").addEventListener("click",(event)=>{event.stopPropagation();document.getElementById("accountMenu").classList.toggle("hidden");});
  document.addEventListener("click",()=>closeMenu());
  document.getElementById("logoutBtn").addEventListener("click",logout);
}
function closeMenu(){document.getElementById("accountMenu").classList.add("hidden");}
async function logout(){isLoggingOut=true;try{await fetch("/logout",{method:"POST",credentials:"same-origin"});}catch(_e){} sessionStorage.clear();localStorage.clear();window.location.replace("login.html");}
function showPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll("[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  document.getElementById(`${page}Page`).classList.add("active");
  document.getElementById("pageTitle").textContent={dashboard:"Dashboard",company:"Company Information",create:"Create Assessment",form:"Due Diligence Form",notifications:"Notifications"}[page] || "Dashboard";
}
async function loadDashboard(){
  const data=await api("/vendor/dashboard");
  vendors=data.vendors||[];assessments=data.assessments||[];
  renderStats();renderVendors();renderAssessmentRows();renderAssessmentDropdown();renderNotifications(data.notifications||[]);
}
function renderStats(){
  document.getElementById("statCreated").textContent=assessments.length;
  document.getElementById("statDraft").textContent=assessments.filter(a=>a.status==="Draft"||a.status==="Returned to Vendor").length;
  document.getElementById("statSubmitted").textContent=assessments.filter(a=>!["Draft","Returned to Vendor","Report Generated"].includes(a.status)).length;
  document.getElementById("statFinal").textContent=assessments.filter(a=>a.status==="Report Generated").length;
}
function renderVendors(){
  const vendorSelect=document.getElementById("vendorSelect");
  vendorSelect.innerHTML='<option value="">Select company</option>'+vendors.map(v=>`<option value="${v.vendor_id}">${escapeHTML(v.company_name)}</option>`).join("");
  if(vendors[0]){
    document.getElementById("companyName").value=vendors[0].company_name||"";
    document.getElementById("companyWebsite").value=vendors[0].company_website||"";
    document.getElementById("services").value=vendors[0].services||"";
    document.getElementById("contactPerson").value=vendors[0].contact_person||"";
    document.getElementById("contactEmail").value=vendors[0].contact_email||"";
    document.getElementById("contactNumber").value=vendors[0].contact_number||"";
  }
}
function renderAssessmentRows(){
  const body=document.getElementById("assessmentRows");
  if(!assessments.length){body.innerHTML='<tr><td colspan="6">No assessments yet.</td></tr>';return;}
  body.innerHTML=assessments.map(a=>`<tr><td><strong>${escapeHTML(a.assessment_code)}</strong></td><td>${escapeHTML(a.company_name)}</td><td>${escapeHTML(a.purpose)}</td><td><span class="${statusClass(a.status)}">${escapeHTML(a.status)}</span></td><td>${escapeHTML(a.final_decision||"-")}</td><td><button class="btn secondary" onclick="openAssessment(${a.assessment_id});showPage('form')">Open</button></td></tr>`).join("");
}
function renderAssessmentDropdown(){
  const select=document.getElementById("assessmentSelect");
  select.innerHTML='<option value="">Select assessment</option>'+assessments.map(a=>`<option value="${a.assessment_id}">${escapeHTML(a.assessment_code)} - ${escapeHTML(a.company_name)} - ${escapeHTML(a.status)}</option>`).join("");
}
function renderNotifications(list){
  const wrap=document.getElementById("notificationList");
  if(!list.length){wrap.innerHTML='<p class="notice">No notifications yet.</p>';return;}
  wrap.innerHTML=list.map(n=>`<div class="answer-card"><strong>${escapeHTML(n.title)}</strong><p>${escapeHTML(n.message)}</p><small>${escapeHTML(new Date(n.created_at).toLocaleString())}</small></div>`).join("");
}
async function saveCompany(event){
  event.preventDefault();
  const payload={company_name:companyName.value.trim(),company_website:companyWebsite.value.trim(),services:services.value.trim(),contact_person:contactPerson.value.trim(),contact_email:contactEmail.value.trim(),contact_number:contactNumber.value.trim()};
  const data=await api("/vendor/company",{method:"POST",body:JSON.stringify(payload)});
  showToast(data.message);await loadDashboard();showPage("create");
}
async function createAssessment(event){
  event.preventDefault();
  const data=await api("/vendor/assessments",{method:"POST",body:JSON.stringify({vendor_id:vendorSelect.value,purpose:purpose.value,assessment_date:assessmentDate.value})});
  showToast("Assessment draft created.");await loadDashboard();await openAssessment(data.assessment_id);showPage("form");
}
function answerLookup(){
  const map={};
  activeAnswers.forEach(a=>map[`${a.section_key}|${a.question_index}`]=a);
  return map;
}
async function openAssessment(id){
  if(!id)return;
  const data=await api(`/vendor/assessments/${id}`);
  activeAssessment=data;activeAnswers=data.answers||[];
  document.getElementById("assessmentSelect").value=String(id);
  renderQuestions();
}
function renderQuestions(){
  const wrap=document.getElementById("questionsWrap");
  const status=document.getElementById("formStatus");
  const lookup=answerLookup();
  const locked=activeAssessment && !["Draft","Returned to Vendor","Submitted by Vendor"].includes(activeAssessment.status);
  status.innerHTML=`<strong>${escapeHTML(activeAssessment.assessment_code)}</strong> - <span class="${statusClass(activeAssessment.status)}">${escapeHTML(activeAssessment.status)}</span>${activeAssessment.employee_comment?`<br>Employee Comment: ${escapeHTML(activeAssessment.employee_comment)}`:""}${activeAssessment.final_decision?`<br>Final Decision: <strong>${escapeHTML(activeAssessment.final_decision)}</strong>`:""}`;
  let html="";
  questionSections.forEach(section=>{
    html+=`<div class="section-title">${escapeHTML(section.title)}</div>`;
    section.questions.forEach((q,i)=>{
      const saved=lookup[`${section.key}|${i}`]||{};
      html+=`<div class="answer-card"><strong>${i+1}. ${escapeHTML(q)}</strong><div class="form-grid"><div class="field"><label>Response</label><select data-section="${section.key}" data-index="${i}" data-field="response" ${locked?"disabled":""}><option value="">Select</option><option ${saved.response==="Yes"?"selected":""}>Yes</option><option ${saved.response==="No"?"selected":""}>No</option><option ${saved.response==="N/A"?"selected":""}>N/A</option></select></div><div class="field"><label>PDF Document</label><input type="file" accept="application/pdf,.pdf" data-section="${section.key}" data-index="${i}" data-field="document" ${locked?"disabled":""}><small>${saved.document_file_name?`Current: ${escapeHTML(saved.document_file_name)}`:"Required PDF"}</small></div></div><div class="field"><label>Explanation / Vendor Comment</label><textarea data-section="${section.key}" data-index="${i}" data-field="explanation" ${locked?"disabled":""}>${escapeHTML(saved.explanation||"")}</textarea></div></div>`;
    });
  });
  wrap.innerHTML=html;
  document.getElementById("saveDraftBtn").disabled=locked;
  document.getElementById("submitDueDiligenceBtn").disabled=locked;
}
async function saveForm(submit){
  if(!activeAssessment){alert("Select an assessment first.");return;}
  const lookup=answerLookup();
  const answers=[];
  const formData=new FormData();
  questionSections.forEach(section=>{
    section.questions.forEach((q,i)=>{
      const saved=lookup[`${section.key}|${i}`]||{};
      const response=document.querySelector(`[data-section="${section.key}"][data-index="${i}"][data-field="response"]`)?.value || "";
      const explanation=document.querySelector(`[data-section="${section.key}"][data-index="${i}"][data-field="explanation"]`)?.value.trim() || "";
      const fileInput=document.querySelector(`[data-section="${section.key}"][data-index="${i}"][data-field="document"]`);
      if(fileInput?.files?.length) formData.append(`document_${section.key}_${i}`,fileInput.files[0]);
      answers.push({section_key:section.key,question_index:i,question_text:q,response,explanation,existing_document_file_name:saved.document_file_name||null,existing_document_file_path:saved.document_file_path||null});
    });
  });
  formData.append("answers",JSON.stringify(answers));
  formData.append("submit",submit?"1":"0");
  try{
    const data=await api(`/vendor/assessments/${activeAssessment.assessment_id}/save`,{method:"POST",body:formData});
    showToast(data.message);await loadDashboard();await openAssessment(activeAssessment.assessment_id);
  }catch(error){alert(error.message);}
}
boot();
