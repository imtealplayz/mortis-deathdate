// ─────────────────────────────────────────────
//  MORTIS v2.5 — Express Backend
//  Lifespan scoring engine + Groq AI analysis
// ─────────────────────────────────────────────

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// ══════════════════════════════════════════════
//  LIFESPAN SCORING ENGINE
// ══════════════════════════════════════════════

const ARCHETYPES = [
  { id: 'sleepless', name: 'The Sleepless', desc: 'You trade rest for restlessness. The night knows you better than the morning.' },
  { id: 'observer', name: 'The Observer', desc: 'You watch everything, absorb everything, and carry it quietly.' },
  { id: 'survivor', name: 'The Survivor', desc: 'You endure what would break others, but endurance has a cost.' },
  { id: 'overthinker', name: 'The Overthinker', desc: 'Your mind never stops. Even when you rest, it runs.' },
  { id: 'drifter', name: 'The Drifter', desc: 'Structure evades you. You move through days without anchoring to any.' },
  { id: 'performer', name: 'The Performer', desc: 'You appear to thrive. Beneath the surface, exhaustion waits.' },
  { id: 'stoic', name: 'The Stoic', desc: 'You reveal little. The weight you carry is invisible to others.' },
  { id: 'burning_star', name: 'The Burning Star', desc: 'Brilliant intensity, unsustainable pace. You burn bright.' },
];

function detectArchetype(answers) {
  const scores = { sleepless: 0, observer: 0, survivor: 0, overthinker: 0, drifter: 0, performer: 0, stoic: 0, burning_star: 0 };
  const text = answers.map(a => (a.answer || '').toLowerCase()).join(' ');

  // Sleep-related
  const sleepVal = parseFloat(answers.find(a => a.id === 'sleep')?.rawValue) || 7;
  if (sleepVal <= 5) scores.sleepless += 3;
  else if (sleepVal <= 6) scores.sleepless += 1;

  // Awake question keywords
  const awakeAns = (answers.find(a => a.id === 'awake')?.answer || '').toLowerCase();
  if (/phone|scroll|screen|youtube|tiktok|reddit|game/i.test(awakeAns)) scores.sleepless += 2;
  if (/think|thought|worry|anxious|mind|brain/i.test(awakeAns)) scores.overthinker += 3;
  if (/nothing|idk|don.?t know/i.test(awakeAns)) scores.drifter += 2;

  // Energy drain question
  const drainAns = (answers.find(a => a.id === 'energy_drain')?.answer || '').toLowerCase();
  if (/people|social|talk|meeting|interact/i.test(drainAns)) scores.observer += 2;
  if (/work|job|grind|hustle|deadline/i.test(drainAns)) scores.performer += 2;
  if (/everything|exist|living|life itself/i.test(drainAns)) scores.survivor += 2;

  // Evening routine
  const eveningAns = (answers.find(a => a.id === 'evening')?.answer || '').toLowerCase();
  if (/no routine|random|whatever|varies|different/i.test(eveningAns)) scores.drifter += 3;
  if (/work|study|productive|code|project/i.test(eveningAns)) scores.burning_star += 2;
  if (/alone|quiet|silence|isolat/i.test(eveningAns)) scores.stoic += 2;

  // Mental exhaustion
  const exhaustAns = (answers.find(a => a.id === 'exhaustion')?.answer || '').toLowerCase();
  if (/always|every day|constant|all the time|daily/i.test(exhaustAns)) { scores.survivor += 2; scores.performer += 1; }
  if (/often|frequently|most days|usually/i.test(exhaustAns)) scores.performer += 2;
  if (/overthink|can.?t stop|spiral|loop/i.test(exhaustAns)) scores.overthinker += 2;

  // Harmful habit
  const habitAns = (answers.find(a => a.id === 'harmful_habit')?.answer || '').toLowerCase();
  if (/sleep|staying up|late night|insomnia/i.test(habitAns)) scores.sleepless += 2;
  if (/overthink|stress|worry|anxiety/i.test(habitAns)) scores.overthinker += 2;
  if (/nothing|fine|don.?t know|idk/i.test(habitAns)) scores.stoic += 2;

  // Hidden truth
  const hiddenAns = (answers.find(a => a.id === 'hidden')?.answer || '').toLowerCase();
  if (/tired|exhausted|burnt|burnout|broken/i.test(hiddenAns)) scores.survivor += 3;
  if (/lonely|alone|isolated|nobody/i.test(hiddenAns)) scores.observer += 2;
  if (/afraid|scared|anxious|panic/i.test(hiddenAns)) scores.overthinker += 2;
  if (/fine|okay|nothing|good/i.test(hiddenAns)) scores.stoic += 3;

  // Global text patterns
  if (/productive|efficient|achieve|accomplish/i.test(text)) scores.performer += 1;
  if (/intense|fast|push|hard|grind/i.test(text)) scores.burning_star += 1;

  // Find highest
  let maxScore = 0, archId = 'observer';
  for (const [key, val] of Object.entries(scores)) {
    if (val > maxScore) { maxScore = val; archId = key; }
  }
  return ARCHETYPES.find(a => a.id === archId) || ARCHETYPES[1];
}

