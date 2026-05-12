// ─────────────────────────────────────────────
//  MORTIS v2.5 — Main Application Logic
//  Handles: page navigation, question flow,
//  follow-up questions, AI API calls,
//  results rendering, localStorage, sharing,
//  personality archetypes
// ─────────────────────────────────────────────

// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
const State = {
  nickname: '',
  currentPage: 'landing',
  currentQuestion: 0,
  answers: [],
  followupAnswers: [],
  followupQuestions: [],
  result: null,
};

// ══════════════════════════════════════════════
//  QUESTION DEFINITIONS — Emotionally Intelligent
// ══════════════════════════════════════════════
const QUESTIONS = [
  {
    id: 'age',
    text: 'How old are you?',
    hint: 'The oracle requires a starting point.',
    type: 'slider',
    min: 16, max: 90, step: 1, defaultVal: 28,
    labelMin: '16', labelMax: '90+',
    format: v => `${v} years old`,
  },
  {
    id: 'sleep',
    text: 'How many hours of sleep do you actually get most nights?',
    hint: 'Not how many you want. How many you get.',
    type: 'slider',
    min: 2, max: 12, step: 0.5, defaultVal: 6.5,
    labelMin: '2h', labelMax: '12h',
    format: v => `${v} hours`,
  },
  {
    id: 'awake',
    text: 'What usually keeps you awake longer than it should?',
    hint: 'The things that steal your rest reveal more than you think.',
    type: 'textarea',
    placeholder: 'Thoughts, screens, worries, habits, scrolling, nothing specific...',
  },
  {
    id: 'energy_drain',
    text: 'What part of your day drains the most energy from you?',
    hint: 'Not what takes the most time — what takes the most from you.',
    type: 'textarea',
    placeholder: 'Work, social interaction, commute, existing, a specific person...',
  },
  {
    id: 'exercise',
    text: 'How often does your body actually move with purpose?',
    hint: 'Walking, gym, sports, yoga — any deliberate physical effort.',
    type: 'choices',
    options: [
      'Rarely or never',
      '1–2 times per week',
      '3–4 times per week',
      'Almost every day',
    ],
  },
  {
    id: 'evening',
    text: 'Describe your average evening after your obligations end.',
    hint: 'What does the unwatched version of you look like?',
    type: 'textarea',
    placeholder: 'What you eat, what you do, how late you stay up, how you wind down...',
  },
  {
    id: 'substance',
    text: 'What substances do you regularly put into your body?',
    hint: 'Caffeine, alcohol, nicotine, medications, processed food — all count.',
    type: 'choices',
    options: [
      'Nothing notable — clean habits',
      'Caffeine and occasional drinks',
      'Regular alcohol or heavy caffeine dependency',
      'I smoke, vape, or use substances frequently',
    ],
  },
  {
    id: 'exhaustion',
    text: 'How often do you continue functioning while mentally exhausted?',
    hint: 'Pushing through is not the same as being okay.',
    type: 'textarea',
    placeholder: 'Every day, sometimes, only during deadlines, I don\'t notice anymore...',
  },
  {
    id: 'harmful_habit',
    text: 'What habit do you think silently affects your health the most?',
    hint: 'The one you already know about but haven\'t changed.',
    type: 'textarea',
    placeholder: 'Be honest — the oracle already suspects what it is...',
  },
  {
    id: 'hidden',
    text: 'If the oracle could see one truth about your life you hide from others — what would it find?',
    hint: 'This answer stays between you and the machine.',
    type: 'textarea',
    placeholder: 'The thing beneath the surface...',
  },
];

