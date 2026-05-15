let currentUser = null;
let currentRole = "vendor";
let currentReviewTab = "ddf";

const pageTitle = document.getElementById("pageTitle");
const breadcrumb = document.getElementById("breadcrumb");
const roleHelper = document.getElementById("roleHelper");

const pages = {
  dashboard: document.getElementById("dashboardPage"),
  "vendor-directory": document.getElementById("vendorDirectoryPage"),
  "assessment-reviews": document.getElementById("assessmentReviewsPage"),
  "signoff-form": document.getElementById("signoffFormPage"),
  "audit-submit": document.getElementById("auditSubmitPage"),
  "vendor-info": document.getElementById("vendorInfoPage"),
  "create-assessment": document.getElementById("createAssessmentPage"),
  form: document.getElementById("formPage"),
  "submit-forms": document.getElementById("submitFormsPage")
};

const formPanel = document.getElementById("formPanel");

const navButtons = document.querySelectorAll("[data-page]");
const navLinks = document.querySelectorAll(".nav-link[data-page], .sub-link[data-page]");

const ddfToggle = document.getElementById("ddfToggle");
const ddfMenu = document.getElementById("ddfMenu");
const isToggle = document.getElementById("isToggle");
const isMenu = document.getElementById("isMenu");
const reportToggle = document.getElementById("reportToggle");
const reportMenu = document.getElementById("reportMenu");

const accountToggle = document.getElementById("accountToggle");
const accountMenu = document.getElementById("accountMenu");
const logoutBtn = document.getElementById("logoutBtn");

const accountRoleText = document.getElementById("accountRoleText");
const accountMenuRoleText = document.getElementById("accountMenuRoleText");
const accountAvatar = document.getElementById("accountAvatar");
const accountMenuAvatar = document.getElementById("accountMenuAvatar");
const accountUserName = document.getElementById("accountUserName");

const vendorInfoForm = document.getElementById("vendorInfoForm");
const assessmentForm = document.getElementById("assessmentForm");
const assessmentVendor = document.getElementById("assessmentVendor");
const existingAssessment = document.getElementById("existingAssessment");
const activeAssessmentText = document.getElementById("activeAssessmentText");

const vendorStatsGrid = document.getElementById("vendorStatsGrid");
const employeeStatsGrid = document.getElementById("employeeStatsGrid");

const vendorStatCreated = document.getElementById("vendorStatCreated");
const vendorStatDrafted = document.getElementById("vendorStatDrafted");
const vendorStatSubmitted = document.getElementById("vendorStatSubmitted");
const vendorStatReviewed = document.getElementById("vendorStatReviewed");

const employeeStatVendor = document.getElementById("employeeStatVendor");
const employeeStatSubmitted = document.getElementById("employeeStatSubmitted");
const employeeStatRejected = document.getElementById("employeeStatRejected");
const employeeStatReviewed = document.getElementById("employeeStatReviewed");
const employeeStatAudit = document.getElementById("employeeStatAudit");

const recentAssessmentsBody = document.getElementById("recentAssessmentsBody");
const dashboardTableTitle = document.getElementById("dashboardTableTitle");

const vendorDirectoryBody = document.getElementById("vendorDirectoryBody");
const generateEmployeeExcelBtn = document.getElementById("generateEmployeeExcelBtn");

const reviewVendorSelect = document.getElementById("reviewVendorSelect");
const reviewDateInput = document.getElementById("reviewDateInput");
const reviewTabContent = document.getElementById("reviewTabContent");

const signoffForm = document.getElementById("signoffForm");
const signoffRole = document.getElementById("signoffRole");
const signoffName = document.getElementById("signoffName");
const signatureFile = document.getElementById("signatureFile");
const signatureFileName = document.getElementById("signatureFileName");
const cancelSignoffBtn = document.getElementById("cancelSignoffBtn");

const auditVendorName = document.getElementById("auditVendorName");
const auditServiceType = document.getElementById("auditServiceType");
const auditDDFStatus = document.getElementById("auditDDFStatus");
const auditISStatus = document.getElementById("auditISStatus");
const auditSignoffStatus = document.getElementById("auditSignoffStatus");
const cancelAuditBtn = document.getElementById("cancelAuditBtn");
const submitAuditBtn = document.getElementById("submitAuditBtn");

const submitSummary = document.getElementById("submitSummary");
const submitAllBtn = document.getElementById("submitAllBtn");
const submitFormsTitle = document.getElementById("submitFormsTitle");
const submitFormsDescription = document.getElementById("submitFormsDescription");
const submitFormsNavText = document.getElementById("submitFormsNavText");

let vendorKey = "validify_vendor_info_guest";
let assessmentsKey = "validify_assessments_guest";
let activeAssessmentKey = "validify_active_assessment_guest";
let answersKey = "validify_form_answers_guest";

const vendorDirectoryKey = "validify_vendor_directory";
const assessmentDirectoryKey = "validify_assessment_directory";
const oldGlobalSignoffKey = "validify_signoff_records";
const oldGlobalReviewDateKey = "validify_review_date";

const signoffRoles = [
  "IT",
  "Info Sec",
  "Risk Management Officer",
  "Compliance",
  "DPO",
  "HR"
];

const ddfOrder = [
  "ddf-vendor-information",
  "consumer",
  "it-risk-management",
  "compliance",
  "resiliency",
  "data-privacy",
  "environmental-social-risk-management"
];

const ddfTitles = {
  "ddf-vendor-information": "Vendor Information",
  consumer: "Consumer",
  "it-risk-management": "IT Risk Management",
  compliance: "Compliance",
  resiliency: "Resiliency",
  "data-privacy": "Data Privacy",
  "environmental-social-risk-management": "Environmental and Social Risk Management",
  "information-security": "Information Security"
};

