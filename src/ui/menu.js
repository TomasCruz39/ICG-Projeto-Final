// Menu principal: seleção de mapas, recordes, e botões de ação

import { hud, menu, menuMaps, menuScores, menuStart, menuAudio, menuResetScores } from "../core/dom.js";
import { game, keys, mapNames } from "../core/state.js";
import { audioState, setAudioEnabled, unlockAudio } from "../systems/audio.js";
import { getBestScore, getMapScores, resetScores } from "../systems/scores.js";
import { resetInputState } from "../input/state.js";
import { updateHUD } from "./hud.js";

// Renderizar a grelha de botões de mapa com o melhor recorde de cada um
function renderMenuMaps() {
    if (!menuMaps) return;
    menuMaps.innerHTML = mapNames.map((name, index) => {
        const best = getBestScore(index);
        const bestLabel = best ? `${best} tac.` : "sem recorde";
        const activeClass = index === game.currentMap ? "map-button active" : "map-button";
        return `
            <button class="${activeClass}" data-map="${index}">
                <strong>Mapa ${index + 1}</strong>
                <span>${name}</span>
                <small>${bestLabel}</small>
            </button>
        `;
    }).join("");
}

// Renderizar o painel de recordes (top 5 por mapa)
function renderMenuScores() {
    if (!menuScores) return;
    menuScores.innerHTML = mapNames.map((name, index) => {
        const list = getMapScores(index);
        const items = list.length
            ? list.map((score, i) => `<li><span>#${i + 1}</span><span>${score} tac.</span></li>`).join("")
            : `<li><span>--</span><span>Sem recordes</span></li>`;
        return `
            <div class="score-card">
                <strong>Mapa ${index + 1}</strong> - ${name}
                <ul class="score-list">${items}</ul>
            </div>
        `;
    }).join("");
}

// Atualiza o texto dos botões do menu conforme o estado atual do jogo e do áudio
function updateMenuButtons() {
    if (menuStart) menuStart.textContent = game.started ? "Retomar" : "Jogar";
    if (menuAudio) menuAudio.textContent = audioState.enabled ? "Audio: On" : "Audio: Off";
}

// Mostra ou esconde o menu e sincroniza o estado do HUD; ao abrir, atualiza todas as secções
function setMenuVisible(visible) {
    game.menuOpen = visible;
    if (menu) menu.classList.toggle("visible", visible);
    if (hud) hud.classList.toggle("hidden", visible);
    if (visible) {
        // Limpar teclas pressionadas ao abrir o menu para não ficar WASD "preso"
        keys.w = false; keys.a = false; keys.s = false; keys.d = false;
        resetInputState();
        renderMenuMaps();
        renderMenuScores();
        updateMenuButtons();
    }
}

// Abre o menu principal (pausa o jogo)
function openMenu() {
    setMenuVisible(true);
}

// Fecha o menu e marca o jogo como iniciado (muda "Jogar" para "Retomar")
function closeMenu() {
    game.started = true;
    setMenuVisible(false);
}

function initMenu({ loadMap }) {
    // Delegação de eventos na grelha de mapas — 1 listener para todos os botões
    if (menuMaps) {
        menuMaps.addEventListener("click", (e) => {
            const target = e.target.closest("button[data-map]");
            if (!target) return;
            const index = Number(target.dataset.map);
            if (!Number.isNaN(index)) {
                unlockAudio();
                loadMap(index);
                closeMenu();
            }
        });
    }

    if (menuStart) {
        menuStart.addEventListener("click", () => {
            unlockAudio();
            closeMenu();
        });
    }

    if (menuAudio) {
        menuAudio.addEventListener("click", () => {
            unlockAudio();
            setAudioEnabled(!audioState.enabled);
            updateMenuButtons();
        });
    }

    if (menuResetScores) {
        menuResetScores.addEventListener("click", () => {
            resetScores();
            renderMenuMaps();
            renderMenuScores();
            updateHUD();
        });
    }

    renderMenuMaps();
    renderMenuScores();
    updateMenuButtons();
    setMenuVisible(true);
}

export { renderMenuMaps, renderMenuScores, openMenu, closeMenu, initMenu };
