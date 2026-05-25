import * as THREE from "three";
import { scene } from "../core/scene.js";
import { game, ball } from "../core/state.js";

function createAimGuide() {
    const group = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 14), new THREE.MeshBasicMaterial({ color: 0x9ef7e8 }));
    shaft.rotation.z = -Math.PI / 2; shaft.position.x = 0.5;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 18), new THREE.MeshBasicMaterial({ color: 0x5eead4 }));
    tip.rotation.z = -Math.PI / 2; tip.position.x = 1.08;
    group.add(shaft); group.add(tip); group.position.y = 0.14;
    scene.add(group);
    return group;
}

const aimGuide = createAimGuide();

function updateAimGuide() {
    aimGuide.visible = !game.menuOpen && !ball.moving && !game.won;
    if (!aimGuide.visible) return;
    // place aim slightly above the ground under the ball (preserve original 0.14 offset)
    const aimY = ball.position.y - ball.radius + 0.14;
    aimGuide.position.set(ball.position.x, aimY, ball.position.z);
    aimGuide.rotation.y = -game.aimAngle;
    aimGuide.scale.set(1 + (game.power / game.maxPower) * 4, 1, 1);
}

export { updateAimGuide };
