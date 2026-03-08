
'use strict';

/* ========================
   BACKEND URL CONFIG
   ======================== */
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : 'https://study-backend-beta.vercel.app/api';

/* 
   MODULE: App State
    */
const AppState = {
  stats: {
    streak: 1,
    focusHours: 0,
    quizzesDone: 0,
    notesCreated: 0,
  },
  focus: {
    sessions: 0,
    totalSessions: 0,
    minutesFocused: 0,
    currentMode: 'focus',
    durations: { focus: 25, break: 5, long: 15 },
  },
};

/* ========================
   MODULE: Navigation
   ======================== */
const Navigation = (() => {
  const navLinks  = document.querySelectorAll('.nav-link');
  const pages     = document.querySelectorAll('.page');
  const sidebar   = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburger');

  const overlay = document.createElement('div');
  overlay.classList.add('overlay');
  document.body.appendChild(overlay);

  function navigate(pageId) {
    pages.forEach(p => p.classList.remove('active'));
    navLinks.forEach(l => l.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageId}`);
    const targetLink = document.querySelector(`[data-page="${pageId}"]`);

    if (targetPage) targetPage.classList.add('active');
    if (targetLink) targetLink.classList.add('active');

    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  }

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigate(link.dataset.page);
    });
  });

  document.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', () => navigate(card.dataset.page));
  });

  hamburger?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  });

  return { navigate };
})();


/* ========================
   MODULE: Dashboard
   ======================== */
const Dashboard = (() => {
  const tips = [
    "The spacing effect: studying across multiple sessions improves long-term retention by up to 200%.",
    "Active recall (testing yourself) is proven to be more effective than passive re-reading.",
    "The Feynman Technique: explain a concept in simple terms to uncover gaps in your knowledge.",
    "Short, focused study sessions beat marathon cramming every time.",
    "Writing notes by hand engages deeper cognitive processing than typing.",
    "Sleep consolidates memories — a good night's rest before an exam beats late-night cramming.",
    "Interleaving subjects (switching topics) creates stronger, more flexible memory traces.",
    "Mind-mapping activates both hemispheres, improving conceptual understanding.",
  ];

  function init() {
    const el = document.getElementById('current-date');
    if (el) el.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric'
    });

    const tipEl = document.getElementById('ai-tip');
    if (tipEl) tipEl.textContent = tips[Math.floor(Math.random() * tips.length)];

    updateStats();
  }

  function updateStats() {
    const s = AppState.stats;
    setText('stat-streak',  s.streak);
    setText('stat-focus',   s.focusHours);
    setText('stat-quizzes', s.quizzesDone);
    setText('stat-notes',   s.notesCreated);
  }

  function incrementStat(key, amount = 1) {
    if (key in AppState.stats) {
      AppState.stats[key] += amount;
      updateStats();
    }
  }

  return { init, updateStats, incrementStat };
})();


/* ========================
   MODULE: Notes Generator
   ======================== */
const NotesGenerator = (() => {

  async function callAI(topic, level, focus) {
    const response = await fetch(`${API_BASE_URL}/generate-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, level, focus })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Server error ${response.status}`);
    }

    const data = await response.json();
    console.log('Notes data:', data);
    return data;
  }

  function renderExplanation(text) {
    return `<p>${text}</p>`;
  }

  function renderKeyPoints(points) {
    const items = points.map(p => `<li>${p}</li>`).join('');
    return `<ul>${items}</ul>`;
  }

  function renderConcepts(concepts) {
    return concepts.map((c, i) => `
      <div class="concept-stage">
        <div class="concept-num">${String(i + 1).padStart(2, '0')}</div>
        <div class="concept-text">
          <strong>${c.name}</strong>
          ${c.detail}
        </div>
      </div>`).join('');
  }

  function renderApplications(apps) {
    const cards = apps.map(a => `
      <div class="app-card">
        <div class="app-card-icon">${a.icon || '⚡'}</div>
        <div class="app-card-title">${a.title}</div>
        <div class="app-card-text">${a.text}</div>
      </div>`).join('');
    return `<div class="app-grid">${cards}</div>`;
  }

  function renderSummary(text) {
    return `<div class="summary-box">${text}</div>`;
  }

  function renderMeta(level, focus, topic) {
    const chips = [
      { label: level },
      { label: focus },
      { label: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
    ];
    return chips.map(c => `<span class="notes-meta-chip">${c.label}</span>`).join('');
  }

  function render(topic, level, focus, data) {
    setText('notes-title-display', data.title || topic);
    setHTML('notes-meta',             renderMeta(level, focus, topic));
    setHTML('note-explanation-body',  renderExplanation(data.explanation));
    setHTML('note-keypoints-body',    renderKeyPoints(data.keyPoints || []));
    setHTML('note-concepts-body',     renderConcepts(data.concepts || []));
    setHTML('note-applications-body', renderApplications(data.applications || []));
    setHTML('note-summary-body',      renderSummary(data.summary));
    show('notes-output');
  }

  function buildPlainText(data, topic) {
    const kp = (data.keyPoints    || []).map((p, i) => `  ${i + 1}. ${p}`).join('\n');
    const co = (data.concepts     || []).map((c, i) => `  ${i + 1}. ${c.name}: ${c.detail}`).join('\n');
    const ap = (data.applications || []).map(a => `  • ${a.title}: ${a.text}`).join('\n');
    return [
      `=== ${data.title || topic} ===`,
      '', '── Explanation ──',              data.explanation,
      '', '── Key Points ──',               kp,
      '', '── Important Concepts & Stages ──', co,
      '', '── Real-world Applications ──',  ap,
      '', '── Summary ──',                  data.summary,
    ].join('\n');
  }

  let lastData  = null;
  let lastTopic = '';

  function init() {
    const btn      = document.getElementById('generate-notes-btn');
    const copyBtn  = document.getElementById('copy-notes-btn');
    const printBtn = document.getElementById('print-notes-btn');
    const clearBtn = document.getElementById('clear-notes-btn');

    btn?.addEventListener('click', async () => {
      const topic = val('notes-topic').trim();
      const level = val('notes-level');
      const focus = val('notes-focus');
      if (!topic) { toast('⚠️ Please enter a topic first.'); return; }

      hide('notes-output');
      show('notes-loading');
      btn.disabled = true;

      try {
        const data = await callAI(topic, level, focus);
        lastData  = data;
        lastTopic = topic;
        render(topic, level, focus, data);
        Dashboard.incrementStat('notesCreated');
        toast('✅ Notes generated successfully!');
      } catch (err) {
        toast(`❌ ${err.message || 'Error generating notes. Please try again.'}`);
        console.error('Notes API error:', err);
      } finally {
        hide('notes-loading');
        btn.disabled = false;
      }
    });

    document.getElementById('notes-topic')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') btn?.click();
    });

    copyBtn?.addEventListener('click', () => {
      if (!lastData) return;
      navigator.clipboard.writeText(buildPlainText(lastData, lastTopic))
        .then(() => toast('📋 Notes copied to clipboard!'));
    });

    printBtn?.addEventListener('click', () => {
      if (!lastData) { toast('Generate notes first.'); return; }
      window.print();
    });

    clearBtn?.addEventListener('click', () => {
      hide('notes-output');
      lastData = null; lastTopic = '';
      document.getElementById('notes-topic').value = '';
      toast('🗑️ Notes cleared.');
    });
  }

  return { init };
})();


/* ========================
   MODULE: Quiz Generator
   ======================== */
const QuizGenerator = (() => {
  let currentQuiz = [];
  let userAnswers = {};

  async function callAI(topic, difficulty) {
    const response = await fetch(`${API_BASE_URL}/generate-quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, difficulty })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${response.status}`);
    }

    const questions = await response.json();
    console.log('Quiz data:', questions);
    return questions;
  }

  function renderQuiz(topic, questions) {
    currentQuiz = questions;
    userAnswers = {};

    setText('quiz-topic-display', `Topic: ${topic}`);
    setProgressBar(20);

    const container = document.getElementById('quiz-questions-list');
    container.innerHTML = '';

    questions.forEach((q, qi) => {
      const card = document.createElement('div');
      card.className = 'question-card';
      card.innerHTML = `
        <div class="question-num">Question ${qi + 1} of ${questions.length}</div>
        <p class="question-text">${q.question}</p>
        <ul class="options-list" id="options-${qi}">
          ${q.options.map((opt, oi) => `
            <li class="option-item" data-q="${qi}" data-o="${oi}">
              <span class="option-letter">${String.fromCharCode(65 + oi)}</span>
              ${opt.slice(3)}
            </li>
          `).join('')}
        </ul>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.option-item').forEach(item => {
      item.addEventListener('click', () => {
        const qi = +item.dataset.q;
        const oi = +item.dataset.o;

        document.querySelectorAll(`#options-${qi} .option-item`).forEach(el => {
          el.classList.remove('selected');
        });
        item.classList.add('selected');
        userAnswers[qi] = oi;

        const answered = Object.keys(userAnswers).length;
        setProgressBar(Math.round((answered / questions.length) * 100));
        setText('quiz-progress-text', `Question ${Math.min(answered + 1, questions.length)} of ${questions.length}`);
      });
    });

    show('quiz-container');
  }

  function submitQuiz() {
    let score = 0;
    const breakdownEl = document.getElementById('result-breakdown');
    breakdownEl.innerHTML = '';

    currentQuiz.forEach((q, qi) => {
      const selected  = userAnswers[qi];
      const correct   = q.correct;
      const isCorrect = selected === correct;
      if (isCorrect) score++;

      const items = document.querySelectorAll(`#options-${qi} .option-item`);
      items.forEach((item, oi) => {
        if (oi === correct) item.classList.add('correct');
        else if (oi === selected && !isCorrect) item.classList.add('incorrect');
      });

      const bd = document.createElement('div');
      bd.className = 'breakdown-item';
      bd.innerHTML = `
        <span class="breakdown-icon">${isCorrect ? '✅' : '❌'}</span>
        <span>Q${qi + 1}: ${isCorrect ? 'Correct' : `Wrong — correct answer was: ${q.options[correct].slice(3)}`}</span>
      `;
      breakdownEl.appendChild(bd);
    });

    const pct = (score / currentQuiz.length) * 100;
    const messages = [
      { min: 80, msg: 'Outstanding!',    sub: 'You have a strong grasp of this topic. Keep it up!' },
      { min: 60, msg: 'Good Work!',      sub: 'Solid effort! Review the questions you missed.' },
      { min: 40, msg: 'Keep Going!',     sub: "You're getting there. More practice will help." },
      { min: 0,  msg: 'Need More Study', sub: "Don't give up! Use the Notes Generator to review." },
    ];

    const msg = messages.find(m => pct >= m.min);

    setText('result-score-num', score);
    setText('result-message',   msg.msg);
    setText('result-sub',       msg.sub);

    hide('quiz-container');
    show('quiz-results');

    Dashboard.incrementStat('quizzesDone');
    toast(`Quiz complete! Score: ${score}/5`);
  }

  function init() {
    const genBtn    = document.getElementById('generate-quiz-btn');
    const submitBtn = document.getElementById('submit-quiz-btn');
    const retakeBtn = document.getElementById('retake-quiz-btn');

    genBtn?.addEventListener('click', async () => {
      const topic = val('quiz-topic').trim();
      const diff  = val('quiz-difficulty');

      if (!topic) { toast('Please enter a quiz topic.'); return; }

      hide('quiz-container');
      hide('quiz-results');
      show('quiz-loading');
      genBtn.disabled = true;

      try {
        const questions = await callAI(topic, diff);
        renderQuiz(topic, questions);
        toast('Quiz ready! Answer all 5 questions.');
      } catch (err) {
        toast('Error generating quiz. Please try again.');
        console.error(err);
      } finally {
        hide('quiz-loading');
        genBtn.disabled = false;
      }
    });

    submitBtn?.addEventListener('click', () => {
      if (Object.keys(userAnswers).length < currentQuiz.length) {
        toast(`Please answer all ${currentQuiz.length} questions first.`);
        return;
      }
      submitQuiz();
    });

    retakeBtn?.addEventListener('click', () => {
      hide('quiz-results');
      hide('quiz-container');
      userAnswers = {};
      document.getElementById('quiz-questions-list').innerHTML = '';
      document.getElementById('quiz-topic').value = '';
      toast('Ready for a new quiz!');
    });
  }

  function setProgressBar(pct) {
    const bar = document.getElementById('quiz-progress-bar');
    if (bar) bar.style.width = `${pct}%`;
  }

  return { init };
})();