const questionSets = {
  "ddf-vendor-information": [
    "Type of service or deployment model would this vendor implement for the company?",
    "Vendor clients",
    "Vendor local offices",
    "Vendor HQ location",
    "Number of years the vendor has been in business",
    "Please describe your ability and capacity to perform the outsourced activities effectively and reliably.",
    "What is your support turnaround time?",
    "To whom are issues escalated? Please provide name, email address, and contact number.",
    "Have there been any instances where you were unable to deliver services as per agreed terms?",
    "Please provide the cost of this particular engagement."
  ],
  consumer: [
    "Do you have a mechanism to address client complaints against an authorized agent or representative? Please provide an overview of your complaint handling procedures.",
    "How do you ensure that client complaints are addressed quickly and adequately?",
    "Do you have a team or individuals dedicated to managing consumer complaints? If so, lay out the position and qualifications.",
    "What is a typical time frame for acknowledging and addressing a customer complaint?",
    "How do you track and document customer complaints?"
  ],
  "it-risk-management": [
    "Does your organization include IT-related functions such as hardware, software, cloud, maintenance, or other IT resources?",
    "If yes, please provide detailed scope or involvement and outsourced IT functions.",
    "Do you have an IT Risk Management organizational framework or program?",
    "Do you monitor and report Key Risk Indicators and other IT Risk Metrics?",
    "Do you use any third-party IT vendors, contractors, or subcontractors?",
    "Please share documented agreements such as MSA, SLA, NDA, and BCP.",
    "Please provide the latest internal and external audit report and status of open findings.",
    "Will the service be supplied via private cloud, public cloud, hybrid cloud, or community cloud?"
  ],
  compliance: [
    "Enumerate the top shareholders and officers of the vendor as indicated in the General Information Sheet.",
    "Will the service require the transfer of company data to another country?",
    "Do you have policies and procedures to comply with AML and CFT regulations?",
    "Will the service to be provided involve AML-related transactions?",
    "Is there a specific alternate site documented in the BCP?"
  ],
  resiliency: [
    "What is the specific alternate site documented in the BCP?",
    "Have you conducted BCP testing?",
    "Provide the approved Business Continuity Plan.",
    "Provide results of the most recent IT DRP and BCP tests.",
    "Are there action plans in place for corrective actions discovered during the test?"
  ],
  "data-privacy": [
    "Is your company registered at the National Privacy Commission?",
    "Please provide NPC Registration Certificate.",
    "Who is your organization Data Privacy Officer and what are their contact details?",
    "Is your company certified with ISO 27001?",
    "Describe in detail all the data that would be processed or stored under this engagement.",
    "Will company data, whether PII or non-PII, be stored in cloud?",
    "Describe the security controls employed to protect data at rest and data in transit.",
    "How will the company be notified if an information security breach involving company data occurred?",
    "What is the policy for archiving company data when the need arises?",
    "Where does the data or information reside or transition through at a given point in time?"
  ],
  "environmental-social-risk-management": [
    "Please provide a data flow diagram.",
    "Do you have any outstanding legal, regulatory, or environmental issues that could impact your ability to supply goods or services?",
    "Do you have policies in place to ensure compliance with labor, environmental, and health and safety laws?",
    "Do you have policies in place to prevent discrimination, harassment, and abuse of employees?",
    "Do you have systems or policies in place to prevent fraud, corruption, forced labor, child labor, and other unethical practices?",
    "Do you have systems or policies in place to track and measure sustainability performance or have a sustainability report?"
  ]
};

const informationSecurityGroups = [
  {
    title: "A. Leadership and Management",
    questions: [
      "Is there a dedicated security officer or team responsible for overseeing the implementation of the information security programs, awareness, and compliance in your organization?",
      "Does your security officer report to senior management or part of the organization's steering committee?"
    ]
  },
  {
    title: "B. Security Governance",
    questions: [
      "Do you have documented security policies?",
      "Are the security policies board approved?",
      "Are security policies regularly reviewed to align with ISO27001, PCI DSS, NIST, or similar standards?",
      "Does your organization undergo regular internal and external security audits?"
    ]
  },
  {
    title: "C. Legal and Compliance",
    questions: [
      "Do you comply with relevant local and international laws and security regulations?",
      "Are security requirements incorporated in contracts, including data protection clauses?"
    ]
  },
  {
    title: "D. Employee Security Awareness",
    questions: [
      "Do you have an established Information Security Awareness Program?",
      "How often do you conduct security awareness training and what topics are covered?",
      "Do you conduct background investigations before hiring employees who handle sensitive information?"
    ]
  },
  {
    title: "E. Access Control Management",
    questions: [
      "Are roles and access rights following the least-privilege principle?",
      "Are user privileges regularly reviewed and updated?",
      "Are access logs to sensitive data maintained for access review?"
    ]
  },
  {
    title: "F. Network Security",
    questions: [
      "Are you employing a zero-trust infrastructure model?",
      "Does your organization encrypt communications and data stored in IT facilities, including data at rest and data in transit?"
    ]
  },
  {
    title: "G. Application Security",
    questions: [
      "Do you perform application security testing or assessment before production deployment?",
      "Do you follow secure coding practices such as OWASP Top 10?",
      "Do you perform code reviews?",
      "Do you have a defined change management process for updates and system changes?"
    ]
  },
  {
    title: "H. Vendor Security Posture",
    questions: [
      "Do you regularly conduct internal or external penetration testing or vulnerability assessments?",
      "Do you have controls in place to assess your own third-party suppliers?",
      "Are systems and applications patched regularly and in a timely manner?"
    ]
  },
  {
    title: "I. Information Security Incident Management",
    questions: [
      "Do you have a security incident response team and procedures in place?",
      "Have you encountered or reported cyber attacks or security incidents in the past two years?",
      "Do you have a dedicated Security Operations Center or team?",
      "Do you have an Incident Response Plan?",
      "Do you have an Incident Response Plan for ransomware scenarios?",
      "Do you have an Incident Response Plan for phishing and data breach scenarios?"
    ]
  },
  {
    title: "J. Disposal",
    questions: [
      "Do you securely dispose electronic copies of client data?",
      "Describe your process for securely disposing electronic copies of client data.",
      "Do you securely dispose physical copies of client data?",
      "Describe your process for securely disposing physical copies of client data."
    ]
  },
  {
    title: "K. Others",
    questions: [
      "Have you ever been blacklisted as a partner or supplier by another company, client, or customer?",
      "Do you provide services to other organizations that are direct competitors of the company?",
      "If yes, do you have processes and procedures that ensure confidentiality of information?"
    ]
  }
];

/* SESSION */

async function checkLoggedInUser() {
  try {
    const response = await fetch("/me");

    if (!response.ok) {
      window.location.href = "login.html";
      return;
    }

    currentUser = await response.json();
    setStorageKeysForCurrentUser();
  } catch (error) {
    window.location.href = "login.html";
    return;
  }

  applyUserRole();
}

