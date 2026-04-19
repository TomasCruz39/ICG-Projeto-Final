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
const hud = document.getElementById("hud");
const message = document.getElementById("message");
const clock = new THREE.Clock();

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
};

const keys = { w: false, a: false, s: false, d: false };

const mapNames = ["A Reta do Aprendiz", "O Zigue-Zague Móvel", "A Cidadela dos Eixos"];

const ball = {
    radius: 0.28,
    mesh: null,
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    moving: false,
    restTimer: 0,
    isFalling: false,
};

const hole = { pos: new THREE.Vector3(), radius: 0.42, depth: 0.18 };

const course = {
    spawn: new THREE.Vector3(-10, ball.radius, 0),
    bounds: { minX: -16, maxX: 16, minZ: -9, maxZ: 9 },
};

const tmpVec = new THREE.Vector3();
const tmpVecB = new THREE.Vector3();

const colliders = [];
const movingObstacles = [];
const frictionZones = [];
const floorZones = []; 
const courseObjects = [];

function addObject(object) {
    scene.add(object);
    courseObjects.push(object);
}

function clearCourse() {
    for (const object of courseObjects) scene.remove(object);
    courseObjects.length = 0;
    colliders.length = 0;
    movingObstacles.length = 0;
    frictionZones.length = 0;
    floorZones.length = 0; 
}

function makeCheckerTexture(colorA, colorB, size = 256, squares = 8, repeatX = 6, repeatY = 4) {
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    const cell = size / squares;
    for (let y = 0; y < squares; y++) {
        for (let x = 0; x < squares; x++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? colorA : colorB;
            ctx.fillRect(x * cell, y * cell, cell, cell);
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY); texture.anisotropy = 8;
    return texture;
}

function createLights() {
    const hemi = new THREE.HemisphereLight(0xa6ccff, 0x1a2b1e, 0.58);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.08);
    key.position.set(-8, 13, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1; key.shadow.camera.far = 80;
    key.shadow.camera.left = -28; key.shadow.camera.right = 28;
    key.shadow.camera.top = 28; key.shadow.camera.bottom = -28;
    scene.add(key);

    const fill = new THREE.PointLight(0x75bef9, 0.7, 50, 2);
    fill.position.set(0, 6, -4);
    fill.castShadow = true; fill.shadow.mapSize.set(1024, 1024);
    scene.add(fill);
}

function addBoxCollider(x, z, sx, sz, height) {
    colliders.push({ minX: x - sx / 2, maxX: x + sx / 2, minZ: z - sz / 2, maxZ: z + sz / 2, maxY: height });
}

// ================= CONSTRUTORES =================

function addFloor(x, z, sx, sz, type = "grass") {
    let colorA = "#2f7f3f", colorB = "#2a6f37";
    if (type === "dark") { colorA = "#266932"; colorB = "#215c2b"; }

    const repeatX = Math.max(1, Math.ceil(sx / 2));
    const repeatY = Math.max(1, Math.ceil(sz / 2));
    const tex = makeCheckerTexture(colorA, colorB, 512, 16, repeatX, repeatY);

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(sx, 0.35, sz),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.02 })
    );
    mesh.position.set(x, -0.175, z);
    mesh.receiveShadow = true;
    addObject(mesh);
    
    floorZones.push({ minX: x - sx / 2, maxX: x + sx / 2, minZ: z - sz / 2, maxZ: z + sz / 2 });
}

function addFloorWithHole(x, z, sx, sz, holeX, holeZ, holeRadius, type = "grass") {
    let colorA = "#2f7f3f", colorB = "#2a6f37";
    if (type === "dark") { colorA = "#266932"; colorB = "#215c2b"; }

    const tex = makeCheckerTexture(colorA, colorB, 512, 16, 0.5, 0.5);

    const shape = new THREE.Shape();
    shape.moveTo(-sx/2, sz/2);
    shape.lineTo(sx/2, sz/2);
    shape.lineTo(sx/2, -sz/2);
    shape.lineTo(-sx/2, -sz/2);
    shape.lineTo(-sx/2, sz/2);

    const holePath = new THREE.Path();
    const hx = holeX - x;
    const hz = z - holeZ; 
    holePath.absarc(hx, hz, holeRadius, 0, Math.PI * 2, false);
    shape.holes.push(holePath);

    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false, curveSegments: 32 });
    geometry.rotateX(Math.PI / 2);

    const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.02 })
    );
    mesh.position.set(x, 0, z); 
    mesh.receiveShadow = true;
    addObject(mesh);
    
    floorZones.push({ minX: x - sx / 2, maxX: x + sx / 2, minZ: z - sz / 2, maxZ: z + sz / 2 });
}

