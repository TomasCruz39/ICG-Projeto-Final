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

function getMapScores(mapIndex) {
    const list = scores[String(mapIndex)];
    return Array.isArray(list) ? list : [];
}

function getBestScore(mapIndex) {
    const list = getMapScores(mapIndex);
    return list.length ? list[0] : null;
}

function recordScore(mapIndex, strokes) {
    const key = String(mapIndex);
    const list = getMapScores(mapIndex).slice();
    const prevBest = list.length ? list[0] : null;
    list.push(strokes);
    list.sort((a, b) => a - b);
    scores[key] = list.slice(0, 5);
    saveScores();
    return scores[key][0] === strokes && (prevBest === null || strokes <= prevBest);
}

function resetScores() {
    scores = {};
    saveScores();
}

export { initScores, getMapScores, getBestScore, recordScore, resetScores };
