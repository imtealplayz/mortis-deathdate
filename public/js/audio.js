// ─────────────────────────────────────────────
//  MORTIS v2.5 — Ambient Audio System
//  Uses Web Audio API to synthesize:
//  - Low drone / hum
//  - Wind ambience (filtered noise)
//  - Soft UI click sounds
//  - Processing pulse
//  - Typing effect sound
//  No external audio files required.
// ─────────────────────────────────────────────

const MortisAudio = (function () {
  let ctx = null;
  let masterGain = null;
  let droneNodes = [];
  let windNodes = [];
  let pulseInterval = null;
  let isMuted = false;
  let isStarted = false;

  // ── Init Audio Context ──────────────────────────────────────
  function initCtx() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.connect(ctx.destination);
  }

  // ── Low Cinematic Drone ─────────────────────────────────────
  function createDrone(freq, gainVal, detune = 0) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = detune;

    filter.type = 'lowpass';
    filter.frequency.value = 300;
    filter.Q.value = 0.5;

    gain.gain.value = gainVal;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start();

    // Subtle LFO tremolo
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08 + Math.random() * 0.06;
    lfoGain.gain.value = gainVal * 0.25;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();

    return { osc, gain, lfo };
  }

  // ── Wind Ambience (White noise + bandpass) ──────────────────
  function createWind() {
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink-ish noise
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter1 = ctx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.value = 600;
    filter1.Q.value = 0.5;

    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.value = 1200;

    const gain = ctx.createGain();
    gain.gain.value = 0.06;

    // Slow LFO on wind gain for natural breathing
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();

    source.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(gain);
    gain.connect(masterGain);
    source.start();

    return { source, gain };
  }

  // ── Start Ambient Soundscape ────────────────────────────────
  function startAmbience() {
    if (isStarted) return;
    isStarted = true;
    initCtx();

    // Layered drone chord (very low, atmospheric)
    droneNodes.push(createDrone(40, 0.18, 0));
    droneNodes.push(createDrone(40, 0.12, -8));
    droneNodes.push(createDrone(60, 0.08, 4));
    droneNodes.push(createDrone(80, 0.05, -3));

    // Wind layer
    windNodes.push(createWind());

    // Fade in master over 3s
    if (!isMuted) {
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 3);
    }
  }

  // ── UI Click Sound ──────────────────────────────────────────
  function playClick() {
    if (!ctx || isMuted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);

    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  }

  // ── Hover Sound (very subtle) ───────────────────────────────
  function playHover() {
    if (!ctx || isMuted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 2400;
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.07);
  }

  // ── Reveal Sound (result page — enhanced) ───────────────────
  function playReveal() {
    if (!ctx || isMuted) return;
    const now = ctx.currentTime;

    // Deep boom
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 2);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 2.5);

    // Mid-range swell
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(180, now + 0.1);
    osc3.frequency.exponentialRampToValueAtTime(90, now + 1.8);
    gain3.gain.setValueAtTime(0, now);
    gain3.gain.linearRampToValueAtTime(0.15, now + 0.4);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 2);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.1);
    osc3.stop(now + 2.1);

    // High shimmer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, now + 0.3);
    osc2.frequency.exponentialRampToValueAtTime(600, now + 1.5);
    gain2.gain.setValueAtTime(0, now + 0.3);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.6);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.3);
    osc2.stop(now + 2);
  }

  // ── Transition Sound ─────────────────────────────────────────
  function playTransition() {
    if (!ctx || isMuted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.4);
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  // ── Processing Pulse — rhythmic low throb ───────────────────
  function startProcessingPulse() {
    if (!ctx || isMuted) return;
    stopProcessingPulse();
    function pulse() {
      if (!ctx || isMuted) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 50;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.3);
    }
    pulse();
    pulseInterval = setInterval(pulse, 2000);
  }

  function stopProcessingPulse() {
    if (pulseInterval) {
      clearInterval(pulseInterval);
      pulseInterval = null;
    }
  }

  // ── Toggle Mute ─────────────────────────────────────────────
  function toggleMute() {
    if (!ctx) return;
    isMuted = !isMuted;
    const target = isMuted ? 0 : 0.6;
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.5);
    if (isMuted) stopProcessingPulse();
    return isMuted;
  }

  // ── Resume context after user gesture ──────────────────────
  function resume() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  return {
    startAmbience, playClick, playHover, playReveal, playTransition,
    startProcessingPulse, stopProcessingPulse, toggleMute, resume
  };
})();

// ── Mute button wiring ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('mute-btn');
  const icon = document.getElementById('mute-icon');
  const label = document.getElementById('mute-label');

  btn.addEventListener('click', () => {
    MortisAudio.resume();
    const muted = MortisAudio.toggleMute();
    btn.classList.toggle('muted', muted);
    icon.textContent = muted ? '♪' : '♪';
    label.textContent = muted ? 'MUTED' : 'AMBIENT';
    icon.style.opacity = muted ? '0.3' : '1';
  });

  // Attach hover sounds to all interactive elements
  document.addEventListener('mouseover', (e) => {
    if (e.target.matches('button, .choice-btn, .checkbox-label')) {
      MortisAudio.playHover();
    }
  });
});
