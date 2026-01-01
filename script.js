// ====================== ÂM THANH =========================
const winSound = new Audio('/sound/win.mp3');
const selectSound = new Audio('/sound/click.mp3');
const hoverSound = new Audio('/sound/hover.mp3');
const wrongSound = new Audio('https://luuchihoa.github.io/sound/buzzer.mp3');
const correctSound = new Audio('/sound/ding.mp3');

winSound.volume = 0.35;
selectSound.volume = 0.4;
wrongSound.volume = 0.4;

// ====================== DỮ LIỆU =========================
let questions = [];

// ====================== BIẾN =========================
let current = 0;
let scoreChoice = 0;
let totalTime = 0;
let globalTimer;
let userAnswers = [];

const quizBox = document.querySelector('.quiz-box');
const fractionEl = document.getElementById('fraction');
const questionTextEl = document.getElementById('question-text');
const optionsArea = document.getElementById('options-area');
const questionTimeText = document.getElementById('question-time-text');
const questionProgress = document.getElementById('question-progress');
const skipBtn = document.getElementById('skip-btn');
const finishBtn = document.getElementById('finish-btn');

// per-question timer
const QUESTION_TIME = 30; // seconds
let questionRemaining = QUESTION_TIME;
let questionTimerInterval = null;

let quizQuestions = [];

// ====================== CẤU HÌNH BÀI THI =========================
const examConfig = {
  'dovui': {
    title: 'ĐỐ VUI GIÁO LÝ',
    api: 'https://script.google.com/macros/s/AKfycbzs823Exjgop4XQHd90PVcjSMD3INg2j4V0Iy3uN0zAhZfvwHZIonpIEW0HdD8YOE4Y/exec',
    time: 15 * 60,
    mcqCount: 5,
  },
  '1tiet': {
    title: 'ÔN TẬP 1 TIẾT',
    api: 'https://script.google.com/macros/s/AKfycbwOuqPMsL1VjVy78FpeTEAMaYjWMkp6UqTBe9KSjaqu-f16F8RyO5iNc3xYqluEB9LyyA/exec',
    time: 45 * 60,
    mcqCount: 10,
  },
};

function getExamType() {
  const params = new URLSearchParams(window.location.search);
  return params.get('type') || 'dovui';
}

const examType = getExamType();
const config = examConfig[examType] || examConfig['dovui'];
totalTime = config.time;

// ====================== LOAD DATA =========================
window.loadData = async function () {
  document.title = config.title;
  document.querySelector('.header-text')?.classList?.remove('hidden');

  document.querySelectorAll('.title-quiz, #quiz-title').forEach(el=>{
    if(el) el.textContent = config.title;
  });

  try {
    const res = await fetch(config.api);
    const data = await res.json();
    // expecting data.mcq array; each item: { text, choices: {A:..}, correct: "A", image: "/path" (optional) }
    questions = data.mcq || [];
  } catch (err) {
    console.error(err);
    // fallback: empty questions
    questions = [];
  }
};

// ====================== RANDOM =========================
function getRandomItems(arr, n) {
  return [...arr].sort(() => 0.5 - Math.random()).slice(0, n);
}

function randomQuestion() {
  const need = Math.min(config.mcqCount, questions.length);
  quizQuestions = getRandomItems(questions, need);
}

// ====================== QUESTION TIMER =========================
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function startQuestionTimer() {
  clearInterval(questionTimerInterval);
  questionRemaining = QUESTION_TIME;
  updateQuestionTimerUI();

  const total = QUESTION_TIME;
  questionTimerInterval = setInterval(() => {
    questionRemaining--;
    if (questionRemaining < 0) {
      clearInterval(questionTimerInterval);
      // treat as skipped / no answer
      handleTimeout();
      return;
    }
    updateQuestionTimerUI();
  }, 1000);

  // animate progress more smoothly (optional: every 100ms)
  let lastNow = Date.now();
  const smooth = setInterval(() => {
    if (!questionTimerInterval) { clearInterval(smooth); return; }
    const elapsed = (total - questionRemaining);
    const pct = Math.max(0, (questionRemaining / total) * 100);
    questionProgress.style.width = pct + '%';
    if (questionRemaining <= 0) { clearInterval(smooth); }
  }, 100);
}

function updateQuestionTimerUI() {
  questionTimeText.textContent = formatTime(questionRemaining);
  const pct = Math.max(0, (questionRemaining / QUESTION_TIME) * 100);
  questionProgress.style.width = pct + '%';
}

// called when per-question time runs out
function handleTimeout() {
  wrongSound.play();
  pushUnansweredAndNext();
}

  const quizBox1=document.querySelector('.quiz-box1');
