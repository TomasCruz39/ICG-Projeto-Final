// Definição dos 5 mapas do jogo — cada função constrói um percurso completo

import * as THREE from "three";
import { game, mapNames, course, ball, floorZones } from "../core/state.js";
import {
    addObject,
    addFloor,
    addFloorWithHole,
    addWall,
    addMovingBar,
    addRotatingObstacle,
    makeCheckerTexture,
    setHole,
    setBounds,
} from "./builders.js";

// ---- MAPA 1: A Reta do Aprendiz ----
// Percurso reto simples com uma rampa no final para introduzir a mecânica de tacada
function buildMapEasy() {
    game.mapName = mapNames[0];
    setBounds(-22, 22, -12, 12);
    course.spawn.set(-14.2, ball.radius, 4.3);

    // Piso principal com buraco no fim
    addFloorWithHole(-2, 0, 28, 12, 10.5, 0, 0.46, "grass");

    // Rampa inclinada antes do buraco — forçar a bola a travar antes de chegar ao buraco
    const texRamp = makeCheckerTexture("#2f7f3f", "#2a6f37", 512, 16, 2, 6);
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 12), new THREE.MeshStandardMaterial({ map: texRamp, roughness: 0.9, metalness: 0.02 }));
    ramp.position.set(14.1, 0.15, 0);
    ramp.rotation.z = 0.15;
    ramp.castShadow = true; ramp.receiveShadow = true;
    addObject(ramp);
    floorZones.push({ minX: 11.9, maxX: 16.3, minZ: -6, maxZ: 6, height: 0 });

    // Paredes laterais e do fundo
    addWall(-2.3, -6.25, 28.4, 0.5);
    addWall(14.1, -6.25, 4.6, 0.5, 0.28, 0.35, 0, 0.15); // parede acompanha a inclinação da rampa

    addWall(-2.3, 6.25, 28.4, 0.5);
    addWall(14.1, 6.25, 4.6, 0.5, 0.28, 0.35, 0, 0.15);

    addWall(-16.25, 0, 0.5, 12);
    addWall(16.25, 0, 0.5, 12, 0.28, 0.65); // parede mais alta no topo da rampa

    // Pilares a flanquear o buraco
    addWall(0.5, -2.6, 1.7, 1.7);
    addWall(0.5, 2.6, 1.7, 1.7);

    setHole(10.5, 0, 0.46);
}

// ---- MAPA 2: O Zigue-Zague Móvel ----
// Três corredores em S com uma barra deslizante e uma rampa de ligação
function buildMapMedium() {
    game.mapName = mapNames[1];
    setBounds(-24, 24, -16, 16);
    course.spawn.set(-14, ball.radius, 5);

    addFloor(-10, 5, 12, 4, "grass");
    addFloor(-2, 0, 4, 14, "dark");
    addFloorWithHole(6, -5, 12, 4, 10, -5, 0.44, "grass");

    // Paredes exteriores dos três corredores
    addWall(-8, 7.25, 17, 0.5);
    addWall(-16.25, 5, 0.5, 5);
    addWall(4, -7.25, 17, 0.5);
    addWall(12.25, -5, 0.5, 5);

    // Paredes interiores que formam o S
    addWall(-10.25, 2.75, 12.5, 0.5);
    addWall(-4.25, -2.25, 0.5, 10.5);

    addWall(6.25, -2.75, 12.5, 0.5);
    addWall(0.25, 2.25, 0.5, 10.5);

    // Barra deslizante no corredor central para dificultar a passagem
    addMovingBar({ x: -2, z: -2, sx: 2.5, sy: 0.75, sz: 0.45, axis: "x", amplitude: 0.7, speed: 1.9 });

    // Rampinha de ligação entre o corredor superior e o inferior
    const texRamp = makeCheckerTexture("#9ca3af", "#8b95a1", 128, 4, 2, 2);
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.42, 2.2), new THREE.MeshStandardMaterial({ map: texRamp, roughness: 0.7 }));
    ramp.position.set(-2.0, 0.14, 1.5);
    ramp.rotation.x = Math.PI / 14;
    ramp.castShadow = true; ramp.receiveShadow = true;
    addObject(ramp);

    setHole(10, -5, 0.44);
}

// ---- MAPA 3: A Cidadela dos Eixos ----
// Corredor com zonas de areia e um obstáculo giratório + ilha circular no final separada do piso
function buildMapHard() {
    game.mapName = mapNames[2];
    setBounds(-24, 24, -16, 16);
    course.spawn.set(-13, ball.radius, 0);

    addFloor(-9, 0, 12, 4, "grass");
    addFloor(2, 0, 10, 10, "dark");
    addFloor(10, 0, 6, 2, "sand"); // zona de areia antes da ilha para travar a bola

    // Ilha circular no destino — criada com ExtrudeGeometry + buraco central
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

    addRotatingObstacle(2, 0, 3.5, 0.3, 2.8);
    setHole(15, 0, 0.46);
}