// CORREÇÃO: Função addWall agora suporta rotações (rotX, rotZ) e hitbox inteligente
function addWall(x, z, sx, sz, height = 0.28, yOffset = 0, rotX = 0, rotZ = 0) {
    const repeatX = Math.max(1, Math.ceil(sx / 3));
    const repeatY = Math.max(1, Math.ceil(sz / 3));
    const tex = makeCheckerTexture("#8f98a3", "#828b96", 256, 8, repeatX, repeatY);

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(sx, height, sz),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.06 })
    );
    mesh.position.set(x, height / 2 + yOffset, z);
    mesh.rotation.set(rotX, 0, rotZ); // Aplica a rotação
    mesh.castShadow = true; mesh.receiveShadow = true;
    addObject(mesh);
    
    // Hitbox ganha altura extra se a parede estiver inclinada
    const extraHeight = (rotX !== 0 || rotZ !== 0) ? 1.0 : 0;
    addBoxCollider(x, z, sx, sz, height + yOffset + extraHeight);
}

function addStartPad(x, z) {
    const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.72, 0.12, 30),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.2 })
    );
    pad.position.set(x, 0.06, z); pad.receiveShadow = true;
    addObject(pad);
}

function setHole(x, z, radius = 0.42) {
    hole.pos.set(x, 0, z); hole.radius = radius;
    
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.025, 16, 32),
        new THREE.MeshStandardMaterial({ color: 0x8f98a3, roughness: 0.45, metalness: 0.2 })
    );
    ring.position.set(x, 0, z); ring.rotation.x = Math.PI / 2;
    ring.receiveShadow = true;
    addObject(ring);

    const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, hole.depth, 32, 1, false),
        new THREE.MeshStandardMaterial({ color: 0x101317, roughness: 0.9, side: THREE.BackSide })
    );
    cup.position.set(x, -hole.depth / 2, z);
    addObject(cup);
}

function addFrictionZone(minX, maxX, minZ, maxZ, multiplier) {
    frictionZones.push({ minX, maxX, minZ, maxZ, multiplier });
    const sx = maxX - minX; const sz = maxZ - minZ;

    const repeatX = Math.max(1, Math.ceil(sx * 1.5));
    const repeatY = Math.max(1, Math.ceil(sz * 1.5));
    const tex = makeCheckerTexture("#d4c394", "#c2b280", 256, 16, repeatX, repeatY);

    const plate = new THREE.Mesh(
        new THREE.BoxGeometry(sx, 0.06, sz),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0.0 })
    );
    plate.position.set((minX + maxX) / 2, 0.03, (minZ + maxZ) / 2);
    plate.receiveShadow = true; addObject(plate);
}

function addMovingBar(options) {
    const tex = makeCheckerTexture("#f59e0b", "#d97706", 128, 4, 4, 1);
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(options.sx, options.sy, options.sz),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.12 })
    );
    mesh.position.set(options.x, options.sy / 2, options.z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    addObject(mesh);

    movingObstacles.push({
        type: "slideBox", mesh, axis: options.axis, baseX: options.x, baseZ: options.z,
        amplitude: options.amplitude, speed: options.speed, halfX: options.sx / 2, halfZ: options.sz / 2,
        maxY: options.sy,
        phase: options.phase || 0, velX: 0, velZ: 0,
    });
}

