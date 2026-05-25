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

initScores();
initMenu({ loadMap });
initControls();

createLights();
createBall();
loadMap(0);

function animate() {
    const dt = Math.min(clock.getDelta(), 0.033);
    timeState.now = clock.elapsedTime;
    if (!game.menuOpen) {
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
