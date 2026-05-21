const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const messageBox = document.getElementById("messageBox");
const authTitle = document.getElementById("authTitle");

function routeForRole(role){
  if(role === "vendor") return "vendor.html";
  if(role === "employee") return "employee.html";
  if(["it","infosec","management","dpo","hr","compliance"].includes(role)) return "department.html";
  return "login.html";
}

function showMessage(message,type="error"){
  messageBox.textContent = message;
  messageBox.className = `message show ${type}`;
}
function clearMessage(){messageBox.textContent="";messageBox.className="message";}
async function api(url,options={}){
  const response = await fetch(url,{...options,credentials:"same-origin",headers:{"Content-Type":"application/json",...(options.headers||{})}});
  let data=null;try{data=await response.json();}catch(_error){}
  if(!response.ok) throw new Error(data?.message || "Request failed.");
  return data;
}
async function redirectIfAlreadyLoggedIn(){
  try{const user=await api("/me"); if(user?.role) window.location.replace(routeForRole(user.role));}catch(_error){}
}
redirectIfAlreadyLoggedIn();
window.addEventListener("pageshow",event=>{ if(event.persisted) redirectIfAlreadyLoggedIn(); });

document.querySelectorAll("[data-auth-tab]").forEach(button=>{
  button.addEventListener("click",()=>{
    const tab=button.dataset.authTab;
    document.querySelectorAll("[data-auth-tab]").forEach(item=>item.classList.toggle("active",item.dataset.authTab===tab));
    loginForm.classList.toggle("active",tab==="login");
    registerForm.classList.toggle("active",tab==="register");
    authTitle.textContent = tab === "login" ? "Login" : "Create an Account";
    clearMessage();
  });
});

loginForm.addEventListener("submit",async event=>{
  event.preventDefault();clearMessage();
  try{
    const data=await api("/login",{method:"POST",body:JSON.stringify({email:document.getElementById("loginEmail").value.trim(),password:document.getElementById("loginPassword").value})});
    window.location.replace(routeForRole(data.user.role));
  }catch(error){showMessage(error.message || "Failed to login.");}
});

registerForm.addEventListener("submit",async event=>{
  event.preventDefault();clearMessage();
  try{
    const data=await api("/register",{method:"POST",body:JSON.stringify({full_name:document.getElementById("registerName").value.trim(),email:document.getElementById("registerEmail").value.trim(),password:document.getElementById("registerPassword").value,role:document.getElementById("registerRole").value})});
    registerForm.reset();document.querySelector('[data-auth-tab="login"]').click();showMessage(data.message || "Account created.","success");
  }catch(error){showMessage(error.message || "Failed to register.");}
});
