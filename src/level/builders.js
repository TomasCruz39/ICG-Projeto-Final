// Funções construtoras de elementos de nível: pisos, paredes, obstáculos e zonas especiais
// Usa caches de geometria, material e textura para não recriar assets repetidos

import * as THREE from "three";
import { scene } from "../core/scene.js";
import {
    ball,
    hole,
    course,
    colliders,
    movingObstacles,
    floorZones,
    courseObjects,
} from "../core/state.js";


// Adicionar um objeto à cena e registá-lo na lista do mapa atual
function addObject(object) {
    scene.add(object);
    courseObjects.push(object);
}

// Limpar tudo ao mudar de mapa: remover da cena e esvaziar todas as listas
function clearCourse() {
    for (const object of courseObjects) scene.remove(object);
    courseObjects.length = 0;
    colliders.length = 0;
    movingObstacles.length = 0;
    floorZones.length = 0;
}

// Caches partilhadas entre todos os mapas — reduzem drasticamente a memória de VRAM
const textureCache = {};
const materialCache = {};
const geomCache = {};

// BoxGeometry cacheada por dimensões — evita criar geometrias duplicadas
function getCachedBoxGeom(sx, sy, sz) {
    const key = `${sx}_${sy}_${sz}`;
    if (geomCache[key]) return geomCache[key];
    const geom = new THREE.BoxGeometry(sx, sy, sz);
    geomCache[key] = geom;
    return geom;
}

// MeshStandardMaterial cacheado por parâmetros — a chave inclui todos os campos relevantes
function getCachedMaterial(map, roughness, metalness, color, emissive, emissiveIntensity, side) {
    const key = `${map ? map.uuid : 'none'}_${roughness}_${metalness}_${color || 'none'}_${emissive ? emissive.getHex() : 'none'}_${emissiveIntensity || 0}_${side || THREE.FrontSide}`;
    if (materialCache[key]) return materialCache[key];
    
    const matParams = { roughness, metalness };
    if (map) matParams.map = map;
    if (color !== undefined) matParams.color = color;
    if (emissive) { matParams.emissive = emissive; matParams.emissiveIntensity = emissiveIntensity; }
    if (side !== undefined) matParams.side = side;

    const mat = new THREE.MeshStandardMaterial(matParams);
    materialCache[key] = mat;
    return mat;
}

// Gerar textura de xadrez via Canvas 2D — sem ficheiros de imagem externos
function makeCheckerTexture(colorA, colorB, size = 256, squares = 8, repeatX = 6, repeatY = 4) {
    const key = `${colorA}_${colorB}_${size}_${squares}_${repeatX}_${repeatY}`;
    if (textureCache[key]) return textureCache[key];

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
    texture.repeat.set(repeatX, repeatY); texture.anisotropy = 4;
    
    textureCache[key] = texture;
    return texture;
}

// Iluminação global: HemisphereLight para ambient + DirectionalLight para sombras + PointLight de fill
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
    // castShadow removido da PointLight — evitaria 6 renders de sombra por frame
    scene.add(fill);
}

// Adicionar um colisor AABB invisível (apenas dados, sem mesh)
function addBoxCollider(x, z, sx, sz, minY, maxY) {
    colliders.push({ minX: x - sx / 2, maxX: x + sx / 2, minZ: z - sz / 2, maxZ: z + sz / 2, minY, maxY });
}

// Criar um piso plano com textura gerada proceduralmente e registar a zona de piso
function addFloor(x, z, sx, sz, type = "grass", topY = 0) {
    let colorA = "#2f7f3f", colorB = "#2a6f37";
    if (type === "dark") { colorA = "#266932"; colorB = "#215c2b"; }
    else if (type === "ice") { colorA = "#7dd3fc"; colorB = "#60a5fa"; }
    else if (type === "sand") { colorA = "#d4c394"; colorB = "#c2b280"; }

    // Mais repetições de textura na areia para o padrão parecer mais fino
    let repeatX = Math.max(1, Math.ceil(sx / 2));
    let repeatY = Math.max(1, Math.ceil(sz / 2));
    if (type === "sand") {
        repeatX = Math.max(1, Math.ceil(sx * 1.5));
        repeatY = Math.max(1, Math.ceil(sz * 1.5));
    }
    const tex = makeCheckerTexture(colorA, colorB, type === "sand" ? 256 : 512, 16, repeatX, repeatY);

    const mesh = new THREE.Mesh(
        getCachedBoxGeom(sx, 0.1, sz),
        getCachedMaterial(tex, 0.9, 0.02)
    );
    mesh.position.set(x, topY - 0.05, z);
    mesh.receiveShadow = true;
    addObject(mesh);

    floorZones.push({ minX: x - sx / 2, maxX: x + sx / 2, minZ: z - sz / 2, maxZ: z + sz / 2, height: topY, type });
}

