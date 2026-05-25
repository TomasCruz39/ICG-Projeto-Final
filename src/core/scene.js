import * as THREE from "three";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1114);
scene.fog = new THREE.Fog(0x0b1114, 24, 90);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 180);
const clock = new THREE.Clock();
const timeState = { now: 0 };

function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener("resize", handleResize);

export { scene, renderer, camera, clock, timeState };
