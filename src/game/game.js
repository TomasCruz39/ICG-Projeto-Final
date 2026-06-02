// Carregamento de mapas: limpa a cena, constrói o mapa e repõe a bola

import { game, mapNames, course, hole, tmpVec } from "../core/state.js";
import { message } from "../core/dom.js";
import { clearCourse } from "../level/builders.js";
import { buildMapEasy, buildMapMedium, buildMapHard, buildMapIceBridge, buildMapWindLabyrinth } from "../level/maps.js";
import { resetBall } from "./ball.js";
import { renderMenuMaps } from "../ui/menu.js";

// Carrega o mapa pelo índice: limpa o percurso anterior, constrói o novo e repõe a bola no spawn
function loadMap(index) {
    const safeIndex = Math.max(0, Math.min(index, mapNames.length - 1));
    // Atualizar o estado global do jogo para o novo mapa
    game.currentMap = safeIndex; game.strokes = 0; game.won = false;

    // Remover todos os objetos do mapa anterior da cena e limpar as listas de colisores
    clearCourse();
    if (message) message.classList.remove("visible");

    if (safeIndex === 0) buildMapEasy();
    else if (safeIndex === 1) buildMapMedium();
    else if (safeIndex === 2) buildMapHard();
    else if (safeIndex === 3) buildMapIceBridge();
    else buildMapWindLabyrinth();

    resetBall();

    // Apontar a mira e câmara automaticamente na direção do buraco ao iniciar
    const toHole = tmpVec.copy(hole.pos).sub(course.spawn);
    game.aimAngle = Math.atan2(toHole.z, toHole.x);
    game.cameraYaw = game.aimAngle + Math.PI;
    game.cameraPitch = 0.6;

    renderMenuMaps();
}

export { loadMap };
