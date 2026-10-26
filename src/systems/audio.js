// All game sound is synthesised at runtime with the Web Audio API: no audio
// files, no licences, nothing to download. One shared instance owns the
// AudioContext and the mute state for every scene.

let ctx = null;
let master = null;
let muted = false;
let noiseBuffer = null;
const lastPlayed = new Map();

function ensure() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let seed = 7;
    for (let i = 0; i < data.length; i += 1) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
  } catch {
    ctx = null;
  }
  return ctx;
}

// Browsers only allow audio after a user gesture; call this from one.
export function unlockAudio() {
  const c = ensure();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

export function setMuted(value) {
  muted = Boolean(value);
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.02);
}

export function isMuted() {
  return muted;
}

function tone({ freq, to = freq, dur = 0.12, type = "square", gain = 0.2, delay = 0, attack = 0.004 }) {
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise({ dur = 0.08, gain = 0.25, freq = 1800, q = 1, type = "bandpass", delay = 0 }) {
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

const arpeggio = (notes, step, opts) => notes.forEach((freq, i) => tone({ freq, delay: i * step, ...opts }));

const SOUNDS = {
  flipper: () => { noise({ dur: 0.05, gain: 0.35, freq: 900, q: 0.7 }); tone({ freq: 120, to: 60, dur: 0.06, type: "triangle", gain: 0.25 }); },
  flipperUp: () => noise({ dur: 0.03, gain: 0.12, freq: 600, q: 0.7 }),
  bumper: () => { tone({ freq: 520, to: 180, dur: 0.12, type: "square", gain: 0.16 }); noise({ dur: 0.06, gain: 0.22, freq: 2400, q: 2 }); },
  sling: () => { tone({ freq: 300, to: 120, dur: 0.07, type: "sawtooth", gain: 0.12 }); noise({ dur: 0.04, gain: 0.2, freq: 3000, q: 1 }); },
  target: () => { tone({ freq: 880, dur: 0.08, type: "triangle", gain: 0.2 }); tone({ freq: 1320, dur: 0.1, type: "triangle", gain: 0.12, delay: 0.05 }); },
  rollover: () => tone({ freq: 1200, to: 1600, dur: 0.07, type: "sine", gain: 0.15 }),
  complete: () => arpeggio([523, 659, 784, 1047], 0.07, { dur: 0.16, type: "square", gain: 0.12 }),
  skill: () => arpeggio([784, 988, 1175, 1568, 1976], 0.06, { dur: 0.14, type: "square", gain: 0.12 }),
  wake: () => { tone({ freq: 70, to: 140, dur: 0.6, type: "sawtooth", gain: 0.22 }); noise({ dur: 0.5, gain: 0.18, freq: 400, q: 0.5, type: "lowpass" }); },
  saucer: () => { tone({ freq: 160, to: 90, dur: 0.25, type: "triangle", gain: 0.25 }); },
  eject: () => { noise({ dur: 0.12, gain: 0.3, freq: 700, q: 0.8 }); tone({ freq: 90, to: 220, dur: 0.15, type: "sawtooth", gain: 0.16 }); },
  jackpot: () => {
    noise({ dur: 0.7, gain: 0.25, freq: 500, q: 0.4, type: "lowpass" });
    arpeggio([392, 523, 659, 784, 1047, 1319], 0.09, { dur: 0.3, type: "square", gain: 0.13 });
  },
  kickback: () => { noise({ dur: 0.35, gain: 0.3, freq: 900, q: 0.5 }); tone({ freq: 110, to: 440, dur: 0.3, type: "sawtooth", gain: 0.16 }); },
  plunger: () => noise({ dur: 0.04, gain: 0.08, freq: 300, q: 2 }),
  launch: () => { noise({ dur: 0.18, gain: 0.35, freq: 500, q: 0.6 }); tone({ freq: 90, to: 400, dur: 0.18, type: "triangle", gain: 0.2 }); },
  drain: () => { tone({ freq: 330, to: 82, dur: 0.7, type: "sawtooth", gain: 0.16 }); },
  save: () => arpeggio([659, 880, 659, 880], 0.08, { dur: 0.1, type: "square", gain: 0.12 }),
  gameover: () => arpeggio([392, 330, 262, 196], 0.22, { dur: 0.35, type: "triangle", gain: 0.2 }),
  highscore: () => arpeggio([523, 659, 784, 1047, 784, 1047, 1319], 0.11, { dur: 0.22, type: "square", gain: 0.12 }),
  click: () => tone({ freq: 660, dur: 0.05, type: "square", gain: 0.1 }),
  start: () => arpeggio([262, 392, 523, 784], 0.08, { dur: 0.18, type: "square", gain: 0.12 }),
};

export function play(name) {
  if (muted || !ctx || ctx.state !== "running") return;
  const fn = SOUNDS[name];
  if (!fn) return;
  // Rapid repeats (a ball buzzing between bumpers) would only clip.
  const t = ctx.currentTime;
  if (t - (lastPlayed.get(name) ?? -1) < 0.035) return;
  lastPlayed.set(name, t);
  try { fn(); } catch { /* sound must never break play */ }
}
