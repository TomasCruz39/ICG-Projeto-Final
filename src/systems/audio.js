// Sistema de áudio: música de fundo e efeitos sonoros via Web Audio API

const AUDIO_KEY = "icg-mini-golf-audio-enabled";

// Música de fundo em loop — volume baixo para não abafar os SFX
const bgMusic = new Audio("./assets/bg_music.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.03;

const audioState = {
    enabled: true,
    ready: false,   // true depois de initAudio() ser chamado (requer interação do utilizador)
    ctx: null,
    master: null,
    ambience: null,
};

// Lê a preferência de áudio guardada no localStorage
function loadAudioEnabled() {
    try {
        const raw = localStorage.getItem(AUDIO_KEY);
        if (raw === null) return true;
        return raw === "1";
    } catch {
        return true;
    }
}

// Liga ou desliga todo o áudio e guarda a preferência
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

// O browser não permite criar AudioContext antes de uma interação do utilizador
// Esta função é chamada no primeiro clique/tecla
function unlockAudio() {
    initAudio();
    if (audioState.ctx && audioState.ctx.state === "suspended") audioState.ctx.resume();
}

function initAudio() {
    if (audioState.ready) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    // Nó master de ganho — controla o volume global dos SFX
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
    audioState.ambience = true;
    bgMusic.play().catch(e => console.log("O browser bloqueou o autoplay:", e));
}

function stopAmbience() {
    audioState.ambience = null;
    bgMusic.pause();
}

// Toca um tom sintético via Web Audio API com envelope de volume (attack + decay)
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

    // Envelope simples: attack rápido e decay para evitar clipping
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

// Toca os SFX compostos por tipo de evento de jogo
function playSfx(type, intensity = 1) {
    const strength = Math.max(0.2, Math.min(intensity, 1));
    if (type === "shot") {
        // Tacada: camadas de alta, média e baixa frequência para soar bem em laptop
        playTone({ freq: 700 + strength * 300, duration: 0.05, type: "square", volume: 0.06 * strength });
        playTone({ freq: 300 + strength * 150, duration: 0.12, type: "triangle", volume: 0.12 * strength });
        playTone({ freq: 150, duration: 0.18, type: "sine", volume: 0.08 * strength });
    } else if (type === "bounce") {
        // Ressalto na parede
        playTone({ freq: 240 + strength * 140, duration: 0.09, type: "square", volume: 0.08 * strength });
    } else if (type === "hole") {
        // Sequência ascendente ao entrar no buraco
        playTone({ freq: 330, duration: 0.18, type: "sine", volume: 0.12 });
        playTone({ freq: 440, duration: 0.2, type: "sine", volume: 0.1, delay: 0.12 });
        playTone({ freq: 550, duration: 0.22, type: "sine", volume: 0.08, delay: 0.24 });
    }
}

audioState.enabled = loadAudioEnabled();

export { audioState, setAudioEnabled, unlockAudio, playSfx };