function calculateLifespanScore(answers) {
  let score = 50; // Base score 0-100 (higher = healthier)

  // Age factor
  const age = parseFloat(answers.find(a => a.id === 'age')?.rawValue) || 28;

  // Sleep (weight: 15%)
  const sleep = parseFloat(answers.find(a => a.id === 'sleep')?.rawValue) || 7;
  if (sleep >= 7 && sleep <= 8.5) score += 12;
  else if (sleep >= 6 && sleep < 7) score += 5;
  else if (sleep >= 8.5 && sleep <= 9) score += 8;
  else if (sleep < 5) score -= 10;
  else if (sleep < 6) score -= 4;
  else if (sleep > 9) score -= 2;

  // Exercise (weight: 15%)
  const exercise = (answers.find(a => a.id === 'exercise')?.answer || '').toLowerCase();
  if (/almost every|daily|6|7/i.test(exercise)) score += 12;
  else if (/3.*4|regularly|often/i.test(exercise)) score += 8;
  else if (/1.*2|sometimes|occasionally/i.test(exercise)) score += 2;
  else score -= 8;

  // Substance use (weight: 15%)
  const substance = (answers.find(a => a.id === 'substance')?.answer || '').toLowerCase();
  if (/neither|don.?t|no|none/i.test(substance)) score += 10;
  else if (/social|occasional/i.test(substance)) score += 3;
  else if (/regular|heavy|frequent/i.test(substance)) score -= 8;
  else if (/smoke|cigarette|vape/i.test(substance)) score -= 12;

  // Stress inference from text answers (weight: 20%)
  const allText = answers.filter(a => a.id !== 'age' && a.id !== 'sleep').map(a => a.answer || '').join(' ').toLowerCase();
  const stressWords = (allText.match(/stress|anxi|exhaust|burn|overwhelm|drain|tired|insomnia|can.?t sleep|panic|depress|numb|hopeless|miserable|suffer|struggle/gi) || []).length;
  const positiveWords = (allText.match(/happy|calm|peace|relax|gratef|content|balanced|stable|joy|meditat|mindful|healthy|strong|energi/gi) || []).length;
  score += Math.min(positiveWords * 2, 10);
  score -= Math.min(stressWords * 2.5, 15);

  // Evening routine quality (weight: 10%)
  const evening = (answers.find(a => a.id === 'evening')?.answer || '').toLowerCase();
  if (/relax|read|walk|family|cook|hobby|meditat|stretch/i.test(evening)) score += 6;
  if (/work|study|grind|code|screen|phone|scroll|game/i.test(evening)) score -= 4;
  if (/nothing|tv|couch|junk|fast food|drink|smoke/i.test(evening)) score -= 5;

  // Self-awareness bonus
  const harmful = (answers.find(a => a.id === 'harmful_habit')?.answer || '');
  if (harmful.length > 30) score += 2; // Self-awareness is a positive signal

  // Clamp score
  score = Math.max(10, Math.min(95, score));
  return score;
}