function addWindmill(x, z, armLength = 2.1, armThickness = 0.24, speed = 2.5) {
    const group = new THREE.Group(); group.position.set(x, 0.5, z);
    const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.26, 0.95, 22),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35 })
    );
    hub.rotation.x = Math.PI / 2; group.add(hub);

    const bladeTex = makeCheckerTexture("#ef4444", "#dc2626", 128, 4, 8, 1);
    const bladeMat = new THREE.MeshStandardMaterial({ map: bladeTex, roughness: 0.5 });
    const bladeA = new THREE.Mesh(new THREE.BoxGeometry(armLength * 2, 0.3, armThickness * 2), bladeMat);
    const bladeB = new THREE.Mesh(new THREE.BoxGeometry(armThickness * 2, 0.3, armLength * 2), bladeMat);
    group.add(bladeA); group.add(bladeB);

    group.traverse((obj) => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
    addObject(group);
    movingObstacles.push({ type: "windmill", mesh: group, speed, armLength, armThickness, maxY: 0.65 });
}

function setBounds(minX, maxX, minZ, maxZ) {
    course.bounds.minX = minX; course.bounds.maxX = maxX;
    course.bounds.minZ = minZ; course.bounds.maxZ = maxZ;
}

// ================= MAPAS =================

function buildMapEasy() {
    game.mapName = mapNames[0];
    setBounds(-22, 22, -12, 12);
    course.spawn.set(-14.2, ball.radius, 4.3);

    addFloorWithHole(-2, 0, 28, 12, 10.5, 0, 0.46, "grass");

    const texRamp = makeCheckerTexture("#2f7f3f", "#2a6f37", 512, 16, 2, 6);
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 12), new THREE.MeshStandardMaterial({ map: texRamp, roughness: 0.9, metalness: 0.02 }));
    ramp.position.set(14.1, 0.15, 0);
    ramp.rotation.z = 0.15; // Inclina para cima
    ramp.castShadow = true; ramp.receiveShadow = true;
    addObject(ramp);
    floorZones.push({ minX: 11.9, maxX: 16.3, minZ: -6, maxZ: 6 });

    // --- PAREDES (Laterais fatiadas para inclinar com a rampa) ---
    
    // Parede de cima
    addWall(-2.3, -6.25, 28.4, 0.5); // Metade plana
    addWall(14.1, -6.25, 4.6, 0.5, 0.28, 0.35, 0, 0.15); // Metade inclinada
    
    // Parede de baixo
    addWall(-2.3, 6.25, 28.4, 0.5);  // Metade plana
    addWall(14.1, 6.25, 4.6, 0.5, 0.28, 0.35, 0, 0.15); // Metade inclinada
    
    // Paredes frontal e traseira mantidas como estavam
    addWall(-16.25, 0, 0.5, 12);  
    // Tabela Final! Levantada 0.65 metros para acompanhar o topo da rampa
    addWall(16.25, 0, 0.5, 12, 0.28, 0.65);   

    addStartPad(course.spawn.x, course.spawn.z);
    addWall(0.5, -2.6, 1.7, 1.7);
    addWall(0.5, 2.6, 1.7, 1.7);
    
    setHole(10.5, 0, 0.46);
}

function buildMapMedium() {
    game.mapName = mapNames[1];
    setBounds(-24, 24, -16, 16);
    course.spawn.set(-14, ball.radius, 5);

    addFloor(-10, 5, 12, 4, "grass");
    addFloor(-2, 0, 4, 14, "dark");
    addFloorWithHole(6, -5, 12, 4, 10, -5, 0.44, "grass");

    addWall(-8, 7.25, 17, 0.5);
    addWall(-16.25, 5, 0.5, 5);
    addWall(4, -7.25, 17, 0.5);
    addWall(12.25, -5, 0.5, 5);

    addWall(-10.25, 2.75, 12.5, 0.5);
    addWall(-4.25, -2.25, 0.5, 10.5);

    addWall(6.25, -2.75, 12.5, 0.5);
    addWall(0.25, 2.25, 0.5, 10.5);

    addStartPad(course.spawn.x, course.spawn.z);
    addMovingBar({ x: -2.0, z: -2, sx: 2.5, sy: 0.75, sz: 0.45, axis: "x", amplitude: 0.8, speed: 2.0 });

    const texRamp = makeCheckerTexture("#9ca3af", "#8b95a1", 128, 4, 2, 2);
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.42, 2.2), new THREE.MeshStandardMaterial({ map: texRamp, roughness: 0.7 }));
    ramp.position.set(-2.0, 0.14, 1.5); 
    ramp.rotation.x = Math.PI / 14;
    ramp.castShadow = true; ramp.receiveShadow = true;
    addObject(ramp);

    setHole(10, -5, 0.44);
}