function makeStorageSafe(value) {
  return String(value || "guest")
    .toLowerCase()
    .trim()
    .replaceAll("@", "_at_")
    .replaceAll(".", "_")
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function getCurrentUserStorageId() {
  return makeStorageSafe(
    currentUser?.id ||
      currentUser?.user_id ||
      currentUser?.email ||
      currentUser?.username ||
      currentUser?.full_name ||
      "guest"
  );
}

function setStorageKeysForCurrentUser() {
  const userId = getCurrentUserStorageId();

  vendorKey = `validify_vendor_info_${userId}`;
  assessmentsKey = `validify_assessments_${userId}`;
  activeAssessmentKey = `validify_active_assessment_${userId}`;
  answersKey = `validify_form_answers_${userId}`;
}

function isCurrentUserEmployee() {
  const roleText = String(currentRole || currentUser?.role || "")
    .toLowerCase()
    .replaceAll("_", " ");

  return roleText === "company employee" || roleText === "employee" || roleText.includes("employee");
}

function applyUserRole() {
  currentRole = currentUser?.role || "vendor";

  const isEmployee = isCurrentUserEmployee();
  const roleLabel = isEmployee ? "Employee" : "Vendor";
  const avatarLetter = isEmployee ? "E" : "V";

  document.body.dataset.role = isEmployee ? "employee" : "vendor";

  if (accountRoleText) accountRoleText.textContent = roleLabel;
  if (accountMenuRoleText) accountMenuRoleText.textContent = roleLabel;
  if (accountAvatar) accountAvatar.textContent = avatarLetter;
  if (accountMenuAvatar) accountMenuAvatar.textContent = avatarLetter;
  if (accountUserName) accountUserName.textContent = currentUser?.full_name || "User";

  document.querySelectorAll(".vendor-only").forEach((element) => {
    element.classList.toggle("hidden", isEmployee);
  });

  document.querySelectorAll(".employee-only").forEach((element) => {
    element.classList.toggle("hidden", !isEmployee);
  });

  if (roleHelper) {
    roleHelper.textContent = isEmployee
      ? "Employee dashboard: review submitted vendor forms and company comments."
      : "Vendor dashboard: answer the vendor questionnaire and submit it for company review.";
  }

  if (submitFormsNavText) {
    submitFormsNavText.textContent = isEmployee ? "Review Forms" : "Submit Forms";
  }

  if (dashboardTableTitle) {
    dashboardTableTitle.textContent = "Recent Assessments";
  }

  if (submitFormsTitle) {
    submitFormsTitle.textContent = isEmployee ? "Review Forms" : "Submit Forms";
  }

  if (submitFormsDescription) {
    submitFormsDescription.textContent = isEmployee
      ? "Review vendor answers and add company comments."
      : "Review all saved DDF and Information Security answers before submitting.";
  }
}

/* STORAGE */

function getJSON(key, fallback) {
  return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
}

function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHTML(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getVendorDirectory() {
  return getJSON(vendorDirectoryKey, []);
}

function saveVendorToDirectory(vendor) {
  const vendors = getVendorDirectory();
  const ownerId = getCurrentUserStorageId();

  const vendorRecord = {
    ...vendor,
    ownerId,
    ownerName: currentUser?.full_name || "Vendor User"
  };

  const existingIndex = vendors.findIndex((item) => item.ownerId === ownerId);

  if (existingIndex >= 0) {
    vendors[existingIndex] = vendorRecord;
  } else {
    vendors.push(vendorRecord);
  }

  setJSON(vendorDirectoryKey, vendors);
}

function getAssessmentDirectory() {
  return getJSON(assessmentDirectoryKey, []);
}

function saveAssessmentDirectory(data) {
  setJSON(assessmentDirectoryKey, data);
}

function getAssessments() {
  if (isCurrentUserEmployee()) {
    return getAssessmentDirectory();
  }

  return getJSON(assessmentsKey, []);
}

function saveAssessments(data) {
  if (isCurrentUserEmployee()) {
    saveAssessmentDirectory(data);
    return;
  }

  const ownerId = getCurrentUserStorageId();
  const ownerName = currentUser?.full_name || "Vendor User";

  const normalizedPersonal = data.map((item) => ({
    ...item,
    ownerId,
    ownerName
  }));

  setJSON(assessmentsKey, normalizedPersonal);

  const directory = getAssessmentDirectory().filter((item) => item.ownerId !== ownerId);
  saveAssessmentDirectory([...directory, ...normalizedPersonal]);
}

function getAnswersKeyForActiveAssessment() {
  const activeAssessment = getActiveAssessment();

  if (isCurrentUserEmployee() && activeAssessment?.ownerId) {
    return `validify_form_answers_${activeAssessment.ownerId}`;
  }

  return answersKey;
}

function getAnswers() {
  return getJSON(getAnswersKeyForActiveAssessment(), {});
}

function saveAnswers(data) {
  setJSON(getAnswersKeyForActiveAssessment(), data);
}

function getActiveAssessmentId() {
  return localStorage.getItem(activeAssessmentKey) || localStorage.getItem("validify_employee_active_assessment");
}

function setActiveAssessmentId(id) {
  if (id) {
    if (isCurrentUserEmployee()) {
      localStorage.setItem("validify_employee_active_assessment", id);
    } else {
      localStorage.setItem(activeAssessmentKey, id);
    }
  } else {
    localStorage.removeItem(activeAssessmentKey);
    localStorage.removeItem("validify_employee_active_assessment");
  }
}

function getActiveAssessment() {
  const assessments = getAssessments();
  const activeId = getActiveAssessmentId();

  return assessments.find((item) => String(item.id) === String(activeId)) || null;
}

function getSignoffKey() {
  const activeAssessmentId = getActiveAssessmentId();

  if (!activeAssessmentId) {
    return "validify_signoff_records_empty";
  }

  return `validify_signoff_records_${activeAssessmentId}`;
}

function getSignoffs() {
  return getJSON(getSignoffKey(), {});
}

function saveSignoffs(data) {
  setJSON(getSignoffKey(), data);
}

function getReviewDateKey() {
  const activeAssessmentId = getActiveAssessmentId();

  if (!activeAssessmentId) {
    return "validify_review_date_empty";
  }

  return `validify_review_date_${activeAssessmentId}`;
}

function updateActiveAssessmentStatus(status) {
  const assessments = getAssessments();
  const activeId = getActiveAssessmentId();

  const target = assessments.find((item) => String(item.id) === String(activeId));

  if (!target) return;

  target.status = status;
  target.reviewedDate = reviewDateInput?.value || getTodayDate();

  saveAssessments(assessments);
  renderDashboard();
}

function formatSavedDate(dateValue) {
  if (!dateValue) return "N/A";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

/* NAVIGATION */

function setActiveNav(page) {
  navLinks.forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });
}

function showOnlyPage(pageKey) {
  Object.values(pages).forEach((page) => {
    if (page) page.classList.remove("active");
  });

  if (pages[pageKey]) {
    pages[pageKey].classList.add("active");
    return;
  }

  if (pages.form) {
    pages.form.classList.add("active");
  }
}

function showPage(page) {
  saveVisibleResponses();

  const isEmployee = isCurrentUserEmployee();

  if (isEmployee && (page === "vendor-info" || page === "create-assessment")) {
    page = "dashboard";
  }

  if (!isEmployee && (
    page === "vendor-directory" ||
    page === "assessment-reviews" ||
    page === "signoff-form" ||
    page === "audit-submit"
  )) {
    page = "dashboard";
  }

  setActiveNav(page);
  showOnlyPage(page);

  if (page === "dashboard") {
    pageTitle.textContent = "Dashboard";
    breadcrumb.textContent = isEmployee ? "Dashboard" : "Dashboard / Home";
    renderDashboard();
    return;
  }

  if (page === "vendor-directory") {
    pageTitle.textContent = "Vendor Directory";
    breadcrumb.textContent = "Vendor Directory";
    renderEmployeePages();
    return;
  }

  if (page === "assessment-reviews") {
    pageTitle.textContent = "Assessment Reviews";
    breadcrumb.textContent = "Assessment Reviews";
    renderAssessmentReviewPage();
    return;
  }

  if (page === "signoff-form") {
    pageTitle.textContent = "Form for Sign-off";
    breadcrumb.textContent = "Reporting & Sign-offs / Form for Sign-off";
    renderSignoffFormPage();
    return;
  }

  if (page === "audit-submit") {
    pageTitle.textContent = "Submit Assessment to Audit";
    breadcrumb.textContent = "Reporting & Sign-offs / Submit file to Audit Team";
    renderAuditSubmitPage();
    return;
  }

  if (page === "vendor-info") {
    pageTitle.textContent = "Vendor Information";
    breadcrumb.textContent = "Vendor Information";
    loadVendorInfo();
    return;
  }

  if (page === "create-assessment") {
    pageTitle.textContent = "Assessment";
    breadcrumb.textContent = "Create an Assessment Form";
    populateAssessmentOptions();
    return;
  }

  if (page === "submit-forms") {
    pageTitle.textContent = isEmployee ? "Review Forms" : "Submit Forms";
    breadcrumb.textContent = isEmployee ? "Employee / Review Forms" : "Submit Forms / Review";
    renderSubmitForms();
    return;
  }

  if (page === "information-security") {
    pageTitle.textContent = "Information Security";
    breadcrumb.textContent = "Information Security / Form for IS";
    renderInformationSecurity();
    return;
  }

  if (ddfOrder.includes(page)) {
    const title = ddfTitles[page];
    pageTitle.textContent = title;
    breadcrumb.textContent = `Due Diligence Form / ${title}`;
    renderDDF(page);
  }
}

/* DASHBOARD */

function getStatusClass(status) {
  return String(status || "")
    .toLowerCase()
    .replaceAll(" ", "-");
}

function getAssessmentAction(assessment, isEmployee) {
  if (!isEmployee) {
    if (
      assessment.status === "Reviewed" ||
      assessment.status === "Approved" ||
      assessment.status === "Rejected" ||
      assessment.status === "Reported to Audit"
    ) {
      return `<button class="action-btn" data-review-id="${assessment.id}">View Details</button>`;
    }

    return "";
  }

  if (assessment.status === "Submitted") {
    return `<button class="action-btn" data-review-id="${assessment.id}">Review</button>`;
  }

  if (
    assessment.status === "Reviewed" ||
    assessment.status === "Approved" ||
    assessment.status === "Rejected" ||
    assessment.status === "Reported to Audit"
  ) {
    return `<button class="action-btn" data-review-id="${assessment.id}">View Details</button>`;
  }

  return "";
}

function renderDashboard() {
  const assessments = getAssessments();
  const isEmployee = isCurrentUserEmployee();

  if (isEmployee) {
    if (vendorStatsGrid) vendorStatsGrid.classList.add("hidden");
    if (employeeStatsGrid) employeeStatsGrid.classList.remove("hidden");

    employeeStatVendor.textContent = getVendorDirectory().length;
    employeeStatSubmitted.textContent = assessments.filter((item) => item.status === "Submitted").length;
    employeeStatRejected.textContent = assessments.filter((item) => item.status === "Rejected").length;
    employeeStatReviewed.textContent = assessments.filter((item) => item.status === "Reviewed" || item.status === "Approved").length;
    employeeStatAudit.textContent = assessments.filter((item) => item.status === "Reported to Audit").length;
  } else {
    if (employeeStatsGrid) employeeStatsGrid.classList.add("hidden");
    if (vendorStatsGrid) vendorStatsGrid.classList.remove("hidden");

    vendorStatCreated.textContent = assessments.length;
    vendorStatDrafted.textContent = assessments.filter((item) => item.status === "Draft").length;
    vendorStatSubmitted.textContent = assessments.filter((item) => item.status === "Submitted").length;
    vendorStatReviewed.textContent = assessments.filter((item) => item.status === "Reviewed" || item.status === "Approved").length;
  }

  if (assessments.length === 0) {
    recentAssessmentsBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">No assessments yet.</td>
      </tr>
    `;
    return;
  }

  recentAssessmentsBody.innerHTML = assessments
    .slice()
    .reverse()
    .slice(0, 8)
    .map((assessment) => {
      const statusClass = getStatusClass(assessment.status);

      return `
        <tr>
          <td class="assessment-name">
            <strong>${escapeHTML(assessment.purpose || "Assessment")}</strong>
            <span>${escapeHTML(assessment.vendorName || "No vendor")}</span>
          </td>
          <td>${escapeHTML(assessment.purpose || "N/A")}</td>
          <td>${escapeHTML(assessment.reviewedDate || assessment.date || "N/A")}</td>
          <td>
            <span class="status-pill ${statusClass}">
              ${escapeHTML(assessment.status)}
            </span>
          </td>
          <td>${getAssessmentAction(assessment, isEmployee)}</td>
        </tr>
      `;
    })
    .join("");
}

/* EMPLOYEE PAGES */

function renderEmployeePages() {
  const vendors = getVendorDirectory();

  if (!vendorDirectoryBody) return;

  if (!vendors.length) {
    vendorDirectoryBody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-cell">No vendors found.</td>
      </tr>
    `;
    return;
  }

  vendorDirectoryBody.innerHTML = vendors
    .map((vendor) => `
      <tr>
        <td>${escapeHTML(vendor.companyName || "N/A")}</td>
        <td>${escapeHTML(vendor.productServices || "N/A")}</td>
        <td>${escapeHTML(vendor.contactName || "N/A")}</td>
        <td>${escapeHTML(formatSavedDate(vendor.dateSaved))}</td>
      </tr>
    `)
    .join("");
}

function populateReviewSelector() {
  const vendors = getVendorDirectory();
  const activeAssessment = getActiveAssessment();

  if (reviewVendorSelect) {
    reviewVendorSelect.innerHTML = `<option value="">Select Vendor</option>`;

    vendors.forEach((vendor) => {
      const selected =
        activeAssessment?.ownerId === vendor.ownerId ||
        activeAssessment?.vendorName === vendor.companyName
          ? "selected"
          : "";

      reviewVendorSelect.innerHTML += `
        <option value="${escapeHTML(vendor.ownerId)}" ${selected}>
          ${escapeHTML(vendor.companyName || "Unnamed Vendor")}
        </option>
      `;
    });
  }

  if (reviewDateInput) {
    const savedDate = localStorage.getItem(getReviewDateKey());
    reviewDateInput.value = savedDate || activeAssessment?.reviewedDate || getTodayDate();
  }
}

function renderAssessmentReviewPage() {
  populateReviewSelector();
  renderReviewTab();
}

function setReviewTab(tab) {
  currentReviewTab = tab;

  document.querySelectorAll(".review-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.reviewTab === tab);
  });

  renderReviewTab();
}