// ---- MAPA 4: O Círculo de Gelo ----
// Circuito em loop com 4 pistas de gelo e curvas de areia para travar a velocidade
function buildMapIceBridge() {
    game.mapName = mapNames[3];
    setBounds(-24, 24, -24, 24);
    course.spawn.set(12, ball.radius, 12);

    // Zona de partida em relva
    addFloor(12, 12, 8, 8, "grass");

    // Pista 1: reto para norte (gelo) com obstáculo giratório e barra deslizante
    addFloor(12, -2, 8, 20, "ice");
    addRotatingObstacle(12, 2, 3.5, 0.3, 3.5);
    addMovingBar({ x: 12, z: -6, sx: 4.0, sy: 0.8, sz: 0.8, axis: "x", amplitude: 1.8, speed: 3.5 });

    // Curva 1 em areia — a bola trava e o jogador tem de reajustar
    addFloor(12, -16, 8, 8, "sand");

    // Pista 2: reto para oeste (gelo)
    addFloor(-2, -16, 20, 8, "ice");
    addMovingBar({ x: 2, z: -16, sx: 0.8, sy: 0.8, sz: 4.0, axis: "z", amplitude: 1.8, speed: 4.0 });
    addRotatingObstacle(-6, -16, 3.5, 0.3, -3.5); // velocidade negativa = sentido oposto

    // Curva 2 em areia
    addFloor(-16, -16, 8, 8, "sand");

    // Pista 3: reto para sul (gelo) com barras mais rápidas
    addFloor(-16, -2, 8, 20, "ice");
    addMovingBar({ x: -16, z: -6, sx: 4.0, sy: 0.8, sz: 0.8, axis: "x", amplitude: 1.8, speed: 4.5 });
    addRotatingObstacle(-16, 2, 3.5, 0.3, 3.5);

    // Curva 3 em areia
    addFloor(-16, 12, 8, 8, "sand");

    // Pista 4: reto para este (gelo) com duas barras em sentidos opostos
    addFloor(-5, 12, 14, 8, "ice");
    addMovingBar({ x: -9, z: 12, sx: 0.8, sy: 0.8, sz: 4.0, axis: "z", amplitude: 1.8, speed: 4.0 });
    addMovingBar({ x: -2, z: 12, sx: 0.8, sy: 0.8, sz: 4.0, axis: "z", amplitude: 1.8, speed: -4.0 });

    // Zona final com buraco
    addFloorWithHole(4, 12, 4, 8, 4, 12, 0.46, "dark");
    setHole(4, 12, 0.46);

    // Paredes exteriores do circuito
    addWall(16.25, -2, 0.5, 36);  // direita
    addWall(-2, -20.25, 37, 0.5); // topo
    addWall(-20.25, -2, 0.5, 36); // esquerda
    addWall(-7, 16.25, 27, 0.5);  // baixo (zona do buraco)
    addWall(12, 16.25, 9, 0.5);   // baixo (zona de spawn)

    // Paredes interiores do circuito
    addWall(7.75, -1.75, 0.5, 19.5);
    addWall(-2, -11.75, 20, 0.5);
    addWall(-11.75, -2, 0.5, 19);
    addWall(-2.75, 7.75, 18.5, 0.5);

    // Divisórias entre a zona de partida e chegada
    addWall(7.75, 12, 0.5, 8);
    addWall(6.25, 12, 0.5, 8);
}

// ---- MAPA 5: A Torre da Queda Livre ----
// Três pisos em altura — a bola cai pelos buracos de queda para chegar ao piso seguinte
function buildMapWindLabyrinth() {
    game.mapName = mapNames[4];
    setBounds(-30, 8, -12, 28);

    course.spawn.set(0, ball.radius + 12, 15); // spawn no Piso 3 (Y=12)

    // ===== PISO 3 (Y = +12) — corredor de relva com 2 barras deslizantes =====
    const y3 = 12;
    addFloor(0, 10.5, 7, 17, "grass", y3);
    // Buraco de queda no fim — bola cai para o Piso 2
    addFloorWithHole(0, -1, 7, 6, 0, -1, 0.75, "grass", y3, true);

    addWall(0, 19.25, 7, 0.5, 0.28, y3);
    addWall(0, -4.25, 7, 0.5, 0.28, y3);
    addWall(-3.25, 7.5, 0.5, 23, 0.28, y3);
    addWall(3.25, 7.5, 0.5, 23, 0.28, y3);

    addMovingBar({ x: 0, z: 5, sx: 2.0, sy: 0.5, sz: 0.4, axis: "x", amplitude: 1.8, speed: 3.5, y: y3 });
    addMovingBar({ x: 0, z: 12, sx: 2.0, sy: 0.5, sz: 0.4, axis: "x", amplitude: 1.8, speed: -3.5, y: y3 });


    // ===== PISO 2 (Y = +6) — corredor longo de gelo com obstáculo giratório =====
    const y2 = 6;
    addFloor(-8.0, -1, 23, 8, "ice", y2);
    // Buraco de queda no fim — bola cai para o Piso 1
    addFloorWithHole(-23, -1, 7, 8, -23, -1, 0.75, "ice", y2, true);

    addWall(3.25, -1, 0.5, 8, 0.28, y2);
    addWall(-11.5, -5.25, 30, 0.5, 0.28, y2);
    addWall(-11.5, 3.25, 30, 0.5, 0.28, y2);
    addWall(-26.25, -1, 0.5, 8, 0.28, y2);

    addRotatingObstacle(-13, -1, 3.5, 0.3, 3.5, y2);


    // ===== PISO 1 (Y = 0) — corredor de relva → areia → buraco final =====
    const y1 = 0;
    addFloor(-23, 3, 8, 12, "grass", y1);
    addFloor(-23, 13, 8, 8, "sand", y1); // areia para travar a bola antes do buraco
    addFloorWithHole(-23, 20, 8, 6, -23, 22, 0.46, "grass", y1);
    setHole(-23, 22, 0.46, y1);

    addWall(-23, -3.25, 8, 0.5, 0.28, y1);
    addWall(-19.25, 10, 0.5, 26, 0.28, y1);
    addWall(-26.75, 10, 0.5, 26, 0.28, y1);
    addWall(-23, 23.25, 8, 0.5, 0.28, y1);
}


export { buildMapEasy, buildMapMedium, buildMapHard, buildMapIceBridge, buildMapWindLabyrinth };