function buildMapHard() {
    game.mapName = mapNames[2];
    setBounds(-24, 24, -16, 16);
    course.spawn.set(-13, ball.radius, 0);

    addFloor(-9, 0, 12, 4, "grass"); 
    addFloor(2, 0, 10, 10, "dark"); 
    addFloor(10, 0, 6, 2, "grass");  

    const texIsland = makeCheckerTexture("#2f7f3f", "#2a6f37", 512, 16, 0.5, 0.5);
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 2.5, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, 0.46, 0, Math.PI * 2, false);
    shape.holes.push(holePath);
    const islandGeom = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: false, curveSegments: 36 });
    islandGeom.rotateX(Math.PI / 2);
    const island = new THREE.Mesh(islandGeom, new THREE.MeshStandardMaterial({ map: texIsland, roughness: 0.82, metalness: 0.03 }));
    island.position.set(15, 0, 0); 
    island.receiveShadow = true;
    addObject(island);

    addWall(-15.25, 0, 0.5, 5);       
    addWall(-9.25, -2.25, 12.5, 0.5); 
    addWall(-9.25, 2.25, 12.5, 0.5);  
    addWall(-3.25, -3.75, 0.5, 3.5);  
    addWall(-3.25, 3.75, 0.5, 3.5);   
    addWall(2, -5.25, 11, 0.5);       
    addWall(2, 5.25, 11, 0.5);        
    addWall(7.25, -3.25, 0.5, 4.5);   
    addWall(7.25, 3.25, 0.5, 4.5);    
    addWall(10, -1.25, 6, 0.5);       
    addWall(10, 1.25, 6, 0.5);        

    addStartPad(course.spawn.x, course.spawn.z);
    addWindmill(2, 0, 3.5, 0.3, 2.8); 
    addFrictionZone(7, 13, -1, 1, 4.8);
    setHole(15, 0, 0.46);
}

// ================= FÍSICA E JOGO =================

function loadMap(index) {
    game.currentMap = index; game.strokes = 0; game.won = false;
    clearCourse(); message.classList.remove("visible");

    if (index === 0) buildMapEasy();
    else if (index === 1) buildMapMedium();
    else buildMapHard();

    resetBall();

    const toHole = tmpVec.copy(hole.pos).sub(course.spawn);
    game.aimAngle = Math.atan2(toHole.z, toHole.x);
    game.cameraYaw = game.aimAngle + Math.PI;
    game.cameraPitch = 0.6;
}

function createBall() {
    const ballMesh = new THREE.Mesh(
        new THREE.SphereGeometry(ball.radius, 32, 24),
        new THREE.MeshStandardMaterial({ color: 0xf0f3f7, roughness: 0.26, metalness: 0.14 })
    );
    ballMesh.castShadow = true; ballMesh.receiveShadow = true;
    scene.add(ballMesh); ball.mesh = ballMesh;
}

function createAimGuide() {
    const group = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 14), new THREE.MeshBasicMaterial({ color: 0x9ef7e8 }));
    shaft.rotation.z = -Math.PI / 2; shaft.position.x = 0.5;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 18), new THREE.MeshBasicMaterial({ color: 0x5eead4 }));
    tip.rotation.z = -Math.PI / 2; tip.position.x = 1.08;
    group.add(shaft); group.add(tip); group.position.y = 0.14;
    scene.add(group); return group;
}

const aimGuide = createAimGuide();

function resetBall() {
    ball.position.copy(course.spawn); ball.velocity.set(0, 0, 0);
    ball.moving = false; ball.restTimer = 0;
    ball.isFalling = false;
    if (ball.mesh) { ball.mesh.position.copy(ball.position); ball.mesh.rotation.set(0, 0, 0); }
}

function shoot() {
    if (game.won || ball.moving) return;
    const dir = new THREE.Vector3(Math.cos(game.aimAngle), 0, Math.sin(game.aimAngle));
    ball.velocity.copy(dir.multiplyScalar(game.power));
    ball.moving = true; ball.restTimer = 0; game.strokes += 1;
}

