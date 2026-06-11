console.log("🔥 SCRIPT LOADED");

let API_ENDPOINT = "http://localhost:3000/api/analyze";
let aiMode = "chatgpt"; // default normal mode

let roles = [];
let modes = [];
let isLoading = false

/* ========================
   ROLE SELECTION
======================== */
function selectRole(el, selectedRole) {

  el.classList.toggle("active");

  const exists = roles.includes(selectedRole);

  if (exists) {
    roles = roles.filter(r => r !== selectedRole);
  } else {
    roles.push(selectedRole);
  }

  console.log("Roles:", [...roles]);
}
/* ========================
   MODE SELECTION
======================== */
function selectMode(el, selectedMode) {

  el.classList.toggle("active");

  const exists = modes.includes(selectedMode);

  if (exists) {
    modes = modes.filter(m => m !== selectedMode);
  } else {
    modes.push(selectedMode);
  }

  console.log("Modes:", [...modes]);
}

/* ========================
   FORMAT AI RESPONSE
======================== */
function format(text) {
  return text
    .replace(/\nROLE:/g, "<br><br>ROLE:")
    .replace(/\n/g, "<br>")
    .replace(/•/g, "🔹")
    .replace(/SCORE:/g, " SCORE:")
    .replace(/RISK:/g, " RISK:")
    .replace(/VERDICT:/g, " VERDICT:")
    .replace(/CRITICISM:/g, " CRITICISM:")
    .replace(/INSIGHT:/g, " INSIGHT:")
    .replace(/FINAL THOUGHT:/g, " FINAL THOUGHT:");
}

/* ========================
   ANALYZE (SERVER CALL)
======================== */
async function analyze() {

  const idea = document.getElementById("idea").value.trim();
  const output = document.getElementById("output");
  const actions = document.querySelector(".output-actions");

  if (!idea) return alert("Enter your idea!");

  if (isLoading) return;

  isLoading = true;

  /* ========================
     LOADING MESSAGE
  ========================= */

  const loadingDiv = document.createElement("div");

  loadingDiv.className = "loading-message";

  loadingDiv.innerHTML = `
    <div class="ai-message loading-bubble">
      ⏳ Thinking...
    </div>
  `;

  output.appendChild(loadingDiv);

  scrollToBottom();

  try {

    const res = await fetch("http://localhost:3000/api/analyze", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        prompt: idea,
        aiMode: aiMode,
        roles: roles,
        modes: modes
      })

    });

    const data = await res.json();

    loadingDiv.remove();

    if (!res.ok) {

      output.innerHTML += `
        <div class="ai-message error-message">
          ❌ ${data.error || "Server error"}
        </div>
      `;

      return;
    }

    /* ========================
       AI LABEL
    ========================= */

    const aiLabels = {

      chatgpt: "🤖 ThinkTwice",
      concept: "🧠 Concept Breaker",

    };

    const aiLabel =
      aiLabels[aiMode] || "🤖 ThinkTwice";

    /* ========================
       CHAT CONTAINER
    ========================= */

    const chatWrapper = document.createElement("div");

    chatWrapper.className = "chat-wrapper";

    chatWrapper.innerHTML = `

      <!-- USER MESSAGE -->
      <div class="message-row user-row">

        <div class="user-message">

          <div class="message-header">
            🧑 You
          </div>

          <div class="message-text">
            ${idea}
          </div>

        </div>

      </div>

      <!-- AI MESSAGE -->
      <div class="message-row ai-row">

        <div class="ai-message">

          <div class="message-header">
            ${aiLabel}
          </div>

          <div class="message-text">
            ${format(data.result || "No response")}
          </div>

        </div>

      </div>
    `;

    output.appendChild(chatWrapper);

    /* ========================
       AUTO SCROLL
    ========================= */

    setTimeout(() => {
      scrollToBottom();
    }, 100);

    /* ========================
       FOLLOW UP
    ========================= */

    const followUpBox =
      document.getElementById("followUpBox");

    if (followUpBox) {
      followUpBox.style.display = "block";
    }

    document.getElementById("followUpInput").value = "";

    actions.classList.add("show");

    /* ========================
       HIDE INPUT SECTION
    ========================= */

    document.querySelector(".textarea-wrapper").style.display = "none";

    document.getElementById("analyzeBtn").style.display = "none";

    /* ========================
       CLEAR INPUT
    ========================= */

    const ideaInput =
      document.getElementById("idea");

    ideaInput.value = "";
    ideaInput.innerHTML = "";
    ideaInput.textContent = "";

    ideaInput.focus();

  } catch (err) {

    console.error(err);

    output.innerHTML += `
      <div class="ai-message error-message">
        ❌ Server connection failed
      </div>
    `;

  } finally {

    isLoading = false;

  }
}

