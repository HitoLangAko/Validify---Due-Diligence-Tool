// DEPARTMENT PAGE JS - separated from original script.js
window.VALIDIFY_ALLOWED_ROLES = ["it", "infosec", "management", "dpo", "hr", "compliance"];

const VALIDIFY_ROLE_PAGES = {
  employee: "employee.html",
  admin: "employee.html",
  it: "department.html",
  infosec: "department.html",
  management: "department.html",
  dpo: "department.html",
  hr: "department.html",
  compliance: "department.html"
};

function redirectToRoleHome(role) {
  window.location.href = VALIDIFY_ROLE_PAGES[role] || "login.html";
}

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
let adminReviewRows = [];
let selectedReviewAssessment = null;
let reportingSignoffRows = [];
let selectedReportingAssessment = null;
let assessmentSummaryData = null;

const roleLabels = {
  employee: "Employee / Compliance Officer",
  it: "IT",
  infosec: "InfoSec",
  management: "Management",
  dpo: "DPO",
  hr: "HR",
  compliance: "Compliance",
  admin: "Employee / Compliance Officer"
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
  "department-reviews": "Department Reviews",
  "assessment-review": "Assessment Review",
  "reporting-signoff": "Reporting Signoff",
  "assessment-summary": "Assessment Summary",
  profile: "Profile Settings",
  help: "Help"
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
const submitDepartmentFormBtn = document.getElementById("submitDepartmentFormBtn");
const submitDepartmentFormText = document.getElementById("submitDepartmentFormText");
const cancelInfoSecAssessmentBtn = document.getElementById("cancelInfoSecAssessmentBtn");
const createInfoSecAssessmentBtn = document.getElementById("createInfoSecAssessmentBtn");
const vendorAssessmentNavBtn = document.getElementById("vendorAssessmentNavBtn");
const signoffForm = document.getElementById("signoffForm");
const signatureFile = document.getElementById("signatureFile");
const signatureFileName = document.getElementById("signatureFileName");
const cancelSignoffBtn = document.getElementById("cancelSignoffBtn");
const assessmentReviewVendorSelect = document.getElementById("assessmentReviewVendorSelect");
const assessmentReviewDetailsWrap = document.getElementById("assessmentReviewDetailsWrap");
const assessmentReviewCode = document.getElementById("assessmentReviewCode");
const assessmentReviewVendorName = document.getElementById("assessmentReviewVendorName");
const assessmentReviewPurpose = document.getElementById("assessmentReviewPurpose");
const assessmentReviewDate = document.getElementById("assessmentReviewDate");
const assessmentReviewStatus = document.getElementById("assessmentReviewStatus");
const assessmentReviewServices = document.getElementById("assessmentReviewServices");
const assessmentReviewComment = document.getElementById("assessmentReviewComment");
const finalizeAssessmentBtn = document.getElementById("finalizeAssessmentBtn");
const reportingSignoffAssessmentName = document.getElementById("reportingSignoffAssessmentName");
const reportingSignoffVendorName = document.getElementById("reportingSignoffVendorName");
const reportingSignoffOverallStatus = document.getElementById("reportingSignoffOverallStatus");
const reportingSignoffNotes = document.getElementById("reportingSignoffNotes");
const reportingSignoffStatusList = document.getElementById("reportingSignoffStatusList");
const assessmentSummaryVendorName = document.getElementById("assessmentSummaryVendorName");
const assessmentSummaryServiceType = document.getElementById("assessmentSummaryServiceType");
const summaryDDFStatus = document.getElementById("summaryDDFStatus");
const summaryInfosecStatus = document.getElementById("summaryInfosecStatus");
const summarySignoffStatus = document.getElementById("summarySignoffStatus");
const rejectAssessmentBtn = document.getElementById("rejectAssessmentBtn");
const approveAssessmentBtn = document.getElementById("approveAssessmentBtn");
const profileBtn = document.getElementById("profileBtn");
const helpBtn = document.getElementById("helpBtn");
const profileForm = document.getElementById("profileForm");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const profilePhotoPreview = document.getElementById("profilePhotoPreview");
const profileFirstName = document.getElementById("profileFirstName");
const profileLastName = document.getElementById("profileLastName");
const profileJobTitle = document.getElementById("profileJobTitle");
const profileWorkEmail = document.getElementById("profileWorkEmail");

function getRoleLabel(role = currentRole) {
  return roleLabels[role] || role || "User";
}

function isDepartmentRole(role = currentRole) {
  return departmentRoles.includes(role);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("Pending Admin Approval", "Pending Compliance Review")
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


const ddfSectionOrder = [
  "Vendor Information",
  "Consumer",
  "IT Risk Management",
  "Compliance",
  "Resiliency",
  "Data Privacy",
  "Environmental and Social Risk Management"
];

function getDDFReviewContainer() {
  let container = document.getElementById("assessmentReviewDDFBody");

  if (!container) {
    const tab = document.getElementById("tabDDFContent");
    if (!tab) return null;

    tab.innerHTML = `<div id="assessmentReviewDDFBody" class="admin-ddf-review-wrap"></div>`;
    return document.getElementById("assessmentReviewDDFBody");
  }

  if (container.tagName && container.tagName.toLowerCase() === "tbody") {
    const tableWrap = container.closest(".table-wrap");

    if (tableWrap) {
      tableWrap.outerHTML = `<div id="assessmentReviewDDFBody" class="admin-ddf-review-wrap"></div>`;
      return document.getElementById("assessmentReviewDDFBody");
    }
  }

  return container;
}

function renderArtifactLink(item) {
  if (!item) return "-";

  const artifactPath =
    item.artifact_path ||
    item.file_path ||
    item.supporting_document_path ||
    "";

  const artifactName =
    item.artifact_name ||
    item.file_name ||
    item.supporting_document_name ||
    "Open file";

  if (!artifactPath) return "-";

  return `
    <a href="${escapeHTML(artifactPath)}" target="_blank" class="review-file-link">
      ${escapeHTML(artifactName)}
    </a>
  `;
}

function getDDFDisplayResponse(answer) {
  const response = String(answer?.response || "").trim();

  if (["TEXT_ANSWER", "DATE_ANSWER"].includes(response)) {
    return answer.explanation || answer.vendor_response || "-";
  }

  if (response === "FILE_ANSWER") {
    return "File submitted";
  }

  return response || answer.vendor_response || answer.explanation || "-";
}

function normalizeDDFAnswers(assessment) {
  const normalized = [];

  const vendorInfoAnswers = assessment?.vendor_information_answers || [];

  vendorInfoAnswers.forEach((answer) => {
    normalized.push({
      section_name: "Vendor Information",
      question_text: answer.question_text || "",
      response: answer.vendor_response || answer.answer_text || answer.response || "",
      explanation: answer.company_comment || answer.explanation || "",
      artifact_path: answer.artifact_path || answer.file_path || answer.supporting_document_path || "",
      artifact_name: answer.artifact_name || answer.file_name || answer.supporting_document_name || ""
    });
  });

  const departmentAnswers = assessment?.department_answers?.length
    ? assessment.department_answers
    : (assessment?.department_assessments || []).flatMap((dept) => {
        return (dept.answers || []).map((answer) => ({
          ...answer,
          department_role: dept.department_role
        }));
      });

  departmentAnswers.forEach((answer) => {
    if (!ddfSectionOrder.includes(answer.section_name)) return;

    normalized.push({
      section_name: answer.section_name,
      question_text: answer.question_text || "",
      response: answer.response || "",
      explanation: answer.explanation || "",
      artifact_path: answer.artifact_path || "",
      artifact_name: answer.artifact_name || ""
    });
  });

  return normalized;
}

function renderAdminDueDiligenceForm(assessment) {
  const container = getDDFReviewContainer();
  if (!container) return;

  if (!assessment) {
    container.innerHTML = `<p class="empty-cell">Select an assessment to view Due Diligence Form responses.</p>`;
    return;
  }

  function normalizeInformationSecurityAnswers(assessment) {
  const departmentAnswers = assessment?.department_answers?.length
    ? assessment.department_answers
    : (assessment?.department_assessments || []).flatMap((dept) => {
        return (dept.answers || []).map((answer) => ({
          ...answer,
          department_role: dept.department_role
        }));
      });

  return departmentAnswers.filter((answer) => {
    return (
      answer.department_role === "infosec" ||
      answer.section_name === "Information Security"
    );
  });
}

function renderAdminInformationSecurityForm(assessment) {
  const container = document.getElementById("infosecReviewDetailsWrap");
  if (!container) return;

  if (!assessment) {
    container.innerHTML = `<p class="empty-cell">Select an assessment to view Information Security responses.</p>`;
    return;
  }

  const answers = normalizeInformationSecurityAnswers(assessment);
  const infosecDept = (assessment.department_assessments || []).find(
    (dept) => dept.department_role === "infosec"
  );

  if (!answers.length) {
    container.innerHTML = `
      <div class="admin-is-summary-card">
        <div>
          <span class="review-label">Department</span>
          <strong>Information Security</strong>
        </div>

        <div>
          <span class="review-label">Status</span>
          <span class="status-pill ${statusClass(infosecDept?.department_status)}">
            ${escapeHTML(infosecDept?.department_status || "Pending")}
          </span>
        </div>

        <div>
          <span class="review-label">Submitted By</span>
          <strong>${escapeHTML(infosecDept?.submitted_by || "-")}</strong>
        </div>

        <div>
          <span class="review-label">Date Submitted</span>
          <strong>${escapeHTML(formatDate(infosecDept?.submitted_at))}</strong>
        </div>
      </div>

      <p class="empty-cell">No Information Security answers submitted yet.</p>
    `;
    return;
  }

  let html = `
    <div class="admin-is-summary-card">
      <div>
        <span class="review-label">Department</span>
        <strong>Information Security</strong>
      </div>

      <div>
        <span class="review-label">Status</span>
        <span class="status-pill ${statusClass(infosecDept?.department_status)}">
          ${escapeHTML(infosecDept?.department_status || "Pending")}
        </span>
      </div>

      <div>
        <span class="review-label">Submitted By</span>
        <strong>${escapeHTML(infosecDept?.submitted_by || "-")}</strong>
      </div>

      <div>
        <span class="review-label">Date Submitted</span>
        <strong>${escapeHTML(formatDate(infosecDept?.submitted_at))}</strong>
      </div>
    </div>

    <div class="admin-ddf-section">
      <div class="admin-ddf-section-title">Information Security</div>

      <div class="table-wrap">
        <table class="admin-ddf-table">
          <thead>
            <tr>
              <th>Question</th>
              <th>Response</th>
              <th>Supporting Document</th>
            </tr>
          </thead>
          <tbody>
  `;

  html += answers.map((answer, index) => {
    const displayResponse = getDDFDisplayResponse(answer);
    const rawResponse = String(answer.response || "").trim();

    const showExplanation =
      answer.explanation &&
      !["TEXT_ANSWER", "DATE_ANSWER"].includes(rawResponse) &&
      answer.explanation !== displayResponse;

    return `
      <tr>
        <td class="admin-ddf-question">
          ${index + 1}. ${escapeHTML(answer.question_text || "Question not available.")}
        </td>

        <td>
          <div class="admin-ddf-response">
            ${escapeHTML(displayResponse)}
          </div>

          ${
            showExplanation
              ? `<div class="admin-ddf-explanation">
                  <strong>Explanation:</strong> ${escapeHTML(answer.explanation)}
                </div>`
              : ""
          }
        </td>

        <td>
          ${renderArtifactLink(answer)}
        </td>
      </tr>
    `;
  }).join("");

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

  const answers = normalizeDDFAnswers(assessment);
  let html = "";

  ddfSectionOrder.forEach((sectionName) => {
    const sectionAnswers = answers.filter((answer) => answer.section_name === sectionName);

    html += `
      <div class="admin-ddf-section">
        <div class="admin-ddf-section-title">${escapeHTML(sectionName)}</div>

        <div class="table-wrap">
          <table class="admin-ddf-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Vendor / Department Response</th>
                <th>Supporting Document</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (!sectionAnswers.length) {
      html += `
        <tr>
          <td colspan="3" class="empty-cell">No submitted answers yet.</td>
        </tr>
      `;
    } else {
      html += sectionAnswers.map((answer, index) => {
        const displayResponse = getDDFDisplayResponse(answer);
        const rawResponse = String(answer.response || "").trim();
        const showExplanation =
          answer.explanation &&
          !["TEXT_ANSWER", "DATE_ANSWER"].includes(rawResponse) &&
          answer.explanation !== displayResponse;

        return `
          <tr>
            <td class="admin-ddf-question">
              ${index + 1}. ${escapeHTML(answer.question_text || "Question not available.")}
            </td>

            <td>
              <div class="admin-ddf-response">
                ${escapeHTML(displayResponse)}
              </div>

              ${
                showExplanation
                  ? `<div class="admin-ddf-explanation">
                      <strong>Explanation:</strong> ${escapeHTML(answer.explanation)}
                    </div>`
                  : ""
              }
            </td>

            <td>
              ${renderArtifactLink(answer)}
            </td>
          </tr>
        `;
      }).join("");
    }

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function getAssessmentReviewDisplayStatus(assessment) {
  const departments = assessment?.department_assessments || [];
  const requiredDepartments = ["management", "it", "compliance", "dpo", "hr", "infosec"];

  const completedDepartments = requiredDepartments.filter((role) => {
    const dept = departments.find((item) => item.department_role === role);

    return dept && ["Pending Admin Approval", "Approved", "Completed"].includes(dept.department_status);
  });

  return completedDepartments.length === requiredDepartments.length ? "Ready" : "Pending";
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

function updateAssessmentSubmitButtonText() {
  if (!submitDepartmentFormText) return;

  submitDepartmentFormText.textContent = currentRole === "employee"
    ? "Submit Vendor Information"
    : "Submit Department Form to Compliance Officer";
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

    if (
      Array.isArray(window.VALIDIFY_ALLOWED_ROLES) &&
      !window.VALIDIFY_ALLOWED_ROLES.includes(currentRole)
    ) {
      redirectToRoleHome(currentRole);
      return;
    }
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

  const vendorAssessmentCard = document.querySelector("#vendorAssessmentPage .vendor-assessment-card");

  if (vendorAssessmentCard) {
    vendorAssessmentCard.classList.toggle("hidden", isDepartmentRole());
  }

  const displayName = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() || currentUser.full_name || "Account";

  if (accountUserName) accountUserName.textContent = displayName;
  if (accountMenuUserName) accountMenuUserName.textContent = displayName;

  updateProfilePhotoUI(currentUser.profile_photo_path);
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
      roleHelper.textContent = "Compliance Officer Portal: monitor vendors and department reviews.";
    }
  }

  populateSignoffRole();
  updateTopActionButton();
  updateAssessmentSubmitButtonText();
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
  if (page === "profile") {
  fillProfileForm();
  }
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
      if (_page === "assessment-review") {
        await loadAdminReviewData();
      }
      if (_page === "reporting-signoff") {
        await loadReportingSignoffData();
      }
      if (_page === "assessment-summary") {
        await loadAssessmentSummaryData();
      }
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
          infosecQuestionsWrap.innerHTML = `<p class="empty-cell">Vendor draft saved. It is not assigned to departments yet. Select an assessment date and purpose, then click Create Assessment.</p>`;
        }

        showPage("vendor-assessment");
        showAssessmentSuccess(
          `Success. Vendor ${payload.company_name} saved.`,
          "Vendor draft saved. It will only be assigned to IT, InfoSec, Management, DPO, HR, and Compliance after you click Create Assessment."
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
  updateAssessmentSubmitButtonText();
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
      updateAssessmentSubmitButtonText();
      showAssessmentSuccess(
        `Vendor Assessment ${assessment.assessment_code || "created"} created.`,
        "Assessment created and assigned to departments. Complete the Vendor Information section, then click Submit Vendor Information so the Compliance Officer can review it and include it in the Excel report."
      );
      showToast("Vendor assessment created. You can now submit Vendor Information.");
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
    showToast(currentRole === "employee" ? "Vendor Information submitted to Compliance Officer." : `${getRoleLabel()} assessment submitted to Compliance Officer.`);
    if (currentRole === "employee") {
      await loadEmployeeData();
      await loadEmployeeAssessment(activeMainAssessment.assessment_id);
      showAssessmentSuccess(
        "Vendor Information submitted.",
        "Vendor Information was saved for Compliance Officer review and will be included in the Excel report."
      );
      showPage("vendor-assessment");
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

  const pendingVendors = adminRows.filter((vendor) => {
    return Number(vendor.pending_reviews || 0) > 0 ||
      ["Pending", "In Review", "Pending Admin Approval"].includes(vendor.overall_status || "Pending");
  }).length;

  const completed = adminRows.filter((item) => item.overall_status === "Completed").length;
  const rejected = adminRows.filter((item) => item.overall_status === "Rejected").length;

  if (adminTotalVendors) adminTotalVendors.textContent = adminRows.length;
  if (adminPendingReviews) adminPendingReviews.textContent = pendingVendors;
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


async function loadAdminReviewData() {
  const data = await api("/admin/review-assessments");
  adminReviewRows = Array.isArray(data) ? data : data.assessments || [];
  renderAssessmentReviewPage();
}

async function loadReportingSignoffData() {
  const selectedId = selectedReviewAssessment?.assessment_id || selectedReportingAssessment?.assessment_id || "";
  const url = selectedId ? `/admin/reporting-signoff?assessment_id=${encodeURIComponent(selectedId)}` : "/admin/reporting-signoff";
  const data = await api(url);
  reportingSignoffRows = Array.isArray(data) ? data : data.signoffs || data.departments || [];
  selectedReportingAssessment = data.assessment || selectedReviewAssessment || (reportingSignoffRows[0] ? reportingSignoffRows[0].assessment : null);
  renderReportingSignoffPage();
}

async function loadAssessmentSummaryData() {
  const selectedId = selectedReviewAssessment?.assessment_id || selectedReportingAssessment?.assessment_id || "";
  const url = selectedId ? `/admin/assessment-summary?assessment_id=${encodeURIComponent(selectedId)}` : "/admin/assessment-summary";
  assessmentSummaryData = await api(url);
  renderAssessmentSummaryPage();
}

function renderAssessmentReviewPage() {
  if (!assessmentReviewVendorSelect) return;

  assessmentReviewVendorSelect.innerHTML = `<option value="">Select vendor assessment</option>`;
  adminReviewRows.forEach((item) => {
    assessmentReviewVendorSelect.innerHTML += `
      <option value="${item.assessment_id}">${escapeHTML(item.assessment_code)} - ${escapeHTML(item.company_name)}</option>
    `;
  });

  if (selectedReviewAssessment) {
    assessmentReviewVendorSelect.value = String(selectedReviewAssessment.assessment_id);
  }

  if (!selectedReviewAssessment && adminReviewRows.length) {
    selectedReviewAssessment = adminReviewRows[0];
    assessmentReviewVendorSelect.value = String(selectedReviewAssessment.assessment_id);
  }

  updateAssessmentReviewDetails();
  populateAssessmentReviewTabs();
}

function handleAssessmentReviewSelection() {
  if (!assessmentReviewVendorSelect) return;
  const selectedId = assessmentReviewVendorSelect.value;
  selectedReviewAssessment = adminReviewRows.find((item) => String(item.assessment_id) === String(selectedId)) || null;
  selectedReportingAssessment = selectedReviewAssessment;
  updateAssessmentReviewDetails();
  populateAssessmentReviewTabs();
}

function switchAssessmentReviewTab(tabName, clickedButton) {
  document.querySelectorAll("[data-tab]").forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach((content) => content.classList.add("hidden"));

  if (clickedButton) clickedButton.classList.add("active");

  const targetContent = {
    ddf: document.getElementById("tabDDFContent"),
    infosec: document.getElementById("tabInfosecContent"),
    signoff: document.getElementById("tabSignoffContent")
  }[tabName];

  if (targetContent) targetContent.classList.remove("hidden");
}

const adminInfoSecQuestions = [
  "Is there a dedicated security officer or team responsible for overseeing the implementation of the information security programs, awareness, and compliance in your organization?",
  "Does your security officer report to senior management or part of the organization's steering committee?",
  "Do you have documented security policies?",
  "Are the security policies board approved?",
  "Are security policies regularly reviewed to align with ISO 27001, PCI DSS, NIST, or similar standards?",
  "Does your organization undergo regular internal and external security audits?",
  "Do you comply with relevant local and international laws and security regulations?",
  "Are security requirements incorporated in contracts, including data protection clauses?",
  "Do you have an established Information Security Awareness Program?",
  "Are roles and access rights following the least-privilege principle?",
  "Are user privileges regularly reviewed and updated?",
  "Are access logs to sensitive data maintained for access review?",
  "Does your organization encrypt communications and data stored in IT facilities, including data at rest and data in transit?",
  "Do you perform application security testing or assessment before production deployment?",
  "Do you have a security incident response team and procedures in place?",
  "Do you have an Incident Response Plan for ransomware, phishing, and data breach scenarios?"
];

function getInfoSecAnswerRows(assessment) {
  const departmentAnswers = assessment?.department_answers?.length
    ? assessment.department_answers
    : (assessment?.department_assessments || []).flatMap((dept) => {
        return (dept.answers || []).map((answer) => ({
          ...answer,
          department_role: dept.department_role
        }));
      });

  const infosecAnswers = departmentAnswers.filter((answer) => {
    return answer.department_role === "infosec" || answer.section_name === "Information Security";
  });

  return adminInfoSecQuestions.map((questionText, index) => {
    const saved = infosecAnswers.find((answer) => Number(answer.question_index) === index);

    return {
      section_name: "Information Security",
      question_index: index,
      question_text: saved?.question_text || questionText,
      response: saved?.response || "",
      explanation: saved?.explanation || "",
      artifact_path: saved?.artifact_path || "",
      artifact_name: saved?.artifact_name || ""
    };
  });
}

function renderInfoSecArtifactLink(answer) {
  if (!answer?.artifact_path) return "-";

  return `
    <a href="${escapeHTML(answer.artifact_path)}" target="_blank" class="review-file-link">
      ${escapeHTML(answer.artifact_name || "Open file")}
    </a>
  `;
}

function renderAdminInformationSecurityForm(assessment) {
  const container = document.getElementById("infosecReviewDetailsWrap");
  if (!container) return;

  if (!assessment) {
    container.innerHTML = `<p class="empty-cell">Select an assessment to view Information Security responses.</p>`;
    return;
  }

  const infosecDept = (assessment.department_assessments || []).find(
    (dept) => dept.department_role === "infosec"
  );

  const answers = getInfoSecAnswerRows(assessment);

  let html = `
    <div class="admin-is-summary-card">
      <div>
        <span class="review-label">Department</span>
        <strong>Information Security</strong>
      </div>

      <div>
        <span class="review-label">Status</span>
        <span class="status-pill ${statusClass(infosecDept?.department_status)}">
          ${escapeHTML(infosecDept?.department_status || "Pending")}
        </span>
      </div>

      <div>
        <span class="review-label">Submitted By</span>
        <strong>${escapeHTML(infosecDept?.submitted_by || "-")}</strong>
      </div>

      <div>
        <span class="review-label">Date Submitted</span>
        <strong>${escapeHTML(formatDate(infosecDept?.submitted_at))}</strong>
      </div>
    </div>

    <div class="admin-ddf-section">
      <div class="admin-ddf-section-title">Information Security</div>

      <div class="table-wrap">
        <table class="admin-ddf-table">
          <thead>
            <tr>
              <th>Question</th>
              <th>Response</th>
              <th>Explanation</th>
              <th>Supporting Document</th>
            </tr>
          </thead>
          <tbody>
  `;

  html += answers.map((answer, index) => `
    <tr>
      <td class="admin-ddf-question">
        ${index + 1}. ${escapeHTML(answer.question_text)}
      </td>

      <td>
        <div class="admin-ddf-response">
          ${escapeHTML(answer.response || "No response submitted yet.")}
        </div>
      </td>

      <td>
        <div class="admin-ddf-explanation">
          ${escapeHTML(answer.explanation || "-")}
        </div>
      </td>

      <td>
        ${renderInfoSecArtifactLink(answer)}
      </td>
    </tr>
  `).join("");

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function populateAssessmentReviewTabs() {
  if (!selectedReviewAssessment) {
    renderAdminDueDiligenceForm(null);
    renderAdminInformationSecurityForm(null);

    const signoffGrid = document.getElementById("signoffReviewGrid");
    if (signoffGrid) {
      signoffGrid.innerHTML = `<p class="empty-cell">Select an assessment to view sign-off data.</p>`;
    }

    return;
  }

  renderAdminDueDiligenceForm(selectedReviewAssessment);
  renderAdminInformationSecurityForm(selectedReviewAssessment);

  const signoffs = selectedReviewAssessment.department_signoffs || [];
  const signoffGrid = document.getElementById("signoffReviewGrid");

  if (signoffGrid) {
    if (!signoffs.length) {
      signoffGrid.innerHTML = `<p class="empty-cell">No sign-off data available yet.</p>`;
    } else {
      signoffGrid.innerHTML = signoffs.map((signoff) => `
        <div class="signoff-review-item">
          <div class="dept-name">
            ${escapeHTML(signoff.department_name || signoff.role_name || signoff.department || "Unknown")}
          </div>

          <div class="signer-info">
            <span>Signer:</span>
            <strong>${escapeHTML(signoff.signer_name || "-")}</strong>

            <span>Status:</span>
            <span class="status-pill ${statusClass(signoff.status || signoff.signoff_status)}" style="margin-top: 6px;">
              ${escapeHTML(signoff.status || signoff.signoff_status || "Pending")}
            </span>

            <span>Date:</span>
            <strong>${escapeHTML(formatDate(signoff.signed_at || signoff.created_at))}</strong>
          </div>
        </div>
      `).join("");
    }
  }
}

function updateAssessmentReviewDetails() {
  if (!selectedReviewAssessment) {
    if (assessmentReviewCode) assessmentReviewCode.textContent = "-";
    if (assessmentReviewVendorName) assessmentReviewVendorName.textContent = "-";
    if (assessmentReviewPurpose) assessmentReviewPurpose.textContent = "-";
    if (assessmentReviewDate) assessmentReviewDate.textContent = "-";
    if (assessmentReviewServices) assessmentReviewServices.textContent = "-";

    if (assessmentReviewStatus) {
      assessmentReviewStatus.textContent = "Pending";
      assessmentReviewStatus.className = "status-pill status-pending";
    }

    if (finalizeAssessmentBtn) finalizeAssessmentBtn.disabled = true;
    return;
  }

  const displayStatus = getAssessmentReviewDisplayStatus(selectedReviewAssessment);

  if (assessmentReviewCode) {
    assessmentReviewCode.textContent = selectedReviewAssessment.assessment_code || "-";
  }

  if (assessmentReviewVendorName) {
    assessmentReviewVendorName.textContent = selectedReviewAssessment.company_name || "-";
  }

  if (assessmentReviewPurpose) {
    assessmentReviewPurpose.textContent = selectedReviewAssessment.purpose || "-";
  }

  if (assessmentReviewDate) {
    assessmentReviewDate.textContent = formatDate(selectedReviewAssessment.assessment_date);
  }

  if (assessmentReviewServices) {
    assessmentReviewServices.textContent = selectedReviewAssessment.product_services_offered || "-";
  }

  if (assessmentReviewStatus) {
    assessmentReviewStatus.textContent = displayStatus;
    assessmentReviewStatus.className = `status-pill ${displayStatus === "Ready" ? "status-ready" : "status-pending"}`;
  }

  if (finalizeAssessmentBtn) {
    finalizeAssessmentBtn.disabled = displayStatus !== "Ready";
  }
}

async function finalizeAssessment() {
  if (!selectedReviewAssessment) {
    alert("Please select an assessment to finalize.");
    return;
  }

  try {
    await api(`/admin/assessments/${selectedReviewAssessment.assessment_id}/finalize`, {
      method: "POST",
      body: JSON.stringify({ action: "finalize" })
    });
    selectedReportingAssessment = selectedReviewAssessment;
    showToast("Assessment finalized and moved to Reporting & Sign-off.");
    showPage("reporting-signoff");
  } catch (error) {
    alert(error.message);
  }
}

function renderReportingSignoffPage() {
  if (!reportingSignoffStatusList || !reportingSignoffNotes) return;

  const assessment = selectedReportingAssessment || (reportingSignoffRows[0] ? reportingSignoffRows[0].assessment : null);
  if (reportingSignoffAssessmentName) reportingSignoffAssessmentName.textContent = assessment?.assessment_code || "No assessment selected";
  if (reportingSignoffVendorName) reportingSignoffVendorName.textContent = assessment?.company_name || "—";
  if (reportingSignoffOverallStatus) {
    reportingSignoffOverallStatus.textContent = assessment?.overall_status || "Pending";
    reportingSignoffOverallStatus.className = `status-pill ${statusClass(assessment?.overall_status)}`;
  }

  if (!reportingSignoffRows.length) {
    reportingSignoffStatusList.innerHTML = `<tr><td colspan="4" class="empty-cell">No sign-off data available yet.</td></tr>`;
    if (reportingSignoffNotes) reportingSignoffNotes.textContent = "No sign-off submissions are available for this assessment.";
    return;
  }

  const allDone = reportingSignoffRows.every((item) => ["Signed", "Approved"].includes(item.status));
  if (reportingSignoffNotes) {
    reportingSignoffNotes.textContent = allDone
      ? "All departments have submitted their sign-off. Review the summary for final approval or rejection."
      : "Waiting for all departments to submit sign-off. The list updates as each department submits.";
  }

  reportingSignoffStatusList.innerHTML = reportingSignoffRows.map((item) => `
    <tr>
      <td>${escapeHTML(item.department_name || item.department || "Unknown")}</td>
      <td><span class="status-pill ${statusClass(item.status)}">${escapeHTML(item.status || "Pending")}</span></td>
      <td>${escapeHTML(item.signer_name || item.submitted_by || "—")}</td>
      <td>${escapeHTML(formatDate(item.signed_at || item.updated_at || item.submitted_at))}</td>
    </tr>
  `).join("");
}

function renderAssessmentSummaryPage() {
  if (!assessmentSummaryData || !assessmentSummaryData.assessment) {
    if (assessmentSummaryVendorName) assessmentSummaryVendorName.textContent = "—";
    if (assessmentSummaryServiceType) assessmentSummaryServiceType.textContent = "—";
    if (summaryDDFStatus) summaryDDFStatus.textContent = "Pending";
    if (summaryInfosecStatus) summaryInfosecStatus.textContent = "Pending";
    if (summarySignoffStatus) summarySignoffStatus.textContent = "Pending";
    if (rejectAssessmentBtn) rejectAssessmentBtn.disabled = true;
    if (approveAssessmentBtn) approveAssessmentBtn.disabled = true;
    return;
  }

  const assessment = assessmentSummaryData.assessment;
  const deptAssessments = assessmentSummaryData.department_assessments || [];

  if (assessmentSummaryVendorName) assessmentSummaryVendorName.textContent = assessment.company_name || "—";
  if (assessmentSummaryServiceType) assessmentSummaryServiceType.textContent = assessment.product_services_offered || "—";

  const ddfDepts = deptAssessments.filter((dept) => dept.department_role !== "infosec");
  const ddfComplete = ddfDepts.length > 0 && ddfDepts.every((dept) => ["Approved", "Completed", "Signed", "Pending Admin Approval"].includes(dept.department_status));
  const ddfStatus = ddfComplete ? "Complete" : ddfDepts.length > 0 ? "In Progress" : "Pending";
  if (summaryDDFStatus) {
    summaryDDFStatus.textContent = ddfStatus;
    summaryDDFStatus.className = `completion-status ${ddfComplete ? "completed" : ""}`;
  }

  const infosecDept = deptAssessments.find((dept) => dept.department_role === "infosec");
  const infosecComplete = infosecDept && ["Approved", "Completed", "Signed", "Pending Admin Approval"].includes(infosecDept.department_status);
  const infosecStatus = infosecComplete ? "Cleared" : infosecDept ? "In Progress" : "Pending";
  if (summaryInfosecStatus) {
    summaryInfosecStatus.textContent = infosecStatus;
    summaryInfosecStatus.className = `completion-status ${infosecComplete ? "completed" : ""}`;
  }

  const signoffs = assessmentSummaryData.department_signoffs || [];
  const signoffComplete = signoffs.length > 0 && signoffs.every((s) => ["Signed", "Approved"].includes(s.status));
  const signoffStatus = signoffComplete ? "Signed and Approved" : signoffs.length > 0 ? "In Progress" : "Pending";
  if (summarySignoffStatus) {
    summarySignoffStatus.textContent = signoffStatus;
    summarySignoffStatus.className = `completion-status ${signoffComplete ? "completed" : ""}`;
  }

  const hasProgress = ddfDepts.length > 0 || infosecDept || signoffs.length > 0;
  if (rejectAssessmentBtn) rejectAssessmentBtn.disabled = !hasProgress;
  if (approveAssessmentBtn) approveAssessmentBtn.disabled = !hasProgress;
}

async function submitAssessmentDecision(decision) {
  if (!assessmentSummaryData?.assessment?.assessment_id) {
    alert("No assessment is selected for final decision.");
    return;
  }

  if (!confirm(`Are you sure you want to ${decision.toLowerCase()} this assessment?`)) {
    return;
  }

  try {
    await api(`/admin/assessments/${assessmentSummaryData.assessment.assessment_id}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision })
    });
    showToast(`Assessment ${decision} submitted.`);
    await loadAssessmentSummaryData();
    await loadAdminData();
  } catch (error) {
    alert(error.message);
  }
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

function updateProfilePhotoUI(photoPath) {
  if (!profilePhotoPreview) return;

  if (photoPath) {
    profilePhotoPreview.innerHTML = `
      <img src="${escapeHTML(photoPath)}" alt="Profile Photo" />
    `;
  } else {
    profilePhotoPreview.innerHTML = `<i class="fa-solid fa-user"></i>`;
  }

  if (accountAvatar) {
    if (photoPath) {
      accountAvatar.innerHTML = `<img src="${escapeHTML(photoPath)}" alt="Profile" />`;
    } else {
      accountAvatar.textContent = getRoleLabel(currentRole).charAt(0).toUpperCase();
    }
  }

  if (accountMenuAvatar) {
    if (photoPath) {
      accountMenuAvatar.innerHTML = `<img src="${escapeHTML(photoPath)}" alt="Profile" />`;
    } else {
      accountMenuAvatar.textContent = getRoleLabel(currentRole).charAt(0).toUpperCase();
    }
  }
}

function fillProfileForm() {
  if (!currentUser) return;

  const fullNameParts = String(currentUser.full_name || "").split(" ");
  const fallbackFirstName = fullNameParts[0] || "";
  const fallbackLastName = fullNameParts.slice(1).join(" ") || "";

  if (profileFirstName) profileFirstName.value = currentUser.first_name || fallbackFirstName;
  if (profileLastName) profileLastName.value = currentUser.last_name || fallbackLastName;
  if (profileJobTitle) profileJobTitle.value = currentUser.job_title || "";
  if (profileWorkEmail) profileWorkEmail.value = currentUser.work_email || currentUser.email || "";

  updateProfilePhotoUI(currentUser.profile_photo_path);
}

async function saveProfile(event) {
  event.preventDefault();

  const formData = new FormData();
  formData.append("first_name", profileFirstName?.value.trim() || "");
  formData.append("last_name", profileLastName?.value.trim() || "");
  formData.append("job_title", profileJobTitle?.value.trim() || "");
  formData.append("work_email", profileWorkEmail?.value.trim() || "");

  if (profilePhotoInput?.files?.length) {
    formData.append("profile_photo", profilePhotoInput.files[0]);
  }

  try {
    const data = await api("/profile", {
      method: "POST",
      body: formData
    });

    currentUser = data.user;

    const displayName = `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() || currentUser.full_name;

    if (accountUserName) accountUserName.textContent = displayName;
    if (accountMenuUserName) accountMenuUserName.textContent = displayName;

    updateProfilePhotoUI(currentUser.profile_photo_path);
    showToast("Profile updated successfully.");
  } catch (error) {
    alert(error.message || "Failed to update profile.");
  }
}

async function generateAdminExcel() {
  try {
    let url = "/admin/export-excel";

    const currentPage = getCurrentPage();

    if (currentPage === "assessment-review") {
      if (!selectedReviewAssessment || !selectedReviewAssessment.assessment_id) {
        alert("Please select a vendor assessment first.");
        return;
      }

      url = `/admin/export-excel?assessment_id=${encodeURIComponent(selectedReviewAssessment.assessment_id)}`;
    }

    const response = await fetch(url, {
      method: "GET",
      credentials: "same-origin"
    });

    if (!response.ok) {
      let errorMessage = "Failed to generate Excel report.";

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (_error) {}

      throw new Error(errorMessage);
    }

    const blob = await response.blob();

    const contentDisposition = response.headers.get("Content-Disposition") || "";
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);

    const filename = filenameMatch
      ? filenameMatch[1]
      : selectedReviewAssessment?.assessment_code
        ? `${selectedReviewAssessment.assessment_code}-due-diligence-report.xlsx`
        : "validify-due-diligence-report.xlsx";

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(downloadUrl);

    showToast("Excel report generated.");
  } catch (error) {
    alert(error.message || "Failed to generate Excel report.");
  }
}

async function generateAdminExcel() {
  try {
    let url = "/admin/export-excel";

    const currentPage = getCurrentPage();

    if (currentPage === "assessment-review") {
      if (!selectedReviewAssessment || !selectedReviewAssessment.assessment_id) {
        alert("Please select a vendor assessment first.");
        return;
      }

      url = `/admin/export-excel?assessment_id=${encodeURIComponent(selectedReviewAssessment.assessment_id)}`;
    }

    const response = await fetch(url, {
      method: "GET",
      credentials: "same-origin"
    });

    if (!response.ok) {
      let errorMessage = "Failed to generate Excel report.";

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (_error) {}

      throw new Error(errorMessage);
    }

    const blob = await response.blob();

    const contentDisposition = response.headers.get("Content-Disposition") || "";
    const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);

    const filename = filenameMatch
      ? filenameMatch[1]
      : selectedReviewAssessment?.assessment_code
        ? `${selectedReviewAssessment.assessment_code}-due-diligence-report.xlsx`
        : "validify-due-diligence-report.xlsx";

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(downloadUrl);

    showToast("Excel report generated.");
  } catch (error) {
    alert(error.message || "Failed to generate Excel report.");
  }
}

function setupEvents() {
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  document.querySelectorAll("[data-tab]").forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => switchAssessmentReviewTab(tabBtn.dataset.tab, tabBtn));
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

  if (profileBtn) {
  profileBtn.addEventListener("click", () => {
    if (accountMenu) accountMenu.classList.add("hidden");
    showPage("profile");
  });
}

if (helpBtn) {
  helpBtn.addEventListener("click", () => {
    if (accountMenu) accountMenu.classList.add("hidden");
    showPage("help");
  });
}

if (profilePhotoInput) {
  profilePhotoInput.addEventListener("change", () => {
    const file = profilePhotoInput.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    updateProfilePhotoUI(previewUrl);
  });
}

if (profileForm) {
  profileForm.addEventListener("submit", saveProfile);
}if (profileBtn) {
  profileBtn.addEventListener("click", () => {
    if (accountMenu) accountMenu.classList.add("hidden");
    showPage("profile");
  });
}

if (helpBtn) {
  helpBtn.addEventListener("click", () => {
    if (accountMenu) accountMenu.classList.add("hidden");
    showPage("help");
  });
}

if (profilePhotoInput) {
  profilePhotoInput.addEventListener("change", () => {
    const file = profilePhotoInput.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    updateProfilePhotoUI(previewUrl);
  });
}

if (profileForm) {
  profileForm.addEventListener("submit", saveProfile);
}

  if (createInfoSecAssessmentBtn) createInfoSecAssessmentBtn.addEventListener("click", createOrStartAssessment);
  if (cancelInfoSecAssessmentBtn) cancelInfoSecAssessmentBtn.addEventListener("click", () => showPage(isDepartmentRole() ? "vendor-queue" : "my-submissions"));
  if (infosecForm) infosecForm.addEventListener("submit", submitDepartmentForm);
  if (assessmentReviewVendorSelect) assessmentReviewVendorSelect.addEventListener("change", handleAssessmentReviewSelection);
  if (finalizeAssessmentBtn) finalizeAssessmentBtn.addEventListener("click", finalizeAssessment);
  if (approveAssessmentBtn) approveAssessmentBtn.addEventListener("click", () => submitAssessmentDecision("Approved"));
  if (rejectAssessmentBtn) rejectAssessmentBtn.addEventListener("click", () => submitAssessmentDecision("Rejected"));
  if (signatureFile) signatureFile.addEventListener("change", () => {
    signatureFileName.textContent = signatureFile.files.length > 0 ? signatureFile.files[0].name : "Upload Signature";
  });
  if (signoffForm) signoffForm.addEventListener("submit", submitSignoff);
  if (cancelSignoffBtn) cancelSignoffBtn.addEventListener("click", () => showPage("dashboard"));
}

setupAddVendorForm();
setupEvents();
checkLoggedInUser();
