import * as THREE from "three";
import { scene } from "../core/scene.js";
import {
    ball,
    hole,
    course,
    colliders,
    movingObstacles,
    frictionZones,
    boostZones,
    floorZones,
    courseObjects,
} from "../core/state.js";

let boostZoneId = 0;

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
    boostZones.length = 0;
    boostZoneId = 0;
    floorZones.length = 0;
}

const textureCache = {};
const materialCache = {};
const geomCache = {};

function getCachedBoxGeom(sx, sy, sz) {
    const key = `${sx}_${sy}_${sz}`;
    if (geomCache[key]) return geomCache[key];
    const geom = new THREE.BoxGeometry(sx, sy, sz);
    geomCache[key] = geom;
    return geom;
}

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
    // PointLight castShadow was removed to save massive performance (avoids 6 renders per frame)
    scene.add(fill);
}

function addBoxCollider(x, z, sx, sz, minY, maxY) {
    colliders.push({ minX: x - sx / 2, maxX: x + sx / 2, minZ: z - sz / 2, maxZ: z + sz / 2, minY, maxY });
}

function addFloor(x, z, sx, sz, type = "grass", topY = 0) {
    let colorA = "#2f7f3f", colorB = "#2a6f37";
    if (type === "dark") { colorA = "#266932"; colorB = "#215c2b"; }
    else if (type === "ice") { colorA = "#7dd3fc"; colorB = "#60a5fa"; }
    else if (type === "sand") { colorA = "#d4c394"; colorB = "#c2b280"; }

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

function addFloorWithHole(x, z, sx, sz, holeX, holeZ, holeRadius, type = "grass", topY = 0, fallThrough = false) {
    let colorA = "#2f7f3f", colorB = "#2a6f37";
    if (type === "dark") { colorA = "#266932"; colorB = "#215c2b"; }
    else if (type === "ice") { colorA = "#7dd3fc"; colorB = "#60a5fa"; }
    else if (type === "sand") { colorA = "#d4c394"; colorB = "#c2b280"; }

    const tex = makeCheckerTexture(colorA, colorB, 512, 16, 0.5, 0.5);

    const shape = new THREE.Shape();
    shape.moveTo(-sx / 2, sz / 2);
    shape.lineTo(sx / 2, sz / 2);
    shape.lineTo(sx / 2, -sz / 2);
    shape.lineTo(-sx / 2, -sz / 2);
    shape.lineTo(-sx / 2, sz / 2);

    const holePath = new THREE.Path();
    const hx = holeX - x;
    const hz = holeZ - z;
    holePath.absarc(hx, hz, holeRadius, 0, Math.PI * 2, false);
    shape.holes.push(holePath);

    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false, curveSegments: 32 });
    geometry.rotateX(Math.PI / 2);

    const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.02 })
    );
    mesh.position.set(x, topY, z);
    mesh.receiveShadow = true;
    addObject(mesh);

    if (fallThrough) {
        // Buracos de queda: 4 faixas à volta do buraco — bola cai pelo centro
        const fx0 = x - sx / 2, fx1 = x + sx / 2;
        const fz0 = z - sz / 2, fz1 = z + sz / 2;
        const hR = holeRadius;
        if (fz0 < holeZ - hR) floorZones.push({ minX: fx0, maxX: fx1, minZ: fz0, maxZ: holeZ - hR, height: topY, type });
        if (holeZ + hR < fz1) floorZones.push({ minX: fx0, maxX: fx1, minZ: holeZ + hR, maxZ: fz1, height: topY, type });
        if (fx0 < holeX - hR) floorZones.push({ minX: fx0, maxX: holeX - hR, minZ: Math.max(fz0, holeZ - hR), maxZ: Math.min(fz1, holeZ + hR), height: topY, type });
        if (holeX + hR < fx1) floorZones.push({ minX: holeX + hR, maxX: fx1, minZ: Math.max(fz0, holeZ - hR), maxZ: Math.min(fz1, holeZ + hR), height: topY, type });
    } else {
        // Buracos de vitória: retângulo completo — bola fica na superfície, vitória é detetada normalmente
        floorZones.push({ minX: x - sx / 2, maxX: x + sx / 2, minZ: z - sz / 2, maxZ: z + sz / 2, height: topY, type });
    }
}

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

    const extraHeight = (rotX !== 0 || rotZ !== 0) ? 1.0 : 0;
    addBoxCollider(x, z, sx, sz, yOffset, yOffset + height + extraHeight);
}

