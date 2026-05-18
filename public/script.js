let currentUser = null;
let currentRole = "";
let employeeRows = [];
let employeeAssessmentRows = [];
let departmentQueueRows = [];
let departmentAssessmentRows = [];
let departmentPendingRows = [];
let departmentQuestions = [];
let adminRows = [];
let activeMainAssessment = null;
let activeDepartmentAssessment = null;
let activeDepartmentAnswers = {};

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
const assessmentSuccessPanel = document.getElementById("assessmentSuccessPanel");
const assessmentSuccessTitle = document.getElementById("assessmentSuccessTitle");
const assessmentSuccessMessage = document.getElementById("assessmentSuccessMessage");
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
const allVendorsBody = document.getElementById("allVendorsBody");
const departmentReviewsBody = document.getElementById("departmentReviewsBody");
const vendorQueueBody = document.getElementById("vendorQueueBody");
const pendingApprovalBody = document.getElementById("pendingApprovalBody");
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

function getRoleLabel(role = currentRole) {
  return roleLabels[role] || role || "User";
}

function isDepartmentRole(role = currentRole) {
  return departmentRoles.includes(role);
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
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function formatDateForInput(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function getTodayDateInputValue() {
  return formatDateForInput(new Date());
}

function statusClass(value) {
  return `status-${String(value || "Pending").toLowerCase().replaceAll(" ", "-")}`;
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

function showAssessmentSuccess(title, message) {
  if (assessmentSuccessTitle) assessmentSuccessTitle.textContent = title;
  if (assessmentSuccessMessage) assessmentSuccessMessage.textContent = message;
  if (assessmentSuccessPanel) {
    assessmentSuccessPanel.classList.remove("hidden");
    assessmentSuccessPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function hideAssessmentSuccess() {
  if (assessmentSuccessPanel) assessmentSuccessPanel.classList.add("hidden");
}

async function api(url, options = {}) {
  const bodyIsFormData = options.body instanceof FormData;
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: bodyIsFormData
      ? options.headers || {}
      : { "Content-Type": "application/json", ...(options.headers || {}) }
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_error) {
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
  } catch (_error) {
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
      roleHelper.textContent = "Standard Employee Portal: add vendors and create the main vendor assessment request.";
    } else if (isDepartmentRole()) {
      roleHelper.textContent = `${label} Console: answer your department form for shared vendor assessments.`;
    } else if (currentRole === "admin") {
      roleHelper.textContent = "Admin CISO System: monitor all vendors and department reviews.";
    }
  }

  populateSignoffRole();
  updateTopActionButton();
  showPage(defaultPageByRole[currentRole] || "dashboard");
}

function pageIdFromKey(page) {
  return `${page
    .split("-")
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
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
  document.querySelectorAll(".page").forEach((section) => section.classList.remove("active"));
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
    if (isDepartmentRole()) {
      await loadDepartmentWorkflowData();
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

async function loadEmployeeData() {
  const [vendors, assessments] = await Promise.all([
    api("/vendors/mine"),
    api("/vendor-assessments/mine")
  ]);

  employeeRows = vendors;
  employeeAssessmentRows = assessments;
  renderEmployeeSubmissions();
  populateEmployeeVendorAssessmentFields();
}

function populateEmployeeVendorAssessmentFields() {
  if (currentRole !== "employee") return;

  if (infosecVendorSelect) {
    infosecVendorSelect.innerHTML = `<option value="">Select Vendor</option>`;
    employeeRows.forEach((vendor) => {
      infosecVendorSelect.innerHTML += `<option value="${vendor.vendor_id}">${escapeHTML(vendor.company_name)}</option>`;
    });
  }

  if (existingInfoSecAssessment) {
    existingInfoSecAssessment.innerHTML = `<option value="">Select Existing Assessment</option>`;
    employeeAssessmentRows.forEach((assessment) => {
      existingInfoSecAssessment.innerHTML += `
        <option value="${assessment.assessment_id}">
          ${escapeHTML(assessment.assessment_code)} - ${escapeHTML(assessment.company_name)} - ${escapeHTML(assessment.overall_status)}
        </option>
      `;
    });
  }

  if (infosecQuestionsWrap && !activeMainAssessment) {
    infosecQuestionsWrap.innerHTML = `<p class="empty-cell">Create or select a Vendor Assessment to answer the Vendor Information questions.</p>`;
  }
}

function renderEmployeeSubmissions() {
  if (!mySubmissionsHead || !mySubmissionsBody) return;

  mySubmissionsHead.innerHTML = `
    <tr>
      <th>Assessment ID</th>
      <th>Vendor</th>
      <th>Purpose</th>
      <th>Status</th>
      <th>Assessment Date</th>
    </tr>
  `;

  if (!employeeAssessmentRows.length) {
    mySubmissionsBody.innerHTML = `<tr><td colspan="5" class="empty-cell">No vendor assessments yet.</td></tr>`;
    return;
  }

  mySubmissionsBody.innerHTML = employeeAssessmentRows.map((assessment) => `
    <tr>
      <td><strong>${escapeHTML(assessment.assessment_code)}</strong></td>
      <td>${escapeHTML(assessment.company_name)}</td>
      <td>${escapeHTML(assessment.purpose || "N/A")}</td>
      <td><span class="status-pill ${statusClass(assessment.overall_status)}">${escapeHTML(assessment.overall_status || "In Review")}</span></td>
      <td>${escapeHTML(formatDate(assessment.assessment_date))}</td>
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
      const savedVendor = await api("/vendors", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      addVendorForm.reset();
      if (vendorSuccessPanel) vendorSuccessPanel.classList.add("hidden");

      if (currentRole === "employee") {
        await loadEmployeeData();

        activeMainAssessment = null;

        if (infosecAssessmentCode) {
          infosecAssessmentCode.value = "";
          infosecAssessmentCode.placeholder = "Auto-generated ID";
        }

        if (infosecAssessmentDate) {
          infosecAssessmentDate.value = getTodayDateInputValue();
        }

        if (infosecVendorSelect && savedVendor.vendor_id) {
          infosecVendorSelect.value = String(savedVendor.vendor_id);
        }

        if (existingInfoSecAssessment) {
          existingInfoSecAssessment.value = "";
        }

        if (infosecPurpose) {
          infosecPurpose.value = "";
        }

        updateCurrentlyAssessingCard({
          company_name: payload.company_name,
          product_services_offered: payload.product_services_offered
        });

        if (infosecQuestionsWrap) {
          infosecQuestionsWrap.innerHTML = `<p class="empty-cell">Vendor saved. Select an assessment date and purpose, then click Create Assessment to assign it to departments.</p>`;
        }

        showPage("vendor-assessment");
        showAssessmentSuccess(
          `Success. Vendor ${payload.company_name} saved.`,
          "Vendor saved. Create a Vendor Assessment to assign it to IT, InfoSec, Management, DPO, HR, and Compliance."
        );
        return;
      }

      if (isDepartmentRole()) {
        await loadDepartmentWorkflowData();
        showPage("vendor-assessment");
        showAssessmentSuccess(
          `Success. Vendor ${payload.company_name} saved.`,
          "Vendor saved. A main Vendor Assessment must be created before department forms can be answered."
        );
      }
    } catch (error) {
      alert(error.message);
    }
  });
}


async function loadDepartmentWorkflowData() {
  const [queue, assessments, pending, questions, vendors] = await Promise.all([
    api("/department/queue"),
    api("/department/assessments"),
    api("/department/pending-approval"),
    api("/department/questions"),
    api("/vendors/mine")
  ]);

  departmentQueueRows = queue;
  departmentAssessmentRows = assessments;
  departmentPendingRows = pending;
  departmentQuestions = questions;
  employeeRows = vendors;

  renderDepartmentDashboard();
  renderDepartmentQueue();
  renderDepartmentSubmissions();
  renderPendingApproval();
  populateDepartmentAssessmentDropdowns();
}

function renderDepartmentDashboard() {
  if (!departmentStatsGrid) return;
  departmentStatsGrid.classList.remove("hidden");
  if (adminStatsGrid) adminStatsGrid.classList.add("hidden");

  const pending = departmentAssessmentRows.filter((item) => ["Pending", "Draft"].includes(item.department_status || "Pending")).length;
  const submitted = departmentAssessmentRows.filter((item) => item.department_status === "Pending Admin Approval" || item.department_status === "Approved").length;
  const rejected = departmentAssessmentRows.filter((item) => item.department_status === "Rejected").length;

  if (deptTotalAssigned) deptTotalAssigned.textContent = departmentAssessmentRows.length;
  if (deptPending) deptPending.textContent = pending;
  if (deptReviewed) deptReviewed.textContent = submitted;
  if (deptRejected) deptRejected.textContent = rejected;

  if (!dashboardTableHead || !dashboardTableBody) return;
  if (dashboardTableTitle) dashboardTableTitle.textContent = `Recent ${getRoleLabel()} Vendor Assessments`;
  dashboardTableHead.innerHTML = `
    <tr>
      <th>Assessment ID</th>
      <th>Vendor</th>
      <th>Purpose</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  `;

  const rows = departmentQueueRows.slice(0, 5);
  if (!rows.length) {
    dashboardTableBody.innerHTML = `<tr><td colspan="5" class="empty-cell">No vendor assessments yet.</td></tr>`;
    return;
  }

  dashboardTableBody.innerHTML = rows.map((item) => `
    <tr>
      <td><strong>${escapeHTML(item.assessment_code)}</strong></td>
      <td>${escapeHTML(item.company_name)}</td>
      <td>${escapeHTML(item.purpose || "N/A")}</td>
      <td><span class="status-pill ${statusClass(item.department_status)}">${escapeHTML(item.department_status || "Pending")}</span></td>
      <td><button type="button" class="small-action-btn" onclick="startDepartmentAssessment(${item.assessment_id})">Assess</button></td>
    </tr>
  `).join("");
}

function renderDepartmentQueue() {
  if (!vendorQueueBody) return;
  if (!departmentQueueRows.length) {
    vendorQueueBody.innerHTML = `<tr><td colspan="6" class="empty-cell">No vendor assessments waiting for your department.</td></tr>`;
    return;
  }

  vendorQueueBody.innerHTML = departmentQueueRows.map((item) => `
    <tr>
      <td><span class="status-pill ${statusClass(item.department_status)}">${escapeHTML(item.assessment_code)}</span></td>
      <td><strong>${escapeHTML(item.company_name)}</strong><br><small>${escapeHTML(item.product_services_offered || "N/A")}</small></td>
      <td>${escapeHTML(getRoleLabel())}</td>
      <td>${escapeHTML(item.created_by || "N/A")}</td>
      <td><span class="status-pill ${statusClass(item.department_status)}">${escapeHTML(item.department_status || "Pending")}</span></td>
      <td>
        <div class="button-row">
          <button type="button" class="green-action-btn" onclick="startDepartmentAssessment(${item.assessment_id})">Assess <i class="fa-solid fa-arrow-right"></i></button>
          <button type="button" class="red-action-btn" onclick="quickRejectDepartmentAssessment(${item.assessment_id})">Reject</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderDepartmentSubmissions() {
  if (!mySubmissionsHead || !mySubmissionsBody || !isDepartmentRole()) return;
  mySubmissionsHead.innerHTML = `
    <tr>
      <th>Assessment ID</th>
      <th>Vendor</th>
      <th>Department</th>
      <th>Status</th>
      <th>Assessment Date</th>
    </tr>
  `;

  if (!departmentAssessmentRows.length) {
    mySubmissionsBody.innerHTML = `<tr><td colspan="5" class="empty-cell">No assessments yet.</td></tr>`;
    return;
  }

  mySubmissionsBody.innerHTML = departmentAssessmentRows.map((item) => `
    <tr>
      <td><strong>${escapeHTML(item.assessment_code)}</strong></td>
      <td>${escapeHTML(item.company_name)}</td>
      <td>${escapeHTML(getRoleLabel())}</td>
      <td><span class="status-pill ${statusClass(item.department_status)}">${escapeHTML(item.department_status || "Pending")}</span></td>
      <td>${escapeHTML(formatDate(item.assessment_date))}</td>
    </tr>
  `).join("");
}

function renderPendingApproval() {
  if (!pendingApprovalBody) return;
  if (!departmentPendingRows.length) {
    pendingApprovalBody.innerHTML = `<tr><td colspan="5" class="empty-cell">No pending approvals yet.</td></tr>`;
    return;
  }

  pendingApprovalBody.innerHTML = departmentPendingRows.map((item) => `
    <tr>
      <td><strong>${escapeHTML(item.assessment_code)}</strong></td>
      <td>${escapeHTML(item.company_name)}</td>
      <td>${escapeHTML(getRoleLabel(item.department_role))}</td>
      <td><span class="status-pill ${statusClass(item.department_status)}">${escapeHTML(item.department_status)}</span></td>
      <td>${escapeHTML(formatDate(item.submitted_at))}</td>
    </tr>
  `).join("");
}

function populateDepartmentAssessmentDropdowns() {
  if (currentRole !== "employee" && !isDepartmentRole()) return;

  if (infosecVendorSelect && isDepartmentRole()) {
    infosecVendorSelect.innerHTML = `<option value="">Select Assessment / Vendor</option>`;
    departmentAssessmentRows.forEach((item) => {
      infosecVendorSelect.innerHTML += `<option value="${item.assessment_id}">${escapeHTML(item.assessment_code)} - ${escapeHTML(item.company_name)}</option>`;
    });
  }

  if (existingInfoSecAssessment && isDepartmentRole()) {
    existingInfoSecAssessment.innerHTML = `<option value="">Select Existing Assessment</option>`;
    departmentAssessmentRows.forEach((item) => {
      existingInfoSecAssessment.innerHTML += `
        <option value="${item.assessment_id}">
          ${escapeHTML(item.assessment_code)} - ${escapeHTML(getRoleLabel())} - ${escapeHTML(item.company_name)} - ${escapeHTML(item.department_status || "Pending")}
        </option>
      `;
    });
  }
}

function updateCurrentlyAssessingCard(assessment) {
  if (!assessment) return;
  if (currentlyAssessingVendor) currentlyAssessingVendor.textContent = assessment.company_name || "Selected Vendor";
  if (currentlyAssessingServices) currentlyAssessingServices.textContent = assessment.product_services_offered || "No service details provided.";
}

async function startDepartmentAssessment(assessmentId) {
  try {
    await api(`/department/assessments/${assessmentId}/start`, { method: "POST", body: JSON.stringify({}) });
    await loadDepartmentAssessment(assessmentId);
    showPage("vendor-assessment");
  } catch (error) {
    alert(error.message);
  }
}

async function loadDepartmentAssessment(assessmentId) {
  const data = await api(`/department/assessments/${assessmentId}`);
  activeMainAssessment = data.assessment;
  activeDepartmentAssessment = data.department_assessment;
  departmentQuestions = data.questions || departmentQuestions;
  activeDepartmentAnswers = {};
  (data.answers || []).forEach((answer) => {
    activeDepartmentAnswers[answer.question_index] = answer;
  });

  if (infosecAssessmentCode) infosecAssessmentCode.value = activeMainAssessment.assessment_code || "";
  if (infosecAssessmentDate) infosecAssessmentDate.value = formatDateForInput(activeMainAssessment.assessment_date || new Date());
  if (infosecVendorSelect) infosecVendorSelect.value = String(activeMainAssessment.assessment_id);
  if (existingInfoSecAssessment) existingInfoSecAssessment.value = String(activeMainAssessment.assessment_id);
  if (infosecPurpose) infosecPurpose.value = activeMainAssessment.purpose || "Accreditation";
  updateCurrentlyAssessingCard(activeMainAssessment);
  renderDepartmentFormQuestions();
}

function renderDepartmentFormQuestions() {
  if (!infosecQuestionsWrap) return;
  if (!departmentQuestions.length) {
    infosecQuestionsWrap.innerHTML = `<p class="empty-cell">No questions found for this department.</p>`;
    return;
  }

  let currentSection = "";
  let html = "";

  departmentQuestions.forEach((question) => {
    const index = question.question_index;
    const saved = activeDepartmentAnswers[index] || {};
    const response = saved.response || "";
    const explanation = saved.explanation || "";
    const artifactName = saved.artifact_name || "";

    if (question.section_name !== currentSection) {
      currentSection = question.section_name;
      html += `<div class="is-group-title"><h3>${escapeHTML(currentSection)}</h3><p>${escapeHTML(getRoleLabel())} Questionnaire</p></div>`;
    }

    if (currentRole === "employee") {
      html += `
        <div class="is-question-card" data-question-index="${index}">
          <h4>${index + 1}. ${escapeHTML(question.question_text)}</h4>
          <div class="is-answer-grid">
            <div class="field-group" style="grid-column: 1 / -1;">
              <label>Vendor Response</label>
              <textarea class="is-explanation" data-index="${index}" placeholder="Enter vendor information answer" required>${escapeHTML(explanation)}</textarea>
              <select class="is-response hidden" data-index="${index}">
                <option value="TEXT_ANSWER" selected>TEXT_ANSWER</option>
              </select>
            </div>
            <div class="field-group">
              <label>Supporting Document</label>
              <input type="file" class="is-artifact" data-index="${index}" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
              <p class="artifact-note">Optional. ${artifactName ? `Current: ${escapeHTML(artifactName)}` : ""}</p>
            </div>
          </div>
        </div>
      `;
      return;
    }

    html += `
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
  });

  infosecQuestionsWrap.innerHTML = html;
}

