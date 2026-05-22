const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const otpPanel = document.getElementById("otpPanel");
const otpForm = document.getElementById("otpForm");
const otpInputs = Array.from(document.querySelectorAll(".otp-input"));
const otpEmailLabel = document.getElementById("otpEmailLabel");
const otpExpire = document.getElementById("otpExpire");
const requestOtpBtn = document.getElementById("requestOtpBtn");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");
const messageBox = document.getElementById("messageBox");
const authTitle = document.getElementById("authTitle");
const registerRole = document.getElementById("registerRole");
const vendorAccessCodeField = document.getElementById("vendorAccessCodeField");
const vendorAccessHint = document.getElementById("vendorAccessHint");
const vendorAccessCode = document.getElementById("vendorAccessCode");

let pendingOtpEmail = "";
let otpTimer = null;
let otpRemainingSeconds = 0;

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
    const error = new Error(data?.message || `Request failed (${response.status}).`);
    error.status = response.status;
    error.data = data;
    throw error;
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

function setAuthTitle(title) {
  if (authTitle) authTitle.textContent = title;
}

function showPanel(panelName) {
  loginForm?.classList.toggle("active", panelName === "login");
  registerForm?.classList.toggle("active", panelName === "register");
  otpPanel?.classList.toggle("active", panelName === "otp");

  document.querySelectorAll("[data-auth-tab]").forEach((item) => {
    item.classList.toggle("active", item.dataset.authTab === panelName);
  });

  if (panelName === "login") setAuthTitle("Login");
  if (panelName === "register") setAuthTitle("Create an Account");
  if (panelName === "otp") setAuthTitle("OTP Verification");
}

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

function resetOtpInputs() {
  otpInputs.forEach((input, index) => {
    input.value = "";
    if (index === 0) {
      input.removeAttribute("disabled");
    } else {
      input.setAttribute("disabled", "true");
    }
  });

  if (verifyOtpBtn) verifyOtpBtn.disabled = true;
  otpInputs[0]?.focus();
}

function getEnteredOtp() {
  return otpInputs.map((input) => input.value).join("");
}

function updateOtpButtonState() {
  if (!verifyOtpBtn) return;
  verifyOtpBtn.disabled = getEnteredOtp().length !== 4;
}

function startOtpTimer(seconds = 300) {
  clearInterval(otpTimer);
  otpRemainingSeconds = Number(seconds) || 300;

  if (otpExpire) otpExpire.textContent = String(otpRemainingSeconds);

  otpTimer = setInterval(() => {
    otpRemainingSeconds -= 1;

    if (otpExpire) otpExpire.textContent = String(Math.max(0, otpRemainingSeconds));

    if (otpRemainingSeconds <= 0) {
      clearInterval(otpTimer);
      otpTimer = null;
      if (verifyOtpBtn) verifyOtpBtn.disabled = true;
    }
  }, 1000);
}

function openOtpVerification(email, options = {}) {
  pendingOtpEmail = email || pendingOtpEmail;

  if (otpEmailLabel) {
    otpEmailLabel.textContent = pendingOtpEmail || "your account";
  }

  showPanel("otp");
  resetOtpInputs();
  startOtpTimer(options.expiresIn || 300);

  if (options.message) {
    showMessage(options.message, options.type || "success");
  }

  if (options.devOtp) {
    alert(`Your OTP is: ${options.devOtp}`);
  }
}

otpInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 1);

    if (input.value && otpInputs[index + 1]) {
      otpInputs[index + 1].removeAttribute("disabled");
      otpInputs[index + 1].focus();
    }

    updateOtpButtonState();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !input.value && otpInputs[index - 1]) {
      input.setAttribute("disabled", "true");
      otpInputs[index - 1].focus();
      otpInputs[index - 1].value = "";
      updateOtpButtonState();
    }
  });
});

document.querySelectorAll("[data-auth-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.authTab;

    if (tab === "login" || tab === "register") {
      showPanel(tab);
      clearMessage();
    }
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
      const otpRequired = Boolean(error.data?.otp_required) || message.toLowerCase().includes("verify your otp");

      if (otpRequired) {
        openOtpVerification(error.data?.email || email, {
          message: "Please verify your OTP before logging in. Click Request Again to generate a new OTP.",
          type: "error",
          expiresIn: 300
        });
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
    const email = document.getElementById("registerEmail").value.trim();

    const payload = {
      full_name: document.getElementById("registerName").value.trim(),
      email,
      password: document.getElementById("registerPassword").value,
      role: selectedRole,
      vendor_access_code: selectedRole === "vendor"
        ? document.getElementById("vendorAccessCode")?.value.trim() || ""
        : ""
    };

    try {
      const data = await api("/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      registerForm.reset();
      toggleVendorAccessCodeField();

      openOtpVerification(data.email || email, {
        message: data.message || "Account created. Enter the OTP to complete registration.",
        type: "success",
        devOtp: data.dev_otp,
        expiresIn: data.expires_in || 300
      });
    } catch (error) {
      showMessage(error.message || "Failed to register account.");
    }
  });
}

if (otpForm) {
  otpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const otp = getEnteredOtp();

    if (!pendingOtpEmail) {
      showMessage("No account email found for OTP verification.");
      return;
    }

    if (otp.length !== 4) {
      showMessage("Please enter the complete 4-digit OTP.");
      return;
    }

    try {
      const data = await api("/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email: pendingOtpEmail,
          otp
        })
      });

      clearInterval(otpTimer);
      otpTimer = null;
      resetOtpInputs();
      pendingOtpEmail = "";
      showPanel("login");
      showMessage(data.message || "OTP verified successfully. You can now log in.", "success");
    } catch (error) {
      showMessage(error.message || "OTP verification failed.");
      resetOtpInputs();
    }
  });
}

if (requestOtpBtn) {
  requestOtpBtn.addEventListener("click", async () => {
    if (!pendingOtpEmail) {
      showMessage("No account email found for OTP request.");
      return;
    }

    try {
      requestOtpBtn.disabled = true;
      requestOtpBtn.textContent = "Generating...";

      const data = await api("/request-otp", {
        method: "POST",
        body: JSON.stringify({ email: pendingOtpEmail })
      });

      openOtpVerification(data.email || pendingOtpEmail, {
        message: data.message || "A new OTP has been generated.",
        type: "success",
        devOtp: data.dev_otp,
        expiresIn: data.expires_in || 300
      });
    } catch (error) {
      showMessage(error.message || "Failed to request OTP.");
    } finally {
      requestOtpBtn.disabled = false;
      requestOtpBtn.textContent = "Request Again";
    }
  });
}

if (backToLoginBtn) {
  backToLoginBtn.addEventListener("click", () => {
    showPanel("login");
    clearMessage();
  });
}