function clampBallInsideBounds() {
    const margin = ball.radius + 0.1;
    if (ball.position.x < course.bounds.minX + margin) { ball.position.x = course.bounds.minX + margin; ball.velocity.x *= -0.85; }
    if (ball.position.x > course.bounds.maxX - margin) { ball.position.x = course.bounds.maxX - margin; ball.velocity.x *= -0.85; }
    if (ball.position.z < course.bounds.minZ + margin) { ball.position.z = course.bounds.minZ + margin; ball.velocity.z *= -0.85; }
    if (ball.position.z > course.bounds.maxZ - margin) { ball.position.z = course.bounds.maxZ - margin; ball.velocity.z *= -0.85; }
}

function resolveAABBCollision(box) {
    if (box.maxY !== undefined && ball.position.y - ball.radius > box.maxY) return false;

    let nearestX = Math.max(box.minX, Math.min(ball.position.x, box.maxX));
    let nearestZ = Math.max(box.minZ, Math.min(ball.position.z, box.maxZ));
    let dx = ball.position.x - nearestX;
    let dz = ball.position.z - nearestZ;

    let inside = false;
    if (dx === 0 && dz === 0) {
        inside = true;
        const distToMinX = ball.position.x - box.minX;
        const distToMaxX = box.maxX - ball.position.x;
        const distToMinZ = ball.position.z - box.minZ;
        const distToMaxZ = box.maxZ - ball.position.z;
        const minDist = Math.min(distToMinX, distToMaxX, distToMinZ, distToMaxZ);

        if (minDist === distToMinX) { nearestX = box.minX; dx = ball.position.x - nearestX; }
        else if (minDist === distToMaxX) { nearestX = box.maxX; dx = ball.position.x - nearestX; }
        else if (minDist === distToMinZ) { nearestZ = box.minZ; dz = ball.position.z - nearestZ; }
        else { nearestZ = box.maxZ; dz = ball.position.z - nearestZ; }
    }

    const distSq = dx * dx + dz * dz;
    if (!inside && distSq >= ball.radius * ball.radius) return false;

    const distance = Math.sqrt(Math.max(distSq, 1e-6));
    const overlap = ball.radius - distance;
    const nx = dx / distance;
    const nz = dz / distance;

    ball.position.x += nx * overlap;
    ball.position.z += nz * overlap;

    const dot = ball.velocity.x * nx + ball.velocity.z * nz;
    if (dot < 0) {
        const bounce = 0.82;
        ball.velocity.x -= (1 + bounce) * dot * nx;
        ball.velocity.z -= (1 + bounce) * dot * nz;
    }
    return true;
}

function resolveWindmillCollision(obstacle) {
    const relative = tmpVec.copy(ball.position).sub(obstacle.mesh.position);
    const local = relative.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -obstacle.mesh.rotation.y);

    const hitsXArm = Math.abs(local.x) <= obstacle.armLength + ball.radius && Math.abs(local.z) <= obstacle.armThickness + ball.radius;
    const hitsZArm = Math.abs(local.z) <= obstacle.armLength + ball.radius && Math.abs(local.x) <= obstacle.armThickness + ball.radius;
    if (!hitsXArm && !hitsZArm) return;

    if (hitsXArm && Math.abs(local.z) <= Math.abs(local.x)) local.z = (local.z >= 0 ? 1 : -1) * (obstacle.armThickness + ball.radius);
    else local.x = (local.x >= 0 ? 1 : -1) * (obstacle.armThickness + ball.radius);

    const worldLocal = local.applyAxisAngle(new THREE.Vector3(0, 1, 0), obstacle.mesh.rotation.y);
    ball.position.x = obstacle.mesh.position.x + worldLocal.x;
    ball.position.z = obstacle.mesh.position.z + worldLocal.z;

    const bladeVelX = obstacle.speed * worldLocal.z;
    const bladeVelZ = -obstacle.speed * worldLocal.x;
    ball.velocity.x += bladeVelX * 0.6;
    ball.velocity.z += bladeVelZ * 0.6;
}