async function createOrStartAssessment() {
  const selectedValue = infosecVendorSelect?.value || "";
  const purpose = infosecPurpose?.value || "";
  const assessmentDate = infosecAssessmentDate?.value || "";

  if (!selectedValue) {
    alert(currentRole === "employee" ? "Please select a vendor first." : "Please select a vendor assessment first.");
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
    if (currentRole === "employee") {
      const assessment = await api("/vendor-assessments", {
        method: "POST",
        body: JSON.stringify({ vendor_id: selectedValue, purpose, assessment_date: assessmentDate })
      });
      activeMainAssessment = assessment;
      if (infosecAssessmentCode) infosecAssessmentCode.value = assessment.assessment_code || "";
      if (infosecVendorSelect) infosecVendorSelect.value = String(assessment.vendor_id);
      if (existingInfoSecAssessment) existingInfoSecAssessment.value = String(assessment.assessment_id);
      updateCurrentlyAssessingCard(assessment);
      await loadEmployeeData();
      if (infosecVendorSelect) infosecVendorSelect.value = String(assessment.vendor_id);
      if (existingInfoSecAssessment) existingInfoSecAssessment.value = String(assessment.assessment_id);
      await loadEmployeeAssessment(assessment.assessment_id);
      showAssessmentSuccess(
        `Vendor Assessment ${assessment.assessment_code || "created"} created.`,
        "Assessment created and assigned to IT, InfoSec, Management, DPO, HR, and Compliance."
      );
      showToast("Vendor assessment created and assigned to departments.");
      return;
    }

    if (isDepartmentRole()) {
      await startDepartmentAssessment(selectedValue);
      showToast("Department assessment opened.");
    }
  } catch (error) {
    alert(error.message);
  }
}

