let currentUser = null;
let currentRole = "";
let departmentRows = [];
let adminRows = [];
let employeeRows = [];
let infoSecQueueRows = [];
let infoSecSubmissions = [];
let infoSecPendingRows = [];
let infoSecQuestions = [];
let activeInfoSecAssessment = null;
let activeInfoSecAnswers = {};

const roleLabels = {
  employee: "Employee",
  it: "IT",
  infosec: "InfoSec",
  management: "Management",
  dpo: "DPO",
  hr: "HR",
  compliance: "Compliance",
  admin: "Admin"
};

const departmentRoles = ["it", "infosec", "management", "dpo", "hr", "compliance"];
const basicDepartmentRoles = ["it", "management", "dpo", "hr", "compliance"];

const defaultPageByRole = {
  employee: "add-vendor",
  it: "dashboard",
  infosec: "dashboard",
  management: "dashboard",
  dpo: "dashboard",
  hr: "dashboard",
  compliance: "dashboard",
  admin: "dashboard"
};

const customPageLabels = {
  dashboard: "Dashboard",
  "add-vendor": "Insert Vendor",
  "my-submissions": "My Submissions",
  "vendor-queue": "Vendor Queue",
  "vendor-assessment": "Vendor Assessment",
  "pending-approval": "Pending Approval",
  signoff: "Form for Sign-off",
  "infosec-assessment": "Information Security Assessment",
  "department-assessments": "Vendor Assessments",
  "all-vendors": "All Vendors",
  "department-reviews": "Department Reviews"
};

const pageTitle = document.getElementById("pageTitle");
const breadcrumb = document.getElementById("breadcrumb");
const roleHelper = document.getElementById("roleHelper");
const toast = document.getElementById("toast");

const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");
const accountToggle = document.getElementById("accountToggle");
const accountMenu = document.getElementById("accountMenu");

const accountAvatar = document.getElementById("accountAvatar");
const accountMenuAvatar = document.getElementById("accountMenuAvatar");
const accountUserName = document.getElementById("accountUserName");
const accountMenuUserName = document.getElementById("accountMenuUserName");
const accountRoleText = document.getElementById("accountRoleText");
const accountMenuRoleText = document.getElementById("accountMenuRoleText");

const addVendorForm = document.getElementById("addVendorForm");
const clearVendorFormBtn = document.getElementById("clearVendorFormBtn");
const vendorSuccessPanel = document.getElementById("vendorSuccessPanel");
const successVendorName = document.getElementById("successVendorName");
const submitAnotherVendorBtn = document.getElementById("submitAnotherVendorBtn");

const departmentStatsGrid = document.getElementById("departmentStatsGrid");
const adminStatsGrid = document.getElementById("adminStatsGrid");

const deptTotalAssigned = document.getElementById("deptTotalAssigned");
const deptPending = document.getElementById("deptPending");
const deptReviewed = document.getElementById("deptReviewed");
const deptRejected = document.getElementById("deptRejected");

const adminTotalVendors = document.getElementById("adminTotalVendors");
const adminPendingReviews = document.getElementById("adminPendingReviews");
const adminCompletedVendors = document.getElementById("adminCompletedVendors");
const adminRejectedVendors = document.getElementById("adminRejectedVendors");

const dashboardTableTitle = document.getElementById("dashboardTableTitle");
const dashboardTableHead = document.getElementById("dashboardTableHead");
const dashboardTableBody = document.getElementById("dashboardTableBody");
const mySubmissionsHead = document.getElementById("mySubmissionsHead");
const mySubmissionsBody = document.getElementById("mySubmissionsBody");
const departmentAssessmentsBody = document.getElementById("departmentAssessmentsBody");
const allVendorsBody = document.getElementById("allVendorsBody");
const departmentReviewsBody = document.getElementById("departmentReviewsBody");
const vendorQueueBody = document.getElementById("vendorQueueBody");
const pendingApprovalBody = document.getElementById("pendingApprovalBody");

const infosecAssessmentPage = document.getElementById("infosecAssessmentPage");
const infosecAssessmentCode = document.getElementById("infosecAssessmentCode");
const infosecAssessmentDate = document.getElementById("infosecAssessmentDate");
const infosecVendorSelect = document.getElementById("infosecVendorSelect");
const infosecPurpose = document.getElementById("infosecPurpose");
const existingInfoSecAssessment = document.getElementById("existingInfoSecAssessment");
const currentlyAssessingVendor = document.getElementById("currentlyAssessingVendor");
const currentlyAssessingServices = document.getElementById("currentlyAssessingServices");
const infosecForm = document.getElementById("infosecForm");
const infosecQuestionsWrap = document.getElementById("infosecQuestionsWrap");
const cancelInfoSecAssessmentBtn = document.getElementById("cancelInfoSecAssessmentBtn");
const createInfoSecAssessmentBtn = document.getElementById("createInfoSecAssessmentBtn");
const vendorAssessmentNavBtn = document.getElementById("vendorAssessmentNavBtn");