// Criar um piso com buraco circular usando ExtrudeGeometry + Shape com hole
// fallThrough=true → bola cai pelo centro; false → vitória ao chegar ao buraco
function addFloorWithHole(x, z, sx, sz, holeX, holeZ, holeRadius, type = "grass", topY = 0, fallThrough = false) {
    let colorA = "#2f7f3f", colorB = "#2a6f37";
    if (type === "dark") { colorA = "#266932"; colorB = "#215c2b"; }
    else if (type === "ice") { colorA = "#7dd3fc"; colorB = "#60a5fa"; }
    else if (type === "sand") { colorA = "#d4c394"; colorB = "#c2b280"; }

    const tex = makeCheckerTexture(colorA, colorB, 512, 16, 0.5, 0.5);

    // Contorno exterior do piso
    const shape = new THREE.Shape();
    shape.moveTo(-sx / 2, sz / 2);
    shape.lineTo(sx / 2, sz / 2);
    shape.lineTo(sx / 2, -sz / 2);
    shape.lineTo(-sx / 2, -sz / 2);
    shape.lineTo(-sx / 2, sz / 2);

    // Buraco circular subtrai ao shape
    const holePath = new THREE.Path();
    const hx = holeX - x;
    const hz = holeZ - z;
    holePath.absarc(hx, hz, holeRadius, 0, Math.PI * 2, false);
    shape.holes.push(holePath);

    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false, curveSegments: 32 });
    geometry.rotateX(Math.PI / 2); // ExtrudeGeometry gera em XY, precisamos de rodar para XZ

    const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.02 })
    );
    mesh.position.set(x, topY, z);
    mesh.receiveShadow = true;
    addObject(mesh);

    if (fallThrough) {
        // Registar 4 faixas de piso à volta do buraco — o centro fica vazio para a bola cair
        const fx0 = x - sx / 2, fx1 = x + sx / 2;
        const fz0 = z - sz / 2, fz1 = z + sz / 2;
        const hR = holeRadius;
        if (fz0 < holeZ - hR) floorZones.push({ minX: fx0, maxX: fx1, minZ: fz0, maxZ: holeZ - hR, height: topY, type });
        if (holeZ + hR < fz1) floorZones.push({ minX: fx0, maxX: fx1, minZ: holeZ + hR, maxZ: fz1, height: topY, type });
        if (fx0 < holeX - hR) floorZones.push({ minX: fx0, maxX: holeX - hR, minZ: Math.max(fz0, holeZ - hR), maxZ: Math.min(fz1, holeZ + hR), height: topY, type });
        if (holeX + hR < fx1) floorZones.push({ minX: holeX + hR, maxX: fx1, minZ: Math.max(fz0, holeZ - hR), maxZ: Math.min(fz1, holeZ + hR), height: topY, type });
    } else {
        // Buraco de vitória: registar todo o retângulo — a deteção de vitória é feita pelo raio do buraco
        floorZones.push({ minX: x - sx / 2, maxX: x + sx / 2, minZ: z - sz / 2, maxZ: z + sz / 2, height: topY, type });
    }
}

