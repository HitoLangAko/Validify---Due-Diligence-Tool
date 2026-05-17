let currentUser = null;
let currentRole = "";
let departmentRows = [];
let adminRows = [];
let employeeRows = [];

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
const mySubmissionsBody = document.getElementById("mySubmissionsBody");
const departmentAssessmentsBody = document.getElementById("departmentAssessmentsBody");
const allVendorsBody = document.getElementById("allVendorsBody");
const departmentReviewsBody = document.getElementById("departmentReviewsBody");

function getRoleLabel(role) {
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

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
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
  const response = await fetch(url, {
    ...options,
    headers: {
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

  if (currentRole === "employee") {
    if (roleHelper) {
      roleHelper.textContent = "Standard Employee Portal: add vendors and monitor your own submissions.";
    }
  } else if (isDepartmentRole()) {
    if (roleHelper) {
      roleHelper.textContent = `${label} Console: review vendors submitted by employees.`;
    }
  } else if (currentRole === "admin") {
    if (roleHelper) {
      roleHelper.textContent = "Admin CISO System: monitor all vendors and department reviews.";
    }
  }

  showPage(defaultPageByRole[currentRole] || "dashboard");
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

  const pageId = `${page
    .split("-")
    .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join("")}Page`;

  const target = document.getElementById(pageId);

  if (target) {
    target.classList.add("active");
  }
}

function pageLabel(page) {
  const activeButton = document.querySelector(`[data-page="${page}"] span`);
  return activeButton ? activeButton.textContent.trim() : "Dashboard";
}

function showPage(page) {
  setActiveNav(page);
  showOnlyPage(page);

  const label = pageLabel(page);

  if (pageTitle) pageTitle.textContent = label;
  if (breadcrumb) breadcrumb.textContent = `${getRoleLabel(currentRole)} / ${label}`;

  refreshCurrentPage(page);
}

async function refreshCurrentPage(page = getCurrentPage()) {
  try {
    if (currentRole === "employee") {
      await loadEmployeeData();
    }

    if (isDepartmentRole()) {
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

/* EMPLOYEE */

async function loadEmployeeData() {
  employeeRows = await api("/vendors/mine");
  renderMySubmissions();
}

function renderMySubmissions() {
  if (!mySubmissionsBody) return;

  if (!employeeRows.length) {
    mySubmissionsBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">No submissions yet.</td>
      </tr>
    `;
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
      await loadEmployeeData();
      showToast("Vendor submitted to all department accounts.");
      showPage("my-submissions");
    } catch (error) {
      alert(error.message);
    }
  });
}

/* DEPARTMENT */

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
  if (!dashboardTableHead || !dashboardTableBody || !isDepartmentRole()) return;

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
    dashboardTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">No vendor assessments yet.</td>
      </tr>
    `;
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
    departmentAssessmentsBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-cell">No vendor assessments yet.</td>
      </tr>
    `;
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
      <td>
        <textarea class="inline-review-box" id="comment-${vendor.vendor_id}" placeholder="Department comment">${escapeHTML(vendor.comments || "")}</textarea>
      </td>
      <td>
        <select class="inline-select" id="status-${vendor.vendor_id}">
          <option value="Pending" ${vendor.review_status === "Pending" ? "selected" : ""}>Pending</option>
          <option value="Reviewed" ${vendor.review_status === "Reviewed" ? "selected" : ""}>Reviewed</option>
          <option value="Approved" ${vendor.review_status === "Approved" ? "selected" : ""}>Approved</option>
          <option value="Rejected" ${vendor.review_status === "Rejected" ? "selected" : ""}>Rejected</option>
        </select>
      </td>
      <td class="wide-action-cell">
        <button type="button" class="green-action-btn" onclick="saveDepartmentReview(${vendor.vendor_id})">Save Review</button>
      </td>
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
    dashboardTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-cell">No vendors yet.</td>
      </tr>
    `;
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
    allVendorsBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-cell">No vendors yet.</td>
      </tr>
    `;
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
    departmentReviewsBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-cell">No department reviews yet.</td>
      </tr>
    `;
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
      await fetch("/logout", {
        method: "POST"
      });
    } catch (error) {
      console.error(error);
    }

    sessionStorage.clear();
    window.location.href = "login.html";
  });
}

setupAddVendorForm();

async function init() {
  await checkLoggedInUser();
}

init();
