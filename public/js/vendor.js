const STORAGE_KEYS = {
  vendors: "validify_mock_vendors",
  assessments: "validify_mock_global_assessments",
  activeAssessment: "active_assessment_id",
  darkMode: "validify_vendor_dark_mode"
};

const ddfSequence = [
  "vendor_info",
  "consumer",
  "it_risk",
  "compliance",
  "resiliency",
  "data_privacy",
  "environmental"
];

const questionnaireDatabase = {
  vendor_info: {
    title: "Vendor Information Section",
    breadcrumb: "Due Diligence Form / Vendor Info",
    storageKey: "validify_ddf_draft",
    questions: [
      "Type of Service/s deployment model would this vendor implement? Describe briefly.",
      "Vendor's clients and industries they belong to.",
      "Vendor's Local Offices and Headquarter (HQ) Location.",
      "Number of years the company has been in business.",
      "Please describe your ability and capacity to perform the outsourced activities effectively and reliably.",
      "What is your Support Turnaround time?",
      "Vendor's clients and actual performance such as certifications, accreditations, and performance rating.",
      "To whom are issues escalated? Please provide name, email address, and contact number.",
      "Have there been any instances where you were unable to deliver services as per the agreed terms? If yes, please provide details.",
      "Please provide the cost of this particular engagement."
    ]
  },
  consumer: {
    title: "Consumer Protection",
    breadcrumb: "Due Diligence Form / Consumer",
    storageKey: "validify_ddf_draft",
    questions: [
      "Do you have a mechanism to address clients' complaints against an authorized agent or representative? Please provide an overview of your complaint handling procedures.",
      "How do you ensure that client complaints are addressed quickly and adequately?",
      "Do you have a team or individuals dedicated to managing consumer complaints? If so, lay out the positions and qualifications.",
      "What is a typical time frame for acknowledging and addressing a customer complaint?",
      "How do you track and document customer complaints?"
    ]
  },
  it_risk: {
    title: "IT Risk Management",
    breadcrumb: "Due Diligence Form / IT Risk Management",
    storageKey: "validify_ddf_draft",
    questions: [
      "Do you have documented IT Security Risk Management policies and procedures?",
      "Does your organization undergo regular network penetration testing or vulnerability assessments?",
      "Are systems and applications patched regularly and in a timely manner?",
      "Do you have a dedicated Security Operations Center or team that monitors incidents?",
      "What backup and disaster recovery mechanisms are implemented for your critical infrastructure systems?",
      "How do you track, manage, and audit administrative or privileged credential access across your servers?"
    ]
  },
  compliance: {
    title: "Compliance & Governance",
    breadcrumb: "Due Diligence Form / Compliance",
    storageKey: "validify_ddf_draft",
    questions: [
      "Do you have policies in place to ensure compliance with all relevant laws and regulations, including labor, environment, health, and safety?",
      "Are security requirements incorporated explicitly into service contracts through data protection clauses?",
      "Does your organization undergo regular internal and external security compliance audits?",
      "Provide copies of Occupational Health and Safety Policies and related government-mandated compliance reports."
    ]
  },
  resiliency: {
    title: "Business Resiliency & BCP",
    breadcrumb: "Due Diligence Form / Resiliency",
    storageKey: "validify_ddf_draft",
    questions: [
      "Do you have an active Business Continuity Plan and Disaster Recovery Plan in place?",
      "How frequently are your BCP and DRP frameworks tested, evaluated, and updated?",
      "Please provide your latest BCP or DRP testing timeline, executive summaries, or results.",
      "Describe your target Recovery Time Objective and Recovery Point Objective guarantees for system disruptions."
    ]
  },
  data_privacy: {
    title: "Data Privacy & Protection",
    breadcrumb: "Due Diligence Form / Data Privacy",
    storageKey: "validify_ddf_draft",
    questions: [
      "Do you comply with the Data Privacy Act of 2012 and other related privacy frameworks?",
      "Do you have a designated Data Protection Officer or team overseeing client data privacy?",
      "Describe the organizational and technical security measures implemented to protect client data from unauthorized leaks.",
      "What are your established protocols for managing, declaring, and responding to data breaches?"
    ]
  },
  environmental: {
    title: "Environmental & Social Risk",
    breadcrumb: "Due Diligence Form / Environmental & Social",
    storageKey: "validify_ddf_draft",
    questions: [
      "Do you track and measure your sustainability performance, such as UN SDG impact or ESG indicators?",
      "Do you have a corporate sustainability report? If yes, provide a copy of your latest sustainability report.",
      "Do you have policies in place to prevent discrimination, harassment, and abuse of employees?",
      "Do you have systems or policies in place to prevent fraud, corruption, forced labor, child labor, and other unethical practices?"
    ]
  },
  infosec: {
    title: "Information Security Questionnaire",
    breadcrumb: "Information Security / Form for IS",
    storageKey: "validify_infosec_draft",
    questions: [
      "Is there a dedicated security officer or team responsible for overseeing the implementation of the information security programs, awareness, and compliance in your organization?",
      "Does your security officer report to senior management or remain part of the organization's steering committee?",
      "Do you have documented security policies? Are they board approved?",
      "Are security policies regularly reviewed to align with industry best practices such as ISO 27001, PCI DSS, or NIST?",
      "Does your organization undergo regular internal and external security audits? Please share the high-level summary result or report.",
      "Do you comply with relevant local and international laws and security regulations?",
      "Are security requirements incorporated in contracts, including data protection clauses?",
      "Do you have an established Information Security Awareness Program for employees?",
      "Do you have controls in place to assess your own third-party suppliers?",
      "Do you have a security incident response team and procedures in place?",
      "Have you encountered or reported cyber attacks or security incidents in the past two years? If yes, provide details.",
      "Do you have an Incident Response Plan configured for ransomware, phishing, or data breach scenarios?",
      "Do you securely dispose of electronic copies of client data? Kindly describe your process.",
      "Do you securely dispose of physical copies of client data? Kindly describe your process.",
      "Have you ever been blacklisted as a partner or supplier by another company, client, or customer?",
      "Do you provide services to direct competitors? If yes, do you have processes that ensure absolute confidentiality of information?"
    ]
  }
};

