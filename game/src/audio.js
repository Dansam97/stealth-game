// Procedural sound only: short WebAudio tones, no audio files, no network.
// Everything stays silent until the player first presses a key or clicks,
// because browsers only unlock audio after a gesture.
export function createAudio() {
  return { ctx: null, muted: false, lastStepAt: 0 };
}

function ensureContext(audio) {
  if (audio.ctx) return audio.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    audio.ctx = new AC();
  } catch {
    return null;
  }
  return audio.ctx;
}

export function unlockAudio(audio) {
  const ctx = ensureContext(audio);
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function tone(audio, freq, dur, type, gain, slideTo) {
  if (audio.muted) return;
  const ctx = ensureContext(audio);
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.05);
}

export function playStep(audio, sneaking) {
  const now = performance.now();
  if (now - audio.lastStepAt < (sneaking ? 340 : 230)) return;
  audio.lastStepAt = now;
  tone(audio, sneaking ? 140 : 190, 0.07, 'sine', sneaking ? 0.03 : 0.06, 110);
}

export function playPickup(audio) {
  tone(audio, 660, 0.12, 'sine', 0.09, 990);
  setTimeout(() => tone(audio, 990, 0.14, 'sine', 0.07, 1320), 90);
}

export function playAlert(audio) {
  tone(audio, 220, 0.28, 'sawtooth', 0.08, 440);
  setTimeout(() => tone(audio, 330, 0.22, 'sawtooth', 0.06, 220), 160);
}

export function playCaught(audio) {
  tone(audio, 392, 0.5, 'sawtooth', 0.1, 98);
}

export function playWin(audio) {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(audio, f, 0.22, 'triangle', 0.09), i * 110));
}

export function playPebble(audio) {
  tone(audio, 1200, 0.06, 'square', 0.04, 700);
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  return audio.muted;
}
