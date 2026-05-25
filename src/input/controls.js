import * as THREE from "three";
import { renderer, camera } from "../core/scene.js";
import { game, keys, mapNames, ball } from "../core/state.js";
import { message } from "../core/dom.js";
import { input } from "./state.js";
import { unlockAudio } from "../systems/audio.js";
import { shoot, resetBall } from "../game/ball.js";
import { loadMap } from "../game/game.js";
import { openMenu, closeMenu } from "../ui/menu.js";

function initControls() {
    window.addEventListener("contextmenu", (e) => e.preventDefault());

    renderer.domElement.addEventListener("pointerdown", (e) => {
        unlockAudio();
        if (game.menuOpen) return;
        renderer.domElement.setPointerCapture(e.pointerId); input.activePointerId = e.pointerId;
        input.prevX = e.clientX; input.prevY = e.clientY;
        if (e.button === 0) input.draggingCamera = true;
        if (e.button === 2) input.draggingAim = true;
    });

    window.addEventListener("pointerup", (e) => {
        if (input.activePointerId !== null && e.pointerId !== input.activePointerId) return;
        input.activePointerId = null; input.draggingCamera = false; input.draggingAim = false;
    });

    window.addEventListener("pointermove", (e) => {
        if (input.activePointerId !== null && e.pointerId !== input.activePointerId) return;
        const dx = e.clientX - input.prevX; const dy = e.clientY - input.prevY;
        input.prevX = e.clientX; input.prevY = e.clientY;
        if (game.menuOpen) return;
        if (input.draggingCamera) {
            game.cameraYaw -= dx * 0.004;
            if (game.freeCam) game.cameraPitch -= dy * 0.0032;
            else game.cameraPitch = THREE.MathUtils.clamp(game.cameraPitch - dy * 0.0032, 0.17, 1.2);
        }
        if (input.draggingAim && !ball.moving && !game.won) game.aimAngle -= dx * 0.008;
    });

    window.addEventListener("wheel", (e) => game.cameraDist = THREE.MathUtils.clamp(game.cameraDist + e.deltaY * 0.007, 4.2, 16));

    window.addEventListener("keydown", (e) => {
        unlockAudio();
        const key = e.key.toLowerCase();
        if (key === "escape") {
            if (game.menuOpen) closeMenu();
            else openMenu();
            return;
        }
        if (key === "m") {
            if (game.menuOpen) closeMenu();
            else openMenu();
            return;
        }
        if (game.menuOpen) return;
        if (Object.prototype.hasOwnProperty.call(keys, key)) keys[key] = true;
        if (key === "arrowup") game.power = Math.min(game.maxPower, game.power + 0.6);
        else if (key === "arrowdown") game.power = Math.max(game.minPower, game.power - 0.6);
        else if (key === " " || key === "enter") shoot();
        else if (key === "r") { game.strokes = 0; game.won = false; if (message) message.classList.remove("visible"); resetBall(); }
        else if (/^[1-9]$/.test(key)) {
            const index = Number(key) - 1;
            if (index >= 0 && index < mapNames.length) loadMap(index);
        }
        else if (key === "f") {
            game.freeCam = !game.freeCam;
            if (game.freeCam) {
                const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
                game.cameraPitch = -euler.x;
                game.cameraYaw = euler.y + Math.PI / 2;
            } else {
                game.cameraPitch = THREE.MathUtils.clamp(game.cameraPitch, 0.17, 1.2);
            }
        }
    });

    window.addEventListener("keyup", (e) => {
        const key = e.key.toLowerCase();
        if (Object.prototype.hasOwnProperty.call(keys, key)) keys[key] = false;
    });
}

export { initControls };
