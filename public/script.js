const loggedUserName = document.querySelector("#loggedUserName");
const loggedUserRole = document.querySelector("#loggedUserRole");
const logoutBtn = document.querySelector("#logoutBtn");
const roleHelper = document.querySelector("#roleHelper");
const questionnaireHelper = document.querySelector("#questionnaireHelper");

const vendorForm = document.querySelector("#vendorForm");
const assessmentForm = document.querySelector("#assessmentForm");

const saveVendorAnswersBtn = document.querySelector("#saveVendorAnswersBtn");
const submitVendorAnswersBtn = document.querySelector("#submitVendorAnswersBtn");
const saveCompanyReviewBtn = document.querySelector("#saveCompanyReviewBtn");

const vendorList = document.querySelector("#vendorList");
const vendorSelect = document.querySelector("#vendorSelect");
const assessmentSelect = document.querySelector("#assessmentSelect");
const questionsContainer = document.querySelector("#questionsContainer");
const currentAssessment = document.querySelector("#currentAssessment");
const assessmentList = document.querySelector("#assessmentList");

const formTabs = document.querySelectorAll(".form-tab");
const signoffContainer = document.querySelector("#signoffContainer");
const signoffFields = document.querySelector("#signoffFields");
const saveSignoffBtn = document.querySelector("#saveSignoffBtn");
const exportExcelBtn = document.querySelector("#exportExcelBtn");

let currentUser = null;
let activeAssessmentId = null;
let activeAssessmentStatus = null;
let loadedAnswers = {};
let activeFormTab = "Due Diligence Form";

/* =========================
   TAB SWITCHING
========================= */

formTabs.forEach((button) => {
  button.addEventListener("click", () => {
    formTabs.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    activeFormTab = button.dataset.tab;

    if (activeFormTab === "Sign-off Sheet") {
      questionsContainer.classList.add("hidden");
      signoffContainer.classList.remove("hidden");
      loadSignoffs();
    } else {
      signoffContainer.classList.add("hidden");
      questionsContainer.classList.remove("hidden");
      loadQuestions();
    }
  });
});

/* =========================
   LOGIN / ROLE
========================= */

async function checkLogin() {
  const response = await fetch("/me");

  if (!response.ok) {
    window.location.href = "/login.html";
    return;
  }

  currentUser = await response.json();

  loggedUserName.textContent = currentUser.full_name;
  loggedUserRole.textContent =
    currentUser.role === "vendor" ? "Vendor" : "Company Employee";

  applyRoleView();
}

function applyRoleView() {
  const vendorOnlyElements = document.querySelectorAll(".vendor-only");
  const vendorActions = document.querySelector(".vendor-actions");
  const companyActions = document.querySelector(".company-actions");

  if (currentUser.role === "vendor") {
    roleHelper.textContent =
      "Vendor page: answer the vendor questionnaire and submit it for company review.";

    vendorOnlyElements.forEach((element) => {
      element.classList.remove("hidden");
    });

    vendorActions.classList.remove("hidden");
    companyActions.classList.add("hidden");

    // Vendor should not see export button
    exportExcelBtn.classList.add("hidden");
  } else {
    roleHelper.textContent =
      "Company employee page: review submitted vendor assessments.";

    vendorOnlyElements.forEach((element) => {
      element.classList.add("hidden");
    });

    vendorActions.classList.add("hidden");
    companyActions.classList.remove("hidden");

    // Company employee can see export button
    exportExcelBtn.classList.remove("hidden");
  }
}

logoutBtn.addEventListener("click", async () => {
  await fetch("/logout", {
    method: "POST"
  });

  window.location.href = "/login.html";
});

/* =========================
   VENDOR FORM
========================= */

if (vendorForm) {
  vendorForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const vendorData = {
      company_name: document.querySelector("#company_name").value,
      company_website: document.querySelector("#company_website").value,
      product_services_offered: document.querySelector("#product_services_offered").value,
      contact_person_name: document.querySelector("#contact_person_name").value,
      contact_email: document.querySelector("#contact_email").value,
      contact_phone: document.querySelector("#contact_phone").value
    };

    const response = await fetch("/vendors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(vendorData)
    });

    const result = await response.json();
    alert(result.message);

    if (response.ok) {
      vendorForm.reset();
      loadVendors();
    }
  });
}

