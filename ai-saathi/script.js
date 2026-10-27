
const $ = id => document.getElementById(id);

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
const MODEL_NAME = "gemini-2.5-flash";

let selectedFile = null;
let apiKey = "";
let lastAnswer = "";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const imageInput = $("imageInput");
const form = $("assistantForm");

function show(elementId) {
  $(elementId).classList.remove("hidden");
}

function hide(elementId) {
  $(elementId).classList.add("hidden");
}

function showError(message) {
  $("errorState").textContent = message;
  show("errorState");
}

function setLoading(isLoading) {
  $("analyzeButton").disabled = isLoading;
  $("analyzeButton").textContent = isLoading
    ? "⏳ Understanding..."
    : "✨ Understand with AI";

  if (isLoading) {
    hide("emptyState");
    hide("errorState");
    hide("resultContent");
    show("loadingState");
  } else {
    hide("loadingState");
  }
}

// Image upload and preview
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  if (!file) return;

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    selectedFile = null;
    imageInput.value = "";
    hide("imagePreviewContainer");
    alert("Please choose a JPG, PNG or WEBP image.");
    return;
  }

  if (file.size > MAX_IMAGE_SIZE) {
    selectedFile = null;
    imageInput.value = "";
    hide("imagePreviewContainer");
    alert("Image must be smaller than 8 MB.");
    return;
  }

  selectedFile = file;

  const reader = new FileReader();

  reader.onload = () => {
    $("imagePreview").src = reader.result;
    show("imagePreviewContainer");
  };

  reader.onerror = () => {
    selectedFile = null;
    alert("Could not read this image. Please try another.");
  };

  reader.readAsDataURL(file);
});

$("removeImage").addEventListener("click", () => {
  selectedFile = null;
  imageInput.value = "";
  $("imagePreview").removeAttribute("src");
  hide("imagePreviewContainer");
});

// Convert an image file into base64 data for the API.
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result;
      const commaIndex = dataUrl.indexOf(",");

      if (commaIndex === -1) {
        reject(new Error("Could not process the image."));
        return;
      }

      resolve(dataUrl.slice(commaIndex + 1));
    };

    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

function buildPrompt(question, language, hasImage) {
  const imageInstruction = hasImage
    ? `Describe the image accurately. Explain visible objects, signs, printed text, and important details. Do not guess details that cannot be seen.`
    : `Answer the user's text question clearly and accurately.`;

  return `
You are AI Saathi, an accessibility assistant.

The user selected this response language: ${language}.

${imageInstruction}

User's question:
${question || "Please describe this image in simple language."}

Instructions:
1. Use simple, respectful, easy-to-understand language.
2. If the selected language is Hindi, respond in Hindi using Devanagari script.
3. If the selected language is Hinglish, use natural Hindi-English mixed language.
4. If the selected language is English, use simple English.
5. If you see readable text in the image, explain its meaning.
6. If a visible warning or safety instruction exists, explain it clearly.
7. Never claim that a person, object, or danger is present unless there is enough visual evidence.
8. If text is blurry or uncertain, say so.
9. Do not claim that an image proves something is safe or dangerous.
10. Organize the answer using short paragraphs or bullet points.
11. Do not invent emergency numbers, addresses, or official instructions.
`;
}

function detectWarning(text) {
  const pattern =
    /\b(danger|warning|caution|emergency|fire|poison|toxic|hazard|evacuate|flammable|high voltage|do not enter|keep out|खतरा|सावधान|चेतावनी|आपातकाल|आग|जहरीला|बाहर निकलें)\b/i;

  return pattern.test(text);
}

function displayAnswer(answer) {
  lastAnswer = answer;

  // Render model output as plain text, not HTML.
  $("answerText").textContent = answer;
  show("resultContent");
  hide("emptyState");

  if (detectWarning(answer)) {
    $("warningText").textContent =
      "The response mentions potentially important safety-related information. Verify the original sign or notice and follow reliable official instructions.";
    show("warningBox");
  } else {
    hide("warningBox");
  }

  $("resultHeading").textContent = "Here's what I found";
}

// Ask for the key without storing it in localStorage.
function getApiKey() {
  if (apiKey) return apiKey;

  const enteredKey = window.prompt(
    "Enter your Google AI API key for this session. It will not be saved by this page."
  );

  if (!enteredKey || !enteredKey.trim()) return "";

  apiKey = enteredKey.trim();
  return apiKey;
}

async function askAI(question, language, file) {
  const key = getApiKey();

  if (!key) {
    throw new Error("An API key is required to use AI analysis.");
  }

  const parts = [
    { text: buildPrompt(question, language, Boolean(file)) }
  ];

  if (file) {
    const base64Data = await fileToBase64(file);

    parts.push({
      inline_data: {
        mime_type: file.type,
        data: base64Data
      }
    });
  }

  const endpoint =
    API_URL + encodeURIComponent(MODEL_NAME) + ":generateContent";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000
      }
    })
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("The AI service returned an unreadable response.");
  }

  if (!response.ok) {
    const message = data?.error?.message || "The AI request failed.";

    if (response.status === 400 || response.status === 403) {
      apiKey = "";
      throw new Error(
        "API request rejected. Check your API key, model access and API settings. Details: " +
        message
      );
    }

    if (response.status === 429) {
      throw new Error(
        "The API usage limit may have been reached. Check your quota and try again later."
      );
    }

    throw new Error(message);
  }

  const answer = data?.candidates?.[0]?.content?.parts
    ?.map(part => part.text || "")
    .join("\n")
    .trim();

  if (!answer) {
    throw new Error(
      "The AI returned no text. Try another image or a clearer question."
    );
  }

  return answer;
}

// Submit image/text for analysis
form.addEventListener("submit", async event => {
  event.preventDefault();

  const question = $("questionInput").value.trim();
  const language = $("languageSelect").value;

  if (!selectedFile && !question) {
    showError("Please upload an image or type a question first.");
    hide("emptyState");
    return;
  }

  setLoading(true);

  try {
    const answer = await askAI(question, language, selectedFile);
    displayAnswer(answer);
  } catch (error) {
    show("errorState");

    $("errorState").textContent =
      error.message ||
      "Something went wrong. Check your internet connection and try again.";

    show("emptyState");
    $("resultHeading").textContent = "Could not complete the request";
  } finally {
    setLoading(false);
  }
});

// Read the answer aloud
$("speakButton").addEventListener("click", () => {
  if (!lastAnswer) return;

  if (!("speechSynthesis" in window)) {
    alert("Speech is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(lastAnswer);
  const language = $("languageSelect").value;

  if (language === "Hindi") {
    utterance.lang = "hi-IN";
  } else if (language === "Hinglish") {
    utterance.lang = "hi-IN";
  } else {
    utterance.lang = "en-US";
  }

  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
});

$("stopSpeakButton").addEventListener("click", () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
});

// Copy the answer
$("copyButton").addEventListener("click", async () => {
  if (!lastAnswer) return;

  try {
    await navigator.clipboard.writeText(lastAnswer);
    $("copyButton").textContent = "✓ Copied!";

    setTimeout(() => {
      $("copyButton").textContent = "📋 Copy answer";
    }, 1800);
  } catch {
    alert("Copy was blocked by the browser. You can select and copy the answer manually.");
  }
});

// Stop speech if the page is closed or refreshed.
window.addEventListener("pagehide", () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
});