/* ========================
   MODULE: Study Planner
   ======================== */
const StudyPlanner = (() => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  function generateSchedule(subjects, hoursPerDay, examDate) {
    const schedule = [];
    let subjectIdx = 0;

    days.forEach((day, i) => {
      const isWeekend = i >= 5;
      const dayHours  = isWeekend ? Math.max(1, hoursPerDay - 1) : hoursPerDay;

      if (subjects.length === 0) return;

      const morning   = [];
      const afternoon = [];
      const evening   = [];

      if (dayHours >= 2) { morning.push(subjects[subjectIdx % subjects.length]);   subjectIdx++; }
      if (dayHours >= 4) { afternoon.push(subjects[subjectIdx % subjects.length]); subjectIdx++; }
      if (dayHours >= 6) { evening.push(subjects[subjectIdx % subjects.length]);   subjectIdx++; }
      if (dayHours < 2)  { morning.push(subjects[subjectIdx % subjects.length]);   subjectIdx++; }

      schedule.push({ day, morning, afternoon, evening, hours: dayHours });
    });

    return schedule;
  }

  function renderSchedule(schedule, subjects, examDate, hoursPerDay) {
    const daysUntil = examDate
      ? Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    const summary = document.getElementById('planner-summary');
    summary.innerHTML = `
      <strong>📋 Study Plan Generated</strong><br>
      Subjects: <strong>${subjects.join(', ')}</strong> &nbsp;|&nbsp;
      Hours/day: <strong>${hoursPerDay}</strong> &nbsp;|&nbsp;
      ${daysUntil !== null ? `Days until exam: <strong>${Math.max(0, daysUntil)} days</strong>` : ''}
    `;

    const tbody = document.getElementById('schedule-tbody');
    tbody.innerHTML = '';

    schedule.forEach(row => {
      const tr = document.createElement('tr');
      const makeCell = (subjects) => subjects.length
        ? subjects.map(s => `<span class="subject-chip">${s}</span>`).join(' ')
        : '<span style="color:var(--text-muted);font-size:12px">—</span>';

      tr.innerHTML = `
        <td class="day-cell">${row.day}</td>
        <td>${makeCell(row.morning)}</td>
        <td>${makeCell(row.afternoon)}</td>
        <td>${makeCell(row.evening)}</td>
        <td class="hours-cell">${row.hours}h</td>
      `;
      tbody.appendChild(tr);
    });

    const tipsData = [
      { icon: 'fa-rotate',   title: 'Rotate Subjects', text: 'Switch between subjects every 45–60 min to prevent fatigue and improve retention.' },
      { icon: 'fa-dumbbell', title: 'Practice Daily',  text: 'Solve past papers or quiz yourself each evening to reinforce what you studied.' },
      { icon: 'fa-moon',     title: 'Rest Matters',    text: 'Ensure 7–8 hours of sleep. Memory consolidation happens during deep sleep.' },
    ];

    const tipsEl = document.getElementById('planner-tips');
    tipsEl.innerHTML = tipsData.map(t => `
      <div class="tip-card">
        <i class="fa-solid ${t.icon}"></i>
        <strong>${t.title}</strong>
        <p style="margin-top:6px;font-size:12px">${t.text}</p>
      </div>
    `).join('');

    show('planner-output');
  }

  function init() {
    const dateInput = document.getElementById('exam-date');
    if (dateInput) {
      dateInput.min = new Date().toISOString().split('T')[0];
    }

    document.getElementById('generate-plan-btn')?.addEventListener('click', () => {
      const examDate    = val('exam-date');
      const hoursPerDay = parseInt(val('study-hours')) || 4;
      const subjectsRaw = val('subjects-input').trim();

      if (!subjectsRaw) { toast('Please enter at least one subject.'); return; }

      const subjects = subjectsRaw.split(',').map(s => s.trim()).filter(Boolean);
      if (subjects.length === 0) { toast('Enter valid subject names.'); return; }

      const schedule = generateSchedule(subjects, hoursPerDay, examDate);
      renderSchedule(schedule, subjects, examDate, hoursPerDay);
      toast('Study schedule generated!');
    });
  }

  return { init };
})();


