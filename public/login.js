const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const messageBox = document.getElementById("messageBox");
const authTitle = document.getElementById("authTitle");
const registerRole = document.getElementById("registerRole");
const vendorAccessCodeField = document.getElementById("vendorAccessCodeField");
const vendorAccessHint = document.getElementById("vendorAccessHint");
const vendorAccessCode = document.getElementById("vendorAccessCode");

function getRedirectPage(role) {
  if (role === "vendor") return "vendor.html";
  if (role === "employee" || role === "admin") return "employee.html";

  if (["it", "infosec", "management", "dpo", "hr", "compliance"].includes(role)) {
    return "department.html";
  }

  return "login.html";
}

function showMessage(message, type = "error") {
  if (!messageBox) return;

  messageBox.textContent = message;
  messageBox.className = `message show ${type}`;
}

function showVerifyMessage(message, email) {
  if (!messageBox) return;

  messageBox.className = "message show error";
  messageBox.innerHTML = `
    <div>${message}</div>
    <button type="button" id="resendVerificationBtn" class="message-action-btn">
      Resend verification email
    </button>
  `;

  const resendBtn = document.getElementById("resendVerificationBtn");

  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      try {
        resendBtn.disabled = true;
        resendBtn.textContent = "Sending...";

        const data = await api("/resend-verification", {
          method: "POST",
          body: JSON.stringify({ email })
        });

        showMessage(
          data.message || "Verification email sent. Please check your inbox.",
          "success"
        );
      } catch (error) {
        showMessage(error.message || "Failed to resend verification email.");
      }
    });
  }
}

function clearMessage() {
  if (!messageBox) return;

  messageBox.textContent = "";
  messageBox.className = "message";
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
    throw new Error(data?.message || `Request failed (${response.status}).`);
  }

  return data;
}

async function redirectIfAlreadyLoggedIn() {
  try {
    const user = await api("/me");

    if (user?.role) {
      window.location.replace(getRedirectPage(user.role));
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

function toggleVendorAccessCodeField() {
  const isVendor = registerRole?.value === "vendor";

  vendorAccessCodeField?.classList.toggle("hidden", !isVendor);
  vendorAccessHint?.classList.toggle("hidden", !isVendor);

  if (vendorAccessCode) {
    vendorAccessCode.required = isVendor;

    if (!isVendor) {
      vendorAccessCode.value = "";
    }
  }
}

if (registerRole) {
  registerRole.addEventListener("change", toggleVendorAccessCodeField);
  toggleVendorAccessCodeField();
}

document.querySelectorAll("[data-auth-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.authTab;

    document.querySelectorAll("[data-auth-tab]").forEach((item) => {
      item.classList.toggle("active", item.dataset.authTab === tab);
    });

    if (loginForm) loginForm.classList.toggle("active", tab === "login");
    if (registerForm) registerForm.classList.toggle("active", tab === "register");

    if (authTitle) {
      authTitle.textContent = tab === "login" ? "Login" : "Create an Account";
    }

    clearMessage();
  });
});

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const email = document.getElementById("loginEmail").value.trim();

    const payload = {
      email,
      password: document.getElementById("loginPassword").value
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
      const message = error.message || "Failed to login.";

      if (message.toLowerCase().includes("verify your email")) {
        showVerifyMessage(message, email);
      } else {
        showMessage(message);
      }
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const selectedRole = document.getElementById("registerRole").value;

    const payload = {
      full_name: document.getElementById("registerName").value.trim(),
      email: document.getElementById("registerEmail").value.trim(),
      password: document.getElementById("registerPassword").value,
      role: selectedRole,
      vendor_access_code: selectedRole === "vendor"
        ? document.getElementById("vendorAccessCode").value.trim()
        : ""
    };

    try {
      const data = await api("/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      registerForm.reset();
      toggleVendorAccessCodeField();
      document.querySelector('[data-auth-tab="login"]')?.click();

      showMessage(
        data.message ||
          "Account registered successfully. Please check your email to verify your account before logging in.",
        "success"
      );
    } catch (error) {
      showMessage(error.message || "Failed to register account.");
    }
  });
}

const urlParams = new URLSearchParams(window.location.search);

if (urlParams.get("verified") === "1") {
  showMessage("Email verified successfully. You can now log in.", "success");
}