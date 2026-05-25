import { hud, menu, menuMaps, menuScores, menuStart, menuAudio, menuResetScores } from "../core/dom.js";
import { game, keys, mapNames } from "../core/state.js";
import { audioState, setAudioEnabled, unlockAudio } from "../systems/audio.js";
import { getBestScore, getMapScores, resetScores } from "../systems/scores.js";
import { resetInputState } from "../input/state.js";
import { updateHUD } from "./hud.js";

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

function updateMenuButtons() {
    if (menuStart) menuStart.textContent = game.started ? "Retomar" : "Jogar";
    if (menuAudio) menuAudio.textContent = audioState.enabled ? "Audio: On" : "Audio: Off";
}

function setMenuVisible(visible) {
    game.menuOpen = visible;
    if (menu) menu.classList.toggle("visible", visible);
    if (hud) hud.classList.toggle("hidden", visible);
    if (visible) {
        keys.w = false; keys.a = false; keys.s = false; keys.d = false;
        resetInputState();
        renderMenuMaps();
        renderMenuScores();
        updateMenuButtons();
    }
}

function openMenu() {
    setMenuVisible(true);
}

function closeMenu() {
    game.started = true;
    setMenuVisible(false);
}

function initMenu({ loadMap }) {
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

export { renderMenuMaps, renderMenuScores, updateMenuButtons, setMenuVisible, openMenu, closeMenu, initMenu };