/* ========================
   ELEMENTS
======================== */
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");

const themeBtn = document.getElementById("themeBtn");
const themePanel = document.getElementById("themePanel");
const themeButtons = document.querySelectorAll(".theme-btn");

const searchModal = document.getElementById("searchModal");
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const searchResult = document.getElementById("searchResult");
const closeSearch = document.getElementById("closeSearch");

const langBtn = document.getElementById("langBtn");
const langDropdown = document.getElementById("langDropdown");
const langButtons = document.querySelectorAll(".lang-dropdown button");

const menuItems = document.querySelectorAll(".menu li");

/* ========================
   SIDEBAR
======================== */
menuToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  sidebar.classList.toggle("active");
});

/* ========================
   MENU ACTIVE
======================== */
menuItems.forEach(item => {
  item.addEventListener("click", () => {
    menuItems.forEach(i => i.classList.remove("active"));
    item.classList.add("active");
  });
});

/* ========================
   THEME
======================== */
themeBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  themePanel.style.display =
    themePanel.style.display === "block" ? "none" : "block";
});

themeButtons.forEach(btn => {
  btn.addEventListener("click", () => {

    const gradient = btn.dataset.gradient;

    document.body.style.background = gradient;

    localStorage.setItem("bgGradient", gradient);

    themePanel.style.display = "none";
  });
});

/* ========================
   SEARCH
======================== */

searchBtn.addEventListener("click", (e) => {
  e.stopPropagation();

  searchModal.style.display = "flex";

  searchInput.value = "";
  searchResult.innerHTML = "";

  searchInput.focus();
});

closeSearch.addEventListener("click", () => {
  searchModal.style.display = "none";
});

searchModal.addEventListener("click", (e) => {
  if (e.target === searchModal) {
    searchModal.style.display = "none";
  }
});

/* LIVE SEARCH + HIGHLIGHT */
searchInput.addEventListener("input", (e) => {

  const query = e.target.value.trim().toLowerCase();

  if (!query) {
    searchResult.innerHTML = "";
    return;
  }

  // IDEA TEXT
  const ideaText =
    document.getElementById("idea").value;

  // AI OUTPUT
  const outputText =
    document.getElementById("output").textContent;

  let results = [];

  // HIGHLIGHT FUNCTION
  function highlight(text, keyword) {

    const regex = new RegExp(`(${keyword})`, "gi");

    return text.replace(
      regex,
      `<mark class="highlight">$1</mark>`
    );
  }

  /* SEARCH IDEA */
  if (ideaText.toLowerCase().includes(query)) {

    results.push(`
      <div class="search-item">
        <h4>📝 Idea Input</h4>
        <p>${highlight(ideaText, query)}</p>
      </div>
    `);
  }

  /* SEARCH OUTPUT */
  if (outputText.toLowerCase().includes(query)) {

    results.push(`
      <div class="search-item">
        <h4>🤖 AI Output</h4>
        <p>${highlight(outputText, query)}</p>
      </div>
    `);
  }

  /* NO RESULTS */
  if (results.length === 0) {

    searchResult.innerHTML = `
      <p>No results found for "<b>${query}</b>"</p>
    `;

    return;
  }

  searchResult.innerHTML = results.join("");
});

/* ========================
   LANGUAGE
======================== */
langBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  langDropdown.style.display =
    langDropdown.style.display === "flex" ? "none" : "flex";
});