function generateDeathDate(age, lifespanScore) {
  // Base lifespan from score
  const baseLifespan = 55 + (lifespanScore / 100) * 38; // Range: 55-93

  // Controlled randomness: ±3 years
  const variance = (Math.random() - 0.5) * 6;
  const projectedLifespan = Math.round(baseLifespan + variance);

  const remainingYears = Math.max(1, projectedLifespan - age);
  const deathYear = new Date().getFullYear() + remainingYears;

  // Random month and day
  const deathMonth = Math.floor(Math.random() * 12);
  const daysInMonth = new Date(deathYear, deathMonth + 1, 0).getDate();
  const deathDay = Math.floor(Math.random() * daysInMonth) + 1;
  const deathDate = new Date(deathYear, deathMonth, deathDay);

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const formattedDate = `${months[deathMonth]} ${deathDay}, ${deathYear}`;

  // Stress score from lifespan score (inverse relationship)
  const stressBase = Math.round(100 - lifespanScore + (Math.random() - 0.5) * 10);
  const stressScore = Math.max(8, Math.min(95, stressBase));
  let stressLabel = 'Low';
  if (stressScore >= 75) stressLabel = 'Critical';
  else if (stressScore >= 55) stressLabel = 'Elevated';
  else if (stressScore >= 35) stressLabel = 'Moderate';

  return { projectedDeathDate: formattedDate, estimatedLifespan: projectedLifespan, stressScore, stressLabel, remainingYears };
}

// ══════════════════════════════════════════════
//  ANALYZE ENDPOINT
// ══════════════════════════════════════════════
app.post('/api/analyze', async (req, res) => {
  const { answers, nickname } = req.body;

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Invalid request: answers array required.' });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: API key missing.' });
  }

  // 1. Calculate lifespan score
  const lifespanScore = calculateLifespanScore(answers);

  // 2. Extract age
  const age = parseFloat(answers.find(a => a.id === 'age')?.rawValue) || 28;

  // 3. Generate unique death date
  const projection = generateDeathDate(age, lifespanScore);

  // 4. Detect archetype
  const archetype = detectArchetype(answers);

  // 5. Build answer summary
  const answerSummary = answers
    .map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.answer}`)
    .join('\n\n');

  const systemPrompt = `You are MORTIS — a fictional AI lifespan trajectory oracle. You analyze human behavioral data and generate atmospheric, psychologically observant fictional projections.

VOICE & TONE:
- Calm, emotionally intelligent, analytical, slightly eerie
- Sound like a wise oracle who sees patterns humans miss
- NEVER comedic, sarcastic, robotic, or meme-like
- Deeply human-aware and psychologically observant

CRITICAL RULES:
- This is ENTIRELY FICTIONAL. Never claim to be real or medical.
- Never diagnose diseases or encourage fear/hopelessness/self-harm.
- Never say "You WILL die" — use "Your trajectory suggests..." or "Based on your current patterns..."
- Write longer, deeper observations. Each section should be 2-4 sentences minimum.

The user's archetype is "${archetype.name}" — subtly adapt your wording to reflect this archetype's characteristics without explicitly naming it in every section.

PRE-CALCULATED VALUES (use these exactly, do NOT generate your own):
- Projected Death Date: ${projection.projectedDeathDate}
- Estimated Lifespan: ${projection.estimatedLifespan} years
- Stress Score: ${projection.stressScore}/100
- Stress Label: ${projection.stressLabel}