const signoffForm = document.getElementById("signoffForm");
const signatureFile = document.getElementById("signatureFile");
const signatureFileName = document.getElementById("signatureFileName");
const cancelSignoffBtn = document.getElementById("cancelSignoffBtn");

function getRoleLabel(role) {
  return roleLabels[role] || role || "User";
}

function isDepartmentRole(role = currentRole) {
  return departmentRoles.includes(role);
}

function isBasicDepartmentRole(role = currentRole) {
  return basicDepartmentRoles.includes(role);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatDate(value) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

function formatDateForInput(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function statusClass(value) {
  return `status-${String(value || "Pending").toLowerCase().replaceAll(" ", "-")}`;
}

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

async function api(url, options = {}) {
  const bodyIsFormData = options.body instanceof FormData;

  const response = await fetch(url, {
    ...options,
    headers: bodyIsFormData
      ? options.headers || {}
      : {
          "Content-Type": "application/json",
          ...(options.headers || {})
        }
  });

  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.message || "Request failed.");
  }

  return data;
}

async function checkLoggedInUser() {
  try {
    currentUser = await api("/me");
    currentRole = currentUser.role;
  } catch (error) {
    window.location.href = "login.html";
    return;
  }

  applyRoleLayout();
}

function applyRoleLayout() {
  const label = getRoleLabel(currentRole);
  const initial = label.charAt(0).toUpperCase();

  document.body.dataset.role = currentRole;

  if (accountAvatar) accountAvatar.textContent = initial;
  if (accountMenuAvatar) accountMenuAvatar.textContent = initial;
  if (accountUserName) accountUserName.textContent = currentUser.full_name || "Account";
  if (accountMenuUserName) accountMenuUserName.textContent = currentUser.full_name || "User";
  if (accountRoleText) accountRoleText.textContent = label;
  if (accountMenuRoleText) accountMenuRoleText.textContent = label;

  document.querySelectorAll("[data-roles]").forEach((element) => {
    const roles = element.dataset.roles.split(",").map((role) => role.trim());
    element.classList.toggle("hidden", !roles.includes(currentRole));
  });

  if (roleHelper) {
    if (currentRole === "employee") {
      roleHelper.textContent = "Standard Employee Portal: add vendors and monitor your own submissions.";
    } else if (currentRole === "infosec") {
      roleHelper.textContent = "InfoSec Console: assess vendor security profiles and submit them to Admin.";
    } else if (isDepartmentRole()) {
      roleHelper.textContent = `${label} Console: review vendors submitted by employees.`;
    } else if (currentRole === "admin") {
      roleHelper.textContent = "Admin CISO System: monitor all vendors and department reviews.";
    }
  }

  showPage(defaultPageByRole[currentRole] || "dashboard");
}

function pageIdFromKey(page) {
  return `${page
    .split("-")
    .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join("")}Page`;
}

function setActiveNav(page) {
  document.querySelectorAll("[data-page]").forEach((button) => {
    if (button.classList.contains("hidden")) {
      button.classList.remove("active");
      return;
    }

    button.classList.toggle("active", button.dataset.page === page);
  });
}

function showOnlyPage(page) {
  document.querySelectorAll(".page").forEach((section) => {
    section.classList.remove("active");
  });

  const target = document.getElementById(pageIdFromKey(page));

  if (target) {
    target.classList.remove("hidden");
    target.classList.add("active");
  }
}

function pageLabel(page) {
  return customPageLabels[page] || "Dashboard";
}

function showPage(page) {
  setActiveNav(page);
  showOnlyPage(page);

  const label = pageLabel(page);

  if (pageTitle) pageTitle.textContent = label;
  if (breadcrumb) breadcrumb.textContent = `${getRoleLabel(currentRole)} / ${label}`;

  refreshCurrentPage(page);
}

async function refreshCurrentPage(_page = getCurrentPage()) {
  try {
    if (currentRole === "employee") {
      await loadEmployeeData();
    }

    if (currentRole === "infosec") {
      await loadInfoSecData();
    }

    if (isBasicDepartmentRole()) {
      await loadDepartmentData();
    }

    if (currentRole === "admin") {
      await loadAdminData();
    }
  } catch (error) {
    console.error(error);
    showToast(error.message || "Failed to load data.");
  }
}

function getCurrentPage() {
  const active = document.querySelector("[data-page].active");
  return active?.dataset.page || defaultPageByRole[currentRole] || "dashboard";
}

/* ADD VENDOR AND EMPLOYEE SUBMISSIONS */

async function loadEmployeeData() {
  employeeRows = await api("/vendors/mine");
  renderEmployeeSubmissions();
}