function resolveObstacleCollision(obstacle) {
    if (obstacle.maxY !== undefined && ball.position.y - ball.radius > obstacle.maxY) return;

    if (obstacle.type === "slideBox") {
        const box = { minX: obstacle.mesh.position.x - obstacle.halfX, maxX: obstacle.mesh.position.x + obstacle.halfX, minZ: obstacle.mesh.position.z - obstacle.halfZ, maxZ: obstacle.mesh.position.z + obstacle.halfZ, maxY: obstacle.maxY };
        if (resolveAABBCollision(box)) {
            if (obstacle.axis === "x") ball.velocity.x += (obstacle.velX || 0) * 0.55;
            else ball.velocity.z += (obstacle.velZ || 0) * 0.55;
        }
    } else if (obstacle.type === "windmill") {
        resolveWindmillCollision(obstacle);
    }
}

function updateMovingObstacles(time, dt) {
    for (const obstacle of movingObstacles) {
        const prevX = obstacle.mesh.position.x; const prevZ = obstacle.mesh.position.z;
        if (obstacle.type === "slideBox") {
            const phase = obstacle.phase || 0;
            if (obstacle.axis === "x") obstacle.mesh.position.x = obstacle.baseX + Math.sin(time * obstacle.speed + phase) * obstacle.amplitude;
            else obstacle.mesh.position.z = obstacle.baseZ + Math.sin(time * obstacle.speed + phase) * obstacle.amplitude;
        } else if (obstacle.type === "windmill") {
            obstacle.mesh.rotation.y = time * obstacle.speed;
        }
        if (dt > 0) { obstacle.velX = (obstacle.mesh.position.x - prevX) / dt; obstacle.velZ = (obstacle.mesh.position.z - prevZ) / dt; }
    }
}

function getFrictionMultiplier() {
    let multiplier = 1;
    for (const zone of frictionZones) {
        if (ball.position.x >= zone.minX && ball.position.x <= zone.maxX && ball.position.z >= zone.minZ && ball.position.z <= zone.maxZ) multiplier = Math.max(multiplier, zone.multiplier);
    }
    return multiplier;
}