const translations = {
  en: {
    title: "ThinkTwice",
    subtitle: "YOUR IDEA WILL NOT SURVIVE THIS",
    tagline: "TEST YOUR IDEAS. BREAK YOUR LIMITS.",

    attackerTitle: "CHOOSE YOUR ATTACKER",
    investor: "📉 The Investor",
    investorDesc: "ROI & risk only",

    lawyer: "⚖️ The Lawyer",
    lawyerDesc: "Legal & ethical holes",

    competitor: "😤 The Competitor",
    competitorDesc: "Attacks like a rival",

    traditional: "👵 The Traditionalist",
    traditionalDesc: "Social & cultural gaps",

    modeTitle: "SELECT MODE",

    critic: "😈 Critic",
    criticDesc: "Destroy argument",

    improve: "🛠 Improve",
    improveDesc: "Make it stronger",

    pivot: "🔄 Pivot",
    pivotDesc: "New idea",

    score: "📊 Score",
    scoreDesc: "Rate idea",

    pitch: "PITCH YOUR IDEA",
    textarea: "Type your idea...",
    followup: "Ask another question...",

    button: "🤔 ThinkTwice My Idea"
  },

  ms: {
    title: "ThinkTwice",
    subtitle: "IDEA ANDA TIDAK AKAN BERTAHAN",
    tagline: "UJI IDEA ANDA. PECAHKAN BATAS.",

    attackerTitle: "PILIH PENYERANG",

    investor: "📉 Pelabur",
    investorDesc: "Hanya ROI & risiko",

    lawyer: "⚖️ Peguam",
    lawyerDesc: "Lubang undang-undang & etika",

    competitor: "😤 Pesaing",
    competitorDesc: "Menyerang seperti pesaing",

    traditional: "👵 Tradisionalis",
    traditionalDesc: "Jurang sosial & budaya",

    modeTitle: "PILIH MOD",

    critic: "😈 Pengkritik",
    criticDesc: "Hancurkan hujah",

    improve: "🛠 Baiki",
    improveDesc: "Jadikannya lebih kuat",

    pivot: "🔄 Pivot",
    pivotDesc: "Idea baru",

    score: "📊 Skor",
    scoreDesc: "Nilai idea",

    pitch: "HANTAR IDEA ANDA",
    textarea: "Taip idea anda...",
    followup: "Tanya soalan lain...",

    button: "🤔 Hancurkan Idea Saya"
  },

  in: {
    title: "ThinkTwice",
    subtitle: "आपका विचार जीवित नहीं रहेगा",
    tagline: "अपने विचारों को परखें। सीमाएँ तोड़ें।",

    attackerTitle: "अपना हमलावर चुनें",

    investor: "📉 निवेशक",
    investorDesc: "केवल ROI और जोखिम",

    lawyer: "⚖️ वकील",
    lawyerDesc: "कानूनी और नैतिक कमियाँ",

    competitor: "😤 प्रतियोगी",
    competitorDesc: "प्रतिद्वंद्वी की तरह हमला",

    traditional: "👵 परंपरावादी",
    traditionalDesc: "सामाजिक और सांस्कृतिक अंतर",

    modeTitle: "मोड चुनें",

    critic: "😈 आलोचक",
    criticDesc: "तर्क नष्ट करें",

    improve: "🛠 सुधारें",
    improveDesc: "इसे मजबूत बनाएं",

    pivot: "🔄 पिवट",
    pivotDesc: "नया विचार",

    score: "📊 स्कोर",
    scoreDesc: "विचार को रेट करें",

    pitch: "अपना विचार लिखें",
    textarea: "अपना विचार टाइप करें...",
    followup: "एक और सवाल पूछें...",

    button: "🤔 मेरा विचार तोड़ो"
  },

  zh: {
    title: "ThinkTwice",
    subtitle: "你的想法无法通过",
    tagline: "测试你的想法。突破你的极限。",

    attackerTitle: "选择攻击者",

    investor: "📉 投资者",
    investorDesc: "只关注ROI和风险",

    lawyer: "⚖️ 律师",
    lawyerDesc: "法律与道德漏洞",

    competitor: "😤 竞争对手",
    competitorDesc: "像对手一样攻击",

    traditional: "👵 传统主义者",
    traditionalDesc: "社会与文化差距",

    modeTitle: "选择模式",

    critic: "😈 批评者",
    criticDesc: "摧毁论点",

    improve: "🛠 改进",
    improveDesc: "让它更强",

    pivot: "🔄 转型",
    pivotDesc: "新想法",

    score: "📊 评分",
    scoreDesc: "评价想法",

    pitch: "输入你的想法",
    textarea: "输入你的想法...",
    followup: "提出另一个问题...",

    button: "🤔 摧毁我的想法"
  }
};

langButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const lang = btn.dataset.lang;
    applyLanguage(lang);
    localStorage.setItem("lang", lang);
    langDropdown.style.display = "none";
  });
});