function renderReviewTab() {
  if (!reviewTabContent) return;

  if (currentReviewTab === "ddf") {
    renderReviewDDF();
    return;
  }

  if (currentReviewTab === "infosec") {
    renderReviewInformationSecurity();
    return;
  }

  renderReviewSignoffSheet();
}

function renderReviewDDF() {
  const answers = getAnswers();

  let html = "";

  ddfOrder.forEach((sectionKey) => {
    const sectionTitle = ddfTitles[sectionKey];
    const questions = questionSets[sectionKey] || [];

    html += `<h4 class="review-section-title">${escapeHTML(sectionTitle)}</h4>`;

    questions.forEach((question, index) => {
      const vendorAnswer = answers?.[sectionKey]?.[index]?.vendor || "";
      const companyAnswer = answers?.[sectionKey]?.[index]?.company || "";

      html += `
        <div class="review-question">
          <p class="review-question-text">${escapeHTML(question)}</p>

          <div class="review-two-col">
            <div>
              <span class="review-field-label">Vendor Response</span>
              <textarea class="review-vendor-box" disabled>${escapeHTML(vendorAnswer || "Vendor Response")}</textarea>
            </div>

            <div>
              <span class="review-field-label">Company Comment</span>
              <textarea
                class="review-comment-box company-review-live"
                data-section="${sectionKey}"
                data-index="${index}"
                data-type="company"
                placeholder="Company Review or Comment"
              >${escapeHTML(companyAnswer)}</textarea>
            </div>
          </div>
        </div>
      `;
    });
  });

  html += `
    <div class="review-actions">
      <button type="button" class="reject-review-btn" data-review-action="Rejected">Mark as Rejected</button>
      <button type="button" class="mark-reviewed-btn" data-review-action="Reviewed">Mark as Reviewed</button>
    </div>
  `;

  reviewTabContent.innerHTML = html;
  setupAutoResizeTextareas();
}

