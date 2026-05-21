/* Vendor portal connected workflow:
   DDF sections save as Draft and move with Next.
   Last DDF section goes to Information Security.
   Information Security submission sends the whole assessment to Employee review. */
let isLoggingOut = false;
window.__validifyAllowNavigation = false;

function validifyLockDashboardBackButton() {
  const lockedUrl = window.location.href;

  function shouldLock() {
    return !isLoggingOut && !window.__validifyAllowNavigation;
  }

  function addLockState() {
    if (!shouldLock()) return;
    try {
      window.history.pushState({ validifyDashboardLock: true, timestamp: Date.now() }, "", lockedUrl);
    } catch (_error) {}
  }

  try {
    window.history.replaceState({ validifyDashboardLock: true, timestamp: Date.now() }, "", lockedUrl);
    for (let index = 0; index < 80; index += 1) addLockState();
  } catch (_error) {}

  window.addEventListener("popstate", () => {
    if (!shouldLock()) return;
    addLockState();
    window.setTimeout(addLockState, 0);
    window.requestAnimationFrame(addLockState);
  });

  window.addEventListener("pageshow", () => {
    if (!shouldLock()) return;
    window.setTimeout(addLockState, 0);
  });
}

function validifyGoToLogin() {
  isLoggingOut = true;
  window.__validifyAllowNavigation = true;
  window.location.replace("login.html");
}

validifyLockDashboardBackButton();

const ddfSequence = [
  "vendor_info",
  "consumer",
  "it_risk",
  "compliance",
  "resiliency",
  "data_privacy",
  "environmental"
];

const allSubmissionSections = [...ddfSequence, "infosec"];

const fallbackQuestionBank = {
  vendor_info: {
    title: "Vendor Information Section",
    breadcrumb: "Due Diligence Form / Vendor Information",
    questions: ["Describe the vendor service deployment model."]
  },
  consumer: {
    title: "Consumer Protection",
    breadcrumb: "Due Diligence Form / Consumer",
    questions: ["Describe your complaint handling procedure."]
  },
  it_risk: {
    title: "IT Risk Management",
    breadcrumb: "Due Diligence Form / IT Risk Management",
    questions: ["Describe your IT risk management controls."]
  },
  compliance: {
    title: "Compliance & Governance",
    breadcrumb: "Due Diligence Form / Compliance",
    questions: ["Describe your compliance controls."]
  },
  resiliency: {
    title: "Business Resiliency & BCP",
    breadcrumb: "Due Diligence Form / Resiliency",
    questions: ["Describe your BCP/DRP process."]
  },
  data_privacy: {
    title: "Data Privacy & Protection",
    breadcrumb: "Due Diligence Form / Data Privacy",
    questions: ["Describe your data privacy controls."]
  },
  environmental: {
    title: "Environmental & Social Risk",
    breadcrumb: "Due Diligence Form / Environmental & Social Risk",
    questions: ["Describe your environmental and social risk controls."]
  },
  infosec: {
    title: "Information Security Questionnaire",
    breadcrumb: "Information Security / Form for IS",
    questions: ["Describe your information security program."]
  }
};

let currentUser = null;
let vendors = [];
let assessments = [];
let questionBank = { ...fallbackQuestionBank };
let currentSectionKey = "vendor_info";
let activeAssessmentId = localStorage.getItem("active_assessment_id") || null;
let activeAssessment = null;
let answersBySection = {};

const pages = {
  dashboard: document.getElementById("dashboardPage"),
  credentials: document.getElementById("credentialsPage"),
  "create-assessment": document.getElementById("createAssessmentPage"),
  workspace: document.getElementById("assessmentWorkspacePage")
};

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function displayStatus(status) {
  return String(status || "Draft")
    .replaceAll("Pending Admin Approval", "Submitted to Employee")
    .replaceAll("Submitted", "Submitted to Employee")
    .replaceAll("Approved", "Approved for Department Review");
}

