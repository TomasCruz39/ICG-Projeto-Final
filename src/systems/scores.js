// Recordes locais: lê e escreve no localStorage, guarda os 5 melhores por mapa

const SCORE_KEY = "icg-mini-golf-scores-v1";
let scores = {};

function loadScores() {
    try {
        const raw = localStorage.getItem(SCORE_KEY);
        if (!raw) return {};
        const data = JSON.parse(raw);
        return data && typeof data === "object" ? data : {};
    } catch {
        return {};
    }
}

function saveScores() {
    try {
        localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
    } catch {
        // ignore write errors
    }
}

function initScores() {
    scores = loadScores();
}

// Devolve a lista de pontuações ordenadas para um mapa (melhor primeiro)
function getMapScores(mapIndex) {
    const list = scores[String(mapIndex)];
    return Array.isArray(list) ? list : [];
}

function getBestScore(mapIndex) {
    const list = getMapScores(mapIndex);
    return list.length ? list[0] : null;
}

// Regista uma nova pontuação e devolve true se for um novo recorde
function recordScore(mapIndex, strokes) {
    const key = String(mapIndex);
    const list = getMapScores(mapIndex).slice();
    const prevBest = list.length ? list[0] : null;
    list.push(strokes);
    list.sort((a, b) => a - b);
    scores[key] = list.slice(0, 5); // guardar apenas top 5
    saveScores();
    return scores[key][0] === strokes && (prevBest === null || strokes <= prevBest);
}

function resetScores() {
    scores = {};
    saveScores();
}

export { initScores, getMapScores, getBestScore, recordScore, resetScores };
