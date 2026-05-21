const ROLE_PAGE_MAP = {
  vendor: "vendor.html",
  employee: "employee.html",
  admin: "employee.html", // Legacy admin accounts are treated as Employee / Compliance Officer.
  it: "department.html",
  infosec: "department.html",
  management: "department.html",
  dpo: "department.html",
  hr: "department.html",
  compliance: "department.html"
};

async function routeUser() {
  try {
    const response = await fetch("/me", { credentials: "same-origin" });

    if (!response.ok) {
      window.location.replace("login.html");
      return;
    }

    const user = await response.json();
    window.location.replace(ROLE_PAGE_MAP[user.role] || "login.html");
  } catch (_error) {
    window.location.replace("login.html");
  }
}

routeUser();