function statusClass(status) {
  return `status-${String(status || "Draft").toLowerCase().replaceAll(" ", "-")}`;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
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

function buildQuestionBank(data) {
  const nextBank = {};

  (data?.due_diligence || []).forEach((section) => {
    nextBank[section.section_key] = {
      title: section.title || section.section_name,
      breadcrumb: section.breadcrumb || `Due Diligence Form / ${section.section_name}`,
      questions: section.questions || []
    };
  });

  (data?.information_security || []).forEach((section) => {
    nextBank[section.section_key] = {
      title: section.title || section.section_name,
      breadcrumb: section.breadcrumb || `Information Security / ${section.section_name}`,
      questions: section.questions || []
    };
  });

  questionBank = Object.keys(nextBank).length ? nextBank : fallbackQuestionBank;
}

function normalizeResponseForSelect(value) {
  if (value === "N/A") return "NA";
  return value || "";
}

function normalizeAnswers(rawAnswers = {}) {
  const normalized = {};

  Object.entries(rawAnswers || {}).forEach(([sectionKey, sectionAnswers]) => {
    normalized[sectionKey] = {};

    Object.entries(sectionAnswers || {}).forEach(([index, answer]) => {
      normalized[sectionKey][Number(index)] = {
        response: normalizeResponseForSelect(answer.response),
        explanation: answer.explanation || "",
        artifact_path: answer.artifact_path || "",
        artifact_name: answer.artifact_name || ""
      };
    });
  });

  return normalized;
}

function getSectionSavedAnswers(sectionKey) {
  return answersBySection[sectionKey] || {};
}

function showPage(pageKey) {
  Object.values(pages).forEach((page) => page?.classList.remove("active"));
  const target = pages[pageKey] || pages.dashboard;
  target?.classList.add("active");

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === pageKey);
  });

  if (pageKey !== "workspace") {
    document.querySelectorAll("[data-section]").forEach((button) => button.classList.remove("active"));
  }

  if (pageKey === "dashboard") renderDashboard();
  if (pageKey === "create-assessment") populateAssessmentControls();
}

function findAssessment(assessmentId) {
  return assessments.find((item) => String(item.assessment_id) === String(assessmentId)) || null;
}

async function selectAssessment(assessmentId, openSection = "vendor_info") {
  if (!assessmentId) return;
  activeAssessmentId = String(assessmentId);
  localStorage.setItem("active_assessment_id", activeAssessmentId);

  const data = await api(`/vendor/assessments/${encodeURIComponent(activeAssessmentId)}`);
  activeAssessment = data.assessment;
  answersBySection = normalizeAnswers(data.answers || {});

  openWorkspace(openSection);
}

async function openWorkspace(sectionKey) {
  if (!questionBank[sectionKey]) return;

  if (!activeAssessmentId && assessments.length) {
    activeAssessmentId = String(assessments[0].assessment_id);
    localStorage.setItem("active_assessment_id", activeAssessmentId);
  }

  if (!activeAssessmentId) {
    showToast("Create an assessment first before answering forms.");
    showPage("create-assessment");
    return;
  }

  if (!activeAssessment || String(activeAssessment.assessment_id) !== String(activeAssessmentId)) {
    const data = await api(`/vendor/assessments/${encodeURIComponent(activeAssessmentId)}`);
    activeAssessment = data.assessment;
    answersBySection = normalizeAnswers(data.answers || {});
  }

  currentSectionKey = sectionKey;
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.remove("active"));
  document.querySelectorAll("[data-section]").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === sectionKey);
  });

  showPage("workspace");
  renderAssessmentWorkspace(sectionKey);
}

