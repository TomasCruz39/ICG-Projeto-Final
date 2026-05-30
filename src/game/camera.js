// Câmara orbital centrada na bola + modo Free Cam para exploração

import * as THREE from "three";
import { camera } from "../core/scene.js";
import { game, ball, keys } from "../core/state.js";

function updateCamera(dt) {
    if (game.freeCam) {
        const speed = 12 * dt;

        // Mover na direção para onde a câmara aponta (espaço mundo)
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

        if (keys.w) camera.position.addScaledVector(dir, speed);
        if (keys.s) camera.position.addScaledVector(dir, -speed);
        if (keys.a) camera.position.addScaledVector(right, -speed);
        if (keys.d) camera.position.addScaledVector(right, speed);

        // Ordem YXZ evita gimbal lock ao olhar na vertical
        camera.rotation.order = "YXZ";
        camera.rotation.set(-game.cameraPitch, game.cameraYaw - Math.PI / 2, 0);
    } else {
        // Câmara orbital: converte coordenadas esféricas (yaw, pitch, dist) para cartesiano
        const target = ball.position;
        const cosPitch = Math.cos(game.cameraPitch);
        camera.position.set(
            target.x + Math.cos(game.cameraYaw) * cosPitch * game.cameraDist,
            target.y + Math.sin(game.cameraPitch) * game.cameraDist + 1.2,
            target.z + Math.sin(game.cameraYaw) * cosPitch * game.cameraDist
        );
        camera.lookAt(target);
    }
}

export { updateCamera };
