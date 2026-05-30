// Configuração base do Three.js: cena, renderer, câmara e relógio

import * as THREE from "three";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1114);
// Fog suave para esconder o corte da geometria ao longe
scene.fog = new THREE.Fog(0x0b1114, 24, 90);

const renderer = new THREE.WebGLRenderer({ antialias: true });
// Limitar o pixel ratio a 2x para não sobrecarregar GPUs de alta resolução
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // sombras mais suaves
document.body.appendChild(renderer.domElement);

// FOV de 60° dá uma perspetiva parecida com jogos de golf sem distorção excessiva
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 180);
const clock = new THREE.Clock();
const timeState = { now: 0 }; // tempo global partilhado para animações e obstáculos

function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", handleResize);

export { scene, renderer, camera, clock, timeState };