function updateBall(dt) {
    if (game.won) {
        const targetY = -hole.depth + ball.radius;
        if (ball.position.y > targetY) {
            ball.position.y = Math.max(targetY, ball.position.y - 2 * dt);
            ball.position.x += (hole.pos.x - ball.position.x) * 8 * dt;
            ball.position.z += (hole.pos.z - ball.position.z) * 8 * dt;
            if (ball.mesh) ball.mesh.position.copy(ball.position);
        }
        return;
    }

    if (ball.isFalling) {
        ball.position.y -= 8 * dt;
        ball.position.addScaledVector(ball.velocity, dt);
        if (ball.mesh) ball.mesh.position.copy(ball.position);

        if (ball.position.y < -4) {
            resetBall();
            game.strokes += 1;
        }
        return;
    }

    if (!ball.moving) return;

    const prevX = ball.position.x; 
    const prevZ = ball.position.z;

    // --- GRAVIDADE DAS RAMPAS ---
    let isOnSlope = false;
    if (game.currentMap === 0) { 
        if (ball.position.x > 11.9 && ball.position.x < 16.3) {
            isOnSlope = true;
            ball.velocity.x -= 4.5 * dt; 
        }
    } else if (game.currentMap === 1) { 
        if (ball.position.x > -3.4 && ball.position.x < -0.6 && ball.position.z > 0.4 && ball.position.z < 2.6) {
            isOnSlope = true;
            ball.velocity.z += 4.5 * dt; 
        }
    }

    ball.position.addScaledVector(ball.velocity, dt);

    if (game.currentMap === 1) {
        const backZ = 0.4;   
        const frontZ = 2.6;  
        const leftX = -3.4;  
        const rightX = -0.6; 
        const margin = ball.radius;

        if (ball.position.x > leftX && ball.position.x < rightX) {
            if (prevZ <= backZ - margin && ball.position.z > backZ - margin) {
                ball.position.z = backZ - margin;
                ball.velocity.z *= -0.82; 
            }
        }

        if (ball.position.z > backZ && ball.position.z < frontZ) {
            if (prevX <= leftX - margin && ball.position.x > leftX - margin) {
                ball.position.x = leftX - margin;
                ball.velocity.x *= -0.82; 
            }
            else if (prevX >= rightX + margin && ball.position.x < rightX + margin) {
                ball.position.x = rightX + margin;
                ball.velocity.x *= -0.82; 
            }
        }
    }

    const baseDrag = 1.4;
    const drag = baseDrag * getFrictionMultiplier();
    ball.velocity.multiplyScalar(Math.exp(-drag * dt));

    clampBallInsideBounds();
    for (const box of colliders) resolveAABBCollision(box);
    for (const obstacle of movingObstacles) resolveObstacleCollision(obstacle);

    const speedSq = ball.velocity.lengthSq();
    const movedSq = (ball.position.x - prevX) ** 2 + (ball.position.z - prevZ) ** 2;

    if (speedSq < 0.08 && movedSq < 0.0005) ball.restTimer += dt;
    else ball.restTimer = 0;

    if (!isOnSlope && (ball.restTimer > 0.22 || speedSq < 0.015)) {
        ball.velocity.set(0, 0, 0); ball.moving = false; ball.restTimer = 0;
    }

    const toHole = tmpVecB.copy(hole.pos).sub(ball.position);
    if (!game.won && Math.hypot(toHole.x, toHole.z) < hole.radius * 0.82 && ball.velocity.length() < 2.2) {
        game.won = true; ball.moving = false; ball.velocity.set(0, 0, 0);
        message.innerHTML = `🏁 ${game.mapName} concluído!<br>Tacadas: <b>${game.strokes}</b><br><small>R = repetir | 1/2/3 = mapa</small>`;
        message.classList.add("visible");
    }

    // --- SISTEMA DE QUEDA E SUBIDA ---
    let targetGroundY = 0; 
    let onFloor = false;

    for (const f of floorZones) {
        if (ball.position.x >= f.minX - 0.05 && ball.position.x <= f.maxX + 0.05 && 
            ball.position.z >= f.minZ - 0.05 && ball.position.z <= f.maxZ + 0.05) {
            onFloor = true;
            break;
        }
    }

    if (game.currentMap === 0) { 
        if (ball.position.x > 11.9 && ball.position.x < 16.3) {
            targetGroundY = (ball.position.x - 11.9) * 0.151; 
            if (ball.velocity.x > 0) {
                ball.velocity.y = ball.velocity.x * 0.151; 
            }
        }
    } else if (game.currentMap === 1) { 
        if (ball.position.x > -3.4 && ball.position.x < -0.6 && ball.position.z > 0.4 && ball.position.z < 2.6) {
            targetGroundY = ((2.6 - ball.position.z) / 2.2) * 0.42; 
            if (ball.velocity.z < 0) {
                ball.velocity.y = Math.abs(ball.velocity.z) * (0.42 / 2.2); 
            }
        }
    } else if (game.currentMap === 2) {
        const distParaCentroIlha = Math.hypot(ball.position.x - 15, ball.position.z - 0);
        if (ball.position.x > 12.8 && distParaCentroIlha <= 2.5) {
            onFloor = true;
        }
    }

    if (!onFloor && !game.won) {
        ball.isFalling = true;
        targetGroundY = -20; 
    }

    const groundCenterY = targetGroundY + ball.radius;

    if (ball.position.y > groundCenterY) {
        ball.velocity.y -= 16 * dt; 
    }

    ball.position.y += ball.velocity.y * dt;

    if (ball.position.y <= groundCenterY && !ball.isFalling) {
        ball.position.y = groundCenterY; 
        if (ball.velocity.y < -1.5) {
            ball.velocity.y *= -0.3; 
        } else {
            ball.velocity.y = 0; 
        }
    }

    if (ball.mesh) {
        ball.mesh.position.copy(ball.position);
        const speed = ball.velocity.length();
        if (speed > 0.001) ball.mesh.rotateOnWorldAxis(new THREE.Vector3(ball.velocity.z, 0, -ball.velocity.x).normalize(), (speed * dt) / ball.radius);
    }
}

function updateCamera(dt) {
    if (game.freeCam) {
        const speed = 12 * dt;

        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

        if (keys.w) camera.position.addScaledVector(dir, speed);
        if (keys.s) camera.position.addScaledVector(dir, -speed);
        if (keys.a) camera.position.addScaledVector(right, -speed);
        if (keys.d) camera.position.addScaledVector(right, speed);

        camera.rotation.order = "YXZ";
        camera.rotation.set(-game.cameraPitch, game.cameraYaw - Math.PI / 2, 0);
    } else {
        const target = new THREE.Vector3(ball.position.x, 0.35, ball.position.z);
        const cosPitch = Math.cos(game.cameraPitch);
        camera.position.set(
            target.x + Math.cos(game.cameraYaw) * cosPitch * game.cameraDist,
            target.y + Math.sin(game.cameraPitch) * game.cameraDist + 1.2,
            target.z + Math.sin(game.cameraYaw) * cosPitch * game.cameraDist
        );
        camera.lookAt(target);
    }
}

