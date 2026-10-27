const $ = id => document.getElementById(id);

const STORE = "learnlite_v1";

let state = {
  lessons: [],
  attempts: [],
  plans: [],
  profile: {},
  theme: "light"
};

try {
  state = {
    ...state,
    ...JSON.parse(localStorage.getItem(STORE) || "{}")
  };
} catch (e) {}

let currentLesson = null;
let currentPhoto = null;
let timerInterval = null;
let seconds = 25 * 60;
let running = false;

const demoLesson = {
  title: "Photosynthesis — a simple guide",

  explanation: `Photosynthesis is the way green plants make their own food. Think of a leaf as a tiny food factory.

• Sunlight provides the energy.
• Roots absorb water from the soil.
• Leaves take in carbon dioxide from the air.
• Chlorophyll, the green pigment in leaves, helps capture sunlight.

The plant uses these ingredients to make glucose (a kind of sugar) and releases oxygen into the air.

Remember: sunlight + water + carbon dioxide → glucose + oxygen.

Photosynthesis helps plants grow and provides much of the oxygen we breathe.`,

  questions: [
    {
      q: "What is the main purpose of photosynthesis?",
      opts: [
        "To help plants make food",
        "To absorb minerals only",
        "To make soil",
        "To cool the roots"
      ],
      a: 0
    },
    {
      q: "Which part of a plant contains chlorophyll?",
      opts: [
        "Roots",
        "Leaves",
        "Flowers only",
        "Seeds only"
      ],
      a: 1
    },
    {
      q: "Which gas do plants take in for photosynthesis?",
      opts: [
        "Oxygen",
        "Helium",
        "Carbon dioxide",
        "Hydrogen"
      ],
      a: 2
    },
    {
      q: "What does a plant release into the air during photosynthesis?",
      opts: [
        "Smoke",
        "Oxygen",
        "Salt",
        "Dust"
      ],
      a: 1
    },
    {
      q: "Which energy source powers photosynthesis?",
      opts: [
        "Moonlight only",
        "Sound",
        "Sunlight",
        "Wind alone"
      ],
      a: 2
    }
  ]
};

function persist() {
  try {
    localStorage.setItem(STORE, JSON.stringify(state));
  } catch (e) {
    toast("Storage is full. Export your notes to keep a backup.");
  }

  updateStats();
  renderNotes();
  renderPlans();
  renderScores();
}

function toast(message) {
  $("toast").textContent = message;
  $("toast").style.display = "block";

  setTimeout(() => {
    $("toast").style.display = "none";
  }, 2600);
}

function nav(page) {
  document.querySelectorAll(".section").forEach(section => {
    section.classList.remove("active");
  });

  $("page-" + page)?.classList.add("active");

  document.querySelectorAll(".nav button").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });
}

document.querySelectorAll(".nav button").forEach(button => {
  button.addEventListener("click", () => {
    if (button.dataset.page === "learn") {
      nav("home");
      $("photo").click();
      return;
    }

    nav(button.dataset.page);
  });
});

document.querySelectorAll("[data-goto]").forEach(button => {
  button.addEventListener("click", () => {
    nav(button.dataset.goto);
  });
});

document.querySelectorAll("[data-url]").forEach(button => {
  button.addEventListener("click", () => {
    window.open(button.dataset.url, "_blank", "noopener");
  });
});

function applyTheme() {
  document.documentElement.dataset.theme =
    state.theme === "dark" ? "dark" : "light";

  $("themeBtn").textContent =
    state.theme === "dark" ? "☀" : "☾";
}

$("themeBtn").onclick = () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  persist();
};

$("studentBtn").onclick = () => {
  nav("planner");
  $("studentId").focus();
};

$("photo").addEventListener("change", event => {
  const file = event.target.files[0];

  if (!file) return;

  currentPhoto = file;

  const reader = new FileReader();

  reader.onload = event => {
    $("preview").src = event.target.result;
    $("preview").style.display = "block";
  };

  reader.readAsDataURL(file);

  $("explainStatus").textContent = "Photo ready";

  toast("Photo added. Tap Explain simply.");
});

