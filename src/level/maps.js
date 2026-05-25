import * as THREE from "three";
import { game, mapNames, course, ball, floorZones } from "../core/state.js";
import {
    addObject,
    addFloor,
    addFloorWithHole,
    addWall,
    addStartPad,
    addMovingBar,
    addWindmill,
    addFrictionZone,
    addBoostZone,
    makeCheckerTexture,
    setHole,
    setBounds,
} from "./builders.js";

function buildMapEasy() {
    game.mapName = mapNames[0];
    setBounds(-22, 22, -12, 12);
    course.spawn.set(-14.2, ball.radius, 4.3);

    addFloorWithHole(-2, 0, 28, 12, 10.5, 0, 0.46, "grass");

    const texRamp = makeCheckerTexture("#2f7f3f", "#2a6f37", 512, 16, 2, 6);
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 12), new THREE.MeshStandardMaterial({ map: texRamp, roughness: 0.9, metalness: 0.02 }));
    ramp.position.set(14.1, 0.15, 0);
    ramp.rotation.z = 0.15;
    ramp.castShadow = true; ramp.receiveShadow = true;
    addObject(ramp);
    floorZones.push({ minX: 11.9, maxX: 16.3, minZ: -6, maxZ: 6, height: 0 });

    addWall(-2.3, -6.25, 28.4, 0.5);
    addWall(14.1, -6.25, 4.6, 0.5, 0.28, 0.35, 0, 0.15);

    addWall(-2.3, 6.25, 28.4, 0.5);
    addWall(14.1, 6.25, 4.6, 0.5, 0.28, 0.35, 0, 0.15);

    addWall(-16.25, 0, 0.5, 12);
    addWall(16.25, 0, 0.5, 12, 0.28, 0.65);

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

    addMovingBar({ x: -2, z: -2, sx: 2.5, sy: 0.75, sz: 0.45, axis: "x", amplitude: 0.7, speed: 1.9 });

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
    addFloor(10, 0, 6, 2, "sand");

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

    addWindmill(2, 0, 3.5, 0.3, 2.8);
    setHole(15, 0, 0.46);
}

// ---------------- NOVO MAPA 4: O CÍRCULO DE GELO ----------------
function buildMapIceBridge() {
    game.mapName = "O Círculo de Gelo";
    setBounds(-24, 24, -24, 24);
    course.spawn.set(12, ball.radius, 12);

    // 1. ZONA DE PARTIDA
    addFloor(12, 12, 8, 8, "grass");

    // 2. PISTA RETA 1 (Para Norte)
    addFloor(12, -2, 8, 20, "ice");
    addWindmill(12, 2, 3.5, 0.3, 3.5);
    addMovingBar({ x: 12, z: -6, sx: 4.0, sy: 0.8, sz: 0.8, axis: "x", amplitude: 1.8, speed: 3.5 });

    // 3. CURVA 1 (Areia para travar a velocidade do gelo)
    addFloor(12, -16, 8, 8, "sand");

    // 4. PISTA RETA 2 (Para Oeste)
    addFloor(-2, -16, 20, 8, "ice");
    addMovingBar({ x: 2, z: -16, sx: 0.8, sy: 0.8, sz: 4.0, axis: "z", amplitude: 1.8, speed: 4.0 });
    addWindmill(-6, -16, 3.5, 0.3, -3.5);

    // 5. CURVA 2 (Areia)
    addFloor(-16, -16, 8, 8, "sand");

    // 6. PISTA RETA 3 (Para Sul)
    addFloor(-16, -2, 8, 20, "ice");
    addMovingBar({ x: -16, z: -6, sx: 4.0, sy: 0.8, sz: 0.8, axis: "x", amplitude: 1.8, speed: 4.5 });
    addWindmill(-16, 2, 3.5, 0.3, 3.5);

    // 7. CURVA 3 (Areia)
    addFloor(-16, 12, 8, 8, "sand");

    // 8. PISTA RETA 4 (Para Este)
    addFloor(-5, 12, 14, 8, "ice");
    addMovingBar({ x: -9, z: 12, sx: 0.8, sy: 0.8, sz: 4.0, axis: "z", amplitude: 1.8, speed: 4.0 });
    addMovingBar({ x: -2, z: 12, sx: 0.8, sy: 0.8, sz: 4.0, axis: "z", amplitude: 1.8, speed: -4.0 });

    // 9. ZONA FINAL
    addFloorWithHole(4, 12, 4, 8, 4, 12, 0.46, "dark");
    setHole(4, 12, 0.46);

    // ================= PAREDES EXTERIORES =================
    addWall(16.25, -2, 0.5, 36);  // Direita exterior
    addWall(-2, -20.25, 37, 0.5); // Cima exterior
    addWall(-20.25, -2, 0.5, 36); // Esquerda exterior
    addWall(-7, 16.25, 27, 0.5);  // Baixo exterior (Zona do buraco)
    addWall(12, 16.25, 9, 0.5);   // Baixo exterior (Zona de spawn)

    // ================= PAREDES INTERIORES =================
    addWall(7.75, -1.75, 0.5, 19.5); // Direita interior
    addWall(-2, -11.75, 20, 0.5);    // Cima interior
    addWall(-11.75, -2, 0.5, 19);    // Esquerda interior
    addWall(-2.75, 7.75, 18.5, 0.5); // Baixo interior

    // Divisórias
    addWall(7.75, 12, 0.5, 8); // Separa a Partida da Chegada
    addWall(6.25, 12, 0.5, 8); // Apara a bola depois do buraco final
}