/* =========================
   ASSESSMENT FORM
========================= */

if (assessmentForm) {
  assessmentForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const assessmentData = {
      vendor_id: document.querySelector("#vendorSelect").value,
      assessment_date: document.querySelector("#assessment_date").value,
      purpose: document.querySelector("#purpose").value
    };

    const response = await fetch("/assessments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(assessmentData)
    });

    const result = await response.json();
    alert(result.message);

    if (response.ok) {
      activeAssessmentId = result.assessment_id;
      activeAssessmentStatus = "Draft";
      loadedAnswers = {};

      currentAssessment.textContent = `Active Assessment ID: ${activeAssessmentId} | Status: Draft`;

      await loadAssessments();
      await loadAssessmentAnswers(activeAssessmentId);
      applyFieldPermissions();

      if (activeFormTab === "Sign-off Sheet") {
        loadSignoffs();
      }
    }
  });
}

assessmentSelect.addEventListener("change", async function () {
  const selectedId = assessmentSelect.value;

  if (!selectedId) {
    activeAssessmentId = null;
    activeAssessmentStatus = null;
    currentAssessment.textContent = "No active assessment selected.";
    loadedAnswers = {};

    renderLoadedAnswers();
    applyFieldPermissions();

    if (activeFormTab === "Sign-off Sheet") {
      loadSignoffs();
    }

    return;
  }

  activeAssessmentId = selectedId;

  await loadAssessmentAnswers(activeAssessmentId);
  applyFieldPermissions();

  if (activeFormTab === "Sign-off Sheet") {
    loadSignoffs();
  }
});

/* =========================
   VENDOR ANSWERS
========================= */

saveVendorAnswersBtn.addEventListener("click", async function () {
  if (!activeAssessmentId) {
    alert("Create or select an assessment first.");
    return;
  }

  const answers = collectVendorAnswers();

  if (answers.length === 0) {
    alert("Please answer at least one vendor field.");
    return;
  }

  const response = await fetch("/answers/vendor-save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      assessment_id: activeAssessmentId,
      answers: answers
    })
  });

  const result = await response.json();
  alert(result.message);

  if (response.ok) {
    await loadAssessmentAnswers(activeAssessmentId);
  }
});

submitVendorAnswersBtn.addEventListener("click", async function () {
  if (!activeAssessmentId) {
    alert("Create or select an assessment first.");
    return;
  }

  const confirmSubmit = confirm(
    "Submit vendor answers? After this, vendor fields will lock and company review will be enabled."
  );

  if (!confirmSubmit) return;

  const response = await fetch(`/assessments/${activeAssessmentId}/submit`, {
    method: "PATCH"
  });

  const result = await response.json();
  alert(result.message);

  if (response.ok) {
    activeAssessmentStatus = "Submitted";
    currentAssessment.textContent = `Active Assessment ID: ${activeAssessmentId} | Status: Submitted`;

    await loadAssessments();
    await loadAssessmentAnswers(activeAssessmentId);
    applyFieldPermissions();
  }
});

/* =========================
   COMPANY REVIEW
========================= */

saveCompanyReviewBtn.addEventListener("click", async function () {
  if (!activeAssessmentId) {
    alert("Select an assessment first.");
    return;
  }

  if (activeAssessmentStatus === "Draft") {
    alert("Company review is locked. Vendor must submit answers first.");
    return;
  }

  const answers = collectCompanyReviews();

  if (answers.length === 0) {
    alert("Please add at least one company comment.");
    return;
  }

  const response = await fetch("/answers/company-review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      assessment_id: activeAssessmentId,
      answers: answers
    })
  });

  const result = await response.json();
  alert(result.message);

  if (response.ok) {
    await loadAssessmentAnswers(activeAssessmentId);
  }
});

