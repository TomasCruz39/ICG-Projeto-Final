// Controlos de teclado e rato: câmara, mira, tacada e navegação de mapas

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
    // Desativar menu de contexto para o botão direito do rato funcionar como mira
    window.addEventListener("contextmenu", (e) => e.preventDefault());

    renderer.domElement.addEventListener("pointerdown", (e) => {
        unlockAudio(); // primeiro clique desbloqueia o AudioContext
        if (game.menuOpen) return;
        
        if (e.pointerType === "touch") {
            // Primeiro toque no ecrã — ativar a UI móvel uma única vez
            if (!input.isMobile) {
                input.isMobile = true;
                const mUI = document.getElementById("mobile-ui");
                if (mUI) mUI.classList.add("visible");
            }
            // Registar a posição deste dedo no mapa de toques ativos
            input.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
            
            if (input.activeTouches.size === 2) {
                // Dois dedos no ecrã: inicializar pinch-to-zoom e suspender arrastamentos
                const touches = Array.from(input.activeTouches.values());
                input.initialPinchDist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
                input.draggingCamera = false; input.draggingAim = false;
                return;
            } else if (input.activeTouches.size === 1) {
                // Um dedo: capturar o pointer e iniciar câmara ou mira consoante o modo ativo
                try { renderer.domElement.setPointerCapture(e.pointerId); } catch (_) {}
                input.activePointerId = e.pointerId;
                input.prevX = e.clientX; input.prevY = e.clientY;
                if (input.mobileAimMode) input.draggingAim = true;
                else input.draggingCamera = true;
            }
        } else {
            // Rato: botão esquerdo roda a câmara; botão direito ajusta a mira
            renderer.domElement.setPointerCapture(e.pointerId); input.activePointerId = e.pointerId;
            input.prevX = e.clientX; input.prevY = e.clientY;
            if (e.button === 0) input.draggingCamera = true;
            if (e.button === 2) input.draggingAim = true;
        }
    });

    window.addEventListener("pointerup", (e) => {
        if (e.pointerType === "touch") {
            // Remover este dedo do mapa; se ficou só 1 dedo, reiniciar o pinch
            input.activeTouches.delete(e.pointerId);
            if (input.activeTouches.size < 2) input.initialPinchDist = null;
            if (e.pointerId === input.activePointerId) {
                // O dedo principal saiu — parar arrastamentos
                input.activePointerId = null; input.draggingCamera = false; input.draggingAim = false;
                if (input.activeTouches.size === 1) {
                    // Se ainda existe 1 dedo no ecrã, reassociar o tracking a esse dedo
                    const [id, touch] = Array.from(input.activeTouches.entries())[0];
                    input.activePointerId = id;
                    input.prevX = touch.x; input.prevY = touch.y;
                    if (input.mobileAimMode) input.draggingAim = true;
                    else input.draggingCamera = true;
                }
            }
        } else {
            // Rato: ignorar eventos de outros pointers; limpar estado ao soltar
            if (input.activePointerId !== null && e.pointerId !== input.activePointerId) return;
            input.activePointerId = null; input.draggingCamera = false; input.draggingAim = false;
        }
    });

    // pointercancel: o browser cancelou o toque (notificação, scroll externo, etc.)
    // Sem este handler, o pointerId fica no activeTouches e o próximo toque é
    // contado como 2.º dedo, entrando em modo pinch e bloqueando a mira.
    const cancelTouch = (e) => {
        if (e.pointerType !== "touch") return;
        input.activeTouches.delete(e.pointerId);
        if (input.activeTouches.size < 2) input.initialPinchDist = null;
        if (e.pointerId === input.activePointerId) {
            input.activePointerId = null;
            input.draggingCamera = false;
            input.draggingAim = false;
        }
    };
    window.addEventListener("pointercancel", cancelTouch);
    // pointerleave no canvas também pode acontecer quando o dedo sai da janela
    renderer.domElement.addEventListener("pointercancel", cancelTouch);

    window.addEventListener("pointermove", (e) => {
        if (e.pointerType === "touch") {
            // Ignorar completamente toques que não foram registados no canvas
            if (!input.activeTouches.has(e.pointerId)) return;
            // Atualizar posição deste dedo no mapa de toques
            input.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (input.activeTouches.size === 2 && input.initialPinchDist !== null) {
                // Pinch-to-zoom: comparar distância atual com a anterior para calcular delta de zoom
                const touches = Array.from(input.activeTouches.values());
                const currentDist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
                const delta = input.initialPinchDist - currentDist;
                game.cameraDist = THREE.MathUtils.clamp(game.cameraDist + delta * 0.05, 4.2, 16);
                input.initialPinchDist = currentDist; // guardar para o próximo frame
                return; // não processar como arrastamento simples
            }
        }

        // Ignorar movimentos de pointers que não sejam o ativo
        if (input.activePointerId !== null && e.pointerId !== input.activePointerId) return;
        // Para toques: se não houver pointer ativo, ignorar (evita corromper prevX/Y com toques nos botões)
        if (e.pointerType === "touch" && input.activePointerId === null) return;
        const dx = e.clientX - input.prevX; const dy = e.clientY - input.prevY;
        input.prevX = e.clientX; input.prevY = e.clientY;
        if (game.menuOpen) return;
        // Arrastar a câmara ajusta o yaw e o pitch da câmara orbital
        if (input.draggingCamera) {
            game.cameraYaw -= dx * 0.004;
            // Em Free Cam o pitch é livre; em jogo é limitado para não virar ao contrário
            if (game.freeCam) game.cameraPitch -= dy * 0.0032;
            else game.cameraPitch = THREE.MathUtils.clamp(game.cameraPitch - dy * 0.0032, 0.17, 1.2);
        }
        // Arrastar com mira ativa roda apenas a direção da tacada (não se move enquanto a bola está em movimento)
        if (input.draggingAim && !ball.moving && !game.won) game.aimAngle -= dx * 0.008;
    });

    // Scroll para zoom da câmara orbital
    window.addEventListener("wheel", (e) => game.cameraDist = THREE.MathUtils.clamp(game.cameraDist + e.deltaY * 0.007, 4.2, 16));

    window.addEventListener("keydown", (e) => {
        unlockAudio();
        const key = e.key.toLowerCase();

        // Esc e M alternam o menu
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

        // Atualizar o mapa de teclas pressionadas (usado pelo sistema de Free Cam com WASD)
        if (Object.prototype.hasOwnProperty.call(keys, key)) keys[key] = true;

        // Setas ou W/S (fora do Free Cam): ajustar a força da próxima tacada
        if (key === "arrowup" || (!game.freeCam && key === "w")) game.power = Math.min(game.maxPower, game.power + 0.6);
        else if (key === "arrowdown" || (!game.freeCam && key === "s")) game.power = Math.max(game.minPower, game.power - 0.6);
        // Espaço ou Enter: efetuar a tacada
        else if (key === " " || key === "enter") shoot();
        else if (key === "r") {
            // Reiniciar sem contar tacada extra
            game.strokes = 0; game.won = false;
            if (message) message.classList.remove("visible");
            resetBall();
        }
        // Teclas 1-9: carregar o mapa correspondente diretamente
        else if (/^[1-9]$/.test(key)) {
            const index = Number(key) - 1;
            if (index >= 0 && index < mapNames.length) loadMap(index);
        }
        else if (key === "f") {
            // Alternar Free Cam — ao sair, preservar o yaw/pitch atuais
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

    // Limpar teclas pressionadas ao soltar (evita que fiquem "presas" ao alt-tab, etc.)
    window.addEventListener("keyup", (e) => {
        const key = e.key.toLowerCase();
        if (Object.prototype.hasOwnProperty.call(keys, key)) keys[key] = false;
    });

    // Ligar os botões e controlos da UI móvel aos sistemas do jogo
    const mobileUI = document.getElementById("mobile-ui");
    if (mobileUI) {
        // Botão ☰: abrir/fechar menu
        document.getElementById("mobile-menu").addEventListener("pointerdown", (e) => {
            e.preventDefault(); unlockAudio();
            if (game.menuOpen) closeMenu(); else openMenu();
        });
        // Botão ↻: reiniciar o mapa sem contabilizar tacada
        document.getElementById("mobile-reset").addEventListener("pointerdown", (e) => {
            e.preventDefault(); unlockAudio();
            game.strokes = 0; game.won = false;
            if (message) message.classList.remove("visible");
            resetBall();
        });
        // Botão toggle: alternar entre modo "Mover Câmara" e "Mover Mira"
        // Atualiza o texto e a cor do botão para reflectir o modo atual
        document.getElementById("mobile-aim-toggle").addEventListener("pointerdown", (e) => {
            e.preventDefault(); unlockAudio();
            input.mobileAimMode = !input.mobileAimMode;
            e.target.textContent = input.mobileAimMode ? "Mover Mira" : "Mover Câmara";
            e.target.style.borderColor = input.mobileAimMode ? "var(--accent-2)" : "var(--panel-border)";
            e.target.style.color = input.mobileAimMode ? "var(--accent-2)" : "var(--ink)";
        });
        // Botão 👁: mostrar/ocultar o HUD do canto superior esquerdo
        document.getElementById("mobile-hud-toggle").addEventListener("pointerdown", (e) => {
            e.preventDefault(); unlockAudio();
            const hudEl = document.getElementById("hud");
            if (!hudEl) return;
            const hidden = hudEl.classList.toggle("hidden");
            e.target.textContent = hidden ? "👁\u{FE0E}" : "👁";
            e.target.style.opacity = hidden ? "0.45" : "1";
        });
        // Botão grande: disparar tacada (equivalente a Espaço/Enter)
        document.getElementById("mobile-shoot").addEventListener("pointerdown", (e) => {
            e.preventDefault(); unlockAudio(); shoot();
        });
        // Slider de força: mapear o valor 0-1 do range para o intervalo [minPower, maxPower]
        document.getElementById("mobile-power").addEventListener("input", (e) => {
            game.power = game.minPower + parseFloat(e.target.value) * (game.maxPower - game.minPower);
        });
        
        // Sincronizar o slider caso o power mude pelas setas do teclado
        // (loop de rAF — corre sempre mas só escreve no slider em desktop com touch screen)
        const updateSlider = () => {
            const slider = document.getElementById("mobile-power");
            if (slider && !input.isMobile) {
                slider.value = (game.power - game.minPower) / (game.maxPower - game.minPower);
            }
            requestAnimationFrame(updateSlider);
        };
        updateSlider();
    }
}

export { initControls };
