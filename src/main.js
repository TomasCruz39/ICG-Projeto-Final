// Ponto de entrada do jogo — inicializa tudo e arranca o loop de animação

import { scene, renderer, camera, clock, timeState } from "./core/scene.js";
import { game } from "./core/state.js";
import { createLights } from "./level/builders.js";
import { createBall, updateBall, updateMovingObstacles } from "./game/ball.js";
import { loadMap } from "./game/game.js";
import { updateParticles } from "./systems/particles.js";
import { updateAimGuide } from "./game/aim.js";
import { updateCamera } from "./game/camera.js";
import { updateHUD } from "./ui/hud.js";
import { initMenu } from "./ui/menu.js";
import { initControls } from "./input/controls.js";
import { initScores } from "./systems/scores.js";

// Inicializar sistemas que não dependem do mapa
initScores();
initMenu({ loadMap });
initControls();

// Criar luzes, bola e carregar o primeiro mapa
createLights();
createBall();
loadMap(0);

// Loop principal — corre a ~60fps via requestAnimationFrame
function animate() {
    // Limitar o dt a 33ms para evitar saltos físicos em tabs em background
    const dt = Math.min(clock.getDelta(), 0.033);
    timeState.now = clock.elapsedTime;

    if (!game.menuOpen) {
        // Só atualizar física quando o menu está fechado
        updateMovingObstacles(timeState.now, dt);
        updateBall(dt);
    }

    updateParticles(dt);
    updateAimGuide();
    updateCamera(dt);
    updateHUD();
    renderer.render(scene, camera); requestAnimationFrame(animate);
}

animate();