function renderEmployeeSubmissions() {
  if (!mySubmissionsHead || !mySubmissionsBody) return;

  mySubmissionsHead.innerHTML = `
    <tr>
      <th>Company Name</th>
      <th>Services</th>
      <th>Contact</th>
      <th>Overall Status</th>
      <th>Date Submitted</th>
    </tr>
  `;

  if (!employeeRows.length) {
    mySubmissionsBody.innerHTML = `<tr><td colspan="5" class="empty-cell">No submissions yet.</td></tr>`;
    return;
  }

  mySubmissionsBody.innerHTML = employeeRows.map((vendor) => `
    <tr>
      <td>${escapeHTML(vendor.company_name)}</td>
      <td>${escapeHTML(vendor.product_services_offered || "N/A")}</td>
      <td>${escapeHTML(vendor.contact_person_name || "N/A")}</td>
      <td><span class="status-pill ${statusClass(vendor.overall_status)}">${escapeHTML(vendor.overall_status || "Pending")}</span></td>
      <td>${escapeHTML(formatDate(vendor.created_at))}</td>
    </tr>
  `).join("");
}

function setupAddVendorForm() {
  if (!addVendorForm) return;

  addVendorForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      company_name: document.getElementById("companyName").value.trim(),
      company_website: document.getElementById("companyWebsite").value.trim(),
      product_services_offered: document.getElementById("productServices").value.trim(),
      contact_person_name: document.getElementById("contactName").value.trim(),
      contact_email: document.getElementById("contactEmail").value.trim(),
      contact_phone: document.getElementById("contactNumber").value.trim()
    };

    try {
      await api("/vendors", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      addVendorForm.reset();

      if (successVendorName) {
        successVendorName.textContent = payload.company_name;
      }

      if (vendorSuccessPanel) {
        vendorSuccessPanel.classList.remove("hidden");
        vendorSuccessPanel.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }

      if (currentRole === "employee") await loadEmployeeData();
      if (currentRole === "infosec") await loadInfoSecData();
    } catch (error) {
      alert(error.message);
    }
  });
}

/* INFOSEC */

async function loadInfoSecData() {
  const [queue, submissions, pending, questions] = await Promise.all([
    api("/infosec/queue"),
    api("/infosec/assessments/mine"),
    api("/infosec/pending-approval"),
    api("/infosec/questions")
  ]);

  infoSecQueueRows = queue;
  infoSecSubmissions = submissions;
  infoSecPendingRows = pending;
  infoSecQuestions = questions;

  renderInfoSecDashboard();
  renderInfoSecQueue();
  renderInfoSecSubmissions();
  renderPendingApproval();
  populateInfoSecAssessmentDropdowns();
}

function renderInfoSecDashboard() {
  if (!departmentStatsGrid) return;

  departmentStatsGrid.classList.remove("hidden");
  if (adminStatsGrid) adminStatsGrid.classList.add("hidden");

  const pending = infoSecQueueRows.filter((item) => item.latest_assessment_status !== "Pending Admin Approval" && item.latest_assessment_status !== "Approved").length;
  const submitted = infoSecSubmissions.filter((item) => item.status === "Pending Admin Approval" || item.status === "Approved").length;
  const rejected = infoSecSubmissions.filter((item) => item.status === "Rejected").length;

  if (deptTotalAssigned) deptTotalAssigned.textContent = infoSecQueueRows.length;
  if (deptPending) deptPending.textContent = pending;
  if (deptReviewed) deptReviewed.textContent = submitted;
  if (deptRejected) deptRejected.textContent = rejected;

  if (!dashboardTableHead || !dashboardTableBody) return;

  if (dashboardTableTitle) dashboardTableTitle.textContent = "Recent InfoSec Vendor Queue";

  dashboardTableHead.innerHTML = `
    <tr>
      <th>ID</th>
      <th>Vendor</th>
      <th>Type</th>
      <th>Submitted By</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  `;

  const rows = infoSecQueueRows.slice(0, 5);

  if (!rows.length) {
    dashboardTableBody.innerHTML = `<tr><td colspan="6" class="empty-cell">No vendor queue yet.</td></tr>`;
    return;
  }

  dashboardTableBody.innerHTML = rows.map((vendor) => `
    <tr>
      <td><span class="status-pill ${statusClass(vendor.latest_assessment_status || vendor.review_status)}">${escapeHTML(vendor.latest_assessment_code || `V-${vendor.vendor_id}`)}</span></td>
      <td>${escapeHTML(vendor.company_name)}</td>
      <td>InfoSec</td>
      <td>${escapeHTML(vendor.submitted_by || "N/A")}</td>
      <td><span class="status-pill ${statusClass(vendor.latest_assessment_status || vendor.review_status)}">${escapeHTML(vendor.latest_assessment_status || vendor.review_status || "Pending")}</span></td>
      <td><button type="button" class="small-action-btn" onclick="startInfoSecAssessment(${vendor.vendor_id})">Assess</button></td>
    </tr>
  `).join("");
}