// Parede com textura de pedra e colisor AABB correspondente
function addWall(x, z, sx, sz, height = 0.28, yOffset = 0, rotX = 0, rotZ = 0) {
    const repeatX = Math.max(1, Math.ceil(sx / 3));
    const repeatY = Math.max(1, Math.ceil(sz / 3));
    const tex = makeCheckerTexture("#8f98a3", "#828b96", 256, 8, repeatX, repeatY);

    const mesh = new THREE.Mesh(
        getCachedBoxGeom(sx, height, sz),
        getCachedMaterial(tex, 0.7, 0.06)
    );
    mesh.position.set(x, height / 2 + yOffset, z);
    mesh.rotation.set(rotX, 0, rotZ);
    mesh.castShadow = true; mesh.receiveShadow = true;
    addObject(mesh);

    // Margem extra na altura do colisor para paredes inclinadas (rotX ou rotZ)
    const extraHeight = (rotX !== 0 || rotZ !== 0) ? 1.0 : 0;
    addBoxCollider(x, z, sx, sz, yOffset, yOffset + height + extraHeight);
}



// Definir o buraco: atualizar o estado global, criar o anel metálico e a cavidade escura
function setHole(x, z, radius = 0.42, y = 0) {
    hole.pos.set(x, y, z); hole.radius = radius;

    // Anel visual em torno do buraco
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.025, 16, 32),
        new THREE.MeshStandardMaterial({ color: 0x8f98a3, roughness: 0.45, metalness: 0.2 })
    );
    ring.position.set(x, y, z); ring.rotation.x = Math.PI / 2;
    ring.receiveShadow = true;
    addObject(ring);

    // Cilindro interior com BackSide para simular a profundidade do buraco
    const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, hole.depth, 32, 1, false),
        new THREE.MeshStandardMaterial({ color: 0x101317, roughness: 0.9, side: THREE.BackSide })
    );
    cup.position.set(x, y - hole.depth / 2, z);
    addObject(cup);
}


// Barra deslizante animada — o movimento sinusoidal é calculado em updateMovingObstacles()
function addMovingBar(options) {
    const tex = makeCheckerTexture("#f59e0b", "#d97706", 128, 4, 4, 1);
    const baseY = options.y || 0;
    const mesh = new THREE.Mesh(
        getCachedBoxGeom(options.sx, options.sy, options.sz),
        getCachedMaterial(tex, 0.5, 0.12)
    );
    mesh.position.set(options.x, baseY + options.sy / 2, options.z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    addObject(mesh);

    movingObstacles.push({
        type: "slideBox", mesh, axis: options.axis, baseX: options.x, baseZ: options.z,
        amplitude: options.amplitude, speed: options.speed, halfX: options.sx / 2, halfZ: options.sz / 2,
        maxY: baseY + options.sy,
        phase: options.phase || 0, velX: 0, velZ: 0,
    });
}

// Obstáculo giratório com hub central e duas pás cruzadas em X
// A colisão é tratada em resolveRotatingObstacleCollision() com transformação para espaço local
function addRotatingObstacle(x, z, armLength = 2.1, armThickness = 0.24, speed = 2.5, y = 0) {
    const group = new THREE.Group(); group.position.set(x, y + 0.5, z);
    const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.26, 0.95, 22),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35 })
    );
    hub.rotation.x = Math.PI / 2; group.add(hub);

    // Duas pás perpendiculares — juntas formam a cruz do obstáculo giratório
    const bladeTex = makeCheckerTexture("#ef4444", "#dc2626", 128, 4, 8, 1);
    const bladeMat = new THREE.MeshStandardMaterial({ map: bladeTex, roughness: 0.5 });
    const bladeA = new THREE.Mesh(new THREE.BoxGeometry(armLength * 2, 0.3, armThickness * 2), bladeMat);
    const bladeB = new THREE.Mesh(new THREE.BoxGeometry(armThickness * 2, 0.3, armLength * 2), bladeMat);
    group.add(bladeA); group.add(bladeB);

    group.traverse((obj) => { if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; } });
    addObject(group);
    movingObstacles.push({ type: "rotatingObstacle", mesh: group, speed, armLength, armThickness, maxY: y + 0.65 });
}

// Atualizar os limites do mundo — cada mapa define os seus próprios limites
function setBounds(minX, maxX, minZ, maxZ) {
    course.bounds.minX = minX; course.bounds.maxX = maxX;
    course.bounds.minZ = minZ; course.bounds.maxZ = maxZ;
}

export {
    addObject,
    clearCourse,
    makeCheckerTexture,
    createLights,
    addFloor,
    addFloorWithHole,
    addWall,
    setHole,
    addMovingBar,
    addRotatingObstacle,
    setBounds,
};
