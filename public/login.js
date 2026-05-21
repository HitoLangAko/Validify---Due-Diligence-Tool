const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const messageBox = document.getElementById("messageBox");
const authTitle = document.getElementById("authTitle");

const VALIDIFY_ROLE_PAGES = {
  vendor: "vendor.html",
  employee: "employee.html",
  admin: "employee.html",
  it: "department.html",
  infosec: "department.html",
  management: "department.html",
  dpo: "department.html",
  hr: "department.html",
  compliance: "department.html"
};

function getRedirectPage(role) {
  return VALIDIFY_ROLE_PAGES[role] || "login.html";
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
    throw new Error(data?.message || "Request failed.");
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
    // User is not logged in, stay on login page.
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

    const payload = {
      email: document.getElementById("loginEmail").value.trim(),
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
      showMessage(error.message || "Failed to login.");
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const payload = {
      full_name: document.getElementById("registerName").value.trim(),
      email: document.getElementById("registerEmail").value.trim(),
      password: document.getElementById("registerPassword").value,
      role: document.getElementById("registerRole").value
    };

    try {
      const data = await api("/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      registerForm.reset();
      document.querySelector('[data-auth-tab="login"]')?.click();
      showMessage(data.message || "Account created. You can now log in.", "success");
    } catch (error) {
      showMessage(error.message || "Failed to register account.");
    }
  });
}

const urlParams = new URLSearchParams(window.location.search);

if (urlParams.get("verified") === "1") {
  showMessage("Email verified successfully. You can now log in.", "success");
}