// ---------------- NOVO MAPA 5: A TORRE DA QUEDA LIVRE ----------------
function buildMapWindLabyrinth() {
    game.mapName = "A Torre da Queda Livre";
    setBounds(-30, 8, -12, 28);

    course.spawn.set(0, ball.radius + 12, 15);

    // ================= PISO 3 (Y = +12) =================
    const y3 = 12;
    // Plataforma principal (z: 2 to 19, center=10.5, sz=17)
    addFloor(0, 10.5, 7, 17, "grass", y3);
    // Buraco de queda redondo no fim — centrado sobre o Piso 2 (z:-4 to 2, center=-1)
    addFloorWithHole(0, -1, 7, 6, 0, -1, 0.75, "grass", y3, true);  // fallThrough: bola cai para o Piso 2

    // Paredes do Piso 3
    addWall(0, 19.25, 7, 0.5, 0.28, y3);         // Trás
    addWall(0, -4.25, 7, 0.5, 0.28, y3);          // Frente
    addWall(-3.25, 7.5, 0.5, 23, 0.28, y3);       // Esquerda (z: -4 to 19)
    addWall(3.25, 7.5, 0.5, 23, 0.28, y3);        // Direita

    // Obstáculos no corredor
    addMovingBar({ x: 0, z: 5, sx: 2.0, sy: 0.5, sz: 0.4, axis: "x", amplitude: 1.8, speed: 3.5, y: y3 });
    addMovingBar({ x: 0, z: 12, sx: 2.0, sy: 0.5, sz: 0.4, axis: "x", amplitude: 1.8, speed: -3.5, y: y3 });


    // ================= PISO 2 (Y = +6) =================
    const y2 = 6;
    // Corredor de gelo — uma peça única (x: -19.5 to 3.5, z: -5 to 3)
    // center=(-8.0, -1), sx=23, sz=8
    addFloor(-8.0, -1, 23, 8, "ice", y2);
    // Buraco de queda redondo no fim (x: -26.5 to -19.5, z: -5 to 3)
    // center=(-23, -1), sx=7, sz=8 — buraco centrado em z=0
    addFloorWithHole(-23, -1, 7, 8, -23, -1, 0.75, "ice", y2, true);  // fallThrough: bola cai para o Piso 1

    // Paredes do Piso 2 (ajustadas para z: -5 to 3)
    addWall(3.25, -1, 0.5, 8, 0.28, y2);          // Direita
    addWall(-11.5, -5.25, 30, 0.5, 0.28, y2);     // Topo  (x: -26.5 to 3.5)
    addWall(-11.5, 3.25, 30, 0.5, 0.28, y2);      // Baixo
    addWall(-26.25, -1, 0.5, 8, 0.28, y2);        // Esquerda

    // Moinho no corredor de gelo
    addWindmill(-13, -1, 3.5, 0.3, 3.5, y2);


    // ================= PISO 1 (Y = 0) =================
    const y1 = 0;
    // Corredor inicial de relva (z: -3 to 9)
    addFloor(-23, 3, 8, 12, "grass", y1);
    
    // Areia para travar a bola antes do buraco (z: 9 to 17)
    addFloor(-23, 13, 8, 8, "sand", y1);
    
    // Buraco final circular com vitória (z: 17 to 23)
    addFloorWithHole(-23, 20, 8, 6, -23, 22, 0.46, "grass", y1);
    setHole(-23, 22, 0.46, y1);

    // Paredes do Piso 1
    addWall(-23, -3.25, 8, 0.5, 0.28, y1);        // Atrás
    addWall(-19.25, 10, 0.5, 26, 0.28, y1);       // Direita (z: -3 to 23)
    addWall(-26.75, 10, 0.5, 26, 0.28, y1);       // Esquerda
    addWall(-23, 23.25, 8, 0.5, 0.28, y1);        // Fundo

}


export { buildMapEasy, buildMapMedium, buildMapHard, buildMapIceBridge, buildMapWindLabyrinth };