let currentSectionKey = "vendor_info";
let activeAssessmentId = localStorage.getItem(STORAGE_KEYS.activeAssessment) || null;

const pages = {
  dashboard: document.getElementById("dashboardPage"),
  credentials: document.getElementById("credentialsPage"),
  "create-assessment": document.getElementById("createAssessmentPage"),
  workspace: document.getElementById("assessmentWorkspacePage")
};

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getVendors() {
  return readJSON(STORAGE_KEYS.vendors, []);
}

function setVendors(vendors) {
  writeJSON(STORAGE_KEYS.vendors, vendors);
}

function getAssessments() {
  return readJSON(STORAGE_KEYS.assessments, []);
}

function setAssessments(assessments) {
  writeJSON(STORAGE_KEYS.assessments, assessments);
}

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
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  });
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function statusClass(status) {
  return `status-${String(status || "Draft").toLowerCase().replaceAll(" ", "-")}`;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

function setVendorAccountDisplay(name = "Vendor Account", roleText = "Vendor Portal") {
  const displayName = String(name || "Vendor Account").trim() || "Vendor Account";
  const initial = displayName.charAt(0).toUpperCase() || "V";

  const accountName = document.getElementById("accountName");
  const accountMenuName = document.getElementById("accountMenuName");
  const accountRoleText = document.getElementById("accountRoleText");
  const accountMenuRoleText = document.getElementById("accountMenuRoleText");
  const accountAvatar = document.getElementById("accountAvatar");
  const accountMenuAvatar = document.getElementById("accountMenuAvatar");

  if (accountName) accountName.textContent = displayName;
  if (accountMenuName) accountMenuName.textContent = displayName;
  if (accountRoleText) accountRoleText.textContent = roleText;
  if (accountMenuRoleText) accountMenuRoleText.textContent = roleText;
  if (accountAvatar) accountAvatar.textContent = initial;
  if (accountMenuAvatar) accountMenuAvatar.textContent = initial;
}

async function loadVendorAccountDisplay() {
  try {
    const response = await fetch("/me", { credentials: "same-origin" });
    if (!response.ok) return;

    const user = await response.json();
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    const displayName = fullName || user.full_name || "Vendor Account";

    setVendorAccountDisplay(displayName, "Vendor Portal");
  } catch (_error) {
    setVendorAccountDisplay("Vendor Account", "Vendor Portal");
  }
}

function showPage(pageKey) {
  Object.values(pages).forEach((page) => page.classList.remove("active"));
  const target = pages[pageKey] || pages.dashboard;
  target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === pageKey);
  });

  if (pageKey !== "workspace") {
    document.querySelectorAll("[data-section]").forEach((button) => button.classList.remove("active"));
  }

  if (pageKey === "dashboard") renderDashboard();
  if (pageKey === "create-assessment") populateAssessmentControls();
}