async function submitDepartmentForm(event) {
  event.preventDefault();

  if (!activeMainAssessment || !activeDepartmentAssessment) {
    alert("Please select or start an assessment first.");
    return;
  }

  const answers = [];
  const formData = new FormData();

  for (const question of departmentQuestions) {
    const index = question.question_index;
    const response = document.querySelector(`.is-response[data-index="${index}"]`)?.value || "";
    const explanation = document.querySelector(`.is-explanation[data-index="${index}"]`)?.value.trim() || "";
    const artifactInput = document.querySelector(`.is-artifact[data-index="${index}"]`);
    const existing = activeDepartmentAnswers[index] || {};

    if (currentRole === "employee") {
      if (!explanation) {
        alert(`Please answer Vendor Information question ${index + 1}.`);
        return;
      }
    } else {
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
    }
    if (artifactInput?.files?.length) {
      formData.append(`artifact_${index}`, artifactInput.files[0]);
    }

    answers.push({
      question_index: index,
      section_name: question.section_name,
      question_text: question.question_text,
      response,
      explanation,
      existing_artifact_path: existing.artifact_path || null,
      existing_artifact_name: existing.artifact_name || null
    });
  }

  formData.append("answers", JSON.stringify(answers));

  try {
    await api(`/department/assessments/${activeMainAssessment.assessment_id}/submit`, { method: "POST", body: formData });
    showToast(currentRole === "employee" ? "Vendor Information saved." : `${getRoleLabel()} assessment submitted to Admin.`);
    if (currentRole === "employee") {
      await loadEmployeeData();
      showPage("my-submissions");
    } else {
      await loadDepartmentWorkflowData();
      showPage("pending-approval");
    }
  } catch (error) {
    alert(error.message);
  }
}