$("sampleBtn").onclick = () => {
  currentPhoto = null;
  $("topic").value = "Biology";

  loadLesson(demoLesson);

  toast("Sample lesson loaded — try the quiz!");
};

function loadLesson(data) {
  currentLesson = {
    ...data,
    createdAt: new Date().toISOString(),
    saved: false
  };

  $("explanation").className = "result";
  $("explanation").textContent = data.explanation;

  $("explainStatus").textContent = "Lesson ready";

  renderQuiz(data.questions);

  $("saveBtn").disabled = false;
  $("saveQuiz").disabled = false;
  $("submitQuiz").disabled = false;

  $("quizFeedback").textContent = "";
}

$("explainBtn").onclick = () => {
  const topic = $("topic").value.trim();

  if (currentPhoto) {
    toast(
      "Photo selected. The current demo cannot read image text yet. An AI model integration is needed."
    );

    if (!currentLesson) {
      loadLesson(demoLesson);
    }

    $("explainStatus").textContent = "Demo lesson shown";
    return;
  }

  if (!currentLesson) {
    loadLesson(demoLesson);
    toast("Showing sample lesson. This is demo content, not AI-generated.");
    return;
  }

  loadLesson(demoLesson);
};

function renderQuiz(questions) {
  $("quizArea").className = "";
  $("quizArea").innerHTML = "";

  questions.forEach((question, index) => {
    const div = document.createElement("div");

    div.className = "quizq";

    div.innerHTML =
      `<p>${index + 1}. ${escapeHtml(question.q)}</p>` +
      question.opts.map((option, optionIndex) => `
        <label class="option">
          <input
            type="radio"
            name="q${index}"
            value="${optionIndex}"
          >
          <span>${escapeHtml(option)}</span>
        </label>
      `).join("");

    $("quizArea").appendChild(div);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

$("saveBtn").onclick = () => {
  if (!currentLesson) return;

  const existing = state.lessons.find(
    lesson => lesson.title === currentLesson.title
  );

  if (existing) {
    toast("This lesson is already saved.");
    return;
  }

  const copy = {
    ...currentLesson,
    saved: true,
    topic: $("topic").value || "General",
    photoName: currentPhoto?.name || ""
  };

  state.lessons.unshift(copy);
  currentLesson.saved = true;

  persist();

  toast("Lesson saved on this device for offline revision.");
};

$("saveQuiz").onclick = () => {
  if (!currentLesson) return;

  let lesson = state.lessons.find(
    item => item.title === currentLesson.title
  );

  if (!lesson) {
    lesson = {
      ...currentLesson,
      saved: true,
      topic: $("topic").value || "General"
    };

    state.lessons.unshift(lesson);
  }

  lesson.questions = currentLesson.questions;

  persist();

  toast("Quiz saved with your lesson.");
};

$("submitQuiz").onclick = () => {
  if (!currentLesson) return;

  let score = 0;
  let answered = 0;

  currentLesson.questions.forEach((question, index) => {
    const picked = document.querySelector(
      `input[name="q${index}"]:checked`
    );

    if (picked) {
      answered++;

      if (+picked.value === question.a) {
        score++;
      }
    }
  });

  if (answered < currentLesson.questions.length) {
    toast("Answer all five questions first.");
    return;
  }

  const percent = Math.round(
    score / currentLesson.questions.length * 100
  );

  state.attempts.unshift({
    title: currentLesson.title,
    score,
    total: currentLesson.questions.length,
    percent,
    date: new Date().toISOString()
  });

  const weak = currentLesson.questions
    .filter((question, index) => {
      const picked = document.querySelector(
        `input[name="q${index}"]:checked`
      );

      return !picked || Number(picked.value) !== question.a;
    })
    .map(question => question.q);

  $("quizFeedback").innerHTML = `
    <div class="note">
      <strong>Your score: ${score}/5 (${percent}%)</strong>
      <br>
      ${
        percent >= 80
          ? "Great work! Review once more to lock it in."
          : percent >= 60
            ? "Good start. Re-read the key ideas and retry."
            : "No stress — read the explanation slowly, then try again."
      }
      <br><br>
      <b>Revise next:</b>
      ${
        weak.length
          ? escapeHtml(weak.join("; "))
          : "Try a new topic or explain this idea in your own words."
      }
    </div>
  `;

  state.lastRecommendation = weak.length
    ? weak.slice(0, 3)
    : ["Try a new topic"];

  persist();

  toast("Score recorded on this device.");
};

function updateStats() {
  const best = state.attempts.length
    ? Math.max(...state.attempts.map(attempt => attempt.percent)) + "%"
    : "—";

  ["lessonsStat", "lessonsStat2"].forEach(id => {
    $(id).textContent = state.lessons.length;
  });

  ["attemptsStat", "attemptsStat2"].forEach(id => {
    $(id).textContent = state.attempts.length;
  });

  ["bestStat", "bestStat2"].forEach(id => {
    $(id).textContent = best;
  });

  const average = state.attempts.length
    ? Math.round(
        state.attempts.reduce(
          (total, attempt) => total + attempt.percent,
          0
        ) / state.attempts.length
      )
    : 0;

  ["progressFill", "progressFill2"].forEach(id => {
    $(id).style.width = average + "%";
  });

  $("progressCaption").textContent = state.attempts.length
    ? `Average quiz score: ${average}%. Keep practising!`
    : "Your progress is saved on this device.";

  const recommendation = state.lastRecommendation?.length
    ? `Focus on: ${state.lastRecommendation.join(", ")}. Re-read the explanation and retry the quiz.`
    : "Take your first quiz to get a revision recommendation based on your score.";

  $("recommendation").textContent = recommendation;
  $("recommendation2").textContent = recommendation;
}

function renderNotes() {
  const element = $("notesList");

  if (!element) return;

  if (!state.lessons.length) {
    element.innerHTML =
      '<div class="empty">No saved lessons yet. Create a lesson first.</div>';
    return;
  }

  element.innerHTML = state.lessons.map((lesson, index) => `
    <div class="noteitem">
      <strong>${escapeHtml(lesson.title)}</strong>
      <span class="tiny muted">
        ${new Date(lesson.createdAt || Date.now()).toLocaleDateString()}
        · Saved on this device
      </span>
      <p>
        ${escapeHtml(lesson.explanation.slice(0, 300))}
        ${lesson.explanation.length > 300 ? "…" : ""}
      </p>
      <div class="btnrow">
        <button class="btn secondary" onclick="openSaved(${index})">Revise</button>
        <button class="btn secondary" onclick="deleteSaved(${index})">Delete</button>
      </div>
    </div>
  `).join("");
}

window.openSaved = index => {
  const lesson = state.lessons[index];

  if (!lesson) return;

  loadLesson(lesson);
  $("topic").value = lesson.topic || "";

  nav("home");
  window.scrollTo({ top: 0, behavior: "smooth" });

  toast("Saved lesson opened.");
};

window.deleteSaved = index => {
  state.lessons.splice(index, 1);
  persist();
  toast("Saved lesson deleted.");
};

function renderScores() {
  const element = $("scoreHistory");

  if (!state.attempts.length) {
    element.className = "empty";
    element.textContent = "No quizzes completed yet.";
    return;
  }

  element.className = "";

  element.innerHTML = state.attempts.slice(0, 10).map(attempt => `
    <div class="resource">
      <div class="resourceicon">✓</div>
      <div>
        <strong>${escapeHtml(attempt.title)}</strong>
        <small>${new Date(attempt.date).toLocaleDateString()}</small>
      </div>
      <b style="margin-left:auto;color:var(--accent)">
        ${attempt.score}/${attempt.total}
      </b>
    </div>
  `).join("");
}

function renderPlans() {
  const element = $("planList");

  if (!element) return;

  element.innerHTML = state.plans.length
    ? state.plans.map((plan, index) => `
        <label class="option">
          <input
            type="checkbox"
            ${plan.done ? "checked" : ""}
            onchange="togglePlan(${index},this.checked)"
          >
          <span>
            <b>${escapeHtml(plan.text)}</b>
            <br>
            <small class="muted">${escapeHtml(plan.date || "No date")}</small>
          </span>
          <button
            class="btn ghost"
            onclick="event.preventDefault();removePlan(${index})"
          >×</button>
        </label>
      `).join("")
    : '<div class="empty">No goals added yet.</div>';
}

window.togglePlan = (index, value) => {
  state.plans[index].done = value;
  persist();
};

window.removePlan = index => {
  state.plans.splice(index, 1);
  persist();
};

$("addPlan").onclick = () => {
  const text = $("planInput").value.trim();

  if (!text) {
    toast("Enter a study goal first.");
    return;
  }

  state.plans.push({
    text,
    date: $("planDate").value,
    done: false
  });

  $("planInput").value = "";

  persist();

  toast("Study goal added.");
};

$("saveProfile").onclick = () => {
  state.profile = {
    name: $("studentName").value.trim(),
    id: $("studentId").value.trim()
  };

  persist();

  toast("Profile saved on this device.");
};

$("exportBtn").onclick = () => {
  const text = state.lessons.map(lesson => `
${lesson.title}

${lesson.explanation}

Quiz:
${(lesson.questions || []).map(
  (question, index) => `${index + 1}. ${question.q}`
).join("\n")}
  `).join("\n\n------------------\n\n");

  download(
    "learnlite-notes.txt",
    text || "No saved notes yet."
  );
};

function download(filename, text) {
  const link = document.createElement("a");

  link.href = URL.createObjectURL(
    new Blob([text], { type: "text/plain" })
  );

  link.download = filename;
  link.click();

  URL.revokeObjectURL(link.href);
}

$("downloadApp").onclick = () => {
  toast(
    "For offline use, open LearnLite through localhost or HTTPS and let the service worker cache the app."
  );
};

function readLesson() {
  const text = currentLesson?.explanation ||
    "Welcome to LearnLite. Upload a textbook photo to begin learning.";

  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
    speechSynthesis.speak(
      new SpeechSynthesisUtterance(text)
    );
  } else {
    toast("Read-aloud is not supported by this browser.");
  }
}

$("readBtn").onclick = readLesson;
$("readResource").onclick = readLesson;

$("timerMinutes").onchange = () => {
  if (!running) {
    seconds = Math.max(
      1,
      Math.min(180, +$("timerMinutes").value || 25)
    ) * 60;

    showTime();
  }
};

function showTime() {
  $("timeDisplay").textContent =
    String(Math.floor(seconds / 60)).padStart(2, "0") +
    ":" +
    String(seconds % 60).padStart(2, "0");
}

$("timerStart").onclick = () => {
  if (running) return;

  running = true;
  $("timerMessage").textContent =
    "Focus time — one small step at a time.";

  timerInterval = setInterval(() => {
    if (seconds > 0) {
      seconds--;
      showTime();
    } else {
      clearInterval(timerInterval);
      running = false;

      $("timerMessage").textContent =
        "Session complete! Take a short break. 🌱";

      if (
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("LearnLite: Focus session complete!");
      }
    }
  }, 1000);
};

$("timerPause").onclick = () => {
  clearInterval(timerInterval);
  running = false;

  $("timerMessage").textContent =
    "Timer paused. Resume when you are ready.";
};

$("timerReset").onclick = () => {
  clearInterval(timerInterval);
  running = false;

  seconds = Math.max(
    1,
    Math.min(180, +$("timerMinutes").value || 25)
  ) * 60;

  showTime();

  $("timerMessage").textContent = "Timer reset.";
};

function connection() {
  const online = navigator.onLine;

  $("connection").textContent = online
    ? "● Connected"
    : "● Offline mode";

  $("offlineBanner").classList.toggle("show", !online);
}

window.addEventListener("online", connection);
window.addEventListener("offline", connection);

function init() {
  applyTheme();
  connection();

  $("studentName").value = state.profile.name || "";
  $("studentId").value = state.profile.id || "";
  $("planDate").value = new Date().toISOString().slice(0, 10);

  updateStats();
  renderNotes();
  renderPlans();
  renderScores();
  showTime();
}

init();
