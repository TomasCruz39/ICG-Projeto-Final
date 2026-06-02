// HUD in-game: atualiza o painel de informação no canto superior esquerdo a cada frame

import { hud } from "../core/dom.js";
import { game, mapNames, ball } from "../core/state.js";
import { getBestScore } from "../systems/scores.js";

// Reconstrói o HTML do HUD a cada frame com o estado atual do jogo (tacadas, força, mapa, recorde)
function updateHUD() {
    const best = getBestScore(game.currentMap);
    const bestLabel = best ? `${best}` : "--";
    // Tudo numa só linha de innerHTML para evitar reflows desnecessários
    hud.innerHTML = `<b>Mini-Golfe 3D</b><br>Mapa: <b>${game.currentMap + 1}/${mapNames.length} - ${game.mapName}</b><br>Tacadas: <b>${game.strokes}</b> | Recorde: <b>${bestLabel}</b><br>Força: <b>${game.power.toFixed(1)}</b> (${Math.round((game.power / game.maxPower) * 100)}%)<br>Estado: <b>${game.won ? "Concluído" : ball.moving ? "Em movimento" : "Pronto para tacar"}</b><br>Câmara: <b>${game.freeCam ? "Free Cam" : "Jogo"}</b><hr style="border:0;border-top:1px solid rgba(255,255,255,.2);margin:8px 0">Rato esquerdo: câmara | Rato direito: mira<br>W/S ou Setas ↑↓: força | Espaço/Enter: tacada<br>Esc/M: menu | R: reiniciar | 1-${mapNames.length}: mapas | F: Free Cam`;
}

export { updateHUD };
