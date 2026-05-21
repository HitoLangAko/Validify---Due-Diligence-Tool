const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const messageBox = document.getElementById("messageBox");
const authTitle = document.getElementById("authTitle");

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

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage();

    const payload = {
      email: document.getElementById("loginEmail").value.trim(),
      password: document.getElementById("loginPassword").value
    };

    try {
      await api("/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      window.location.href = "index.html";
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
    showMessage(data.message || "Account created. Please check your email.", "success");
    } catch (error) {
      showMessage(error.message || "Failed to register account.");
    }
  });
}

const urlParams = new URLSearchParams(window.location.search);

if (urlParams.get("verified") === "1") {
  showMessage("Email verified successfully. You can now log in.", "success");
}