async function quickRejectDepartmentAssessment(assessmentId) {
  const comment = prompt("Reason for rejection:");
  if (comment === null) return;

  try {
    await startDepartmentAssessment(assessmentId);
    activeMainAssessment = { assessment_id: assessmentId };
    showToast("Open the assessment and submit a rejected assessment with explanation.");
  } catch (error) {
    alert(error.message);
  }
}

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
  dashboardTableHead.innerHTML = `<tr><th>Vendor</th><th>Services</th><th>Submitted By</th><th>Overall Status</th><th>Date Submitted</th></tr>`;
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

function populateSignoffRole() {
  const signoffRole = document.getElementById("signoffRole");
  if (!signoffRole) return;
  if (isDepartmentRole()) {
    signoffRole.innerHTML = `<option value="${escapeHTML(getRoleLabel())}">${escapeHTML(getRoleLabel())}</option>`;
  }
}

async function submitSignoff(event) {
  event.preventDefault();
  const formData = new FormData();
  formData.append("signer_name", document.getElementById("signoffName").value.trim());
  formData.append("signoff_status", document.querySelector("input[name='approvalDecision']:checked")?.value || "Pending");
  if (activeMainAssessment?.assessment_id) formData.append("assessment_id", activeMainAssessment.assessment_id);
  if (activeDepartmentAssessment?.department_assessment_id) formData.append("department_assessment_id", activeDepartmentAssessment.department_assessment_id);
  if (signatureFile?.files?.length) formData.append("signature", signatureFile.files[0]);

  try {
    await api("/department/signoff", { method: "POST", body: formData });
    signoffForm.reset();
    populateSignoffRole();
    if (signatureFileName) signatureFileName.textContent = "Upload Signature";
    showToast("Sign-off saved.");
  } catch (error) {
    alert(error.message);
  }
}