function applyLanguage(lang) {

  const t = translations[lang];
  if (!t) return;

  // HEADER
  document.querySelector(".header h1").innerText = t.title;

  document.querySelectorAll(".header p")[0].innerText =
    t.subtitle;

  document.querySelectorAll(".header p")[1].innerText =
    t.tagline;

  // SECTION TITLES
  document.getElementById("attackerTitle").innerText =
  t.attackerTitle;

  document.getElementById("modeTitle").innerText =
  t.modeTitle;

  document.getElementById("pitchTitle").innerText =
    t.pitch;

  // ATTACKER CARDS
  const attackerCards =
    document.querySelectorAll(".grid")[0]
      .querySelectorAll(".card");

  attackerCards[0].querySelector("h2").innerText =
    t.investor;

  attackerCards[0].querySelector("p").innerText =
    t.investorDesc;

  attackerCards[1].querySelector("h2").innerText =
    t.lawyer;

  attackerCards[1].querySelector("p").innerText =
    t.lawyerDesc;

  attackerCards[2].querySelector("h2").innerText =
    t.competitor;

  attackerCards[2].querySelector("p").innerText =
    t.competitorDesc;

  attackerCards[3].querySelector("h2").innerText =
    t.traditional;

  attackerCards[3].querySelector("p").innerText =
    t.traditionalDesc;

  // MODE CARDS
  const modeCards =
    document.querySelectorAll(".grid")[1]
      .querySelectorAll(".card");

  modeCards[0].querySelector("h2").innerText =
    t.critic;

  modeCards[0].querySelector("p").innerText =
    t.criticDesc;

  modeCards[1].querySelector("h2").innerText =
    t.improve;

  modeCards[1].querySelector("p").innerText =
    t.improveDesc;

  modeCards[2].querySelector("h2").innerText =
    t.pivot;

  modeCards[2].querySelector("p").innerText =
    t.pivotDesc;

  modeCards[3].querySelector("h2").innerText =
    t.score;

  modeCards[3].querySelector("p").innerText =
    t.scoreDesc;

  // TEXTAREA
  document.getElementById("idea").placeholder =
    t.textarea;

  document.getElementById("followUpInput").placeholder =
    t.followup;

  // BUTTON
document.getElementById("analyzeBtn").innerHTML = `
  <img
    src="images/thinktwice-logo.png"
    alt="logo"
    class="analyze-logo"
  >

  <span>${t.button.replace("🤔 ", "")}</span>
`;
}

/* ========================
   LOAD SETTINGS
======================== */
window.addEventListener("load", () => {
  const savedLang = localStorage.getItem("lang");
  if (savedLang) applyLanguage(savedLang);

  const savedTheme = localStorage.getItem("bgGradient");

  if (savedTheme) {
    document.body.style.background = savedTheme;
  }
  });

/* ========================
   OUTSIDE CLICK FIX
======================== */
document.addEventListener("click", (e) => {

  if (!sidebar.contains(e.target) && e.target !== menuToggle) {
    sidebar.classList.remove("active");
  }

  if (!themePanel.contains(e.target) && e.target !== themeBtn) {
    themePanel.style.display = "none";
  }

  if (!langDropdown.contains(e.target) && e.target !== langBtn) {
    langDropdown.style.display = "none";
  }

  if (e.target === searchModal) {
    searchModal.style.display = "none";
  }
});

/* ========================
   HELP MENU
======================== */
const helpBtn = document.getElementById("helpBtn");
const helpDropdown = document.getElementById("helpDropdown");

helpBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  helpDropdown.style.display =
    helpDropdown.style.display === "flex" ? "none" : "flex";
});

document.addEventListener("click", (e) => {
  if (!helpDropdown.contains(e.target) && e.target !== helpBtn) {
    helpDropdown.style.display = "none";
  }
});

/* ========================
   REPORT MODAL
======================== */
const reportModal = document.getElementById("reportModal");
const cancelReport = document.getElementById("cancelReport");
const submitReport = document.querySelector(".submit-btn");

document.querySelectorAll(".help-dropdown a")[0].addEventListener("click", (e) => {
  e.preventDefault();
  reportModal.style.display = "flex";
});

cancelReport.addEventListener("click", () => {
  reportModal.style.display = "none";
});

submitReport.addEventListener("click", () => {
  alert("Report submitted!");
  reportModal.style.display = "none";
});

reportModal.addEventListener("click", (e) => {
  if (e.target === reportModal) {
    reportModal.style.display = "none";
  }
});


const modeBtn = document.getElementById("modeBtn");
const modePopup = document.getElementById("modePopup");

// toggle popup
modeBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = window.getComputedStyle(modePopup).display === "flex";

  modePopup.style.display = isOpen ? "none" : "flex";
});

// close on outside click
document.addEventListener("click", (e) => {
  if (
    !modePopup.contains(e.target) &&
    !modeBtn.contains(e.target)
  ) {
    modePopup.style.display = "none";
  }
});

/*output*/


/* ========================
   OUTPUT ACTIONS (CLEAN)
======================== */

let likes = 0;
let dislikes = 0;

function getOutputText() {
  return document.getElementById("output").textContent;
}

/* COPY */
function copyOutput() {
  navigator.clipboard.writeText(getOutputText())
    .then(() => alert("Copied!"));
}

/* SHARE */
function shareOutput() {
  const text = getOutputText();

  if (navigator.share) {
    navigator.share({
      title: "ThinkTwice Result",
      text: text
    });
  } else {
    navigator.clipboard.writeText(text);
    alert("Copied for sharing!");
  }
}