function renderReviewInformationSecurity() {
  const answers = getAnswers();
  let globalIndex = 0;
  let html = "";

  informationSecurityGroups.forEach((group) => {
    html += `<h4 class="review-group-title">${escapeHTML(group.title)}</h4>`;

    group.questions.forEach((question, questionIndex) => {
      const vendorAnswer = answers?.["information-security"]?.[globalIndex]?.vendor || "";
      const companyAnswer = answers?.["information-security"]?.[globalIndex]?.company || "";

      html += `
        <div class="review-question">
          <p class="review-question-text">${questionIndex + 1}. ${escapeHTML(question)}</p>

          <div class="review-two-col">
            <div>
              <span class="review-field-label">Vendor Response</span>

              <div class="review-answer-row">
                <span class="review-answer-pill">
                  ${escapeHTML(vendorAnswer || "N/A")}
                  <i class="fa-solid fa-caret-down"></i>
                </span>

                <a href="#" class="review-file-link">
                  <i class="fa-solid fa-link"></i>
                  Policy_Signed.pdf
                </a>
              </div>

              <textarea class="review-vendor-box" disabled>Vendor comment</textarea>
            </div>

            <div>
              <span class="review-field-label">Company Comment</span>
              <textarea
                class="review-comment-box company-review-live"
                data-section="information-security"
                data-index="${globalIndex}"
                data-type="company"
                placeholder="Company Review or Comment"
              >${escapeHTML(companyAnswer)}</textarea>
            </div>
          </div>
        </div>
      `;

      globalIndex++;
    });
  });

  html += `
    <div class="review-actions">
      <button type="button" class="reject-review-btn" data-review-action="Rejected">Mark as Rejected</button>
      <button type="button" class="mark-reviewed-btn" data-review-action="Reviewed">Mark as Reviewed</button>
    </div>
  `;

  reviewTabContent.innerHTML = html;
  setupAutoResizeTextareas();
}

function renderReviewSignoffSheet() {
  const signoffs = getSignoffs();

  let html = `
    <h4 class="review-section-title">Final Sign-Off Authorization</h4>

    <div class="signoff-list">
  `;

  signoffRoles.forEach((role) => {
    const record = signoffs[role];
    const status = record?.status || "Pending";
    const name = record?.name || "...";
    const statusClass = status === "Signed" ? "signed" : "pending";

    html += `
      <div class="signoff-row">
        <div>${escapeHTML(role)}</div>
        <div>Name: ${escapeHTML(name)}</div>
        <div>
          Status:
          <span class="signoff-status ${statusClass}">
            ${escapeHTML(status)}
          </span>
        </div>
      </div>
    `;
  });

  html += `
    </div>

    <div class="finalize-row">
      <button type="button" class="finalize-btn" id="goToSignoffFormBtn">
        Finalize Assessment
      </button>
    </div>
  `;

  reviewTabContent.innerHTML = html;
}

function renderSignoffFormPage() {
  if (signoffForm) signoffForm.reset();
  if (signatureFileName) signatureFileName.textContent = "Upload Signature";
}

function renderAuditSubmitPage() {
  const activeAssessment = getActiveAssessment();
  const signoffs = getSignoffs();
  const vendor = getVendorDirectory().find((item) => item.ownerId === activeAssessment?.ownerId) || getJSON(vendorKey, {});

  const signedCount = signoffRoles.filter((role) => signoffs[role]?.status === "Signed").length;
  const allSigned = signedCount === signoffRoles.length;

  if (auditVendorName) auditVendorName.textContent = vendor.companyName || activeAssessment?.vendorName || "N/A";
  if (auditServiceType) auditServiceType.textContent = vendor.productServices || activeAssessment?.purpose || "N/A";
  if (auditDDFStatus) auditDDFStatus.textContent = activeAssessment?.status === "Rejected" ? "Rejected" : "Complete";
  if (auditISStatus) auditISStatus.textContent = activeAssessment?.status === "Rejected" ? "Rejected" : "Cleared";
  if (auditSignoffStatus) auditSignoffStatus.textContent = allSigned ? "Signed and Approved" : "Pending";
}

/* VENDOR INFO */