function updateAimGuide() {
    aimGuide.visible = !ball.moving && !game.won;
    if (!aimGuide.visible) return;
    aimGuide.position.set(ball.position.x, 0.14, ball.position.z);
    aimGuide.rotation.y = -game.aimAngle;
    aimGuide.scale.set(1 + (game.power / game.maxPower) * 4, 1, 1);
}

function updateHUD() {
    hud.innerHTML = `<b>Mini-Golfe 3D</b><br>Mapa: <b>${game.currentMap + 1} - ${game.mapName}</b><br>Tacadas: <b>${game.strokes}</b><br>Força: <b>${game.power.toFixed(1)}</b> (${Math.round((game.power / game.maxPower) * 100)}%)<br>Estado: <b>${game.won ? "Concluído" : ball.moving ? "Em movimento" : "Pronto para tacar"}</b><br>Câmara: <b>${game.freeCam ? "Free Cam" : "Jogo"}</b><hr style="border:0;border-top:1px solid rgba(255,255,255,.2);margin:8px 0">Rato esquerdo: câmara | Rato direito: mira<br>Setas ↑/↓: força | Espaço/Enter: tacada<br>R: reiniciar mapa | 1/2/3: trocar mapa | F: Free Cam | WASD: mover`;
}

// ================= INPUTS E LOOP =================

const input = { draggingCamera: false, draggingAim: false, prevX: 0, prevY: 0, activePointerId: null };
window.addEventListener("contextmenu", (e) => e.preventDefault());

renderer.domElement.addEventListener("pointerdown", (e) => {
    renderer.domElement.setPointerCapture(e.pointerId); input.activePointerId = e.pointerId;
    input.prevX = e.clientX; input.prevY = e.clientY;
    if (e.button === 0) input.draggingCamera = true;
    if (e.button === 2) input.draggingAim = true;
});

window.addEventListener("pointerup", (e) => {
    if (input.activePointerId !== null && e.pointerId !== input.activePointerId) return;
    input.activePointerId = null; input.draggingCamera = false; input.draggingAim = false;
});

window.addEventListener("pointermove", (e) => {
    if (input.activePointerId !== null && e.pointerId !== input.activePointerId) return;
    const dx = e.clientX - input.prevX; const dy = e.clientY - input.prevY;
    input.prevX = e.clientX; input.prevY = e.clientY;
    if (input.draggingCamera) {
        game.cameraYaw -= dx * 0.004;
        if (game.freeCam) game.cameraPitch -= dy * 0.0032;
        else game.cameraPitch = THREE.MathUtils.clamp(game.cameraPitch - dy * 0.0032, 0.17, 1.2);
    }
    if (input.draggingAim && !ball.moving && !game.won) game.aimAngle -= dx * 0.008;
});

window.addEventListener("wheel", (e) => game.cameraDist = THREE.MathUtils.clamp(game.cameraDist + e.deltaY * 0.007, 4.2, 16));

window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(keys, key)) keys[key] = true;
    if (key === "arrowup") game.power = Math.min(game.maxPower, game.power + 0.6);
    else if (key === "arrowdown") game.power = Math.max(game.minPower, game.power - 0.6);
    else if (key === " " || key === "enter") shoot();
    else if (key === "r") { game.strokes = 0; game.won = false; message.classList.remove("visible"); resetBall(); }
    else if (["1", "2", "3"].includes(key)) loadMap(Number(key) - 1);
    else if (key === "f") {
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

window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(keys, key)) keys[key] = false;
});

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
    const dt = Math.min(clock.getDelta(), 0.033);
    updateMovingObstacles(clock.elapsedTime, dt); updateBall(dt); updateAimGuide(); updateCamera(dt); updateHUD();
    renderer.render(scene, camera); requestAnimationFrame(animate);
}

createLights(); createBall(); loadMap(0); animate();