// ══════════════════════════════════════════════
//  PAGE NAVIGATION
// ══════════════════════════════════════════════
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pageId}`);
  if (target) {
    target.classList.add('active');
    target.scrollTop = 0;
  }
  State.currentPage = pageId;
  MortisAudio.playTransition();
}

// ══════════════════════════════════════════════
//  LANDING PAGE
// ══════════════════════════════════════════════
document.getElementById('btn-begin').addEventListener('click', () => {
  const saved = localStorage.getItem('mortis_result');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data && data.result) {
        const resume = confirm('A previous examination result was found. Would you like to view it?\n\nClick OK to restore, or Cancel to start fresh.');
        if (resume) {
          State.nickname = data.nickname || '';
          State.result = data.result;
          MortisAudio.startAmbience();
          MortisAudio.playClick();
          renderResults(data.result, data.nickname);
          showPage('results');
          return;
        } else {
          localStorage.removeItem('mortis_result');
        }
      }
    } catch (e) { /* ignore */ }
  }
  MortisAudio.startAmbience();
  MortisAudio.playClick();
  showPage('terms');
});

// ══════════════════════════════════════════════
//  TERMS PAGE
// ══════════════════════════════════════════════
const termsCheckbox = document.getElementById('terms-checkbox');
const btnTermsContinue = document.getElementById('btn-terms-continue');

termsCheckbox.addEventListener('change', () => {
  btnTermsContinue.disabled = !termsCheckbox.checked;
  MortisAudio.playClick();
});

btnTermsContinue.addEventListener('click', () => {
  if (!termsCheckbox.checked) return;
  MortisAudio.playClick();
  showPage('nickname');
});

// ══════════════════════════════════════════════
//  NICKNAME PAGE
// ══════════════════════════════════════════════
document.getElementById('btn-nickname-continue').addEventListener('click', () => {
  const val = document.getElementById('nickname-input').value.trim();
  State.nickname = val || 'Unknown';
  MortisAudio.playClick();
  State.currentQuestion = 0;
  State.answers = [];
  renderQuestion(0);
  showPage('exam');
});

document.getElementById('nickname-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btn-nickname-continue').click();
});

// ══════════════════════════════════════════════
//  EXAMINATION — QUESTION RENDERING
// ══════════════════════════════════════════════
function renderQuestion(index) {
  const q = QUESTIONS[index];
  const card = document.getElementById('question-card');
  const total = QUESTIONS.length;

  const pct = ((index) / total) * 100;
  document.getElementById('progress-fill').style.width = `${pct}%`;
  document.getElementById('progress-label').textContent = `Question ${index + 1} of ${total}`;
  document.getElementById('q-number').textContent = String(index + 1).padStart(2, '0');
  document.getElementById('q-text').textContent = q.text;
  document.getElementById('q-hint').textContent = q.hint || '';

  document.getElementById('btn-q-back').style.visibility = index === 0 ? 'hidden' : 'visible';

  const isLast = index === total - 1;
  document.getElementById('btn-q-next-label').textContent = isLast ? 'Complete Examination' : 'Continue';

  const prevAnswer = State.answers[index]?.rawValue;
  const zone = document.getElementById('answer-zone');
  zone.innerHTML = '';

  if (q.type === 'slider') {
    const currentVal = prevAnswer !== undefined ? prevAnswer : q.defaultVal;
    zone.innerHTML = `
      <div class="slider-group">
        <div class="slider-value" id="slider-val">${q.format(currentVal)}</div>
        <input type="range" id="q-slider"
          min="${q.min}" max="${q.max}" step="${q.step}"
          value="${currentVal}" />
        <div class="slider-labels"><span>${q.labelMin}</span><span>${q.labelMax}</span></div>
      </div>`;
    const slider = document.getElementById('q-slider');
    const display = document.getElementById('slider-val');
    slider.addEventListener('input', () => {
      display.textContent = q.format(parseFloat(slider.value));
    });
  }

  else if (q.type === 'choices') {
    const grid = document.createElement('div');
    grid.className = 'choice-grid';
    q.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn' + (prevAnswer === opt ? ' selected' : '');
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        MortisAudio.playClick();
      });
      grid.appendChild(btn);
    });
    zone.appendChild(grid);
  }

  else if (q.type === 'textarea') {
    const ta = document.createElement('textarea');
    ta.placeholder = q.placeholder || 'Your answer...';
    ta.value = prevAnswer || '';
    ta.rows = 4;
    zone.appendChild(ta);
  }

  card.classList.remove('q-enter', 'q-exit');
  void card.offsetWidth;
  card.classList.add('q-enter');
}

// ── Get current answer value ──────────────────
function getCurrentAnswer() {
  const q = QUESTIONS[State.currentQuestion];
  const zone = document.getElementById('answer-zone');

  if (q.type === 'slider') {
    const slider = document.getElementById('q-slider');
    const val = parseFloat(slider.value);
    return { answer: q.format(val), rawValue: val };
  }

  if (q.type === 'choices') {
    const selected = zone.querySelector('.choice-btn.selected');
    if (!selected) return null;
    return { answer: selected.textContent, rawValue: selected.textContent };
  }

  if (q.type === 'textarea') {
    const ta = zone.querySelector('textarea');
    const val = ta.value.trim();
    if (!val) return null;
    return { answer: val, rawValue: val };
  }

  return null;
}

// ── Navigation ────────────────────────────────
document.getElementById('btn-q-next').addEventListener('click', async () => {
  const answer = getCurrentAnswer();
  if (!answer) {
    shakeCard();
    return;
  }

  MortisAudio.playClick();

  State.answers[State.currentQuestion] = {
    id: QUESTIONS[State.currentQuestion].id,
    question: QUESTIONS[State.currentQuestion].text,
    answer: answer.answer,
    rawValue: answer.rawValue,
  };

  const isLast = State.currentQuestion === QUESTIONS.length - 1;

  if (isLast) {
    await loadFollowupQuestions();
  } else {
    const card = document.getElementById('question-card');
    card.classList.add('q-exit');
    setTimeout(() => {
      State.currentQuestion++;
      renderQuestion(State.currentQuestion);
    }, 340);
  }
});

document.getElementById('btn-q-back').addEventListener('click', () => {
  if (State.currentQuestion === 0) return;
  MortisAudio.playClick();
  const card = document.getElementById('question-card');
  card.classList.add('q-exit');
  setTimeout(() => {
    State.currentQuestion--;
    renderQuestion(State.currentQuestion);
  }, 340);
});

function shakeCard() {
  const card = document.getElementById('question-card');
  card.style.animation = 'none';
  card.style.transform = 'translateX(-8px)';
  setTimeout(() => { card.style.transform = 'translateX(8px)'; }, 80);
  setTimeout(() => { card.style.transform = 'translateX(-5px)'; }, 160);
  setTimeout(() => { card.style.transform = 'translateX(0)'; }, 240);
}

// ══════════════════════════════════════════════
//  FOLLOW-UP QUESTIONS
// ══════════════════════════════════════════════
async function loadFollowupQuestions() {
  showPage('followup');

  const zone = document.getElementById('followup-questions-zone');
  zone.innerHTML = '<p style="color:var(--ash);font-family:var(--font-data);font-size:0.8rem;letter-spacing:0.12em;">Analyzing behavioral patterns for deeper inquiry...</p>';

  try {
    const response = await fetch('/api/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: State.answers }),
    });

    const data = await response.json();
    if (!data.success || !data.questions) throw new Error('Failed');

    State.followupQuestions = data.questions;
    renderFollowupQuestions(data.questions);

  } catch (err) {
    console.error('Follow-up error:', err);
    zone.innerHTML = `
      <div class="followup-question">
        <p class="followup-q-label">Is there anything about your lifestyle you feel the previous questions didn't capture?</p>
        <textarea id="fu-fallback" placeholder="Any additional context..." style="width:100%;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:6px;color:var(--white);font-family:var(--font-display);font-size:1rem;padding:14px;outline:none;min-height:80px;resize:none;"></textarea>
      </div>`;
    State.followupQuestions = [{ id: 'fallback', question: 'Is there anything about your lifestyle you feel the previous questions didn\'t capture?' }];
  }
}

function renderFollowupQuestions(questions) {
  const zone = document.getElementById('followup-questions-zone');
  zone.innerHTML = '';

  questions.forEach((q) => {
    const div = document.createElement('div');
    div.className = 'followup-question';
    div.dataset.qid = q.id;

    const label = document.createElement('p');
    label.className = 'followup-q-label';
    label.textContent = q.question;
    div.appendChild(label);

    if (q.type === 'select' && q.options) {
      const select = document.createElement('select');
      select.innerHTML = '<option value="" disabled selected>Select an answer...</option>';
      q.options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
      });
      div.appendChild(select);
    } else {
      const ta = document.createElement('textarea');
      ta.placeholder = q.placeholder || 'Be honest with yourself...';
      ta.rows = 3;
      div.appendChild(ta);
    }

    zone.appendChild(div);
  });
}

document.getElementById('btn-followup-submit').addEventListener('click', () => {
  MortisAudio.playClick();

  const zone = document.getElementById('followup-questions-zone');
  State.followupAnswers = [];

  State.followupQuestions.forEach((q, i) => {
    const div = zone.querySelectorAll('.followup-question')[i];
    if (!div) return;

    const ta = div.querySelector('textarea');
    const select = div.querySelector('select');
    const val = ta ? ta.value.trim() : (select ? select.value : '');

    State.followupAnswers.push({
      question: q.question,
      answer: val || '(No answer provided)',
    });
  });

  startProcessing();
});

// ══════════════════════════════════════════════
//  AI PROCESSING
// ══════════════════════════════════════════════
const PROCESSING_MESSAGES = [
  'Initializing behavioral scan...',
  'Mapping sleep architecture patterns...',
  'Reviewing stress accumulation indicators...',
  'Analyzing recovery-to-damage ratios...',
  'Cross-referencing emotional signatures...',
  'Evaluating chronic exhaustion markers...',
  'Scanning for hidden behavioral loops...',
  'Measuring psychological resilience depth...',
  'Calculating trajectory deviation vectors...',
  'Processing substance impact coefficients...',
  'Analyzing evening deterioration patterns...',
  'Synthesizing risk probability matrix...',
  'Detecting personality archetype resonance...',
  'Generating psychological trajectory model...',
  'Compiling final lifespan projection...',
  'Finalizing trajectory analysis...',
];

async function startProcessing() {
  showPage('processing');
  MortisAudio.startProcessingPulse();

  let msgIndex = 0;
  let progress = 0;
  const msgEl = document.getElementById('proc-message');
  const progEl = document.getElementById('proc-progress');
  const startTime = Date.now();

  const msgInterval = setInterval(() => {
    msgEl.style.animation = 'none';
    void msgEl.offsetWidth;
    msgEl.style.animation = 'messageFade 0.5s ease both';
    msgEl.textContent = PROCESSING_MESSAGES[msgIndex % PROCESSING_MESSAGES.length];
    msgIndex++;
    progress = Math.min(progress + Math.random() * 8 + 3, 88);
    progEl.style.width = `${progress}%`;
  }, 1600);

  const allAnswers = [
    ...State.answers,
    ...State.followupAnswers,
  ];

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: allAnswers,
        nickname: State.nickname,
      }),
    });

    const data = await response.json();

    if (!data.success || !data.result) {
      throw new Error(data.error || 'Analysis failed');
    }

    // Ensure minimum 6 seconds of processing display
    const elapsed = Date.now() - startTime;
    const minDelay = Math.max(0, 6000 - elapsed);
    await sleep(minDelay);

    clearInterval(msgInterval);
    MortisAudio.stopProcessingPulse();
    progEl.style.width = '100%';
    msgEl.textContent = 'Trajectory analysis complete.';

    localStorage.setItem('mortis_result', JSON.stringify({
      result: data.result,
      nickname: State.nickname,
      timestamp: Date.now(),
    }));

    State.result = data.result;

    await sleep(800);
    MortisAudio.playReveal();
    renderResults(data.result, State.nickname);
    showPage('results');

  } catch (err) {
    clearInterval(msgInterval);
    MortisAudio.stopProcessingPulse();
    console.error('Analysis error:', err);
    document.getElementById('proc-message').textContent = 'Analysis encountered an error. Please retry.';
    progEl.style.width = '0%';
    setTimeout(() => {
      alert(`Error: ${err.message || 'Something went wrong. Please check your server and API key.'}`);
      showPage('followup');
    }, 1500);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ══════════════════════════════════════════════
//  RESULTS RENDERING
// ══════════════════════════════════════════════
function renderResults(result, nickname) {
  // Header
  document.getElementById('result-name').textContent = `SUBJECT: ${nickname || 'Unknown'}`;
  document.getElementById('result-death-date').textContent = result.projectedDeathDate || '—';
  document.getElementById('result-lifespan').textContent =
    `Estimated lifespan: ${result.estimatedLifespan || '—'} years`;

  // Archetype
  const archLabel = document.getElementById('archetype-label');
  const archDesc = document.getElementById('archetype-desc');
  if (result.archetype) {
    archLabel.textContent = result.archetype;
    archDesc.textContent = result.archetypeDescription || '';
  }

  // Stress meter
  const stress = result.stressScore || 0;
  const stressFill = document.getElementById('stress-fill');
  const stressColor = stress < 35 ? '#5a9080'
    : stress < 60 ? '#c8a96e'
    : stress < 80 ? '#c08840'
    : '#c05050';
  stressFill.style.background = `linear-gradient(90deg, ${stressColor}88, ${stressColor})`;
  setTimeout(() => { stressFill.style.width = `${stress}%`; }, 200);
  document.getElementById('stress-number').textContent = stress;
  document.getElementById('stress-label-display').textContent = result.stressLabel || '—';
  document.getElementById('stress-recovery-text').textContent = result.stressRecovery || '';

  // Analysis sections
  document.getElementById('emotional-text').textContent = result.emotionalAnalysis || '—';
  document.getElementById('behavioral-text').textContent = result.behavioralPatterns || '—';
  document.getElementById('lifestyle-text').textContent = result.lifestyleInterpretation || '—';
  document.getElementById('trajectory-text').textContent = result.trajectoryProjection || '—';

  // Risk factors
  const riskList = document.getElementById('risk-list');
  riskList.innerHTML = '';
  (result.riskFactors || []).forEach(r => {
    const li = document.createElement('li');
    li.textContent = r;
    riskList.appendChild(li);
  });

  // Positive factors
  const positiveList = document.getElementById('positive-list');
  positiveList.innerHTML = '';
  (result.positiveFactors || []).forEach(p => {
    const li = document.createElement('li');
    li.textContent = p;
    positiveList.appendChild(li);
  });

  // Improvement advice
  const adviceList = document.getElementById('advice-list');
  adviceList.innerHTML = '';
  (result.improvementSuggestions || result.improvementAdvice || []).forEach(a => {
    const li = document.createElement('li');
    li.textContent = a;
    adviceList.appendChild(li);
  });

  // Oracle observation
  document.getElementById('trajectory-phrase').textContent = result.trajectoryPhrase || '—';
  document.getElementById('ai-observation').textContent = result.finalObservation || '—';
  document.getElementById('archetype-insight').textContent = result.archetypeInsight || '';

  // Share card (minimal)
  document.getElementById('share-subject').textContent = `SUBJECT: ${nickname || 'Unknown'}`;
  document.getElementById('share-date').textContent = result.projectedDeathDate || '—';
  document.getElementById('share-stress').textContent = `${result.stressScore || '—'} — ${result.stressLabel || ''}`;
  document.getElementById('share-lifespan').textContent = `${result.estimatedLifespan || '—'} years`;
  document.getElementById('share-archetype').textContent = result.archetype || '—';
  document.getElementById('share-quote').textContent = result.trajectoryPhrase || '—';
}

// ══════════════════════════════════════════════
//  SOCIAL SHARING
// ══════════════════════════════════════════════
document.getElementById('btn-share').addEventListener('click', async () => {
  MortisAudio.playClick();

  const r = State.result;
  if (!r) return;

  const shareText = `MORTIS Trajectory Report\n\n` +
    `Subject: ${State.nickname || 'Unknown'}\n` +
    `Projected End: ${r.projectedDeathDate}\n` +
    `Estimated Lifespan: ${r.estimatedLifespan} years\n` +
    `Stress Index: ${r.stressScore}/100 (${r.stressLabel})\n` +
    `Archetype: ${r.archetype || '—'}\n\n` +
    `"${r.trajectoryPhrase}"\n\n` +
    `⚠ Fictional simulation — not medical advice\n` +
    `Take your own examination →`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'MORTIS — My Lifespan Trajectory',
        text: shareText,
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        fallbackCopy(shareText);
      }
    }
  } else {
    fallbackCopy(shareText);
  }
});

function fallbackCopy(text) {
  navigator.clipboard.writeText(text).then(() => {
    showCopyToast();
  }).catch(() => {
    // Final fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showCopyToast();
  });
}

function showCopyToast() {
  let toast = document.getElementById('copy-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'copy-toast';
    toast.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:rgba(200,169,110,0.15);border:1px solid rgba(200,169,110,0.3);color:#c8a96e;font-family:var(--font-data);font-size:11px;letter-spacing:0.14em;padding:12px 24px;border-radius:8px;backdrop-filter:blur(16px);z-index:999;transition:opacity 0.3s;text-transform:uppercase;';
    document.body.appendChild(toast);
  }
  toast.textContent = '✓ Copied to clipboard';
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ══════════════════════════════════════════════
//  DOWNLOAD CARD
// ══════════════════════════════════════════════
document.getElementById('btn-download-card').addEventListener('click', async () => {
  MortisAudio.playClick();
  const card = document.getElementById('share-card');

  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const canvas = await html2canvas(card, {
      backgroundColor: '#0f1018',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const link = document.createElement('a');
    link.download = `mortis-trajectory-${(State.nickname || 'unknown').toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.warn('html2canvas failed:', err);
    window.print();
  }
});

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ══════════════════════════════════════════════
//  RETAKE EXAMINATION
// ══════════════════════════════════════════════
document.getElementById('btn-retake').addEventListener('click', () => {
  MortisAudio.playClick();
  const confirm_ = confirm('Are you sure you want to retake the examination? Your current result will be cleared.');
  if (!confirm_) return;

  localStorage.removeItem('mortis_result');
  State.nickname = '';
  State.currentQuestion = 0;
  State.answers = [];
  State.followupAnswers = [];
  State.followupQuestions = [];
  State.result = null;

  document.getElementById('nickname-input').value = '';
  document.getElementById('terms-checkbox').checked = false;
  document.getElementById('btn-terms-continue').disabled = true;

  showPage('landing');
});

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('progress-fill').style.width = '0%';

  console.log('%c✦ MORTIS v2.5 — Fictional Lifespan Trajectory Simulator', 'color:#c8a96e;font-family:serif;font-size:14px;');
  console.log('%cThis is a fictional creative experience. Not medical advice.', 'color:#9a9589;font-size:11px;');
});
