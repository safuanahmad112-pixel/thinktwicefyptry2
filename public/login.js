const API_URL = window.location.origin;

/* SIGNUP */
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

  const res = await fetch(`${API_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fullname, email, password })
  });

  const data = await res.json();
  alert(data.message);
});

/* LOGIN */
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.querySelector("input[type='email']").value;
  const password = document.getElementById("loginPassword").value;

  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  alert(data.message);

  if (data.success) {
    localStorage.setItem("user", JSON.stringify(data.user));
    window.location.href = "fyp.html";
  }
});

/* RESET PASSWORD */
document.getElementById("sendResetBtn").addEventListener("click", async () => {
  const email = document.querySelector("#forgotModal input").value;

  const res = await fetch(`${API_URL}/check-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });

  const data = await res.json();
  alert(data.exists ? "Email verified" : "Not found");
});