// ====================== LOAD CÂU HỎI =========================
function loadQuestion() {
  quizBox1.style.display='none';
  quizBox.style.display='block';
  if (!quizQuestions || quizQuestions.length === 0) {
    quizContentFallback();
    return;
  }

  const q = quizQuestions[current];
  document.querySelector('.ques-box').textContent = `Câu ${current+1}/${quizQuestions.length}`;
  questionTextEl.textContent = `${q.text}` || '(Không có nội dung câu hỏi)';
  console.log(questionTextEl.textContent);
  // build options
  const choices = q.choices || {};
  optionsArea.innerHTML = Object.entries(choices)
    .map(([k, v]) => {
      return `
      <div class="option text-base" data-key="${k}">
        <span class="option-circle ">${k}</span>
        <span class="option-text">${v}</span>
      </div>`;
    })
    .join('');
  // attach events
  document.querySelectorAll('.option').forEach(opt => {
    opt.addEventListener('mouseenter', () => 
    { 
      hoverSound.play();    
      hoverSound.currentTime = 0;
    });
    opt.addEventListener('click', () => {
      selectSound.play();
      handleAnswer(opt.dataset.key);
    });
  });

  // skip handler
  skipBtn.onclick = () => {
    pushUnansweredAndNext();
  };

  // start per-question timer
  startQuestionTimer();
}


// ====================== CHECK ĐÁP ÁN =========================
function handleAnswer(selectedKey) {
  // stop timer
  clearInterval(questionTimerInterval);

  const q = quizQuestions[current];

  userAnswers.push({
    question: q.text,
    selected: selectedKey,
    correct: q.correct,
  });

  document.querySelectorAll('.option').forEach(btn => {
    btn.style.pointerEvents = 'none';
    if (btn.dataset.key === q.correct)
      btn.classList.add('correct');
    else if (btn.dataset.key === selectedKey)
      btn.classList.add('wrong');
  });

  if (selectedKey === q.correct) {
    scoreChoice++;
    correctSound.play();
  } else wrongSound.play();

  setTimeout(nextQuestion, 900);
}

// ====================== NEXT =========================
function nextQuestion() {
  clearInterval(questionTimerInterval);
  current++;
  if (current < quizQuestions.length) {
    loadQuestion();
  } else {
    autoSubmit();
  }
}

// ====================== AUTO SUBMIT =========================
function autoSubmit() {
  clearInterval(questionTimerInterval);
  // fill remaining as unanswered
  for (let i = current; i < quizQuestions.length; i++) {
    userAnswers.push({
      question: quizQuestions[i].text,
      selected: 'Không trả lời',
      correct: quizQuestions[i].correct,
    });
  }

  const score = ((scoreChoice / quizQuestions.length) * 10).toFixed(2);
  showResults(score);
}

// ====================== KẾT QUẢ =========================
function showResults(total) {
  quizBox.style.display='none';
  quizBox1.style.display='block';
  quizBox1.innerHTML = `
    <h2 class="text-3xl text-center text-green-600 font-bold mb-4">Hoàn thành bài thi!</h2>
    <p class="text-center text-xl font-bold text-red-600">Tổng điểm: ${total}/10</p>
    <div class="text-center mt-4">
      <button id="retry-btn" class="px-6 py-2 bg-gray-400 text-white rounded-xl">Làm lại</button>
    </div>
  `;
  winSound.play();

  document.getElementById('retry-btn').onclick = () => {
    // reload page or restart
    // window.location.reload();
    console.log(questions);
    startQuiz();
  };
}

// fallback if no data
function quizContentFallback() {
  optionsArea.innerHTML = '<p class="text-center text-red-500">Không có câu hỏi để hiển thị.</p>';
}

// ====================== START =========================
function startQuiz() {
  document.getElementById('start-box').style.display = 'none';
  document.getElementById('loading-box').style.display = 'none';
  quizBox.style.display = 'block';

  totalTime = config.time;
  current = 0;
  scoreChoice = 0;
  userAnswers = [];
  randomQuestion();
  loadQuestion();
}

window.startQuiz = startQuiz;

// ====================== RUN ONCE =========================
let hasRun = false;
async function runOnce() {
  if (hasRun) return;
  await loadData();
  // hide loading
  document.getElementById('loading-box').style.display = 'none';
  document.getElementById('start-box').style.display = 'flex';
  // set start title inside start-box
  document.getElementById('quiz-title')?.textContent && (document.getElementById('quiz-title').textContent = config.title);
  hasRun = true;
}
runOnce();

// Optional closeQuiz implementation
const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmOk = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');

let confirmAction = null;

function openConfirm({ title, message, okText, okClass, onConfirm }) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmOk.textContent = okText;
  confirmOk.className = `flex-1 py-3 rounded-xl text-white font-bold transition shadow-lg ${okClass}`;
  confirmAction = onConfirm;

  confirmModal.classList.remove('hidden');
}

function closeConfirm() {
  confirmModal.classList.add('hidden');
  confirmAction = null;
}

confirmCancel.onclick = closeConfirm;

confirmOk.onclick = () => {
  if (confirmAction) confirmAction();
  closeConfirm();
};