async function generateAdminExcel() {
  try {
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating...`;
    }

    const response = await fetch("/admin/export-excel", {
      credentials: "same-origin"
    });

    if (!response.ok) {
      let message = "Failed to generate Excel report.";
      try {
        const data = await response.json();
        message = data.message || message;
      } catch (_error) {}
      alert(message);
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Validify_Due_Diligence_Report.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    showToast("Excel report generated.");
  } catch (error) {
    console.error("Generate Excel error:", error);
    alert("Failed to generate Excel report.");
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      updateTopActionButton();
    }
  }
}

function updateTopActionButton() {
  if (!refreshBtn) return;

  if (currentRole === "admin") {
    refreshBtn.innerHTML = `<i class="fa-solid fa-file-excel"></i> Generate Excel`;
  } else {
    refreshBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> Refresh`;
  }
}

async function loadEmployeeAssessment(assessmentId) {
  const data = await api(`/department/assessments/${assessmentId}`);
  activeMainAssessment = data.assessment;
  activeDepartmentAssessment = data.department_assessment;
  departmentQuestions = data.questions || [];
  activeDepartmentAnswers = {};

  (data.answers || []).forEach((answer) => {
    activeDepartmentAnswers[answer.question_index] = answer;
  });

  if (infosecAssessmentCode) infosecAssessmentCode.value = activeMainAssessment.assessment_code || "";
  if (infosecAssessmentDate) infosecAssessmentDate.value = formatDateForInput(activeMainAssessment.assessment_date || new Date());
  if (infosecVendorSelect) infosecVendorSelect.value = String(activeMainAssessment.vendor_id || "");
  if (existingInfoSecAssessment) existingInfoSecAssessment.value = String(activeMainAssessment.assessment_id || "");
  if (infosecPurpose) infosecPurpose.value = activeMainAssessment.purpose || "Accreditation";

  updateCurrentlyAssessingCard(activeMainAssessment);
  renderDepartmentFormQuestions();
}

