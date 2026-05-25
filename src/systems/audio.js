import * as THREE from "three";

const AUDIO_KEY = "icg-mini-golf-audio-enabled";

const audioState = {
    enabled: true,
    ready: false,
    ctx: null,
    master: null,
    ambience: null,
};

function loadAudioEnabled() {
    try {
        const raw = localStorage.getItem(AUDIO_KEY);
        if (raw === null) return true;
        return raw === "1";
    } catch {
        return true;
    }
}

function setAudioEnabled(enabled) {
    audioState.enabled = enabled;
    try {
        localStorage.setItem(AUDIO_KEY, enabled ? "1" : "0");
    } catch {
        // ignore write errors
    }
    if (!audioState.ready) return;
    if (enabled) startAmbience();
    else stopAmbience();
}

function unlockAudio() {
    initAudio();
    if (audioState.ctx && audioState.ctx.state === "suspended") audioState.ctx.resume();
}

function initAudio() {
    if (audioState.ready) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.38;
    master.connect(ctx.destination);
    audioState.ctx = ctx;
    audioState.master = master;
    audioState.ready = true;
    if (audioState.enabled) startAmbience();
}

function startAmbience() {
    if (!audioState.ready || audioState.ambience) return;
    const ctx = audioState.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.018;
    gain.connect(audioState.master);

    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = "sine"; oscB.type = "sine";
    oscA.frequency.value = 98;
    oscB.frequency.value = 196;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 8;
    lfo.connect(lfoGain).connect(oscB.frequency);

    oscA.connect(gain);
    oscB.connect(gain);
    oscA.start(); oscB.start(); lfo.start();

    audioState.ambience = { gain, oscA, oscB, lfo };
}

function stopAmbience() {
    const amb = audioState.ambience;
    if (!amb) return;
    amb.oscA.stop(); amb.oscB.stop(); amb.lfo.stop();
    amb.oscA.disconnect(); amb.oscB.disconnect(); amb.lfo.disconnect();
    amb.gain.disconnect();
    audioState.ambience = null;
}

function playTone({ freq, duration, type, volume, delay = 0, detune = 0 }) {
    if (!audioState.enabled) return;
    if (!audioState.ready) initAudio();
    if (!audioState.ready) return;

    const ctx = audioState.ctx;
    const startTime = ctx.currentTime + delay;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain).connect(audioState.master);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.03);
    osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
    };
}

function playSfx(type, intensity = 1) {
    const strength = THREE.MathUtils.clamp(intensity, 0.2, 1);
    if (type === "shot") {
        // High-frequency "tack" (audible on laptop speakers)
        playTone({ freq: 700 + strength * 300, duration: 0.05, type: "square", volume: 0.06 * strength });
        // Mid-frequency "thwack"
        playTone({ freq: 300 + strength * 150, duration: 0.12, type: "triangle", volume: 0.12 * strength });
        // Low-frequency body
        playTone({ freq: 150, duration: 0.18, type: "sine", volume: 0.08 * strength });
    } else if (type === "bounce") {
        playTone({ freq: 240 + strength * 140, duration: 0.09, type: "square", volume: 0.08 * strength });
    } else if (type === "hole") {
        playTone({ freq: 330, duration: 0.18, type: "sine", volume: 0.12 });
        playTone({ freq: 440, duration: 0.2, type: "sine", volume: 0.1, delay: 0.12 });
        playTone({ freq: 550, duration: 0.22, type: "sine", volume: 0.08, delay: 0.24 });
    } else if (type === "boost") {
        playTone({ freq: 420 + strength * 120, duration: 0.12, type: "sawtooth", volume: 0.08 * strength });
    }
}

audioState.enabled = loadAudioEnabled();

export { audioState, setAudioEnabled, unlockAudio, playSfx };
