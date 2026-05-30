// Estado global do jogo — tudo partilhado entre os vários módulos

import * as THREE from "three";

// Variáveis de jogo principais
const game = {
    strokes: 0,
    won: false,
    power: 7,           // força inicial da tacada
    maxPower: 20,
    minPower: 2,
    aimAngle: 0,        // ângulo de mira em radianos
    cameraYaw: 0.38,
    cameraPitch: 0.6,
    cameraDist: 9,
    currentMap: 0,
    mapName: "A Reta do Aprendiz",
    freeCam: false,
    menuOpen: true,
    started: false,
};

// Teclas de movimento (usadas no modo Free Cam)
const keys = { w: false, a: false, s: false, d: false };

const mapNames = [
    "A Reta do Aprendiz",
    "O Zigue-Zague Móvel",
    "A Cidadela dos Eixos",
    "O Círculo de Gelo",
    "A Torre da Queda Livre",
];

// Estado da bola — posição e velocidade são Vectors para facilitar operações
const ball = {
    radius: 0.28,
    mesh: null,
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    moving: false,
    restTimer: 0,           // acumula tempo parado para decidir quando parar
    surfaceType: "grass",
    lastImpactTime: -10,    // evita spam de partículas em colisões seguidas
    lastSandTime: -10,
};

// Buraco do mapa atual
const hole = { pos: new THREE.Vector3(), radius: 0.42, depth: 0.18 };

// Limites do percurso — são redefinidos em cada mapa
const course = {
    spawn: new THREE.Vector3(-10, ball.radius, 0),
    bounds: { minX: -16, maxX: 16, minZ: -9, maxZ: 9 },
};

// Se a bola cair abaixo deste Y, é reposta no spawn
const VOID_RESET_Y = -12;

// Vetores temporários reutilizáveis para evitar alocações no loop de física
const tmpVec = new THREE.Vector3();
const tmpVecB = new THREE.Vector3();

// Listas de objetos de colisão e zonas — limpas ao mudar de mapa
const colliders = [];
const movingObstacles = [];
const floorZones = [];     // define onde existe piso (e a que altura)
const courseObjects = [];  // todos os meshes do mapa atual, para poder limpar a cena

export {
    game,
    keys,
    mapNames,
    ball,
    hole,
    course,
    VOID_RESET_Y,
    tmpVec,
    tmpVecB,
    colliders,
    movingObstacles,
    floorZones,
    courseObjects,
};
