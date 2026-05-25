import * as THREE from "three";
import { game, mapNames, course, hole, tmpVec } from "../core/state.js";
import { message } from "../core/dom.js";
import { clearCourse } from "../level/builders.js";
import { buildMapEasy, buildMapMedium, buildMapHard, buildMapIceBridge, buildMapWindLabyrinth } from "../level/maps.js";
import { resetBall } from "./ball.js";
import { renderMenuMaps } from "../ui/menu.js";

function loadMap(index) {
    const safeIndex = THREE.MathUtils.clamp(index, 0, mapNames.length - 1);
    game.currentMap = safeIndex; game.strokes = 0; game.won = false;
    clearCourse();
    if (message) message.classList.remove("visible");

    if (safeIndex === 0) buildMapEasy();
    else if (safeIndex === 1) buildMapMedium();
    else if (safeIndex === 2) buildMapHard();
    else if (safeIndex === 3) buildMapIceBridge();
    else buildMapWindLabyrinth();

    resetBall();

    const toHole = tmpVec.copy(hole.pos).sub(course.spawn);
    game.aimAngle = Math.atan2(toHole.z, toHole.x);
    game.cameraYaw = game.aimAngle + Math.PI;
    game.cameraPitch = 0.6;
    renderMenuMaps();
}

export { loadMap };