function openWorkspace(sectionKey) {
  if (!questionnaireDatabase[sectionKey]) return;

  if (!activeAssessmentId) {
    const assessments = getAssessments();
    if (assessments.length) {
      activeAssessmentId = String(assessments[0].assessment_id);
      localStorage.setItem(STORAGE_KEYS.activeAssessment, activeAssessmentId);
    }
  }

  if (!activeAssessmentId) {
    showToast("Create an assessment first before answering forms.");
    showPage("create-assessment");
    return;
  }

  currentSectionKey = sectionKey;
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.remove("active"));
  document.querySelectorAll("[data-section]").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === sectionKey);
  });

  showPage("workspace");
  renderAssessmentWorkspace(sectionKey);
}

function getActiveAssessment() {
  if (!activeAssessmentId) return null;
  return getAssessments().find((item) => String(item.assessment_id) === String(activeAssessmentId)) || null;
}

function saveActiveAssessmentPatch(patch) {
  const assessments = getAssessments();
  const index = assessments.findIndex((item) => String(item.assessment_id) === String(activeAssessmentId));
  if (index === -1) return null;
  assessments[index] = {
    ...assessments[index],
    ...patch,
    updated_at: new Date().toISOString()
  };
  setAssessments(assessments);
  return assessments[index];
}