function renderInfoSecQueue() {
  if (!vendorQueueBody) return;

  if (!infoSecQueueRows.length) {
    vendorQueueBody.innerHTML = `<tr><td colspan="6" class="empty-cell">No vendors waiting for assessment.</td></tr>`;
    return;
  }

  vendorQueueBody.innerHTML = infoSecQueueRows.map((vendor) => `
    <tr>
      <td><span class="status-pill ${statusClass(vendor.latest_assessment_status || vendor.review_status)}">${escapeHTML(vendor.latest_assessment_code || `V-${vendor.vendor_id}`)}</span></td>
      <td>
        <strong>${escapeHTML(vendor.company_name)}</strong><br>
        <small>${escapeHTML(vendor.product_services_offered || "N/A")}</small>
      </td>
      <td>InfoSec</td>
      <td>${escapeHTML(vendor.submitted_by || "N/A")}</td>
      <td><span class="status-pill ${statusClass(vendor.latest_assessment_status || vendor.review_status)}">${escapeHTML(vendor.latest_assessment_status || vendor.review_status || "Pending")}</span></td>
      <td>
        <div class="button-row">
          <button type="button" class="green-action-btn" onclick="startInfoSecAssessment(${vendor.vendor_id})">Assess <i class="fa-solid fa-arrow-right"></i></button>
          <button type="button" class="red-action-btn" onclick="quickRejectInfoSec(${vendor.vendor_id})">Reject</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderInfoSecSubmissions() {
  if (!mySubmissionsHead || !mySubmissionsBody || currentRole !== "infosec") return;

  mySubmissionsHead.innerHTML = `
    <tr>
      <th>Assessment ID</th>
      <th>Vendor</th>
      <th>Type</th>
      <th>Status</th>
      <th>Date Submitted</th>
    </tr>
  `;

  if (!infoSecSubmissions.length) {
    mySubmissionsBody.innerHTML = `<tr><td colspan="5" class="empty-cell">No InfoSec submissions yet.</td></tr>`;
    return;
  }

  mySubmissionsBody.innerHTML = infoSecSubmissions.map((item) => `
    <tr>
      <td><strong>${escapeHTML(item.assessment_code || `IA-${item.assessment_id}`)}</strong></td>
      <td>${escapeHTML(item.company_name)}</td>
      <td>${escapeHTML(item.purpose || "Information Security")}</td>
      <td><span class="status-pill ${statusClass(item.status)}">${escapeHTML(item.status)}</span></td>
      <td>${escapeHTML(formatDate(item.submitted_at || item.created_at))}</td>
    </tr>
  `).join("");
}

function renderPendingApproval() {
  if (!pendingApprovalBody) return;

  if (!infoSecPendingRows.length) {
    pendingApprovalBody.innerHTML = `<tr><td colspan="5" class="empty-cell">No pending approvals yet.</td></tr>`;
    return;
  }

  pendingApprovalBody.innerHTML = infoSecPendingRows.map((item) => `
    <tr>
      <td><strong>${escapeHTML(item.assessment_code || `IA-${item.assessment_id}`)}</strong></td>
      <td>${escapeHTML(item.company_name)}</td>
      <td>${escapeHTML(item.purpose || "Information Security")}</td>
      <td><span class="status-pill ${statusClass(item.status)}">${escapeHTML(item.status)}</span></td>
      <td>${escapeHTML(formatDate(item.submitted_at))}</td>
    </tr>
  `).join("");
}

function populateInfoSecAssessmentDropdowns() {
  if (infosecVendorSelect) {
    infosecVendorSelect.innerHTML = `<option value="">Select Vendor</option>`;
    infoSecQueueRows.forEach((vendor) => {
      infosecVendorSelect.innerHTML += `<option value="${vendor.vendor_id}">${escapeHTML(vendor.company_name)}</option>`;
    });
  }

  if (existingInfoSecAssessment) {
    existingInfoSecAssessment.innerHTML = `<option value="">Select Existing Assessment</option>`;
    infoSecSubmissions.forEach((assessment) => {
      existingInfoSecAssessment.innerHTML += `
        <option value="${assessment.assessment_id}">
          ${escapeHTML(assessment.assessment_code)} - ${escapeHTML(assessment.company_name)} - ${escapeHTML(assessment.status)}
        </option>
      `;
    });
  }
}

function updateCurrentlyAssessingCard(assessment) {
  if (!assessment) return;

  const vendorName = assessment.company_name || "Selected Vendor";
  const services = assessment.product_services_offered || "No service details provided.";

  if (currentlyAssessingVendor) {
    currentlyAssessingVendor.textContent = vendorName;
  }

  if (currentlyAssessingServices) {
    currentlyAssessingServices.textContent = services;
  }
}

async function startInfoSecAssessment(vendorId) {
  try {
    if (vendorAssessmentNavBtn) {
      vendorAssessmentNavBtn.classList.remove("hidden");
    }

    activeInfoSecAssessment = null;
    activeInfoSecAnswers = {};

    if (infosecAssessmentCode) {
      infosecAssessmentCode.value = "";
      infosecAssessmentCode.placeholder = "Auto-generated ID";
    }

    if (infosecAssessmentDate) {
    infosecAssessmentDate.value = activeInfoSecAssessment.assessment_date || getTodayDateInputValue();
  }
  if (infosecVendorSelect) {
      infosecVendorSelect.value = String(vendorId);
    }

    if (existingInfoSecAssessment) {
      existingInfoSecAssessment.value = "";
    }

    const selectedVendor = infoSecQueueRows.find((vendor) => String(vendor.vendor_id) === String(vendorId));
    if (selectedVendor) {
      updateCurrentlyAssessingCard({
        company_name: selectedVendor.company_name,
        product_services_offered: selectedVendor.product_services_offered
      });
    }

    if (infosecQuestionsWrap) {
      infosecQuestionsWrap.innerHTML = `
        <p class="empty-cell">
          Select a vendor, choose a date and purpose, then click Create Assessment to begin.
        </p>
      `;
    }

    showPage("vendor-assessment");
  } catch (error) {
    alert(error.message);
  }
}

async function loadInfoSecAssessment(assessmentId) {
  const data = await api(`/infosec/assessments/${assessmentId}`);
  activeInfoSecAssessment = data.assessment;
  activeInfoSecAnswers = {};

  data.answers.forEach((answer) => {
    activeInfoSecAnswers[answer.question_index] = answer;
  });

  if (infosecAssessmentCode) infosecAssessmentCode.value = activeInfoSecAssessment.assessment_code || "";
  if (infosecAssessmentDate) infosecAssessmentDate.value = formatDateForInput(activeInfoSecAssessment.created_at || activeInfoSecAssessment.submitted_at || new Date());
  if (infosecVendorSelect) infosecVendorSelect.value = String(activeInfoSecAssessment.vendor_id);
  if (infosecPurpose) infosecPurpose.value = activeInfoSecAssessment.purpose || "Information Security";

  updateCurrentlyAssessingCard(activeInfoSecAssessment);
  renderInfoSecFormQuestions();
}

function renderInfoSecFormQuestions() {
  if (!infosecQuestionsWrap) return;

  if (!infoSecQuestions.length) {
    infosecQuestionsWrap.innerHTML = `<p class="empty-cell">No InfoSec questions found.</p>`;
    return;
  }

  infosecQuestionsWrap.innerHTML = infoSecQuestions.map((question, index) => {
    const saved = activeInfoSecAnswers[index] || {};
    const response = saved.response || "";
    const explanation = saved.explanation || "";
    const artifactName = saved.artifact_name || "";

    return `
      <div class="is-question-card" data-question-index="${index}">
        <h4>${index + 1}. ${escapeHTML(question.question_text)}</h4>

        <div class="is-answer-grid">
          <div class="field-group">
            <label>Response</label>
            <select class="is-response" data-index="${index}" required>
              <option value="">Select</option>
              <option value="Yes" ${response === "Yes" ? "selected" : ""}>Yes</option>
              <option value="No" ${response === "No" ? "selected" : ""}>No</option>
              <option value="N/A" ${response === "N/A" ? "selected" : ""}>N/A</option>
            </select>
          </div>

          <div class="field-group">
            <label>Explanation</label>
            <textarea class="is-explanation" data-index="${index}" placeholder="Required if No or N/A">${escapeHTML(explanation)}</textarea>
          </div>

          <div class="field-group">
            <label>Artifacts</label>
            <input type="file" class="is-artifact" data-index="${index}" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
            <p class="artifact-note">Required if Yes. ${artifactName ? `Current: ${escapeHTML(artifactName)}` : ""}</p>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

async function submitInfoSecForm(event) {
  event.preventDefault();

  if (!activeInfoSecAssessment) {
    alert("Please select or start an assessment first.");
    return;
  }

  const answers = [];
  const formData = new FormData();

  for (const question of infoSecQuestions) {
    const index = question.question_index;
    const response = document.querySelector(`.is-response[data-index="${index}"]`)?.value || "";
    const explanation = document.querySelector(`.is-explanation[data-index="${index}"]`)?.value.trim() || "";
    const artifactInput = document.querySelector(`.is-artifact[data-index="${index}"]`);
    const existing = activeInfoSecAnswers[index] || {};

    if (!response) {
      alert(`Please answer question ${index + 1}.`);
      return;
    }

    if ((response === "No" || response === "N/A") && !explanation) {
      alert(`Question ${index + 1}: No or N/A requires an explanation.`);
      return;
    }

    if (response === "Yes" && !artifactInput?.files?.length && !existing.artifact_path) {
      alert(`Question ${index + 1}: Yes requires an artifact upload.`);
      return;
    }

    if (artifactInput?.files?.length) {
      formData.append(`artifact_${index}`, artifactInput.files[0]);
    }

    answers.push({
      question_index: index,
      question_text: question.question_text,
      response,
      explanation,
      existing_artifact_path: existing.artifact_path || null,
      existing_artifact_name: existing.artifact_name || null
    });
  }

  formData.append("answers", JSON.stringify(answers));

  try {
    await api(`/infosec/assessments/${activeInfoSecAssessment.assessment_id}/submit`, {
      method: "POST",
      body: formData
    });

    showToast("InfoSec assessment submitted to Admin.");
    await loadInfoSecData();
    showPage("pending-approval");
  } catch (error) {
    alert(error.message);
  }
}

async function quickRejectInfoSec(vendorId) {
  const comment = prompt("Reason for rejection:");

  if (comment === null) return;

  try {
    await api(`/department/reviews/${vendorId}`, {
      method: "PATCH",
      body: JSON.stringify({
        review_status: "Rejected",
        comments: comment || "Rejected by InfoSec."
      })
    });

    await loadInfoSecData();
    showToast("Vendor rejected.");
  } catch (error) {
    alert(error.message);
  }
}

if (createInfoSecAssessmentBtn) {
  createInfoSecAssessmentBtn.addEventListener("click", async () => {
    const vendorId = infosecVendorSelect?.value || "";
    const purpose = infosecPurpose?.value || "";
    const assessmentDate = infosecAssessmentDate?.value || "";

    if (!vendorId) {
      alert("Please select a vendor first.");
      return;
    }

    if (!assessmentDate) {
      alert("Please select an assessment date.");
      return;
    }

    if (!purpose) {
      alert("Please select a purpose first.");
      return;
    }

    try {
      const assessment = await api("/infosec/assessments/start", {
        method: "POST",
        body: JSON.stringify({
          vendor_id: vendorId,
          purpose,
          assessment_date: assessmentDate,
          force_new: true
        })
      });

      activeInfoSecAssessment = assessment;
      activeInfoSecAnswers = {};

      if (infosecAssessmentCode) {
        infosecAssessmentCode.value = assessment.assessment_code || "";
      }

      if (infosecAssessmentDate) {
        infosecAssessmentDate.value = assessment.assessment_date || assessmentDate;
      }

      await loadInfoSecData();

      if (infosecVendorSelect) {
        infosecVendorSelect.value = String(vendorId);
      }

      if (infosecPurpose) {
        infosecPurpose.value = purpose;
      }

      if (existingInfoSecAssessment) {
        existingInfoSecAssessment.value = String(assessment.assessment_id);
      }

      await loadInfoSecAssessment(assessment.assessment_id);
      showToast("Assessment created.");
    } catch (error) {
      alert(error.message);
    }
  });
}

/* BASIC DEPARTMENTS */

async function loadDepartmentData() {
  departmentRows = await api("/department/vendors");

  renderDepartmentStats();
  renderDepartmentDashboardTable();
  renderDepartmentAssessments();
}

function renderDepartmentStats() {
  if (!departmentStatsGrid) return;

  departmentStatsGrid.classList.remove("hidden");
  if (adminStatsGrid) adminStatsGrid.classList.add("hidden");

  const pending = departmentRows.filter((item) => item.review_status === "Pending").length;
  const reviewed = departmentRows.filter((item) => item.review_status === "Reviewed" || item.review_status === "Approved").length;
  const rejected = departmentRows.filter((item) => item.review_status === "Rejected").length;

  if (deptTotalAssigned) deptTotalAssigned.textContent = departmentRows.length;
  if (deptPending) deptPending.textContent = pending;
  if (deptReviewed) deptReviewed.textContent = reviewed;
  if (deptRejected) deptRejected.textContent = rejected;
}

function renderDepartmentDashboardTable() {
  if (!dashboardTableHead || !dashboardTableBody || !isBasicDepartmentRole()) return;

  if (dashboardTableTitle) dashboardTableTitle.textContent = "Recent Vendor Assessments";

  dashboardTableHead.innerHTML = `
    <tr>
      <th>Vendor</th>
      <th>Services</th>
      <th>Submitted By</th>
      <th>Department Status</th>
      <th>Action</th>
    </tr>
  `;

  const rows = departmentRows.slice(0, 5);

  if (!rows.length) {
    dashboardTableBody.innerHTML = `<tr><td colspan="5" class="empty-cell">No vendor assessments yet.</td></tr>`;
    return;
  }

  dashboardTableBody.innerHTML = rows.map((vendor) => `
    <tr>
      <td>${escapeHTML(vendor.company_name)}</td>
      <td>${escapeHTML(vendor.product_services_offered || "N/A")}</td>
      <td>${escapeHTML(vendor.submitted_by || "N/A")}</td>
      <td><span class="status-pill ${statusClass(vendor.review_status)}">${escapeHTML(vendor.review_status || "Pending")}</span></td>
      <td><button type="button" class="small-action-btn" onclick="showPage('department-assessments')">Review</button></td>
    </tr>
  `).join("");
}

function renderDepartmentAssessments() {
  if (!departmentAssessmentsBody) return;

  if (!departmentRows.length) {
    departmentAssessmentsBody.innerHTML = `<tr><td colspan="7" class="empty-cell">No vendor assessments yet.</td></tr>`;
    return;
  }

  departmentAssessmentsBody.innerHTML = departmentRows.map((vendor) => `
    <tr>
      <td>
        <strong>${escapeHTML(vendor.company_name)}</strong><br>
        <small>${escapeHTML(vendor.contact_person_name || "No contact")}</small>
      </td>
      <td>${escapeHTML(vendor.product_services_offered || "N/A")}</td>
      <td>${escapeHTML(vendor.submitted_by || "N/A")}</td>
      <td><span class="status-pill ${statusClass(vendor.review_status)}">${escapeHTML(vendor.review_status || "Pending")}</span></td>
      <td><textarea class="inline-review-box" id="comment-${vendor.vendor_id}" placeholder="Department comment">${escapeHTML(vendor.comments || "")}</textarea></td>
      <td>
        <select class="inline-select" id="status-${vendor.vendor_id}">
          <option value="Pending" ${vendor.review_status === "Pending" ? "selected" : ""}>Pending</option>
          <option value="Reviewed" ${vendor.review_status === "Reviewed" ? "selected" : ""}>Reviewed</option>
          <option value="Approved" ${vendor.review_status === "Approved" ? "selected" : ""}>Approved</option>
          <option value="Rejected" ${vendor.review_status === "Rejected" ? "selected" : ""}>Rejected</option>
        </select>
      </td>
      <td><button type="button" class="green-action-btn" onclick="saveDepartmentReview(${vendor.vendor_id})">Save Review</button></td>
    </tr>
  `).join("");
}

async function saveDepartmentReview(vendorId) {
  const commentInput = document.getElementById(`comment-${vendorId}`);
  const statusInput = document.getElementById(`status-${vendorId}`);

  try {
    await api(`/department/reviews/${vendorId}`, {
      method: "PATCH",
      body: JSON.stringify({
        comments: commentInput?.value || "",
        review_status: statusInput?.value || "Pending"
      })
    });

    await loadDepartmentData();
    showToast("Review saved.");
  } catch (error) {
    alert(error.message);
  }
}

/* ADMIN */

async function loadAdminData() {
  adminRows = await api("/admin/vendors");

  renderAdminStats();
  renderAdminDashboardTable();
  renderAllVendorsTable();
  renderDepartmentReviewsTable();
}

function renderAdminStats() {
  if (departmentStatsGrid) departmentStatsGrid.classList.add("hidden");
  if (adminStatsGrid) adminStatsGrid.classList.remove("hidden");

  const pendingReviews = adminRows.reduce((sum, vendor) => sum + Number(vendor.pending_reviews || 0), 0);
  const completed = adminRows.filter((item) => item.overall_status === "Completed").length;
  const rejected = adminRows.filter((item) => item.overall_status === "Rejected").length;

  if (adminTotalVendors) adminTotalVendors.textContent = adminRows.length;
  if (adminPendingReviews) adminPendingReviews.textContent = pendingReviews;
  if (adminCompletedVendors) adminCompletedVendors.textContent = completed;
  if (adminRejectedVendors) adminRejectedVendors.textContent = rejected;
}

function renderAdminDashboardTable() {
  if (!dashboardTableHead || !dashboardTableBody || currentRole !== "admin") return;

  if (dashboardTableTitle) dashboardTableTitle.textContent = "Latest Vendors";

  dashboardTableHead.innerHTML = `
    <tr>
      <th>Vendor</th>
      <th>Services</th>
      <th>Submitted By</th>
      <th>Overall Status</th>
      <th>Date Submitted</th>
    </tr>
  `;

  const rows = adminRows.slice(0, 5);

  if (!rows.length) {
    dashboardTableBody.innerHTML = `<tr><td colspan="5" class="empty-cell">No vendors yet.</td></tr>`;
    return;
  }

  dashboardTableBody.innerHTML = rows.map((vendor) => `
    <tr>
      <td>${escapeHTML(vendor.company_name)}</td>
      <td>${escapeHTML(vendor.product_services_offered || "N/A")}</td>
      <td>${escapeHTML(vendor.submitted_by || "N/A")}</td>
      <td><span class="status-pill ${statusClass(vendor.overall_status)}">${escapeHTML(vendor.overall_status || "Pending")}</span></td>
      <td>${escapeHTML(formatDate(vendor.created_at))}</td>
    </tr>
  `).join("");
}

function renderAllVendorsTable() {
  if (!allVendorsBody) return;

  if (!adminRows.length) {
    allVendorsBody.innerHTML = `<tr><td colspan="6" class="empty-cell">No vendors yet.</td></tr>`;
    return;
  }

  allVendorsBody.innerHTML = adminRows.map((vendor) => `
    <tr>
      <td>${escapeHTML(vendor.company_name)}</td>
      <td>${escapeHTML(vendor.product_services_offered || "N/A")}</td>
      <td>${escapeHTML(vendor.contact_person_name || "N/A")}</td>
      <td>${escapeHTML(vendor.submitted_by || "N/A")}</td>
      <td><span class="status-pill ${statusClass(vendor.overall_status)}">${escapeHTML(vendor.overall_status || "Pending")}</span></td>
      <td>${escapeHTML(formatDate(vendor.created_at))}</td>
    </tr>
  `).join("");
}

function renderDepartmentReviewsTable() {
  if (!departmentReviewsBody) return;

  if (!adminRows.length) {
    departmentReviewsBody.innerHTML = `<tr><td colspan="7" class="empty-cell">No department reviews yet.</td></tr>`;
    return;
  }

  departmentReviewsBody.innerHTML = adminRows.map((vendor) => `
    <tr>
      <td>${escapeHTML(vendor.company_name)}</td>
      <td><span class="status-pill ${statusClass(vendor.it_status)}">${escapeHTML(vendor.it_status || "Pending")}</span></td>
      <td><span class="status-pill ${statusClass(vendor.infosec_status)}">${escapeHTML(vendor.infosec_status || "Pending")}</span></td>
      <td><span class="status-pill ${statusClass(vendor.management_status)}">${escapeHTML(vendor.management_status || "Pending")}</span></td>
      <td><span class="status-pill ${statusClass(vendor.dpo_status)}">${escapeHTML(vendor.dpo_status || "Pending")}</span></td>
      <td><span class="status-pill ${statusClass(vendor.hr_status)}">${escapeHTML(vendor.hr_status || "Pending")}</span></td>
      <td><span class="status-pill ${statusClass(vendor.compliance_status)}">${escapeHTML(vendor.compliance_status || "Pending")}</span></td>
    </tr>
  `).join("");
}

/* SIGN OFF */

async function submitSignoff(event) {
  event.preventDefault();

  const formData = new FormData();
  formData.append("role_name", document.getElementById("signoffRole").value);
  formData.append("signer_name", document.getElementById("signoffName").value.trim());
  formData.append("signoff_status", document.querySelector("input[name='approvalDecision']:checked")?.value || "Pending");

  if (signatureFile?.files?.length) {
    formData.append("signature", signatureFile.files[0]);
  }

  try {
    await api("/infosec/signoff", {
      method: "POST",
      body: formData
    });

    signoffForm.reset();
    if (signatureFileName) signatureFileName.textContent = "Upload Signature";
    showToast("Sign-off saved.");
  } catch (error) {
    alert(error.message);
  }
}

/* EVENTS */

document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    refreshCurrentPage();
    showToast("Page refreshed.");
  });
}

