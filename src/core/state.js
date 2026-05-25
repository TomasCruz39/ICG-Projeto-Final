import * as THREE from "three";

const game = {
    strokes: 0,
    won: false,
    power: 7,
    maxPower: 20,
    minPower: 2,
    aimAngle: 0,
    cameraYaw: 0.38,
    cameraPitch: 0.6,
    cameraDist: 9,
    currentMap: 0,
    mapName: "A Reta do Aprendiz",
    freeCam: false,
    menuOpen: true,
    started: false,
};

const keys = { w: false, a: false, s: false, d: false };

const mapNames = [
    "A Reta do Aprendiz",
    "O Zigue-Zague Móvel",
    "A Cidadela dos Eixos",
    "O Círculo de Gelo",
    "A Torre da Queda Livre",
];

const ball = {
    radius: 0.28,
    mesh: null,
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    moving: false,
    restTimer: 0,
    surfaceType: "grass",
    lastImpactTime: -10,
    lastSandTime: -10,
    lastBoostZone: -1,
};

const hole = { pos: new THREE.Vector3(), radius: 0.42, depth: 0.18 };

const course = {
    spawn: new THREE.Vector3(-10, ball.radius, 0),
    bounds: { minX: -16, maxX: 16, minZ: -9, maxZ: 9 },
};

const VOID_RESET_Y = -12;

const tmpVec = new THREE.Vector3();
const tmpVecB = new THREE.Vector3();

const colliders = [];
const movingObstacles = [];
const frictionZones = [];
const boostZones = [];
const floorZones = [];
const courseObjects = [];

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
    frictionZones,
    boostZones,
    floorZones,
    courseObjects,
};
