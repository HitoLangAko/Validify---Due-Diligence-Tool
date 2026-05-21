const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const messageBox = document.getElementById("messageBox");
const authTitle = document.getElementById("authTitle");

function getRedirectPage(role) {
  if (role === "vendor") return "vendor.html";
  if (role === "employee") return "employee.html";

  if (["it", "infosec", "management", "dpo", "hr", "compliance"].includes(role)) {
    return "department.html";
  }

  return "login.html";
}

function showMessage(message, type = "error") {
  messageBox.textContent = message;
  messageBox.className = `message show ${type}`;
}

function clearMessage() {
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

/* SECURITY:
   If the user is already logged in and presses Back to login.html,
   immediately send them back to their dashboard.
*/
async function redirectIfAlreadyLoggedIn() {
  try {
    const user = await api("/me");

    if (user?.role) {
      window.location.replace(getRedirectPage(user.role));
    }
  } catch (_error) {
    // Not logged in, stay on login page.
  }
}

redirectIfAlreadyLoggedIn();

document.querySelectorAll("[data-auth-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.authTab;

    document.querySelectorAll("[data-auth-tab]").forEach((item) => {
      item.classList.toggle("active", item.dataset.authTab === tab);
    });

    loginForm.classList.toggle("active", tab === "login");
    registerForm.classList.toggle("active", tab === "register");

    authTitle.textContent = tab === "login" ? "Login" : "Create an Account";
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

      // SECURITY:
      // replace() prevents login page from staying in browser history.
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
      document.querySelector('[data-auth-tab="login"]').click();
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