function renderDashboard() {
  const assessments = getAssessments();
  const tbody = document.getElementById("recentAssessmentBody");

  document.getElementById("statTotal").textContent = assessments.length;
  document.getElementById("statDrafted").textContent = assessments.filter((item) => item.status === "Draft").length;
  document.getElementById("statSubmitted").textContent = assessments.filter((item) => item.status === "Submitted").length;
  document.getElementById("statReturned").textContent = assessments.filter((item) => item.status === "Returned").length;

  if (!tbody) return;
  if (!assessments.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">No assessments yet. Create a vendor profile, then create an assessment.</td></tr>`;
    return;
  }

  tbody.innerHTML = assessments.slice(0, 8).map((item) => {
    const status = item.status || "Draft";
    const dateValue = item.updated_at || item.created_at;
    return `
      <tr>
        <td><strong>${escapeHTML(item.purpose || "General Assessment")}</strong></td>
        <td>${escapeHTML(item.company_name || "Unknown Vendor")}</td>
        <td>${escapeHTML(formatDate(dateValue))}</td>
        <td><span class="status-pill ${statusClass(status)}">${escapeHTML(status)}</span></td>
        <td>
          <button class="secondary-btn" type="button" data-resume-id="${escapeHTML(item.assessment_id)}">
            ${status === "Draft" ? "Resume" : "View"}
          </button>
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("[data-resume-id]").forEach((button) => {
    button.addEventListener("click", () => {
      activeAssessmentId = String(button.dataset.resumeId);
      localStorage.setItem(STORAGE_KEYS.activeAssessment, activeAssessmentId);
      openWorkspace("vendor_info");
    });
  });
}

function populateAssessmentControls() {
  const vendors = getVendors();
  const assessments = getAssessments();
  const vendorSelect = document.getElementById("selectVendor");
  const existingSelect = document.getElementById("selectExisting");
  const assessmentDate = document.getElementById("assessmentDate");

  if (assessmentDate && !assessmentDate.value) assessmentDate.value = todayInputValue();

  if (vendorSelect) {
    if (!vendors.length) {
      vendorSelect.innerHTML = `<option value="" disabled selected>No vendors found. Save vendor credentials first.</option>`;
    } else {
      vendorSelect.innerHTML = `<option value="" disabled selected>Select a registered vendor</option>`;
      vendors.forEach((vendor) => {
        vendorSelect.innerHTML += `<option value="${escapeHTML(vendor.vendor_id)}">${escapeHTML(vendor.company_name)}</option>`;
      });
    }
  }

  if (existingSelect) {
    existingSelect.innerHTML = `<option value="" selected>Select existing assessment</option>`;
    if (!assessments.length) {
      existingSelect.innerHTML += `<option value="" disabled>No stored assessment records found.</option>`;
    } else {
      assessments.forEach((item) => {
        existingSelect.innerHTML += `<option value="${escapeHTML(item.assessment_id)}">${escapeHTML(item.company_name)} - ${escapeHTML(item.purpose)} (${escapeHTML(item.status)})</option>`;
      });
    }
  }
}

function saveVendorCredentials(event) {
  event.preventDefault();

  const contactPhoneInput = document.getElementById("contactPhone");
  const newVendor = {
    vendor_id: Date.now(),
    company_name: document.getElementById("companyName").value.trim(),
    company_website: document.getElementById("companyWebsite").value.trim(),
    product_services: document.getElementById("productServices").value.trim(),
    contact_name: document.getElementById("contactName").value.trim(),
    contact_email: document.getElementById("contactEmail").value.trim(),
    contact_phone: contactPhoneInput.value.trim(),
    created_at: new Date().toISOString()
  };

  const vendors = getVendors();
  const duplicate = vendors.some((vendor) => vendor.company_name.toLowerCase() === newVendor.company_name.toLowerCase());
  if (duplicate) {
    showToast("A vendor profile with this company name already exists.");
    return;
  }

  vendors.unshift(newVendor);
  setVendors(vendors);
  event.target.reset();
  showToast("Vendor credentials saved.");
  populateAssessmentControls();
  showPage("create-assessment");
}

function createAssessment(event) {
  event.preventDefault();

  const vendorId = document.getElementById("selectVendor").value;
  const purpose = document.getElementById("assessmentPurpose").value;
  const date = document.getElementById("assessmentDate").value;
  const vendor = getVendors().find((item) => String(item.vendor_id) === String(vendorId));

  if (!vendor) {
    showToast("Please select a vendor first.");
    return;
  }

  const newAssessment = {
    assessment_id: Date.now(),
    vendor_id: vendor.vendor_id,
    company_name: vendor.company_name,
    product_services: vendor.product_services,
    created_at: new Date(date || new Date()).toISOString(),
    updated_at: new Date().toISOString(),
    purpose,
    status: "Draft"
  };

  const assessments = getAssessments();
  assessments.unshift(newAssessment);
  setAssessments(assessments);

  activeAssessmentId = String(newAssessment.assessment_id);
  localStorage.setItem(STORAGE_KEYS.activeAssessment, activeAssessmentId);

  document.getElementById("createAssessmentForm").reset();
  document.getElementById("assessmentDate").value = todayInputValue();
  showToast("Assessment created. Start answering the form.");
  openWorkspace("vendor_info");
}

function getSectionDraft(sectionKey) {
  const section = questionnaireDatabase[sectionKey];
  const master = readJSON(section.storageKey, {});
  const assessmentKey = String(activeAssessmentId || "global");
  return master[assessmentKey] || {};
}

function setSectionDraft(sectionKey, draft) {
  const section = questionnaireDatabase[sectionKey];
  const master = readJSON(section.storageKey, {});
  const assessmentKey = String(activeAssessmentId || "global");
  master[assessmentKey] = draft;
  writeJSON(section.storageKey, master);
}

function captureCurrentPageData() {
  const section = questionnaireDatabase[currentSectionKey];
  if (!section) return {};

  const savedData = getSectionDraft(currentSectionKey);

  section.questions.forEach((_question, index) => {
    const questionId = `${currentSectionKey}_q${index}`;
    const statusVal = document.getElementById(`${questionId}_status`)?.value || "";
    const commentVal = document.getElementById(`${questionId}_comment`)?.value.trim() || "";
    const badge = document.getElementById(`${questionId}_badge`);
    const artifactAttached = Boolean(badge?.classList.contains("attached"));
    let artifactName = "";

    if (artifactAttached) {
      artifactName = badge.querySelector("span")?.textContent.replace("Document Attached: ", "").trim() || "";
    }

    savedData[questionId] = {
      status: statusVal,
      comment: commentVal,
      artifactAttached,
      artifactName
    };
  });

  setSectionDraft(currentSectionKey, savedData);
  return savedData;
}

function validateSequenceCompletion(sequence) {
  const storageKey = sequence[0] === "infosec" ? "validify_infosec_draft" : "validify_ddf_draft";
  const master = readJSON(storageKey, {});
  const savedData = master[String(activeAssessmentId || "global")] || {};
  const missing = [];

  sequence.forEach((sectionKey) => {
    const section = questionnaireDatabase[sectionKey];
    section.questions.forEach((_question, index) => {
      const questionId = `${sectionKey}_q${index}`;
      const record = savedData[questionId];
      if (!record || !record.status || !record.comment || !record.artifactAttached) {
        missing.push(questionId);
      }
    });
  });

  return {
    isComplete: missing.length === 0,
    missing
  };
}

function renderAssessmentWorkspace(sectionKey) {
  const section = questionnaireDatabase[sectionKey];
  const questionsContainer = document.getElementById("questionsContainer");
  const assessment = getActiveAssessment();

  if (!section || !questionsContainer) return;

  document.getElementById("sectionTitle").textContent = section.title;
  document.getElementById("breadcrumbLabel").textContent = section.breadcrumb;
  document.getElementById("activeAssessmentLabel").textContent = assessment
    ? `Active Assessment ID: ${assessment.assessment_id}`
    : "No active assessment selected.";
  document.getElementById("activeVendorName").textContent = assessment?.company_name || "None selected";
  document.getElementById("activePurpose").textContent = assessment?.purpose || "N/A";

  const activeStatus = document.getElementById("activeStatus");
  activeStatus.textContent = assessment?.status || "Draft";
  activeStatus.className = `status-pill ${statusClass(assessment?.status || "Draft")}`;

  const savedData = getSectionDraft(sectionKey);
  questionsContainer.innerHTML = "";

  section.questions.forEach((questionText, index) => {
    const questionId = `${sectionKey}_q${index}`;
    const saved = savedData[questionId] || {};
    const row = document.createElement("div");
    row.className = "questionnaire-row-node";
    row.innerHTML = `
      <div class="questionnaire-statement">${index + 1}. ${escapeHTML(questionText)}</div>
      <div class="interactive-response-split-block">
        <div class="input-wrapper standard-dropdown-wrapper">
          <select id="${questionId}_status" required>
            <option value="" ${!saved.status ? "selected" : ""} disabled>Select Answer</option>
            <option value="YES" ${saved.status === "YES" ? "selected" : ""}>Yes</option>
            <option value="NO" ${saved.status === "NO" ? "selected" : ""}>No</option>
            <option value="NA" ${saved.status === "NA" ? "selected" : ""}>N/A</option>
          </select>
        </div>
        <div class="input-wrapper text-commentary-wrapper">
          <textarea id="${questionId}_comment" placeholder="Type detailed vendor response comments here...">${escapeHTML(saved.comment || "")}</textarea>
        </div>
      </div>
      <div class="artifact-upload-sub-row">
        <label class="artifact-label" for="${questionId}_file">
          <i class="fa-solid fa-paperclip"></i>
          Attach Supporting Artifact (PDF Only) <span style="color:#dc2626;">* Required</span>
        </label>
        <div class="upload-action-group">
          <input type="file" id="${questionId}_file" class="pdf-file-input" accept=".pdf,application/pdf" />
          <div class="artifact-status-badge ${saved.artifactAttached ? "attached" : "missing"}" id="${questionId}_badge">
            <i class="fa-solid ${saved.artifactAttached ? "fa-circle-check" : "fa-circle-xmark"}"></i>
            <span>${saved.artifactAttached ? `Document Attached: ${escapeHTML(saved.artifactName || "Document Attached")}` : "No Document Uploaded"}</span>
          </div>
          <button type="button" id="${questionId}_remove_btn" class="artifact-remove-btn" data-question-id="${questionId}" style="display:${saved.artifactAttached ? "inline-flex" : "none"};">
            <i class="fa-solid fa-trash-can"></i>
            Remove
          </button>
        </div>
      </div>
    `;
    questionsContainer.appendChild(row);
  });

  questionsContainer.querySelectorAll(".pdf-file-input").forEach((input) => {
    input.addEventListener("change", handleArtifactChange);
  });

  questionsContainer.querySelectorAll(".artifact-remove-btn").forEach((button) => {
    button.addEventListener("click", handleArtifactRemove);
  });

  updateNextButton(sectionKey);
}

function handleArtifactChange(event) {
  const input = event.target;
  const questionId = input.id.replace("_file", "");
  const badge = document.getElementById(`${questionId}_badge`);
  const removeBtn = document.getElementById(`${questionId}_remove_btn`);

  if (!badge) return;

  if (!input.files || !input.files.length) {
    setArtifactBadge(questionId, false, "");
    return;
  }

  const selectedFile = input.files[0];
  const isPDF = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");

  if (!isPDF) {
    showToast("Only PDF files are accepted.");
    input.value = "";
    setArtifactBadge(questionId, false, "");
    return;
  }

  badge.className = "artifact-status-badge attached";
  badge.querySelector("i").className = "fa-solid fa-circle-check";
  badge.querySelector("span").textContent = `Document Attached: ${selectedFile.name}`;
  if (removeBtn) removeBtn.style.display = "inline-flex";
  captureCurrentPageData();
}

function handleArtifactRemove(event) {
  const button = event.target.closest(".artifact-remove-btn");
  const questionId = button.dataset.questionId;
  const input = document.getElementById(`${questionId}_file`);
  if (input) input.value = "";
  setArtifactBadge(questionId, false, "");
  captureCurrentPageData();
}

function setArtifactBadge(questionId, attached, filename) {
  const badge = document.getElementById(`${questionId}_badge`);
  const removeBtn = document.getElementById(`${questionId}_remove_btn`);
  if (!badge) return;

  badge.className = `artifact-status-badge ${attached ? "attached" : "missing"}`;
  badge.querySelector("i").className = `fa-solid ${attached ? "fa-circle-check" : "fa-circle-xmark"}`;
  badge.querySelector("span").textContent = attached ? `Document Attached: ${filename}` : "No Document Uploaded";
  if (removeBtn) removeBtn.style.display = attached ? "inline-flex" : "none";
}

function updateNextButton(sectionKey) {
  const nextBtn = document.getElementById("submitNextBtn");
  const isDDF = ddfSequence.includes(sectionKey);
  const sequence = isDDF ? ddfSequence : ["infosec"];
  const index = sequence.indexOf(sectionKey);
  const isLast = index === sequence.length - 1;

  nextBtn.innerHTML = isLast
    ? `<i class="fa-solid fa-paper-plane"></i> Submit Assessment`
    : `Next Section <i class="fa-solid fa-arrow-right"></i>`;
}

function goToNextOrSubmit() {
  captureCurrentPageData();

  const isDDF = ddfSequence.includes(currentSectionKey);
  const sequence = isDDF ? ddfSequence : ["infosec"];
  const index = sequence.indexOf(currentSectionKey);
  const isLast = index === sequence.length - 1;

  if (!isLast) {
    openWorkspace(sequence[index + 1]);
    return;
  }

  const validation = validateSequenceCompletion(sequence);
  if (!validation.isComplete) {
    showToast("Submission blocked. Complete every answer, comment, and PDF artifact first.");
    return;
  }

  const updated = saveActiveAssessmentPatch({ status: "Submitted" });
  if (updated) {
    showToast("Assessment submitted for Compliance Officer review.");
    renderDashboard();
    showPage("dashboard");
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
  document.getElementById("credentialsForm")?.addEventListener("submit", saveVendorCredentials);
  document.getElementById("createAssessmentForm")?.addEventListener("submit", createAssessment);
  document.getElementById("saveDraftBtn")?.addEventListener("click", () => {
    captureCurrentPageData();
    saveActiveAssessmentPatch({ status: "Draft" });
    showToast("Draft saved successfully.");
  });
  document.getElementById("submitNextBtn")?.addEventListener("click", goToNextOrSubmit);

  document.getElementById("resetCredentialsBtn")?.addEventListener("click", () => {
    document.getElementById("credentialsForm").reset();
  });

  document.getElementById("selectExisting")?.addEventListener("change", (event) => {
    if (!event.target.value) return;
    activeAssessmentId = String(event.target.value);
    localStorage.setItem(STORAGE_KEYS.activeAssessment, activeAssessmentId);
    showToast("Assessment loaded.");
    openWorkspace("vendor_info");
  });

  document.getElementById("contactPhone")?.addEventListener("input", (event) => {
    event.target.value = event.target.value.replace(/[^0-9+\-\s()]/g, "");
  });

  document.getElementById("clearDemoDataBtn")?.addEventListener("click", () => {
    if (!confirm("Clear local vendor and assessment demo data?")) return;
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem("validify_ddf_draft");
    localStorage.removeItem("validify_infosec_draft");
    activeAssessmentId = null;
    document.body.classList.remove("dark-mode");
    renderDashboard();
    populateAssessmentControls();
    showToast("Local demo data cleared.");
  });

  document.getElementById("darkModeBtn")?.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem(STORAGE_KEYS.darkMode, document.body.classList.contains("dark-mode") ? "1" : "0");
  });

  const vendorAccountToggle = document.getElementById("vendorAccountToggle");
  const vendorAccountMenu = document.getElementById("vendorAccountMenu");

  if (vendorAccountToggle && vendorAccountMenu) {
    vendorAccountToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      vendorAccountMenu.classList.toggle("hidden");
      vendorAccountToggle.classList.toggle("active");
    });

    vendorAccountMenu.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    document.addEventListener("click", () => {
      vendorAccountMenu.classList.add("hidden");
      vendorAccountToggle.classList.remove("active");
    });
  }

  document.getElementById("vendorProfileBtn")?.addEventListener("click", () => {
    vendorAccountMenu?.classList.add("hidden");
    vendorAccountToggle?.classList.remove("active");
    showPage("credentials");
    showToast("Profile opened. Update your vendor credentials here.");
  });

  document.getElementById("vendorHelpBtn")?.addEventListener("click", () => {
    vendorAccountMenu?.classList.add("hidden");
    vendorAccountToggle?.classList.remove("active");
    showToast("Help: complete credentials, create an assessment, answer all sections, then submit.");
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
    await fetch("/logout", {
      method: "POST",
      credentials: "same-origin"
    });
  } catch (error) {
    console.error(error);
  }

  sessionStorage.clear();
  localStorage.removeItem("currentUser");
  window.location.replace("login.html");
  });
}

function boot() {
  if (localStorage.getItem(STORAGE_KEYS.darkMode) === "1") {
    document.body.classList.add("dark-mode");
  }

  const vendors = getVendors();
  setVendorAccountDisplay(vendors[0]?.company_name || "Vendor Account", "Vendor Portal");
  loadVendorAccountDisplay();

  setupEvents();
  document.getElementById("assessmentDate").value = todayInputValue();
  populateAssessmentControls();
  renderDashboard();
}

document.addEventListener("DOMContentLoaded", boot);