/* ========================
   MODULE: Pomodoro Timer
   ======================== */
const FocusTimer = (() => {
  let timerInterval  = null;
  let isRunning      = false;
  let currentMode    = 'focus';
  let timeLeft       = 25 * 60;
  let totalTime      = 25 * 60;
  let sessionsToday  = 0;
  let totalSessions  = 0;
  let minutesFocused = 0;
  let focusDuration  = 25;
  let breakDuration  = 5;
  let longDuration   = 15;

  const CIRCUMFERENCE = 2 * Math.PI * 88;

  function updateRing() {
    const fill = document.getElementById('timer-ring-fill');
    if (!fill) return;
    const progress = timeLeft / totalTime;
    const offset   = CIRCUMFERENCE * (1 - progress);
    fill.style.strokeDasharray  = CIRCUMFERENCE;
    fill.style.strokeDashoffset = offset;
  }

  function updateDisplay() {
    const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const secs = String(timeLeft % 60).padStart(2, '0');
    setText('timer-time', `${mins}:${secs}`);
    const modeLabels = { focus: 'Focus Session', break: 'Short Break', long: 'Long Break' };
    setText('timer-mode-label', modeLabels[currentMode]);
    updateRing();
  }

  function switchMode(mode) {
    currentMode = mode;
    clearInterval(timerInterval);
    isRunning = false;
    updatePlayIcon();
    const durations = {
      focus: focusDuration * 60,
      break: breakDuration * 60,
      long:  longDuration  * 60,
    };
    timeLeft  = durations[mode];
    totalTime = durations[mode];
    document.querySelectorAll('.mode-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.mode === mode);
    });
    updateDisplay();
  }

  function startTimer() {
    if (isRunning) return;
    isRunning = true;
    updatePlayIcon();
    const task = val('task-input').trim();
    const taskDisplay = document.getElementById('focus-task-display');
    if (task && taskDisplay) {
      taskDisplay.textContent = `🎯 ${task}`;
      taskDisplay.style.display = 'block';
    }
    timerInterval = setInterval(() => {
      timeLeft--;
      updateDisplay();
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        isRunning = false;
        onTimerComplete();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (!isRunning) return;
    clearInterval(timerInterval);
    isRunning = false;
    updatePlayIcon();
    toast('Timer paused.');
  }

  function resetTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    updatePlayIcon();
    switchMode(currentMode);
    toast('Timer reset.');
  }

  function skipTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    const next = currentMode === 'focus'
      ? (sessionsToday > 0 && sessionsToday % 4 === 0 ? 'long' : 'break')
      : 'focus';
    switchMode(next);
    toast(`Switched to ${next === 'focus' ? 'Focus' : next === 'break' ? 'Short Break' : 'Long Break'}.`);
  }

  function onTimerComplete() {
    if (currentMode === 'focus') {
      sessionsToday++;
      totalSessions++;
      minutesFocused += focusDuration;
      AppState.stats.focusHours = +(minutesFocused / 60).toFixed(1);
      Dashboard.updateStats();
      updateSessionDots();
      updateFocusStats();
      toast(`✅ Focus session complete! Take a ${sessionsToday % 4 === 0 ? 'long' : 'short'} break.`);
      playBeep();
      const next = sessionsToday % 4 === 0 ? 'long' : 'break';
      setTimeout(() => switchMode(next), 1000);
    } else {
      toast('⏰ Break over! Time to focus.');
      playBeep();
      setTimeout(() => switchMode('focus'), 1000);
    }
  }

  function updatePlayIcon() {
    const icon = document.getElementById('timer-play-icon');
    if (icon) icon.className = isRunning ? 'fa-solid fa-pause' : 'fa-solid fa-play';
  }

  function updateSessionDots() {
    const dots = document.querySelectorAll('.session-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('completed', i < sessionsToday % 4);
      dot.classList.toggle('active', i === sessionsToday % 4 && isRunning);
    });
    setText('session-count', `${sessionsToday % 4} / 4`);
  }

  function updateFocusStats() {
    setText('today-sessions', sessionsToday);
    setText('today-minutes',  minutesFocused);
    setText('total-sessions', totalSessions);
  }

  function playBeep() {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch (_) {}
  }

  function makeAdjuster(valueId, stateKey, min, max) {
    document.getElementById(`${stateKey}-minus`)?.addEventListener('click', () => {
      const cur  = stateKey === 'focus' ? focusDuration : stateKey === 'break' ? breakDuration : longDuration;
      const next = Math.max(min, cur - 1);
      if (stateKey === 'focus') focusDuration = next;
      if (stateKey === 'break') breakDuration = next;
      if (stateKey === 'long')  longDuration  = next;
      setText(valueId, next);
      if (currentMode === stateKey) switchMode(currentMode);
    });
    document.getElementById(`${stateKey}-plus`)?.addEventListener('click', () => {
      const cur  = stateKey === 'focus' ? focusDuration : stateKey === 'break' ? breakDuration : longDuration;
      const next = Math.min(max, cur + 1);
      if (stateKey === 'focus') focusDuration = next;
      if (stateKey === 'break') breakDuration = next;
      if (stateKey === 'long')  longDuration  = next;
      setText(valueId, next);
      if (currentMode === stateKey) switchMode(currentMode);
    });
  }

  function init() {
    const svg = document.querySelector('.timer-ring');
    if (svg) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = `
        <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="#00e5ff"/>
          <stop offset="100%" stop-color="#8b5cf6"/>
        </linearGradient>
      `;
      svg.prepend(defs);
      const fill = document.getElementById('timer-ring-fill');
      if (fill) fill.setAttribute('stroke', 'url(#ring-gradient)');
    }

    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (!isRunning) switchMode(tab.dataset.mode);
        else toast('Stop the timer first to change mode.');
      });
    });

    document.getElementById('timer-start')?.addEventListener('click', () => {
      isRunning ? pauseTimer() : startTimer();
    });
    document.getElementById('timer-reset')?.addEventListener('click', resetTimer);
    document.getElementById('timer-skip')?.addEventListener('click',  skipTimer);

    makeAdjuster('focus-duration-val', 'focus', 5, 60);
    makeAdjuster('break-duration-val', 'break', 1, 30);
    makeAdjuster('long-duration-val',  'long',  5, 60);

    document.getElementById('task-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const task = e.target.value.trim();
        if (task) toast(`Task set: "${task}"`);
      }
    });

    updateDisplay();
    updateFocusStats();
  }

  return { init };
})();