/* LIKE */
function like() {
  likes++;
  alert("👍 Liked: " + likes);
}

/* DISLIKE */
function dislike() {
  dislikes++;
  alert("👎 Disliked: " + dislikes);
}

/* ========================
   VOICE INPUT (LIVE SPEECH TO TEXT)
======================== */

function startVoice(inputElement, button) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Speech not supported");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  let isRecording = false;

  recognition.onstart = () => {
    isRecording = true;
    button.innerText = "🛑";
  };

  recognition.onend = () => {
    isRecording = false;
    button.innerText = "🎤";
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    inputElement.value = transcript;
  };

  button.addEventListener("click", () => {
    if (isRecording) recognition.stop();
    else recognition.start();
  });
}

startVoice(
  document.getElementById("idea"),
  document.getElementById("voiceBtn")
);

startVoice(
  document.getElementById("followUpInput"),
  document.getElementById("followVoiceBtn")
);


const followModeBtn = document.getElementById("followModeBtn");
const followModePopup = document.getElementById("followModePopup");

followModeBtn.addEventListener("click", (e) => {
  e.stopPropagation();

  const isOpen =
    window.getComputedStyle(followModePopup).display === "flex";

  followModePopup.style.display = isOpen ? "none" : "flex";
});

document.addEventListener("click", (e) => {
  if (
    !followModePopup.contains(e.target) &&
    !followModeBtn.contains(e.target)
  ) {
    followModePopup.style.display = "none";
  }
});
/* ========================
   FILE UPLOAD
======================== */

const fileInput = document.getElementById("fileInput");

if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById("idea").value +=
      `\n📎 File: ${file.name}`;
  });
}

/* ========================
   FOLLOW UP QUESTION
======================== */

const followUpBtn = document.getElementById("followUpBtn");

if (followUpBtn) {

  followUpBtn.addEventListener("click", async () => {

    const text =
      document.getElementById("followUpInput").value.trim();

    if (!text) return;

    document.getElementById("idea").value = text;

    analyze();
  });

}

function setAIMode(mode) {
  aiMode = mode;

  console.log("AI mode:", aiMode);

  const text =
    mode === "concept"
      ? "😈"
      : "🤖";

  document.getElementById("modeBtn").innerText = text;
  document.getElementById("followModeBtn").innerText = text;

  modePopup.style.display = "none";
  followModePopup.style.display = "none";
}

/* ========================
   SMART DOWN BUTTON
======================== */

const downButton = document.getElementById("down-button");

function scrollToBottom() {

  const output = document.getElementById("output");

  // scroll to latest message
  output.lastElementChild?.scrollIntoView({
    behavior: "smooth",
    block: "end"
  });

}

/* CLICK BUTTON */
downButton.addEventListener("click", scrollToBottom);

/* AUTO SHOW/HIDE BUTTON */
window.addEventListener("scroll", () => {

  const isNearBottom =
    window.innerHeight + window.scrollY >=
    document.body.offsetHeight - 200;

  if (isNearBottom) {
    downButton.classList.remove("show-down");
  } else {
    downButton.classList.add("show-down");
  }

});

/* ========================
   ENTER TO SEND
======================== */
const ideaInput = document.getElementById("idea");

ideaInput.addEventListener("keydown", (e) => {
  // Check if Enter is pressed without Shift (Shift+Enter allows line breaks)
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault(); // Prevent newline from being added
    analyze();          // Call your analyze function
  }
});

/* ========================
   NEW CHAT BUTTON
======================== */

const newChatBtn = document.getElementById("newChatBtn");

if (newChatBtn) {
  newChatBtn.addEventListener("click", () => {

    // OPTION 1: FULL PAGE REFRESH
    location.reload();

    // OPTION 2 (WITHOUT REFRESH)
    // document.getElementById("output").innerHTML = "";
    // document.getElementById("idea").value = "";
    // document.getElementById("followUpInput").value = "";
  });
}

// show button when scroll down
window.addEventListener("scroll", () => {
  const btn = document.getElementById("topBtn");

  if (window.scrollY > 300) {
    btn.classList.add("show");
  } else {
    btn.classList.remove("show");
  }
});

// scroll to top
document.getElementById("topBtn").addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});

// show button when scroll down
window.addEventListener("scroll", () => {
  const btn = document.getElementById("topBtnn");

  if (window.scrollY > 300) {
    btn.classList.add("show");
  } else {
    btn.classList.remove("show");
  }
});

// scroll to top
document.getElementById("topBtnn").addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});