function renderDashboard() {
  const tbody = document.getElementById("recentAssessmentBody");
  const total = assessments.length;
  const drafted = assessments.filter((item) => ["Draft", "Returned"].includes(item.vendor_status || item.overall_status)).length;
  const submitted = assessments.filter((item) => ["Submitted", "Pending Admin Approval"].includes(item.vendor_status || item.overall_status)).length;
  const returned = assessments.filter((item) => (item.vendor_status || item.overall_status) === "Returned").length;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statDrafted").textContent = drafted;
  document.getElementById("statSubmitted").textContent = submitted;
  document.getElementById("statReturned").textContent = returned;

  if (!tbody) return;

  if (!assessments.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No assessments yet. Save vendor credentials, then create an assessment.</td></tr>`;
    return;
  }

  tbody.innerHTML = assessments.slice(0, 10).map((item) => {
    const status = item.vendor_status || item.overall_status || "Draft";
    return `
      <tr>
        <td><strong>${escapeHTML(item.assessment_code || `VA-${item.assessment_id}`)}</strong><br><small>${escapeHTML(item.purpose || "General Assessment")}</small></td>
        <td>${escapeHTML(item.company_name || "Unknown Vendor")}</td>
        <td>${escapeHTML(formatDate(item.updated_at || item.created_at))}</td>
        <td><span class="status-pill ${statusClass(status)}">${escapeHTML(displayStatus(status))}</span></td>
        <td>
          <button class="secondary-btn" type="button" data-resume-id="${escapeHTML(item.assessment_id)}">
            ${status === "Submitted" || status === "Approved" ? "View" : "Resume"}
          </button>
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("[data-resume-id]").forEach((button) => {
    button.addEventListener("click", () => selectAssessment(button.dataset.resumeId, "vendor_info"));
  });
}

function populateAssessmentControls() {
  const vendorSelect = document.getElementById("selectVendor");
  const existingSelect = document.getElementById("selectExisting");
  const assessmentDate = document.getElementById("assessmentDate");

  if (assessmentDate && !assessmentDate.value) assessmentDate.value = todayInputValue();

  if (vendorSelect) {
    vendorSelect.innerHTML = vendors.length
      ? `<option value="" disabled selected>Select a registered vendor</option>`
      : `<option value="" disabled selected>No vendors found. Save vendor credentials first.</option>`;

    vendors.forEach((vendor) => {
      vendorSelect.innerHTML += `<option value="${escapeHTML(vendor.vendor_id)}">${escapeHTML(vendor.company_name)}</option>`;
    });
  }

  if (existingSelect) {
    existingSelect.innerHTML = `<option value="" selected>Select existing assessment</option>`;

    assessments.forEach((item) => {
      existingSelect.innerHTML += `
        <option value="${escapeHTML(item.assessment_id)}">
          ${escapeHTML(item.assessment_code || `VA-${item.assessment_id}`)} - ${escapeHTML(item.company_name)} - ${escapeHTML(displayStatus(item.vendor_status || item.overall_status))}
        </option>
      `;
    });
  }
}

async function loadVendorDashboard() {
  const data = await api("/vendor/dashboard");
  vendors = data.vendors || [];
  assessments = data.assessments || [];

  if (activeAssessmentId) {
    activeAssessment = findAssessment(activeAssessmentId);
  }

  const accountName = document.getElementById("accountName");
  const menuName = document.getElementById("accountMenuName");
  const displayName = vendors[0]?.company_name || currentUser?.full_name || "Vendor Account";

  if (accountName) accountName.textContent = displayName;
  if (menuName) menuName.textContent = displayName;

  populateAssessmentControls();
  renderDashboard();
}

async function saveVendorCredentials(event) {
  event.preventDefault();

  const payload = {
    company_name: document.getElementById("companyName").value.trim(),
    company_website: document.getElementById("companyWebsite").value.trim(),
    product_services_offered: document.getElementById("productServices").value.trim(),
    contact_person_name: document.getElementById("contactName").value.trim(),
    contact_email: document.getElementById("contactEmail").value.trim(),
    contact_phone: document.getElementById("contactPhone").value.trim()
  };

  await api("/vendor/vendors", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  event.target.reset();
  showToast("Vendor credentials saved.");
  await loadVendorDashboard();
  showPage("create-assessment");
}

async function createAssessment(event) {
  event.preventDefault();

  const payload = {
    vendor_id: document.getElementById("selectVendor").value,
    purpose: document.getElementById("assessmentPurpose").value,
    assessment_date: document.getElementById("assessmentDate").value
  };

  const assessment = await api("/vendor/assessments", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  activeAssessmentId = String(assessment.assessment_id);
  localStorage.setItem("active_assessment_id", activeAssessmentId);
  activeAssessment = assessment;
  answersBySection = {};

  document.getElementById("createAssessmentForm").reset();
  document.getElementById("assessmentDate").value = todayInputValue();
  await loadVendorDashboard();
  showToast(`Assessment ${assessment.assessment_code || assessment.assessment_id} created.`);
  openWorkspace("vendor_info");
}

function getQuestionId(sectionKey, index) {
  return `${sectionKey}_q${index}`;
}

function captureCurrentPageData() {
  const section = questionBank[currentSectionKey];
  if (!section) return {};

  const saved = { ...(answersBySection[currentSectionKey] || {}) };

  section.questions.forEach((_question, index) => {
    const questionId = getQuestionId(currentSectionKey, index);
    const fileInput = document.getElementById(`${questionId}_file`);
    const existing = saved[index] || {};

    saved[index] = {
      response: document.getElementById(`${questionId}_status`)?.value || "",
      explanation: document.getElementById(`${questionId}_comment`)?.value.trim() || "",
      artifact_path: existing.artifact_path || "",
      artifact_name: fileInput?.files?.[0]?.name || existing.artifact_name || ""
    };
  });

  answersBySection[currentSectionKey] = saved;
  return saved;
}

function validateCurrentSection() {
  const section = questionBank[currentSectionKey];
  const missing = [];

  section.questions.forEach((_question, index) => {
    const questionId = getQuestionId(currentSectionKey, index);
    const response = document.getElementById(`${questionId}_status`)?.value || "";
    const explanation = document.getElementById(`${questionId}_comment`)?.value.trim() || "";
    const fileInput = document.getElementById(`${questionId}_file`);
    const existing = answersBySection[currentSectionKey]?.[index] || {};
    const hasArtifact = Boolean(fileInput?.files?.length || existing.artifact_path || existing.artifact_name);

    if (!response || !explanation || !hasArtifact) {
      missing.push(index + 1);
    }
  });

  if (missing.length) {
    showToast(`Complete all required answers, comments, and PDFs. Missing question/s: ${missing.slice(0, 5).join(", ")}`);
    return false;
  }

  return true;
}

async function saveCurrentSection(status = "Draft") {
  if (!activeAssessmentId) {
    showToast("Create or select an assessment first.");
    return null;
  }

  if (!validateCurrentSection()) return null;

  const section = questionBank[currentSectionKey];
  const formData = new FormData();
  const answers = [];

  section.questions.forEach((questionText, index) => {
    const questionId = getQuestionId(currentSectionKey, index);
    const fileInput = document.getElementById(`${questionId}_file`);
    const existing = answersBySection[currentSectionKey]?.[index] || {};

    if (fileInput?.files?.length) {
      formData.append(`artifact_${index}`, fileInput.files[0]);
    }

    answers.push({
      question_index: index,
      question_text: questionText,
      response: document.getElementById(`${questionId}_status`)?.value || "",
      explanation: document.getElementById(`${questionId}_comment`)?.value.trim() || "",
      existing_artifact_path: existing.artifact_path || null,
      existing_artifact_name: existing.artifact_name || null
    });
  });

  formData.append("section_key", currentSectionKey);
  formData.append("status", status);
  formData.append("answers", JSON.stringify(answers));

  const data = await api(`/vendor/assessments/${encodeURIComponent(activeAssessmentId)}/save`, {
    method: "POST",
    body: formData
  });

  activeAssessment = data.assessment;
  answersBySection = normalizeAnswers(data.answers || {});
  await loadVendorDashboard();

  return data;
}

function renderAssessmentWorkspace(sectionKey) {
  const section = questionBank[sectionKey];
  const questionsContainer = document.getElementById("questionsContainer");

  if (!section || !questionsContainer) return;

  const assessment = activeAssessment || findAssessment(activeAssessmentId);
  const status = assessment?.vendor_status || assessment?.overall_status || "Draft";

  document.getElementById("sectionTitle").textContent = section.title;
  document.getElementById("breadcrumbLabel").textContent = section.breadcrumb;
  document.getElementById("activeAssessmentLabel").textContent = assessment
    ? `Active Assessment ID: ${assessment.assessment_code || `VA-${assessment.assessment_id}`}`
    : "No active assessment selected.";
  document.getElementById("activeVendorName").textContent = assessment?.company_name || "None selected";
  document.getElementById("activePurpose").textContent = assessment?.purpose || "N/A";

  const activeStatus = document.getElementById("activeStatus");
  activeStatus.textContent = displayStatus(status);
  activeStatus.className = `status-pill ${statusClass(status)}`;

  const savedData = getSectionSavedAnswers(sectionKey);
  questionsContainer.innerHTML = "";

  section.questions.forEach((questionText, index) => {
    const questionId = getQuestionId(sectionKey, index);
    const saved = savedData[index] || {};
    const hasArtifact = Boolean(saved.artifact_path || saved.artifact_name);
    const row = document.createElement("div");
    row.className = "questionnaire-row-node";
    row.innerHTML = `
      <div class="questionnaire-statement">${index + 1}. ${escapeHTML(questionText)}</div>
      <div class="interactive-response-split-block">
        <div class="input-wrapper standard-dropdown-wrapper">
          <select id="${questionId}_status" required>
            <option value="" ${!saved.response ? "selected" : ""} disabled>Select Answer</option>
            <option value="YES" ${saved.response === "YES" ? "selected" : ""}>Yes</option>
            <option value="NO" ${saved.response === "NO" ? "selected" : ""}>No</option>
            <option value="NA" ${saved.response === "NA" ? "selected" : ""}>N/A</option>
          </select>
        </div>
        <div class="input-wrapper text-commentary-wrapper">
          <textarea id="${questionId}_comment" placeholder="Type detailed vendor response comments here...">${escapeHTML(saved.explanation || "")}</textarea>
        </div>
      </div>
      <div class="artifact-upload-sub-row">
        <label class="artifact-label" for="${questionId}_file">
          <i class="fa-solid fa-paperclip"></i>
          Attach Supporting Artifact (PDF Only) <span style="color:#dc2626;">* Required</span>
        </label>
        <div class="upload-action-group">
          <input type="file" id="${questionId}_file" class="pdf-file-input" accept=".pdf,application/pdf" />
          <div class="artifact-status-badge ${hasArtifact ? "attached" : "missing"}" id="${questionId}_badge">
            <i class="fa-solid ${hasArtifact ? "fa-circle-check" : "fa-circle-xmark"}"></i>
            <span>${hasArtifact ? `Document Attached: ${escapeHTML(saved.artifact_name || "Saved document")}` : "No Document Uploaded"}</span>
          </div>
        </div>
      </div>
    `;
    questionsContainer.appendChild(row);
  });

  questionsContainer.querySelectorAll(".pdf-file-input").forEach((input) => {
    input.addEventListener("change", handleArtifactChange);
  });

  updateNextButton(sectionKey);
}

function handleArtifactChange(event) {
  const input = event.target;
  const questionId = input.id.replace("_file", "");
  const badge = document.getElementById(`${questionId}_badge`);

  if (!badge) return;

  if (!input.files || !input.files.length) return;

  const selectedFile = input.files[0];
  const isPDF = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");

  if (!isPDF) {
    showToast("Only PDF files are accepted.");
    input.value = "";
    return;
  }

  badge.className = "artifact-status-badge attached";
  badge.querySelector("i").className = "fa-solid fa-circle-check";
  badge.querySelector("span").textContent = `Document Attached: ${selectedFile.name}`;
  captureCurrentPageData();
}

function updateNextButton(sectionKey) {
  const nextBtn = document.getElementById("submitNextBtn");
  if (!nextBtn) return;

  if (sectionKey === "infosec") {
    nextBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Submit Assessment`;
    return;
  }

  const index = ddfSequence.indexOf(sectionKey);
  const label = index === ddfSequence.length - 1 ? "Next: Information Security" : "Next";
  nextBtn.innerHTML = `${label} <i class="fa-solid fa-arrow-right"></i>`;
}

async function goToNextOrSubmit() {
  try {
    captureCurrentPageData();

    if (currentSectionKey === "infosec") {
      const data = await saveCurrentSection("Submitted");
      if (!data) return;
      showToast("Assessment submitted to Employee / Compliance Officer.");
      renderDashboard();
      showPage("dashboard");
      return;
    }

    const currentIndex = ddfSequence.indexOf(currentSectionKey);
    if (currentIndex === -1) return;

    const data = await saveCurrentSection("Draft");
    if (!data) return;

    if (currentIndex === ddfSequence.length - 1) {
      showToast("Due Diligence saved. Continue to Information Security.");
      await openWorkspace("infosec");
      return;
    }

    await openWorkspace(ddfSequence[currentIndex + 1]);
  } catch (error) {
    showToast(error.message || "Failed to save section.");
  }
}

async function saveDraftOnly() {
  try {
    captureCurrentPageData();
    const data = await saveCurrentSection("Draft");
    if (data) showToast("Draft saved successfully.");
  } catch (error) {
    showToast(error.message || "Failed to save draft.");
  }
}

function setupEvents() {
  document.querySelectorAll(".nav-item[data-page]").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  document.querySelectorAll(".dropdown-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const parent = button.closest(".nav-dropdown");
      parent.classList.toggle("open");
    });
  });

  document.querySelectorAll("[data-section]").forEach((button) => {
    button.addEventListener("click", () => openWorkspace(button.dataset.section));
  });

  document.getElementById("openCreateAssessmentBtn")?.addEventListener("click", () => showPage("create-assessment"));
  document.getElementById("backToDashboardBtn")?.addEventListener("click", () => showPage("dashboard"));
  document.getElementById("credentialsForm")?.addEventListener("submit", (event) => saveVendorCredentials(event).catch((error) => showToast(error.message)));
  document.getElementById("createAssessmentForm")?.addEventListener("submit", (event) => createAssessment(event).catch((error) => showToast(error.message)));
  document.getElementById("saveDraftBtn")?.addEventListener("click", saveDraftOnly);
  document.getElementById("submitNextBtn")?.addEventListener("click", goToNextOrSubmit);

  document.getElementById("selectExisting")?.addEventListener("change", (event) => {
    if (!event.target.value) return;
    selectAssessment(event.target.value, "vendor_info").catch((error) => showToast(error.message));
  });

  document.getElementById("contactPhone")?.addEventListener("input", (event) => {
    event.target.value = event.target.value.replace(/[^0-9+\-\s()]/g, "");
  });

  document.getElementById("resetCredentialsBtn")?.addEventListener("click", () => {
    document.getElementById("credentialsForm")?.reset();
  });

  document.getElementById("clearDemoDataBtn")?.addEventListener("click", async () => {
    localStorage.removeItem("active_assessment_id");
    activeAssessmentId = null;
    activeAssessment = null;
    answersBySection = {};
    showToast("Local active assessment selection cleared. Database records were not deleted.");
    await loadVendorDashboard();
  });

  document.getElementById("darkModeBtn")?.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("validify_vendor_dark_mode", document.body.classList.contains("dark-mode") ? "1" : "0");
  });

  const vendorAccountToggle = document.getElementById("vendorAccountToggle");
  const vendorAccountMenu = document.getElementById("vendorAccountMenu");
  const vendorProfileBtn = document.getElementById("vendorProfileBtn");
  const vendorHelpBtn = document.getElementById("vendorHelpBtn");

  if (vendorAccountToggle && vendorAccountMenu) {
    vendorAccountToggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      vendorAccountMenu.classList.toggle("hidden");
      vendorAccountToggle.classList.toggle("active");
    });

    vendorAccountMenu.addEventListener("click", (event) => event.stopPropagation());

    document.addEventListener("click", () => {
      vendorAccountMenu.classList.add("hidden");
      vendorAccountToggle.classList.remove("active");
    });
  }

  vendorProfileBtn?.addEventListener("click", () => {
    vendorAccountMenu?.classList.add("hidden");
    showPage("credentials");
  });

  vendorHelpBtn?.addEventListener("click", () => {
    vendorAccountMenu?.classList.add("hidden");
    showToast("For help, contact the Vendor Management & Compliance Officer.");
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    isLoggingOut = true;
    window.__validifyAllowNavigation = true;

    try {
      await fetch("/logout", { method: "POST", credentials: "same-origin" });
    } catch (_error) {}

    sessionStorage.clear();
    localStorage.removeItem("active_assessment_id");
    validifyGoToLogin();
  });
}

async function boot() {
  try {
    if (localStorage.getItem("validify_vendor_dark_mode") === "1") {
      document.body.classList.add("dark-mode");
    }

    currentUser = await api("/me");
    if (currentUser.role !== "vendor") {
      throw new Error("Vendor account required.");
    }

    try {
      const bank = await api("/question-bank");
      buildQuestionBank(bank);
    } catch (_error) {
      questionBank = { ...fallbackQuestionBank };
    }

    setupEvents();

    const assessmentDate = document.getElementById("assessmentDate");
    if (assessmentDate) assessmentDate.value = todayInputValue();

    await loadVendorDashboard();

    if (activeAssessmentId && findAssessment(activeAssessmentId)) {
      const data = await api(`/vendor/assessments/${encodeURIComponent(activeAssessmentId)}`);
      activeAssessment = data.assessment;
      answersBySection = normalizeAnswers(data.answers || {});
    }
  } catch (error) {
    console.error(error);
    validifyGoToLogin();
  }
}

document.addEventListener("DOMContentLoaded", boot);