/* =========================
   LOAD VENDORS
========================= */

async function loadVendors() {
  const response = await fetch("/vendors");

  if (!response.ok) return;

  const vendors = await response.json();

  vendorSelect.innerHTML = `<option value="">Select a vendor</option>`;

  if (vendorList) {
    vendorList.innerHTML = "";
  }

  if (vendors.length === 0) {
    if (vendorList) {
      vendorList.innerHTML = `<p class="empty-message">No vendors saved yet.</p>`;
    }
    return;
  }

  vendors.forEach((vendor) => {
    const option = document.createElement("option");
    option.value = vendor.vendor_id;
    option.textContent = vendor.company_name;
    vendorSelect.appendChild(option);

    if (vendorList) {
      const div = document.createElement("div");
      div.className = "vendor-item";

      div.innerHTML = `
        <strong>${vendor.company_name}</strong><br>
        Website: ${vendor.company_website || "N/A"}<br>
        Product/Services: ${vendor.product_services_offered || "N/A"}<br>
        Contact: ${vendor.contact_person_name || "N/A"}<br>
        Email: ${vendor.contact_email || "N/A"}<br>
        Phone: ${vendor.contact_phone || "N/A"}
      `;

      vendorList.appendChild(div);
    }
  });
}

/* =========================
   LOAD ASSESSMENTS
========================= */

async function loadAssessments() {
  const response = await fetch("/assessments");

  if (!response.ok) return;

  const assessments = await response.json();

  assessmentList.innerHTML = "";
  assessmentSelect.innerHTML = `<option value="">Select assessment</option>`;

  if (assessments.length === 0) {
    assessmentList.innerHTML = `<p class="empty-message">No assessments created yet.</p>`;
    return;
  }

  assessments.forEach((assessment) => {
    const option = document.createElement("option");
    option.value = assessment.assessment_id;
    option.textContent = `${assessment.company_name} | ID ${assessment.assessment_id} | ${assessment.status}`;
    assessmentSelect.appendChild(option);

    const div = document.createElement("div");
    div.className = "assessment-item";

    div.innerHTML = `
      <strong>${assessment.company_name}</strong><br>
      Assessment ID: ${assessment.assessment_id}<br>
      Date: ${formatDate(assessment.assessment_date)}<br>
      Purpose: ${assessment.purpose || "N/A"}<br>
      Status: <strong>${assessment.status}</strong>
    `;

    assessmentList.appendChild(div);
  });

  if (activeAssessmentId) {
    assessmentSelect.value = activeAssessmentId;
  }
}

/* =========================
   LOAD QUESTIONS BY TAB
========================= */

async function loadQuestions() {
  const response = await fetch("/sections-with-questions");

  if (!response.ok) return;

  const sections = await response.json();

  questionsContainer.innerHTML = "";

  sections.forEach((section) => {
    if (section.tab_name !== activeFormTab) {
      return;
    }

    const sectionBlock = document.createElement("div");
    sectionBlock.className = "section-block";

    let questionsHTML = "";

    section.questions.forEach((question) => {
      questionsHTML += createQuestionHTML(question);
    });

    sectionBlock.innerHTML = `
      <div class="section-header">
        <h3>${section.section_name}</h3>
        <small>${section.tab_name}</small>
      </div>
      ${questionsHTML || `<p class="empty-message">No questions in this section.</p>`}
    `;

    questionsContainer.appendChild(sectionBlock);
  });

  renderLoadedAnswers();
  applyFieldPermissions();
}

function createQuestionHTML(question) {
  const responseInput = createVendorResponseInput(question);

  return `
    <div class="question-card" data-question-id="${question.question_id}">
      <div class="question-text">${question.question_text}</div>
      <div class="question-meta">
        Type: ${question.response_type} |
        Required: ${question.is_required ? "Yes" : "No"}
      </div>

      <div class="response-grid">
        <div>
          <label>Vendor Response</label>
          ${responseInput}
        </div>

        <div>
          <label>Company Comment</label>
          <textarea class="company-comment" placeholder="Company review or internal comment"></textarea>
        </div>
      </div>
    </div>
  `;
}

