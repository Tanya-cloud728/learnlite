
document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);

  const readStorage = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const saveData = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      showToast("Browser storage is unavailable.");
    }
  };

  const safeText = value => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#039;"
  }[char]));

  let toastTimeout;
  function showToast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => $("toast").classList.remove("show"), 2600);
  }

  // Replace a video ID with another YouTube video's ID when needed.
  // IDs below are sample educational video IDs. Check each video is available.
  const courses = [
    {
      id: "html", title: "HTML Fundamentals", category: "Technology",
      icon: "🌐", description: "Learn how web pages are structured.",
      lessons: [
        {
          title: "Introduction to HTML",
          text: "HTML stands for HyperText Markup Language. It provides the structure of a web page using elements such as headings, paragraphs, links and images.",
          video: "kUMe1FH4CHE"
        },
        {
          title: "HTML Elements and Tags",
          text: "HTML elements usually contain an opening tag, content and a closing tag. For example, a paragraph uses the p element.",
          video: "UB1O30fR-EE"
        }
      ]
    },
    {
      id: "css", title: "CSS Styling", category: "Technology",
      icon: "🎨", description: "Style websites with colors and layouts.",
      lessons: [
        {
          title: "Introduction to CSS",
          text: "CSS stands for Cascading Style Sheets. It controls the appearance, spacing, colors and layout of HTML elements.",
          video: "OXGznpKZ_sA"
        },
        {
          title: "CSS Selectors",
          text: "Selectors choose which HTML elements receive a style. A class selector starts with a dot, while an ID selector starts with a hash.",
          video: "yfoY53QXEnI"
        }
      ]
    },
    {
      id: "js", title: "JavaScript Basics", category: "Technology",
      icon: "💻", description: "Make your websites interactive.",
      lessons: [
        {
          title: "JavaScript Introduction",
          text: "JavaScript adds behaviour to websites. It can respond to clicks, validate forms and update content dynamically.",
          video: "W6NZfCO5SIk"
        },
        {
          title: "Variables and Data",
          text: "Variables store values. JavaScript commonly uses let and const to declare variables.",
          video: "hdI2bqOjy3c"
        }
      ]
    },
    {
      id: "science", title: "Everyday Science", category: "Science",
      icon: "🔬", description: "Explore basic scientific ideas.",
      lessons: [
        {
          title: "The Scientific Method",
          text: "The scientific method involves observing a question, making a hypothesis, testing it and evaluating evidence.",
          video: "yi0hwFDQTSQ"
        },
        {
          title: "Energy Around Us",
          text: "Energy can take many forms, including kinetic, potential, thermal, chemical and electrical energy.",
          video: "w4QFJb9a8vo"
        }
      ]
    },
    {
      id: "math", title: "Mathematics Essentials", category: "Mathematics",
      icon: "📐", description: "Practise useful mathematical concepts.",
      lessons: [
        {
          title: "Percentages",
          text: "A percentage means a quantity out of 100. To calculate x percent of a number, multiply the number by x and divide by 100.",
          video: "JeVSmq1Nrpw"
        },
        {
          title: "Basic Algebra",
          text: "Algebra uses letters to represent unknown numbers. For example, if x + 3 = 8, subtracting 3 gives x = 5.",
          video: "NybHckSEQBI"
        }
      ]
    },
    {
      id: "communication", title: "Communication Skills", category: "Communication",
      icon: "🗣️", description: "Improve everyday communication.",
      lessons: [
        {
          title: "Active Listening",
          text: "Active listening means paying attention, avoiding unnecessary interruptions and checking that you understood the speaker.",
          video: "i3ku5nx4sL8"
        },
        {
          title: "Speaking with Confidence",
          text: "Prepare your main points, speak clearly, practise regularly and allow yourself time to think.",
          video: "HAnw168huqA"
        }
      ]
    }
  ];

  let completed = readStorage("ll_completed", []);
  let started = readStorage("ll_started", []);
  let bookmarks = readStorage("ll_bookmarks", []);
  let quizPoints = readStorage("ll_quizPoints", 0);
  let focusMinutes = readStorage("ll_focusMinutes", 0);
  let tasks = readStorage("ll_tasks", []);
  let notes = readStorage("ll_notes", {});
  let currentCourse = null;
  let currentLesson = null;
  let showSavedOnly = false;

  // Online/offline status
  function updateNetwork() {
    const online = navigator.onLine;
    $("networkStatus").textContent = online ? "● Online" : "● Offline";
    $("networkStatus").className = online ? "online" : "offline";
  }

  window.addEventListener("online", updateNetwork);
  window.addEventListener("offline", updateNetwork);
  updateNetwork();

  // Dark mode
  document.body.classList.toggle("dark", readStorage("ll_dark", false));

  $("themeToggle").addEventListener("click", () => {
    const dark = document.body.classList.toggle("dark");
    saveData("ll_dark", dark);
    $("themeToggle").textContent = dark ? "☀️ Theme" : "🌙 Theme";
  });

  $("themeToggle").textContent =
    document.body.classList.contains("dark") ? "☀️ Theme" : "🌙 Theme";

  function lessonKey(course, lesson) {
    return `${course.id}:${lesson.title}`;
  }

  function isComplete(course, lesson) {
    return completed.includes(lessonKey(course, lesson));
  }

  function courseProgress(course) {
    const count = course.lessons.filter(lesson => isComplete(course, lesson)).length;
    return Math.round(count / course.lessons.length * 100);
  }

  // Course cards and filters
  function renderCourses() {
    const query = $("courseSearch").value.trim().toLowerCase();
    const category = $("categoryFilter").value;

    const filtered = courses.filter(course => {
      const matchesText =
        `${course.title} ${course.description} ${course.category}`
          .toLowerCase().includes(query);
      const matchesCategory = category === "All" || course.category === category;
      const matchesBookmark = !showSavedOnly || bookmarks.includes(course.id);
      return matchesText && matchesCategory && matchesBookmark;
    });

    $("courseGrid").innerHTML = filtered.length
      ? filtered.map(course => `
        <article class="course-card">
          <div class="course-icon">${course.icon}</div>
          <div class="course-meta">${safeText(course.category)} · ${course.lessons.length} lessons</div>
          <h3>${safeText(course.title)}</h3>
          <p>${safeText(course.description)}</p>
          <div class="progress-track">
            <div class="progress-fill" style="width:${courseProgress(course)}%"></div>
          </div>
          <p>${courseProgress(course)}% completed</p>
          <div class="button-row">
            <button type="button" data-open-course="${course.id}">Open course</button>
            <button type="button" data-bookmark="${course.id}" aria-label="Bookmark ${safeText(course.title)}">
              ${bookmarks.includes(course.id) ? "★ Saved" : "☆ Save"}
            </button>
          </div>
        </article>
      `).join("")
      : "<p>No courses found. Try another search.</p>";
  }

  $("courseSearch").addEventListener("input", renderCourses);
  $("categoryFilter").addEventListener("change", renderCourses);

  $("showBookmarks").addEventListener("click", () => {
    showSavedOnly = !showSavedOnly;
    $("showBookmarks").textContent = showSavedOnly ? "Show all courses" : "☆ Saved courses";
    renderCourses();
  });

  $("courseGrid").addEventListener("click", event => {
    const openButton = event.target.closest("[data-open-course]");
    const saveButton = event.target.closest("[data-bookmark]");

    if (saveButton) {
      const id = saveButton.dataset.bookmark;
      bookmarks = bookmarks.includes(id)
        ? bookmarks.filter(item => item !== id)
        : [...bookmarks, id];
      saveData("ll_bookmarks", bookmarks);
      renderCourses();
      renderAchievements();
      showToast("Bookmark updated.");
    }

    if (openButton) {
      const course = courses.find(item => item.id === openButton.dataset.openCourse);
      if (!course) return;

      currentCourse = course;
      currentLesson = course.lessons[0];

      if (!started.includes(course.id)) {
        started.push(course.id);
        saveData("ll_started", started);
      }

      renderLessonList();
      renderLesson();
      updateDashboard();
      $("lessonArea").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  // Lessons and video player
  function renderLessonList() {
    if (!currentCourse) return;

    $("lessonList").innerHTML = currentCourse.lessons.map((lesson, index) => `
      <button type="button"
        class="${lesson === currentLesson ? "active" : ""}"
        data-lesson-index="${index}">
        ${isComplete(currentCourse, lesson) ? "✓ " : ""}
        ${index + 1}. ${safeText(lesson.title)}
      </button>
    `).join("");
  }

  $("lessonList").addEventListener("click", event => {
    const button = event.target.closest("[data-lesson-index]");
    if (!button || !currentCourse) return;

    currentLesson = currentCourse.lessons[Number(button.dataset.lessonIndex)];
    renderLessonList();
    renderLesson();
  });

  function renderLesson() {
    if (!currentCourse || !currentLesson) return;

    $("lessonTitle").textContent = currentLesson.title;
    $("lessonText").textContent = currentLesson.text;
    $("lessonNotes").value = notes[lessonKey(currentCourse, currentLesson)] || "";

    const videoId = currentLesson.video;
    const container = $("videoContainer");

    container.replaceChildren();

    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
    iframe.title = `${currentLesson.title} video`;
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    container.appendChild(iframe);

    const link = document.createElement("a");
    link.className = "video-link";
    link.href = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "↗ Watch on YouTube";
    $("videoHelp").replaceChildren(link);

    $("completeLesson").textContent =
      isComplete(currentCourse, currentLesson) ? "✓ Completed — undo" : "✓ Mark complete";
  }

  $("lessonNotes").addEventListener("input", () => {
    if (!currentCourse || !currentLesson) return;
    notes[lessonKey(currentCourse, currentLesson)] = $("lessonNotes").value;
    saveData("ll_notes", notes);
  });

  $("completeLesson").addEventListener("click", () => {
    if (!currentCourse || !currentLesson) {
      showToast("Open a course and select a lesson first.");
      return;
    }

    const key = lessonKey(currentCourse, currentLesson);

    if (completed.includes(key)) {
      completed = completed.filter(item => item !== key);
    } else {
      completed.push(key);
    }

    saveData("ll_completed", completed);
    renderLessonList();
    renderLesson();
    renderCourses();
    updateDashboard();
    renderAchievements();
  });

  $("readLesson").addEventListener("click", () => {
    if (!currentLesson) return showToast("Select a lesson first.");
    if (!("speechSynthesis" in window)) return showToast("Speech is not supported in this browser.");

    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(
      `${currentLesson.title}. ${currentLesson.text}`
    ));
  });

  $("stopReading").addEventListener("click", () => {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  });

  // Quiz
  const questions = [
    { q: "What does HTML stand for?", options: ["HyperText Markup Language", "HighText Machine Language", "Home Tool Markup Language"], answer: 0, explanation: "HTML structures content on web pages." },
    { q: "Which language styles a webpage?", options: ["SQL", "CSS", "C++"], answer: 1, explanation: "CSS controls layout, colours and styling." },
    { q: "Which keyword declares a block-scoped variable that can be reassigned?", options: ["let", "const", "fixed"], answer: 0, explanation: "Use let when the variable needs reassignment." },
    { q: "What is 20% of 150?", options: ["15", "20", "30"], answer: 2, explanation: "150 × 20 ÷ 100 = 30." },
    { q: "What is active listening?", options: ["Interrupting often", "Listening attentively", "Looking away"], answer: 1, explanation: "Active listening means paying attention and understanding." },
    { q: "Which is a form of energy?", options: ["Thermal energy", "A kilogram", "A centimetre"], answer: 0, explanation: "Thermal energy is associated with particle motion." }
  ];

  let quizIndex = 0;
  let selectedAnswer = null;
  let answered = false;
  let quizRunPoints = 0;

  function renderQuiz() {
    const question = questions[quizIndex];
    selectedAnswer = null;
    answered = false;

    $("quizProgress").textContent = `Question ${quizIndex + 1} of ${questions.length}`;
    $("quizQuestion").textContent = question.q;
    $("quizFeedback").textContent = "";
    $("quizOptions").innerHTML = question.options.map((option, index) => `
      <button type="button" class="quiz-option" data-answer="${index}">
        ${String.fromCharCode(65 + index)}. ${safeText(option)}
      </button>
    `).join("");

    $("checkAnswer").disabled = false;
    $("nextQuestion").disabled = true;
    $("nextQuestion").textContent =
      quizIndex === questions.length - 1 ? "Finish quiz" : "Next question →";
  }

  $("quizOptions").addEventListener("click", event => {
    const button = event.target.closest("[data-answer]");
    if (!button || answered) return;

    selectedAnswer = Number(button.dataset.answer);
    document.querySelectorAll(".quiz-option").forEach(option => {
      option.classList.toggle("selected", option === button);
    });
  });

  $("checkAnswer").addEventListener("click", () => {
    if (answered) return;
    if (selectedAnswer === null) return showToast("Choose an answer first.");

    answered = true;
    const question = questions[quizIndex];
    const correct = selectedAnswer === question.answer;

    if (correct) {
      quizRunPoints += 10;
      quizPoints += 10;
      saveData("ll_quizPoints", quizPoints);
    }

    $("quizFeedback").textContent =
      `${correct ? "Correct! 🎉" : "Not quite."} ${question.explanation}`;

    $("quizOptions").querySelectorAll("button").forEach((button, index) => {
      button.disabled = true;
      if (index === question.answer) button.classList.add("selected");
    });

    $("checkAnswer").disabled = true;
    $("nextQuestion").disabled = false;
    updateDashboard();
    renderAchievements();
  });

  $("nextQuestion").addEventListener("click", () => {
    if (!answered) return;

    if (quizIndex < questions.length - 1) {
      quizIndex++;
      renderQuiz();
    } else {
      $("quizQuestion").textContent = "Quiz complete! 🎉";
      $("quizProgress").textContent = `You scored ${quizRunPoints} points this round.`;
      $("quizOptions").innerHTML = "";
      $("quizFeedback").textContent = "Great work! Restart to practise again.";
      $("checkAnswer").disabled = true;
      $("nextQuestion").disabled = true;
    }
  });

  $("restartQuiz").addEventListener("click", () => {
    quizIndex = 0;
    quizRunPoints = 0;
    renderQuiz();
  });

  // Study planner
  function renderTasks() {
    $("taskList").innerHTML = tasks.length
      ? tasks.map(task => `
        <div class="task-item ${task.done ? "done" : ""}">
          <label>
            <input type="checkbox" data-task-toggle="${task.id}" ${task.done ? "checked" : ""}>
            <span>
              <span class="task-title">${safeText(task.text)}</span>
              ${task.date ? `<small> · ${safeText(task.date)}</small>` : ""}
            </span>
          </label>
          <button type="button" data-task-delete="${task.id}">Delete</button>
        </div>
      `).join("")
      : "<p class='muted'>No tasks yet. Add your first study goal!</p>";
  }

  $("taskForm").addEventListener("submit", event => {
    event.preventDefault();
    const text = $("taskInput").value.trim();
    if (!text) return;

    tasks.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
      date: $("taskDate").value,
      done: false
    });

    saveData("ll_tasks", tasks);
    $("taskInput").value = "";
    renderTasks();
    renderAchievements();
  });

  $("taskList").addEventListener("change", event => {
    const checkbox = event.target.closest("[data-task-toggle]");
    if (!checkbox) return;

    const task = tasks.find(item => item.id === checkbox.dataset.taskToggle);
    if (!task) return;

    task.done = checkbox.checked;
    saveData("ll_tasks", tasks);
    renderTasks();
    renderAchievements();
  });

  $("taskList").addEventListener("click", event => {
    const button = event.target.closest("[data-task-delete]");
    if (!button) return;

    tasks = tasks.filter(item => item.id !== button.dataset.taskDelete);
    saveData("ll_tasks", tasks);
    renderTasks();
    renderAchievements();
  });

  // Focus timer
  let remainingSeconds = Number($("focusDuration").value) * 60;
  let timerInterval = null;

  function displayTimer() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    $("timerDisplay").textContent =
      `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  $("focusDuration").addEventListener("change", () => {
    stopTimer();
    remainingSeconds = Number($("focusDuration").value) * 60;
    displayTimer();
  });

  $("startTimer").addEventListener("click", () => {
    if (timerInterval) return;

    if (remainingSeconds <= 0) {
      remainingSeconds = Number($("focusDuration").value) * 60;
      displayTimer();
    }

    timerInterval = setInterval(() => {
      remainingSeconds--;
      displayTimer();

      if (remainingSeconds <= 0) {
        stopTimer();
        focusMinutes += Number($("focusDuration").value);
        saveData("ll_focusMinutes", focusMinutes);
        updateDashboard();
        renderAchievements();
        showToast("Focus session complete! Take a short break. 🎉");
      }
    }, 1000);
  });

  $("pauseTimer").addEventListener("click", stopTimer);

  $("resetTimer").addEventListener("click", () => {
    stopTimer();
    remainingSeconds = Number($("focusDuration").value) * 60;
    displayTimer();
  });

  // Demo Study Buddy: predefined responses, not an AI service.
  $("chatForm").addEventListener("submit", event => {
    event.preventDefault();

    const message = $("chatInput").value.trim();
    if (!message) return;

    const userMessage = document.createElement("p");
    userMessage.className = "user-message";
    userMessage.textContent = message;
    $("chatMessages").appendChild(userMessage);

    const lower = message.toLowerCase();
    let response;

    if (lower.includes("motivat") || lower.includes("tired")) {
      response = "Start with just 10 minutes. Small, consistent progress matters more than perfection.";
    } else if (lower.includes("html") || lower.includes("css") || lower.includes("javascript")) {
      response = "Try a short lesson, write a small example yourself, and explain what you learned in your own words.";
    } else if (lower.includes("exam") || lower.includes("revision")) {
      response = "Revise one topic, solve 3 practice questions, then test yourself without looking at your notes.";
    } else if (lower.includes("plan") || lower.includes("time")) {
      response = "Pick your three most important tasks, estimate their time and start with the hardest one.";
    } else {
      response = "Try this: study for 25 minutes, take a short break, and write down three things you learned.";
    }

    const botMessage = document.createElement("p");
    botMessage.className = "bot-message";
    botMessage.textContent = response;
    $("chatMessages").appendChild(botMessage);

    $("chatInput").value = "";
    $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
  });

  // Achievements
  function renderAchievements() {
    const allTasksDone = tasks.length > 0 && tasks.every(task => task.done);

    const achievements = [
      ["🌱", "First Steps", "Complete your first lesson.", completed.length >= 1],
      ["📚", "Curious Learner", "Start at least three courses.", started.length >= 3],
      ["🏆", "Quiz Champion", "Earn 50 quiz points.", quizPoints >= 50],
      ["⏱️", "Focus Hero", "Focus for 60 minutes.", focusMinutes >= 60],
      ["📅", "Planner Pro", "Finish all your study tasks.", allTasksDone],
      ["⭐", "Saved for Later", "Bookmark a course.", bookmarks.length >= 1]
    ];

    $("achievements").innerHTML = achievements.map(([icon, title, description, unlocked]) => `
      <article class="achievement-card ${unlocked ? "" : "locked"}">
        <strong>${icon} ${safeText(title)} ${unlocked ? "✓" : "🔒"}</strong>
        <p>${safeText(description)}</p>
      </article>
    `).join("");
  }

  // Dashboard
  function updateDashboard() {
    $("coursesStarted").textContent = started.length;
    $("lessonsCompleted").textContent = completed.length;
    $("focusMinutes").textContent = focusMinutes;
    $("quizPoints").textContent = quizPoints;
  }

  // Initial render
  renderCourses();
  renderQuiz();
  renderTasks();
  renderAchievements();
  updateDashboard();
  displayTimer();
});