function setupEvents() {
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      if (currentRole === "admin") {
        await generateAdminExcel();
        return;
      }
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
      try { await fetch("/logout", { method: "POST", credentials: "same-origin" }); } catch (error) { console.error(error); }
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
      if (currentRole === "employee") {
        await loadEmployeeAssessment(id);
      } else if (isDepartmentRole()) {
        await loadDepartmentAssessment(id);
      }
      showPage("vendor-assessment");
    });
  }

  if (infosecVendorSelect) {
    infosecVendorSelect.addEventListener("change", () => {
      if (currentRole === "employee") {
        const found = employeeRows.find((item) => String(item.vendor_id) === String(infosecVendorSelect.value));
        if (found) updateCurrentlyAssessingCard(found);
      } else if (isDepartmentRole()) {
        const found = departmentAssessmentRows.find((item) => String(item.assessment_id) === String(infosecVendorSelect.value));
        if (found) updateCurrentlyAssessingCard(found);
      }
    });
  }

  if (createInfoSecAssessmentBtn) createInfoSecAssessmentBtn.addEventListener("click", createOrStartAssessment);
  if (cancelInfoSecAssessmentBtn) cancelInfoSecAssessmentBtn.addEventListener("click", () => showPage(isDepartmentRole() ? "vendor-queue" : "my-submissions"));
  if (infosecForm) infosecForm.addEventListener("submit", submitDepartmentForm);
  if (signatureFile) signatureFile.addEventListener("change", () => {
    signatureFileName.textContent = signatureFile.files.length > 0 ? signatureFile.files[0].name : "Upload Signature";
  });
  if (signoffForm) signoffForm.addEventListener("submit", submitSignoff);
  if (cancelSignoffBtn) cancelSignoffBtn.addEventListener("click", () => showPage("dashboard"));
}

setupAddVendorForm();
setupEvents();
checkLoggedInUser();
