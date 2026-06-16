const API_URL = window.location.origin;
/* =========================
   MODALS
========================= */

function openForgotModal() {
  document.getElementById("forgotModal").style.display = "flex";
}

function closeForgotModal() {
  document.getElementById("forgotModal").style.display = "none";
}

function openSignupModal() {
  document.getElementById("signupModal").style.display = "flex";
}

function closeSignupModal() {
  document.getElementById("signupModal").style.display = "none";
}

/* =========================
   THEME
========================= */

function toggleTheme() {
  const body = document.body;
  const themeText = document.getElementById("themeText");
  const themeIcon = document.getElementById("themeIcon");

  if (body.classList.contains("light-mode")) {
    body.classList.remove("light-mode");
    body.classList.add("dark-mode");

    themeText.innerText = "Dark";
    themeIcon.className = "fa-solid fa-moon";
  } else {
    body.classList.remove("dark-mode");
    body.classList.add("light-mode");

    themeText.innerText = "Light";
    themeIcon.className = "fa-solid fa-sun";
  }
}

/* =========================
   SIGNUP
========================= */

document.getElementById("signupBtn").addEventListener("click", async () => {
  const inputs = document.querySelectorAll(".signup-modal input");

  const fullname = inputs[0].value;
  const email = inputs[1].value;
  const password = inputs[2].value;
  const confirmPassword = inputs[3].value;

  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  const res = await fetch("http://localhost:3000/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullname, email, password })
  });

  const data = await res.json();
  alert(data.message);
});

/* =========================
   LOGIN + REMEMBER ME
========================= */

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.querySelector(".login-card input[type='email']").value;
  const password = document.getElementById("loginPassword").value;
  const remember = document.getElementById("rememberMe").checked;

  const res = await fetch("http://localhost:3000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  alert(data.message);

  if (data.message === "Login successful") {
  localStorage.setItem("user", JSON.stringify(data.user));

  if (remember) {
    localStorage.setItem("savedEmail", email);
  } else {
    localStorage.removeItem("savedEmail");
  }

  window.location.href = "fyp.html";
}
});

/* =========================
   AUTO FILL EMAIL
========================= */

window.addEventListener("DOMContentLoaded", () => {
  const savedEmail = localStorage.getItem("savedEmail");

  if (savedEmail) {
    document.querySelector(".login-card input[type='email']").value = savedEmail;
    document.getElementById("rememberMe").checked = true;
  }
});

/* =========================
   PASSWORD TOGGLE
========================= */

function setupPasswordToggle(toggleId, inputId) {
  const toggle = document.getElementById(toggleId);
  const input = document.getElementById(inputId);

  if (!toggle || !input) return;

  toggle.addEventListener("click", () => {
    if (input.type === "password") {
      input.type = "text";
      toggle.classList.replace("fa-eye", "fa-eye-slash");
    } else {
      input.type = "password";
      toggle.classList.replace("fa-eye-slash", "fa-eye");
    }
  });
}

setupPasswordToggle("loginToggle", "loginPassword");
setupPasswordToggle("signupToggle", "signupPassword");
setupPasswordToggle("confirmToggle", "confirmPassword");

/* =========================
   FORGOT PASSWORD FLOW
========================= */

let resetToken = null;
let step = 1; // 1 = check email, 2 = reset password

document.getElementById("sendResetBtn").addEventListener("click", async () => {

  const email = document.querySelector("#forgotModal input[type='email']").value;

  /* =========================
     STEP 1: CHECK EMAIL
  ========================= */
  if (step === 1) {

    if (!email) {
      alert("Please enter email");
      return;
    }

    const res = await fetch("http://localhost:3000/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (data.exists) {

      alert("Email verified. Enter new password.");

      resetToken = data.token;

      document.getElementById("newPasswordBox").style.display = "flex";
      document.getElementById("confirmNewPasswordBox").style.display = "flex";

      document.getElementById("sendResetBtn").innerText = "Update Password";

      step = 2; // move to next step

    } else {
      alert("Email not found");
    }

    return;
  }

  /* =========================
     STEP 2: RESET PASSWORD
  ========================= */

  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmNewPassword").value;

  if (!newPassword || !confirmPassword) {
    alert("Please enter password");
    return;
  }

  if (newPassword !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  const res = await fetch("http://localhost:3000/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      token: resetToken,
      newPassword
    })
  });

  const data = await res.json();

  alert(data.message);

  if (data.success) {
    closeForgotModal();

    // reset UI state
    step = 1;
    resetToken = null;

    document.getElementById("sendResetBtn").innerText = "Verify Email";

    document.getElementById("newPasswordBox").style.display = "none";
    document.getElementById("confirmNewPasswordBox").style.display = "none";
  }
});

setupPasswordToggle("toggleNewPassword", "newPassword");
setupPasswordToggle("toggleConfirmNewPassword", "confirmNewPassword");