function loadVendorInfo() {
  document.getElementById("companyName").value = "";
  document.getElementById("companyWebsite").value = "";
  document.getElementById("productServices").value = "";
  document.getElementById("contactName").value = "";
  document.getElementById("contactEmail").value = "";
  document.getElementById("contactNumber").value = "";

  setupAutoResizeTextareas();
}

if (vendorInfoForm) {
  vendorInfoForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const vendor = {
      companyName: document.getElementById("companyName").value.trim(),
      companyWebsite: document.getElementById("companyWebsite").value.trim(),
      productServices: document.getElementById("productServices").value.trim(),
      contactName: document.getElementById("contactName").value.trim(),
      contactEmail: document.getElementById("contactEmail").value.trim(),
      contactNumber: document.getElementById("contactNumber").value.trim(),
      dateSaved: new Date().toISOString()
    };

    setJSON(vendorKey, vendor);
    saveVendorToDirectory(vendor);

    populateAssessmentOptions();
    renderEmployeePages();

    vendorInfoForm.reset();
    loadVendorInfo();

    alert("Vendor information saved.");
  });
}

/* ASSESSMENT */

function populateAssessmentOptions() {
  const vendor = getJSON(vendorKey, {});
  const assessments = getAssessments();
  const activeId = getActiveAssessmentId();

  if (assessmentVendor) {
    assessmentVendor.innerHTML = `<option value="">Select a Vendor</option>`;

    if (vendor.companyName) {
      assessmentVendor.innerHTML += `<option value="${escapeHTML(vendor.companyName)}">${escapeHTML(vendor.companyName)}</option>`;
    }
  }

  if (existingAssessment) {
    existingAssessment.innerHTML = `<option value="">Select Assessment</option>`;

    assessments.forEach((assessment) => {
      existingAssessment.innerHTML += `
        <option value="${assessment.id}" ${String(activeId) === String(assessment.id) ? "selected" : ""}>
          ${escapeHTML(assessment.vendorName)} - ${escapeHTML(assessment.status)}
        </option>
      `;
    });
  }

  updateActiveAssessmentText();
}

function updateActiveAssessmentText() {
  const active = getActiveAssessment();

  if (!activeAssessmentText) return;

  if (!active) {
    activeAssessmentText.textContent = "No active assessment selected.";
    return;
  }

  activeAssessmentText.textContent = `Active Assessment: ${active.vendorName} | ${active.purpose} | ${active.status}`;
}

if (assessmentForm) {
  assessmentForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const vendorName = assessmentVendor.value;
    const date = document.getElementById("assessmentDate").value;
    const purpose = document.getElementById("assessmentPurpose").value;

    if (!vendorName || !date || !purpose) {
      alert("Please complete the assessment form.");
      return;
    }

    const ownerId = getCurrentUserStorageId();
    const ownerName = currentUser?.full_name || "Vendor User";
    const assessments = getAssessments();

    const assessment = {
      id: Date.now(),
      ownerId,
      ownerName,
      vendorName,
      date,
      purpose,
      status: "Draft"
    };

    assessments.push(assessment);
    saveAssessments(assessments);
    setActiveAssessmentId(assessment.id);

    assessmentForm.reset();
    populateAssessmentOptions();
    renderDashboard();

    alert("Assessment created.");
  });
}

if (existingAssessment) {
  existingAssessment.addEventListener("change", () => {
    setActiveAssessmentId(existingAssessment.value);
    updateActiveAssessmentText();
  });
}

/* DDF AND IS RENDERING */

function makeVendorResponseField(sectionKey, index, value) {
  const disabled = isCurrentUserEmployee() ? "disabled" : "";

  return `
    <textarea
      class="question-textarea response-field vendor-answer-field"
      data-section="${sectionKey}"
      data-index="${index}"
      data-type="vendor"
      placeholder="Vendor Response"
      ${disabled}
    >${escapeHTML(value)}</textarea>
  `;
}

function makeCompanyReviewField(sectionKey, index, value) {
  const disabled = isCurrentUserEmployee() ? "" : "disabled";

  return `
    <textarea
      class="question-textarea company-review-field ${disabled ? "disabled-box" : ""}"
      data-section="${sectionKey}"
      data-index="${index}"
      data-type="company"
      placeholder="Company Review"
      ${disabled}
    >${escapeHTML(value)}</textarea>
  `;
}

function renderDDF(sectionKey) {
  const answers = getAnswers();
  const questions = questionSets[sectionKey] || [];
  const title = ddfTitles[sectionKey];
  const nextSection = getNextDDF(sectionKey);
  const isLast = sectionKey === "environmental-social-risk-management";
  const isEmployee = isCurrentUserEmployee();

  let html = `
    <div class="content-card wide-card">
      <div class="ddf-card-scroll">
        <div class="section-header-row">
          <div>
            <h3>${escapeHTML(title)}</h3>
          </div>
        </div>

        <form id="ddfForm">
  `;

  questions.forEach((question, index) => {
    const vendorSaved = answers?.[sectionKey]?.[index]?.vendor || "";
    const companySaved = answers?.[sectionKey]?.[index]?.company || "";

    html += `
      <div class="question-block">
        <label>${escapeHTML(question)}</label>

        <div class="question-grid">
          ${makeVendorResponseField(sectionKey, index, vendorSaved)}
          ${makeCompanyReviewField(sectionKey, index, companySaved)}
        </div>
      </div>
    `;
  });

  html += `
        <div class="form-action-row">
          <button type="submit" class="next-form-btn">
            ${isEmployee ? "Save Review" : isLast ? "Save Draft" : "Next"}
          </button>
        </div>
      </form>
      </div>
    </div>
  `;

  formPanel.innerHTML = html;
  setupAutoResizeTextareas();

  document.getElementById("ddfForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveVisibleResponses();

    if (isEmployee) {
      alert("Company review saved.");
      return;
    }

    if (isLast) {
      alert("Draft saved.");
      return;
    }

    if (nextSection) {
      showPage(nextSection);
    }
  });
}

function getNextDDF(sectionKey) {
  const currentIndex = ddfOrder.indexOf(sectionKey);

  if (currentIndex === -1) return null;
  if (currentIndex >= ddfOrder.length - 1) return null;

  return ddfOrder[currentIndex + 1];
}

