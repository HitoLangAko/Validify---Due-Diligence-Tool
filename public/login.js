const showLoginBtn = document.querySelector("#showLoginBtn");
const showRegisterBtn = document.querySelector("#showRegisterBtn");

const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const authMessage = document.querySelector("#authMessage");

showLoginBtn.addEventListener("click", () => {
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");

  showLoginBtn.classList.add("active");
  showRegisterBtn.classList.remove("active");

  authMessage.classList.add("hidden");
});

showRegisterBtn.addEventListener("click", () => {
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");

  showRegisterBtn.classList.add("active");
  showLoginBtn.classList.remove("active");

  authMessage.classList.add("hidden");
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const loginData = {
    email: document.querySelector("#login_email").value,
    password: document.querySelector("#login_password").value
  };

  const response = await fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(loginData)
  });

  const result = await response.json();

  showMessage(result.message);

  if (response.ok) {
    setTimeout(() => {
      window.location.href = "/";
    }, 700);
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const registerData = {
    full_name: document.querySelector("#register_full_name").value,
    email: document.querySelector("#register_email").value,
    password: document.querySelector("#register_password").value,
    role: document.querySelector("#register_role").value
  };

  const response = await fetch("/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(registerData)
  });

  const result = await response.json();

  showMessage(result.message);

  if (response.ok) {
    registerForm.reset();

    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");

    showLoginBtn.classList.add("active");
    showRegisterBtn.classList.remove("active");
  }
});

function showMessage(message) {
  authMessage.textContent = message;
  authMessage.classList.remove("hidden");
}