RESPONSE FORMAT — return ONLY valid JSON, no markdown fences:
{
  "emotionalAnalysis": "3-4 sentences analyzing their emotional state, coping mechanisms, and inner emotional landscape as revealed by their answers. Be psychologically observant.",
  "behavioralPatterns": "3-4 sentences identifying recurring behavioral patterns — what they do repeatedly, what cycles they're trapped in, what routines reveal about them.",
  "lifestyleInterpretation": "3-4 sentences analyzing their overall lifestyle — the surface appearance vs deeper reality. What their daily patterns truly cost them.",
  "stressRecovery": "2-3 sentences about their stress-to-recovery ratio. How they handle pressure vs how they heal from it.",
  "riskFactors": ["Risk 1 — one sentence each", "Risk 2", "Risk 3", "Risk 4"],
  "positiveFactors": ["Strength 1 — one sentence each", "Strength 2", "Strength 3"],
  "trajectoryProjection": "2-3 sentences about their projected path if current patterns continue unchanged. Paint a vivid but non-fearful picture.",
  "improvementSuggestions": ["Actionable suggestion 1 — specific and personal", "Suggestion 2", "Suggestion 3", "Suggestion 4"],
  "finalObservation": "2-3 deeply personal, slightly eerie sentences that reference something very specific from their answers. This should feel like the oracle truly SAW them.",
  "trajectoryPhrase": "A poetic 5-10 word phrase capturing their essence (e.g., 'A mind that burns brighter than it rests')",
  "archetypeInsight": "1-2 sentences about what their archetype means for their trajectory, written as if revealing a hidden truth."
}`;

  const userPrompt = `Subject: ${nickname || 'Unknown'}
Age: ${age}

Examination responses:
${answerSummary}

Generate the fictional lifespan trajectory analysis. This is creative fiction, NOT medical advice.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.82,
        max_tokens: 2500
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Groq API error:', err);
      return res.status(500).json({ error: 'AI analysis failed. Please try again.' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let aiResult;
    try {
      const clean = content.replace(/```json|```/g, '').trim();
      aiResult = JSON.parse(clean);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, '\nRaw content:', content);
      return res.status(500).json({ error: 'Failed to parse AI response. Please retry.' });
    }

    // Merge server-calculated values with AI analysis
    const result = {
      ...aiResult,
      projectedDeathDate: projection.projectedDeathDate,
      estimatedLifespan: projection.estimatedLifespan,
      stressScore: projection.stressScore,
      stressLabel: projection.stressLabel,
      archetype: archetype.name,
      archetypeDescription: archetype.desc,
    };

    res.json({ success: true, result });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ══════════════════════════════════════════════
//  FOLLOW-UP QUESTIONS ENDPOINT
// ══════════════════════════════════════════════
app.post('/api/followup', async (req, res) => {
  const { answers } = req.body;

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Invalid request.' });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const answerSummary = answers
    .map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.answer}`)
    .join('\n\n');

  const systemPrompt = `You are MORTIS, a fictional AI lifespan oracle. Based on a user's lifestyle answers, generate 2 deeply perceptive follow-up questions that probe patterns you noticed.

Your questions should feel like the AI noticed something specific and troubling — something the user didn't explicitly say but their answers revealed. Be psychologically intelligent, slightly unsettling, but never cruel.

Return ONLY valid JSON:
{
  "questions": [
    {
      "id": "fu1",
      "question": "Your follow-up question — reference something specific from their answers",
      "type": "text",
      "placeholder": "Be honest with yourself..."
    },
    {
      "id": "fu2",
      "question": "Your second follow-up — dig into an emotional pattern you noticed",
      "type": "text",
      "placeholder": "Take a moment to reflect..."
    }
  ]
}

Make questions feel like the oracle genuinely SEES the person. Reference actual patterns. Never ask medical questions.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `User answers:\n${answerSummary}` }
        ],
        temperature: 0.8,
        max_tokens: 600
      })
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Follow-up generation failed.' });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let result;
    try {
      const clean = content.replace(/```json|```/g, '').trim();
      result = JSON.parse(clean);
    } catch {
      return res.status(500).json({ error: 'Failed to parse follow-up questions.' });
    }

    res.json({ success: true, questions: result.questions });

  } catch (err) {
    console.error('Followup error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🕯️  MORTIS v2.5 running at http://localhost:${PORT}\n`);
});