function addStartPad(x, z) {
    const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.72, 0.12, 30),
        getCachedMaterial(null, 0.45, 0.2, 0x334155)
    );
    pad.position.set(x, 0.06, z); pad.receiveShadow = true;
    addObject(pad);
}

function setHole(x, z, radius = 0.42, y = 0) {
    hole.pos.set(x, y, z); hole.radius = radius;

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.025, 16, 32),
        new THREE.MeshStandardMaterial({ color: 0x8f98a3, roughness: 0.45, metalness: 0.2 })
    );
    ring.position.set(x, y, z); ring.rotation.x = Math.PI / 2;
    ring.receiveShadow = true;
    addObject(ring);

    const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, hole.depth, 32, 1, false),
        new THREE.MeshStandardMaterial({ color: 0x101317, roughness: 0.9, side: THREE.BackSide })
    );
    cup.position.set(x, y - hole.depth / 2, z);
    addObject(cup);
}

function addFrictionZone(minX, maxX, minZ, maxZ, multiplier, type = "sand", topY = 0) {
    frictionZones.push({ minX, maxX, minZ, maxZ, multiplier, type });
    const sx = maxX - minX; const sz = maxZ - minZ;

    let colorA = "#d4c394", colorB = "#c2b280";
    if (type === "ice") { colorA = "#a5f3fc"; colorB = "#7dd3fc"; }
    const repeatX = Math.max(1, Math.ceil(sx * 1.5));
    const repeatY = Math.max(1, Math.ceil(sz * 1.5));
    const tex = makeCheckerTexture(colorA, colorB, 256, 16, repeatX, repeatY);

    const plate = new THREE.Mesh(
        getCachedBoxGeom(sx, 0.06, sz),
        getCachedMaterial(tex, 0.95, 0.0)
    );
    plate.position.set((minX + maxX) / 2, topY + 0.03, (minZ + maxZ) / 2);
    plate.receiveShadow = true; addObject(plate);
}

function addBoostZone(minX, maxX, minZ, maxZ, dirX, dirZ, strength = 4.6) {
    const id = boostZoneId++;
    const dir = new THREE.Vector3(dirX, 0, dirZ);
    if (dir.lengthSq() < 0.001) dir.set(1, 0, 0);
    dir.normalize();
    boostZones.push({ id, minX, maxX, minZ, maxZ, dir, strength });

    const sx = maxX - minX; const sz = maxZ - minZ;
    const repeatX = Math.max(1, Math.ceil(sx * 1.6));
    const repeatY = Math.max(1, Math.ceil(sz * 1.6));
    const tex = makeCheckerTexture("#14b8a6", "#0ea5e9", 256, 8, repeatX, repeatY);
    const plate = new THREE.Mesh(
        getCachedBoxGeom(sx, 0.05, sz),
        getCachedMaterial(tex, 0.35, 0.2, undefined, new THREE.Color(0x0f3a42), 0.6)
    );
    plate.position.set((minX + maxX) / 2, 0.03, (minZ + maxZ) / 2);
    plate.receiveShadow = true;
    addObject(plate);
}

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

function addWindmill(x, z, armLength = 2.1, armThickness = 0.24, speed = 2.5, y = 0) {
    const group = new THREE.Group(); group.position.set(x, y + 0.5, z);
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
    movingObstacles.push({ type: "windmill", mesh: group, speed, armLength, armThickness, maxY: y + 0.65 });
}

function setBounds(minX, maxX, minZ, maxZ) {
    course.bounds.minX = minX; course.bounds.maxX = maxX;
    course.bounds.minZ = minZ; course.bounds.maxZ = maxZ;
}

export {
    addObject,
    clearCourse,
    makeCheckerTexture,
    createLights,
    addBoxCollider,
    addFloor,
    addFloorWithHole,
    addWall,
    addStartPad,
    setHole,
    addFrictionZone,
    addBoostZone,
    addMovingBar,
    addWindmill,
    setBounds,
};