if (accountToggle && accountMenu) {
  accountToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    accountMenu.classList.toggle("hidden");
    accountToggle.classList.toggle("active");
  });

  document.addEventListener("click", (event) => {
    if (!accountMenu.contains(event.target) && !accountToggle.contains(event.target)) {
      accountMenu.classList.add("hidden");
      accountToggle.classList.remove("active");
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/logout", { method: "POST" });
    } catch (error) {
      console.error(error);
    }

    sessionStorage.clear();
    window.location.href = "login.html";
  });
}

if (clearVendorFormBtn) {
  clearVendorFormBtn.addEventListener("click", () => {
    if (addVendorForm) addVendorForm.reset();
    if (vendorSuccessPanel) vendorSuccessPanel.classList.add("hidden");
    document.getElementById("companyName")?.focus();
  });
}

if (submitAnotherVendorBtn) {
  submitAnotherVendorBtn.addEventListener("click", () => {
    if (vendorSuccessPanel) vendorSuccessPanel.classList.add("hidden");
    if (addVendorForm) addVendorForm.reset();
    document.getElementById("companyName")?.focus();
  });
}

if (existingInfoSecAssessment) {
  existingInfoSecAssessment.addEventListener("change", async () => {
    const id = existingInfoSecAssessment.value;
    if (!id) return;

    await loadInfoSecAssessment(id);
    showPage("vendor-assessment");
  });
}

if (cancelInfoSecAssessmentBtn) {
  cancelInfoSecAssessmentBtn.addEventListener("click", () => {
    showPage("vendor-queue");
  });
}

if (infosecForm) {
  infosecForm.addEventListener("submit", submitInfoSecForm);
}

if (signatureFile) {
  signatureFile.addEventListener("change", () => {
    if (signatureFile.files.length > 0) {
      signatureFileName.textContent = signatureFile.files[0].name;
    } else {
      signatureFileName.textContent = "Upload Signature";
    }
  });
}

if (signoffForm) {
  signoffForm.addEventListener("submit", submitSignoff);
}

if (cancelSignoffBtn) {
  cancelSignoffBtn.addEventListener("click", () => {
    showPage("dashboard");
  });
}

setupAddVendorForm();

async function init() {
  await checkLoggedInUser();
}

init();