/* ========================
   UTILITIES
   ======================== */
function val(id)          { return document.getElementById(id)?.value || ''; }
function setText(id, txt) { const e = document.getElementById(id); if (e) e.textContent = txt; }
function setHTML(id, html) { const e = document.getElementById(id); if (e) e.innerHTML = html; }
function show(id)  { const e = document.getElementById(id); if (e) e.classList.remove('hidden'); }
function hide(id)  { const e = document.getElementById(id); if (e) e.classList.add('hidden'); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

let toastTimeout;
function toast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  clearTimeout(toastTimeout);
  const el = document.createElement('div');
  el.className   = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  toastTimeout = setTimeout(() => {
    el.style.opacity   = '0';
    el.style.transform = 'translateX(30px)';
    el.style.transition = 'all 0.3s';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}


/* ========================
   MODULE: Particle Canvas
   ======================== */
const ParticleSystem = (() => {
  function init() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function rand(min, max) { return Math.random() * (max - min) + min; }

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x     = rand(0, W);
        this.y     = rand(0, H);
        this.vx    = rand(-0.15, 0.15);
        this.vy    = rand(-0.25, -0.05);
        this.r     = rand(0.5, 2);
        this.alpha = rand(0.2, 0.7);
        this.life  = rand(0.003, 0.006);
        this.fade  = this.alpha;
        const c = Math.random();
        if      (c < 0.5)  this.color = 'rgba(0,229,255,';
        else if (c < 0.75) this.color = 'rgba(139,92,246,';
        else               this.color = 'rgba(244,114,182,';
      }
      update() {
        this.x += this.vx; this.y += this.vy;
        this.fade -= this.life;
        if (this.fade <= 0 || this.y < -10) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color + this.fade + ')';
        ctx.fill();
      }
    }

    for (let i = 0; i < 120; i++) particles.push(new Particle());

    function loop() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => { p.update(); p.draw(); });
      requestAnimationFrame(loop);
    }
    loop();
  }
  return { init };
})();


/* ========================
   APP INIT
   ======================== */
document.addEventListener('DOMContentLoaded', () => {
  ParticleSystem.init();
  Dashboard.init();
  NotesGenerator.init();
  QuizGenerator.init();
  StudyPlanner.init();
  FocusTimer.init();

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const shortcuts = { '1': 'dashboard', '2': 'notes', '3': 'quiz', '4': 'planner', '5': 'focus' };
    if (shortcuts[e.key]) Navigation.navigate(shortcuts[e.key]);
  });

  console.log('%c🧠 AI Study Companion Loaded', 'color:#00e5ff;font-family:monospace;font-size:16px;font-weight:bold');
  console.log('%c⚡ API Target: ' + API_BASE_URL, 'color:#8b5cf6;font-family:monospace');
});