function createVendorResponseInput(question) {
  if (question.response_type === "YES_NO_NA") {
    return `
      <select class="vendor-response">
        <option value="">Select response</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
        <option value="N/A">N/A</option>
      </select>
    `;
  }

  if (question.response_type === "DATE") {
    return `<input type="date" class="vendor-response">`;
  }

  if (question.response_type === "FILE") {
    return `<input type="text" class="vendor-response" placeholder="Enter file name or file link">`;
  }

  return `<textarea class="vendor-response" placeholder="Vendor response"></textarea>`;
}

/* =========================
   LOAD ANSWERS
========================= */

async function loadAssessmentAnswers(assessmentId) {
  const response = await fetch(`/assessments/${assessmentId}/answers`);

  if (!response.ok) return;

  const data = await response.json();

  activeAssessmentStatus = data.status;
  loadedAnswers = {};

  data.answers.forEach((answer) => {
    loadedAnswers[answer.question_id] = answer;
  });

  currentAssessment.textContent = `Active Assessment ID: ${data.assessment_id} | Status: ${data.status}`;

  renderLoadedAnswers();
}

function renderLoadedAnswers() {
  const questionCards = document.querySelectorAll(".question-card");

  questionCards.forEach((card) => {
    const questionId = card.dataset.questionId;
    const answer = loadedAnswers[questionId];

    const vendorResponse = card.querySelector(".vendor-response");
    const companyComment = card.querySelector(".company-comment");

    vendorResponse.value = "";
    companyComment.value = "";

    if (answer) {
      vendorResponse.value = answer.vendor_response || "";
      companyComment.value = answer.company_comment || "";
    }
  });
}

/* =========================
   COLLECT ANSWERS
========================= */

function collectVendorAnswers() {
  const questionCards = document.querySelectorAll(".question-card");
  const answers = [];

  questionCards.forEach((card) => {
    const questionId = card.dataset.questionId;
    const vendorResponse = card.querySelector(".vendor-response").value;

    if (vendorResponse) {
      answers.push({
        question_id: questionId,
        vendor_response: vendorResponse
      });
    }
  });

  return answers;
}

function collectCompanyReviews() {
  const questionCards = document.querySelectorAll(".question-card");
  const answers = [];

  questionCards.forEach((card) => {
    const questionId = card.dataset.questionId;
    const companyComment = card.querySelector(".company-comment").value;

    if (companyComment) {
      answers.push({
        question_id: questionId,
        company_comment: companyComment
      });
    }
  });

  return answers;
}

/* =========================
   FIELD PERMISSIONS
========================= */

function applyFieldPermissions() {
  const vendorResponses = document.querySelectorAll(".vendor-response");
  const companyComments = document.querySelectorAll(".company-comment");

  vendorResponses.forEach((field) => setDisabled(field, true));
  companyComments.forEach((field) => setDisabled(field, true));

  saveVendorAnswersBtn.disabled = true;
  submitVendorAnswersBtn.disabled = true;
  saveCompanyReviewBtn.disabled = true;

  if (!activeAssessmentId) {
    questionnaireHelper.textContent = "Select or create an assessment first.";
    return;
  }

  if (currentUser.role === "vendor") {
    if (activeAssessmentStatus === "Draft") {
      vendorResponses.forEach((field) => setDisabled(field, false));

      saveVendorAnswersBtn.disabled = false;
      submitVendorAnswersBtn.disabled = false;

      questionnaireHelper.textContent =
        "Vendor mode: fill in your responses, save drafts, then submit.";
    } else {
      questionnaireHelper.textContent =
        "Vendor mode: this assessment was already submitted. Vendor fields are locked.";
    }
  }

  if (currentUser.role === "company_employee") {
    if (activeAssessmentStatus === "Draft") {
      questionnaireHelper.textContent =
        "Company mode: review is locked until the vendor submits the assessment.";
    } else {
      companyComments.forEach((field) => setDisabled(field, false));

      saveCompanyReviewBtn.disabled = false;

      questionnaireHelper.textContent =
        "Company mode: vendor submitted the assessment. You may now add company comments.";
    }
  }
}

