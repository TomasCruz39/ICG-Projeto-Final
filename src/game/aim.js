// Seta de mira: mostra ao jogador a direção e força da próxima tacada

import * as THREE from "three";
import { scene } from "../core/scene.js";
import { game, ball } from "../core/state.js";

function createAimGuide() {
    const group = new THREE.Group();

    // Corpo da seta (cilindro deitado no eixo X)
    const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 1, 14),
        new THREE.MeshBasicMaterial({ color: 0x9ef7e8 })
    );
    shaft.rotation.z = -Math.PI / 2; shaft.position.x = 0.5;

    // Ponta triangular
    const tip = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.28, 18),
        new THREE.MeshBasicMaterial({ color: 0x5eead4 })
    );
    tip.rotation.z = -Math.PI / 2; tip.position.x = 1.08;

    group.add(shaft); group.add(tip);
    group.position.y = 0.14; // ligeiramente acima do chão
    scene.add(group);
    return group;
}

const aimGuide = createAimGuide();

function updateAimGuide() {
    // Esconder durante o menu, enquanto a bola está em movimento ou após vencer
    aimGuide.visible = !game.menuOpen && !ball.moving && !game.won;
    if (!aimGuide.visible) return;

    // Colocar a seta rente ao chão sob a bola (0.14 de offset fixo)
    const aimY = ball.position.y - ball.radius + 0.14;
    aimGuide.position.set(ball.position.x, aimY, ball.position.z);
    aimGuide.rotation.y = -game.aimAngle;

    // Escalar a seta conforme a força — dá feedback visual da potência
    aimGuide.scale.set(1 + (game.power / game.maxPower) * 4, 1, 1);
}

export { updateAimGuide };
