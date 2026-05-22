const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const messageBox = document.getElementById("messageBox");
const authTitle = document.getElementById("authTitle");
const approvalPanel = document.getElementById("approvalPanel");
const approvalIcon = document.getElementById("approvalIcon");
const approvalTitle = document.getElementById("approvalTitle");
const approvalMessage = document.getElementById("approvalMessage");
const approvalEmail = document.getElementById("approvalEmail");
const backToLoginBtn = document.getElementById("backToLoginBtn");

function getRedirectPage(role) {
  if (role === "vendor") return "vendor.html";
  if (role === "employee" || role === "admin") return "employee.html";

  if (["it", "infosec", "management", "dpo", "hr", "compliance"].includes(role)) {
    return "department.html";
  }

  return "login.html";
}

function getRoleLabel(role) {
  const labels = {
    vendor: "Vendor",
    employee: "Employee / Compliance Officer",
    it: "IT",
    infosec: "InfoSec",
    management: "Management",
    dpo: "DPO",
    hr: "HR",
    compliance: "Compliance"
  };

  return labels[role] || role || "Account";
}

function showMessage(message, type = "error") {
  if (!messageBox) return;
  messageBox.textContent = message;
  messageBox.className = `message show ${type}`;
}

function clearMessage() {
  if (!messageBox) return;
  messageBox.textContent = "";
  messageBox.className = "message";
}

function setAuthFormsVisible(isVisible) {
  document.querySelector(".tab-row")?.classList.toggle("hidden", !isVisible);
  loginForm?.classList.toggle("hidden", !isVisible);
  registerForm?.classList.toggle("hidden", !isVisible);
}

function showApprovalPanel(account = {}, status = "Pending", message = "") {
  clearMessage();
  setAuthFormsVisible(false);

  const cleanStatus = status === "Rejected" ? "Rejected" : "Pending";
  const accountEmail = String(account.email || "").trim();
  const accountName = String(account.full_name || "").trim();
  const accountRole = String(account.role || "").trim();

  if (approvalPanel) approvalPanel.classList.remove("hidden");
  if (authTitle) authTitle.textContent = cleanStatus === "Rejected" ? "Registration Rejected" : "Pending Approval";

  if (approvalIcon) {
    approvalIcon.classList.toggle("rejected", cleanStatus === "Rejected");
    approvalIcon.innerHTML = cleanStatus === "Rejected"
      ? '<i class="fa-solid fa-ban"></i>'
      : '<i class="fa-solid fa-clock"></i>';
  }

  if (approvalTitle) {
    approvalTitle.textContent = cleanStatus === "Rejected" ? "Registration Rejected" : "Pending Approval";
  }

  if (approvalMessage) {
    approvalMessage.textContent = message || (cleanStatus === "Rejected"
      ? "Your account registration was rejected by InfoSec."
      : "Your account is pending approval by InfoSec.");
  }

  if (approvalEmail) {
    const displayText = [
      accountName || null,
      accountEmail || null,
      accountRole ? getRoleLabel(accountRole) : null
    ].filter(Boolean).join(" • ");

    approvalEmail.textContent = displayText || "No account selected";
  }
}

function hideApprovalPanel() {
  if (approvalPanel) approvalPanel.classList.add("hidden");
  setAuthFormsVisible(true);
  document.querySelector('[data-auth-tab="login"]')?.click();
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  let data = null;

  try {
    data = await response.json();
  } catch (_error) {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.message || `Request failed (${response.status}).`);
    error.data = data;
    error.status = response.status;
    throw error;
  }

  return data;
}

async function redirectIfAlreadyLoggedIn() {
  try {
    const data = await api("/auth-status");

    if (data?.logged_in && data?.user?.role) {
      window.location.replace(getRedirectPage(data.user.role));
    }
  } catch (_error) {
    // User is not logged in. Stay on login page.
  }
}

redirectIfAlreadyLoggedIn();

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    redirectIfAlreadyLoggedIn();
  }
});

document.querySelectorAll("[data-auth-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.authTab;

    if (approvalPanel) approvalPanel.classList.add("hidden");
    setAuthFormsVisible(true);

    document.querySelectorAll("[data-auth-tab]").forEach((item) => {
      item.classList.toggle("active", item.dataset.authTab === tab);
    });

    if (loginForm) loginForm.classList.toggle("active", tab === "login");
    if (registerForm) registerForm.classList.toggle("active", tab === "register");

    if (authTitle) authTitle.textContent = tab === "login" ? "Login" : "Create an Account";
    clearMessage();
  });
});

if (backToLoginBtn) {
  backToLoginBtn.addEventListener("click", hideApprovalPanel);
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    if (!loginForm.checkValidity()) {
      loginForm.reportValidity();
      return;
    }

    const payload = {
      email: document.getElementById("loginEmail")?.value.trim() || "",
      password: document.getElementById("loginPassword")?.value || "",
      account_id: document.getElementById("infoSecAccountId")?.value.trim() || ""
    };

    try {
      const data = await api("/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const role = data?.user?.role;

      if (!role) {
        throw new Error("Login succeeded, but no role was returned.");
      }

      window.location.replace(getRedirectPage(role));
    } catch (error) {
      const status = error.data?.account_status;

      if (status === "Pending" || status === "Rejected") {
        showApprovalPanel(error.data?.account || { email: payload.email }, status, error.message);
        return;
      }

      showMessage(error.message || "Failed to login.");
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    if (!registerForm.checkValidity()) {
      registerForm.reportValidity();
      return;
    }

    const fullName = document.getElementById("registerName")?.value.trim() || "";
    const email = document.getElementById("registerEmail")?.value.trim() || "";
    const password = document.getElementById("registerPassword")?.value || "";
    const role = document.getElementById("registerRole")?.value || "";

    if (!fullName || !email || !password || !role) {
      showMessage("Please fill in full name, email, password, and account type.");
      return;
    }

    const payload = {
      full_name: fullName,
      email,
      password,
      role
    };

    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn?.textContent || "Create Account";

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating...";
      }

      const data = await api("/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      registerForm.reset();

      if (data.pending_approval) {
        showApprovalPanel(data.account || payload, "Pending", data.message);
        return;
      }

      document.querySelector('[data-auth-tab="login"]')?.click();
      showMessage(data.message || "Account created successfully. You can now log in.", "success");
    } catch (error) {
      showMessage(error.message || "Failed to register account.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }
  });
}