function renderInformationSecurity() {
  const answers = getAnswers();
  const isEmployee = isCurrentUserEmployee();
  let globalIndex = 0;

  let html = `
    <div class="content-card wide-card">
      <div class="ddf-card-scroll">
        <form id="isForm">
          <div id="formWarning" class="form-warning hidden"></div>
  `;

  informationSecurityGroups.forEach((group) => {
    html += `
      <div class="is-group-title">
        <h3>${escapeHTML(group.title)}</h3>
        <p>Information Security</p>
      </div>
    `;

    group.questions.forEach((question) => {
      const vendorSaved = answers?.["information-security"]?.[globalIndex]?.vendor || "";
      const companySaved = answers?.["information-security"]?.[globalIndex]?.company || "";
      const vendorDisabled = isEmployee ? "disabled" : "";
      const companyDisabled = isEmployee ? "" : "disabled";

      html += `
        <div class="question-block">
          <label>${escapeHTML(question)}</label>
          <p class="required-message hidden">Required field</p>

          <div class="question-grid">
            <select
              class="question-select response-field vendor-answer-field"
              data-section="information-security"
              data-index="${globalIndex}"
              data-type="vendor"
              ${vendorDisabled}
            >
              <option value="" ${vendorSaved === "" ? "selected" : ""}>Select response</option>
              <option value="Yes" ${vendorSaved === "Yes" ? "selected" : ""}>Yes</option>
              <option value="No" ${vendorSaved === "No" ? "selected" : ""}>No</option>
              <option value="N/A" ${vendorSaved === "N/A" ? "selected" : ""}>N/A</option>
            </select>

            <textarea
              class="question-textarea company-review-field ${companyDisabled ? "disabled-box" : ""}"
              data-section="information-security"
              data-index="${globalIndex}"
              data-type="company"
              placeholder="Company Review"
              ${companyDisabled}
            >${escapeHTML(companySaved)}</textarea>
          </div>
        </div>
      `;

      globalIndex++;
    });
  });

  html += `
          <div class="form-action-row">
            <button type="submit" class="next-form-btn">
              ${isEmployee ? "Save Review" : "Save Draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  formPanel.innerHTML = html;
  setupAutoResizeTextareas();

  document.getElementById("isForm").addEventListener("submit", (event) => {
    event.preventDefault();

    if (!isEmployee) {
      const isValid = validateISRequired();

      if (!isValid) {
        const warning = document.getElementById("formWarning");
        warning.textContent = "Please answer all required fields before saving.";
        warning.classList.remove("hidden");

        const firstError = document.querySelector(".field-error");

        if (firstError) {
          firstError.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }

        return;
      }
    }

    saveVisibleResponses();
    alert(isEmployee ? "Information Security review saved." : "Information Security draft saved.");
  });
}

function validateISRequired() {
  let valid = true;

  document.querySelectorAll(".response-field[data-section='information-security']").forEach((field) => {
    if (field.dataset.type !== "vendor") return;

    const block = field.closest(".question-block");
    const message = block.querySelector(".required-message");

    if (!field.value.trim()) {
      field.classList.add("field-error");
      message.classList.remove("hidden");
      valid = false;
    } else {
      field.classList.remove("field-error");
      message.classList.add("hidden");
    }
  });

  return valid;
}

/* ANSWERS */

function saveVisibleResponses() {
  const fields = document.querySelectorAll("[data-section][data-index][data-type]");
  if (!fields.length) return;

  const answers = getAnswers();

  fields.forEach((field) => {
    const section = field.dataset.section;
    const index = Number(field.dataset.index);
    const type = field.dataset.type;

    if (!answers[section]) answers[section] = [];
    if (!answers[section][index]) answers[section][index] = {};

    answers[section][index][type] = field.value;
  });

  saveAnswers(answers);
}

function autoResizeTextarea(textarea) {
  textarea.style.height = "42px";
  textarea.style.height = textarea.scrollHeight + "px";
}

function setupAutoResizeTextareas() {
  document.querySelectorAll("textarea").forEach((textarea) => {
    autoResizeTextarea(textarea);

    textarea.addEventListener("input", () => {
      autoResizeTextarea(textarea);
    });
  });

  document.querySelectorAll("[data-section][data-index][data-type]").forEach((field) => {
    field.addEventListener("input", () => {
      field.classList.remove("field-error");

      const block = field.closest(".question-block");
      const message = block?.querySelector(".required-message");

      if (message) message.classList.add("hidden");

      saveVisibleResponses();
    });

    field.addEventListener("change", () => {
      field.classList.remove("field-error");

      const block = field.closest(".question-block");
      const message = block?.querySelector(".required-message");

      if (message) message.classList.add("hidden");

      saveVisibleResponses();
    });
  });
}

/* SUBMIT FORMS */

function renderSubmitForms() {
  saveVisibleResponses();

  const answers = getAnswers();
  const isEmployee = isCurrentUserEmployee();
  let html = "";

  ddfOrder.forEach((sectionKey) => {
    const title = ddfTitles[sectionKey];
    const questions = questionSets[sectionKey] || [];

    html += `<div class="summary-section"><h4>${escapeHTML(title)}</h4>`;

    questions.forEach((question, index) => {
      const vendorAnswer = answers?.[sectionKey]?.[index]?.vendor || "";
      const companyAnswer = answers?.[sectionKey]?.[index]?.company || "";

      html += `
        <div class="summary-item">
          <strong>${escapeHTML(question)}</strong>
          <p><b>Vendor:</b> ${vendorAnswer ? escapeHTML(vendorAnswer) : "<em>No answer yet</em>"}</p>
          <p><b>Company Review:</b> ${companyAnswer ? escapeHTML(companyAnswer) : "<em>No comment yet</em>"}</p>
        </div>
      `;
    });

    html += `</div>`;
  });

  html += `<div class="summary-section"><h4>Information Security</h4>`;

  let isIndex = 0;

  informationSecurityGroups.forEach((group) => {
    html += `<h5>${escapeHTML(group.title)}</h5>`;

    group.questions.forEach((question) => {
      const vendorAnswer = answers?.["information-security"]?.[isIndex]?.vendor || "";
      const companyAnswer = answers?.["information-security"]?.[isIndex]?.company || "";

      html += `
        <div class="summary-item">
          <strong>${escapeHTML(question)}</strong>
          <p><b>Vendor:</b> ${vendorAnswer ? escapeHTML(vendorAnswer) : "<em>No answer yet</em>"}</p>
          <p><b>Company Review:</b> ${companyAnswer ? escapeHTML(companyAnswer) : "<em>No comment yet</em>"}</p>
        </div>
      `;

      isIndex++;
    });
  });

  html += `</div>`;

  submitSummary.innerHTML = html || `<p class="muted">No saved responses yet.</p>`;

  if (submitAllBtn) {
    submitAllBtn.classList.toggle("hidden", isEmployee);
  }
}

if (submitAllBtn) {
  submitAllBtn.addEventListener("click", () => {
    const activeId = getActiveAssessmentId();

    if (!activeId) {
      alert("Please create or select an assessment first.");
      return;
    }

    const assessments = getAssessments();
    const target = assessments.find((item) => String(item.id) === String(activeId));

    if (target) {
      target.status = "Submitted";
      saveAssessments(assessments);
    }

    renderDashboard();
    alert("Forms submitted successfully.");
    showPage("dashboard");
  });
}

/* EXCEL */

if (generateEmployeeExcelBtn) {
  generateEmployeeExcelBtn.addEventListener("click", () => {
    if (typeof XLSX === "undefined") {
      alert("XLSX library is missing. Add xlsx-js-style script in index.html before script.js.");
      return;
    }

    const vendors = getVendorDirectory();
    const assessments = getAssessmentDirectory();
    const signoffs = getSignoffs();

    const workbook = XLSX.utils.book_new();

    const vendorRows = vendors.length
      ? vendors.map((vendor) => ({
          "Company Name": vendor.companyName || "N/A",
          "Services": vendor.productServices || "N/A",
          "Contact": vendor.contactName || "N/A",
          "Email": vendor.contactEmail || "N/A",
          "Contact Number": vendor.contactNumber || "N/A",
          "Date Saved": formatSavedDate(vendor.dateSaved)
        }))
      : [{ "Company Name": "No vendors yet", Services: "", Contact: "", Email: "", "Contact Number": "", "Date Saved": "" }];

    const assessmentRows = assessments.length
      ? assessments.map((assessment) => ({
          "Assessment Name": assessment.purpose || "Assessment",
          "Vendor": assessment.vendorName || "N/A",
          "Type": assessment.purpose || "N/A",
          "Date Modified": assessment.reviewedDate || assessment.date || "N/A",
          "Status": assessment.status || "N/A"
        }))
      : [{ "Assessment Name": "No assessments yet", Vendor: "", Type: "", "Date Modified": "", Status: "" }];

    const signoffRows = signoffRoles.map((role) => ({
      "Department / Role": role,
      "Signer Name": signoffs?.[role]?.name || "",
      "Status": signoffs?.[role]?.status || "Pending",
      "Signature File": signoffs?.[role]?.signatureFileName || "",
      "Signed At": signoffs?.[role]?.signedAt || ""
    }));

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(vendorRows), "Vendor Directory");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(assessmentRows), "Assessments");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(signoffRows), "Sign-off Sheet");

    XLSX.writeFile(workbook, "Validify_Assessment_Report.xlsx");
  });
}

/* EVENTS */

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

if (ddfToggle) {
  ddfToggle.addEventListener("click", () => {
    ddfMenu.classList.toggle("open");
  });
}

if (isToggle) {
  isToggle.addEventListener("click", () => {
    isMenu.classList.toggle("open");
  });
}

if (reportToggle) {
  reportToggle.addEventListener("click", () => {
    reportMenu.classList.toggle("open");
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

document.addEventListener("click", (event) => {
  const reviewButton = event.target.closest("[data-review-id]");

  if (reviewButton) {
    setActiveAssessmentId(reviewButton.dataset.reviewId);
    showPage("assessment-reviews");
  }

  const reviewTab = event.target.closest("[data-review-tab]");

  if (reviewTab) {
    setReviewTab(reviewTab.dataset.reviewTab);
  }

  const reviewAction = event.target.closest("[data-review-action]");

  if (reviewAction) {
    saveVisibleResponses();
    localStorage.setItem(getReviewDateKey(), reviewDateInput?.value || getTodayDate());

    updateActiveAssessmentStatus(reviewAction.dataset.reviewAction);

    alert(`Assessment marked as ${reviewAction.dataset.reviewAction}.`);
    renderReviewTab();
  }

  if (event.target.closest("#goToSignoffFormBtn")) {
    showPage("signoff-form");
  }

  if (event.target.closest("#addVendorBtn")) {
    alert("Vendor is added when a vendor account saves the Vendor Information form.");
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "vendorSearchInput") {
    const searchValue = event.target.value.toLowerCase().trim();
    const rows = document.querySelectorAll("#vendorDirectoryBody tr");

    rows.forEach((row) => {
      const rowText = row.textContent.toLowerCase();
      row.style.display = rowText.includes(searchValue) ? "" : "none";
    });
  }

  if (event.target.classList.contains("company-review-live")) {
    saveVisibleResponses();
  }
});

if (reviewVendorSelect) {
  reviewVendorSelect.addEventListener("change", () => {
    const selectedOwnerId = reviewVendorSelect.value;
    const assessments = getAssessmentDirectory();

    const found = assessments
      .slice()
      .reverse()
      .find((assessment) => assessment.ownerId === selectedOwnerId);

    if (found) {
      setActiveAssessmentId(found.id);
    } else {
      setActiveAssessmentId("");
    }

    renderAssessmentReviewPage();
  });
}

if (reviewDateInput) {
  reviewDateInput.addEventListener("change", () => {
    localStorage.setItem(getReviewDateKey(), reviewDateInput.value);
  });
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
  signoffForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const activeAssessment = getActiveAssessment();

    if (!activeAssessment) {
      alert("Please select an assessment first.");
      showPage("assessment-reviews");
      return;
    }

    const role = signoffRole.value;
    const name = signoffName.value.trim();
    const decision = document.querySelector("input[name='approvalDecision']:checked")?.value || "Pending";
    const fileName = signatureFile.files.length > 0 ? signatureFile.files[0].name : "";

    if (!role || !name) {
      alert("Please select a role and enter the signer's full name.");
      return;
    }

    const signoffs = getSignoffs();

    signoffs[role] = {
      name,
      status: decision,
      signatureFileName: fileName,
      signedAt: new Date().toISOString()
    };

    saveSignoffs(signoffs);

    currentReviewTab = "signoff";
    alert("Sign-off record saved.");
    showPage("assessment-reviews");
  });
}

if (cancelSignoffBtn) {
  cancelSignoffBtn.addEventListener("click", () => {
    showPage("assessment-reviews");
  });
}

if (cancelAuditBtn) {
  cancelAuditBtn.addEventListener("click", () => {
    showPage("dashboard");
  });
}

if (submitAuditBtn) {
  submitAuditBtn.addEventListener("click", () => {
    updateActiveAssessmentStatus("Reported to Audit");
    alert("Assessment submitted to Audit Team.");
    showPage("dashboard");
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("/logout", {
        method: "POST"
      });
    } catch (error) {
      console.log("Logout request failed. Clearing local session.");
    }

    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("validifyCurrentUser");
    localStorage.removeItem("validifyLoggedInUser");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("validifyCurrentRole");

    sessionStorage.clear();

    window.location.href = "login.html";
  });
}

/* INIT */

async function init() {
  await checkLoggedInUser();

  localStorage.removeItem(oldGlobalSignoffKey);
  localStorage.removeItem(oldGlobalReviewDateKey);

  populateAssessmentOptions();
  renderEmployeePages();
  renderDashboard();
  showPage("dashboard");
}

init();