function setDisabled(field, disabled) {
  field.disabled = disabled;

  if (disabled) {
    field.classList.add("disabled-field");
  } else {
    field.classList.remove("disabled-field");
  }
}

/* =========================
   SIGN-OFF SHEET
========================= */

function renderSignoffFields(signoffs = []) {
  const roles = [
    "Business Unit Representative",
    "Risk Management Officer",
    "HR",
    "IT Compliance",
    "InfoSec",
    "DPO"
  ];

  const signoffMap = {};

  signoffs.forEach((item) => {
    signoffMap[item.role_name] = item;
  });

  signoffFields.innerHTML = "";

  roles.forEach((role) => {
    const item = signoffMap[role] || {};

    const row = document.createElement("div");
    row.className = "signoff-row";
    row.dataset.role = role;

    row.innerHTML = `
      <div>
        <div class="signoff-role">${role}</div>
      </div>

      <div>
        <label>Signer Name</label>
        <input type="text" class="signer-name" value="${item.signer_name || ""}">
      </div>

      <div>
        <label>Status</label>
        <select class="signoff-status">
          <option value="Pending" ${item.signoff_status === "Pending" ? "selected" : ""}>Pending</option>
          <option value="Signed" ${item.signoff_status === "Signed" ? "selected" : ""}>Signed</option>
          <option value="Rejected" ${item.signoff_status === "Rejected" ? "selected" : ""}>Rejected</option>
        </select>
      </div>
    `;

    signoffFields.appendChild(row);
  });

  applySignoffPermissions();
}

async function loadSignoffs() {
  if (!activeAssessmentId) {
    signoffFields.innerHTML = `<p class="empty-message">Select an assessment first.</p>`;
    saveSignoffBtn.disabled = true;
    return;
  }

  const response = await fetch(`/signoffs/${activeAssessmentId}`);

  if (!response.ok) {
    signoffFields.innerHTML = `<p class="empty-message">Unable to load sign-offs.</p>`;
    saveSignoffBtn.disabled = true;
    return;
  }

  const signoffs = await response.json();
  renderSignoffFields(signoffs);
}

function collectSignoffs() {
  const rows = document.querySelectorAll(".signoff-row");
  const signoffs = [];

  rows.forEach((row) => {
    signoffs.push({
      role_name: row.dataset.role,
      signer_name: row.querySelector(".signer-name").value,
      signoff_status: row.querySelector(".signoff-status").value
    });
  });

  return signoffs;
}

function applySignoffPermissions() {
  const fields = signoffFields.querySelectorAll("input, select");

  if (currentUser.role !== "company_employee") {
    fields.forEach((field) => setDisabled(field, true));
    saveSignoffBtn.disabled = true;
    return;
  }

  fields.forEach((field) => setDisabled(field, false));
  saveSignoffBtn.disabled = false;
}

if (saveSignoffBtn) {
  saveSignoffBtn.addEventListener("click", async () => {
    if (!activeAssessmentId) {
      alert("Select an assessment first.");
      return;
    }

    const response = await fetch("/signoffs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        assessment_id: activeAssessmentId,
        signoffs: collectSignoffs()
      })
    });

    const result = await response.json();
    alert(result.message);

    if (response.ok) {
      loadSignoffs();
    }
  });
}

/* =========================
   EXCEL EXPORT
========================= */

if (exportExcelBtn) {
  exportExcelBtn.addEventListener("click", () => {
    if (!activeAssessmentId) {
      alert("Select an assessment first.");
      return;
    }

    window.location.href = `/export/${activeAssessmentId}`;
  });
}

/* =========================
   HELPERS / INIT
========================= */

function formatDate(dateValue) {
  if (!dateValue) return "N/A";
  return new Date(dateValue).toLocaleDateString();
}

async function init() {
  await checkLogin();
  await loadVendors();
  await loadAssessments();
  await loadQuestions();
}

init();