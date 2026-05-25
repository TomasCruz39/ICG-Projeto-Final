import * as THREE from "three";
import { scene } from "../core/scene.js";
import { message } from "../core/dom.js";
import {
    ball,
    game,
    hole,
    course,
    VOID_RESET_Y,
    colliders,
    movingObstacles,
    frictionZones,
    boostZones,
    floorZones,
    tmpVec,
    tmpVecB,
    mapNames,
} from "../core/state.js";
import { renderMenuMaps, renderMenuScores } from "../ui/menu.js";
import { recordScore } from "../systems/scores.js";
import { playSfx } from "../systems/audio.js";
import { spawnImpactParticles, spawnSandSplash, spawnBoostParticles, startCelebration } from "../systems/particles.js";

function createBall() {
    const ballMesh = new THREE.Mesh(
        new THREE.SphereGeometry(ball.radius, 32, 24),
        new THREE.MeshStandardMaterial({ color: 0xf0f3f7, roughness: 0.26, metalness: 0.14 })
    );
    ballMesh.castShadow = true; ballMesh.receiveShadow = true;
    scene.add(ballMesh); ball.mesh = ballMesh;
}

function resetBall() {
    ball.position.copy(course.spawn); ball.velocity.set(0, 0, 0);
    ball.moving = false; ball.restTimer = 0;
    ball.surfaceType = "grass";
    ball.lastBoostZone = -1;
    if (ball.mesh) { ball.mesh.position.copy(ball.position); ball.mesh.rotation.set(0, 0, 0); }
}

function shoot() {
    if (game.menuOpen || game.won || ball.moving) return;
    const dir = new THREE.Vector3(Math.cos(game.aimAngle), 0, Math.sin(game.aimAngle));
    ball.velocity.copy(dir.multiplyScalar(game.power));
    ball.moving = true; ball.restTimer = 0; game.strokes += 1;
    playSfx("shot", game.power / game.maxPower);
}

function clampBallInsideBounds() {
    const margin = ball.radius + 0.1;
    if (ball.position.x < course.bounds.minX + margin) { ball.position.x = course.bounds.minX + margin; ball.velocity.x *= -0.85; }
    if (ball.position.x > course.bounds.maxX - margin) { ball.position.x = course.bounds.maxX - margin; ball.velocity.x *= -0.85; }
    if (ball.position.z < course.bounds.minZ + margin) { ball.position.z = course.bounds.minZ + margin; ball.velocity.z *= -0.85; }
    if (ball.position.z > course.bounds.maxZ - margin) { ball.position.z = course.bounds.maxZ - margin; ball.velocity.z *= -0.85; }
}

function resolveAABBCollision(box) {
    if (box.minY !== undefined && ball.position.y + ball.radius < box.minY) return false;
    if (box.maxY !== undefined && ball.position.y - ball.radius > box.maxY) return false;

    let nearestX = Math.max(box.minX, Math.min(ball.position.x, box.maxX));
    let nearestZ = Math.max(box.minZ, Math.min(ball.position.z, box.maxZ));
    let dx = ball.position.x - nearestX;
    let dz = ball.position.z - nearestZ;

    if (dx === 0 && dz === 0) {
        // Ball center is inside the box
        const distToMinX = ball.position.x - box.minX;
        const distToMaxX = box.maxX - ball.position.x;
        const distToMinZ = ball.position.z - box.minZ;
        const distToMaxZ = box.maxZ - ball.position.z;
        const minDist = Math.min(distToMinX, distToMaxX, distToMinZ, distToMaxZ);

        let pushOutX = 0;
        let pushOutZ = 0;
        let nx = 0;
        let nz = 0;

        if (minDist === distToMinX) { 
            pushOutX = box.minX - ball.radius - ball.position.x; 
            nx = -1;
        } else if (minDist === distToMaxX) { 
            pushOutX = box.maxX + ball.radius - ball.position.x; 
            nx = 1;
        } else if (minDist === distToMinZ) { 
            pushOutZ = box.minZ - ball.radius - ball.position.z; 
            nz = -1;
        } else { 
            pushOutZ = box.maxZ + ball.radius - ball.position.z; 
            nz = 1;
        }

        ball.position.x += pushOutX;
        ball.position.z += pushOutZ;

        const dot = ball.velocity.x * nx + ball.velocity.z * nz;
        if (dot < 0) {
            const bounce = 0.2; // smaller bounce when crushed inside
            ball.velocity.x -= (1 + bounce) * dot * nx;
            ball.velocity.z -= (1 + bounce) * dot * nz;
        }
        return true;
    }

    const distSq = dx * dx + dz * dz;
    if (distSq >= ball.radius * ball.radius) return false;

    const distance = Math.sqrt(Math.max(distSq, 1e-6));
    const overlap = ball.radius - distance;
    const nx = dx / distance;
    const nz = dz / distance;

    ball.position.x += nx * overlap;
    ball.position.z += nz * overlap;

    const dot = ball.velocity.x * nx + ball.velocity.z * nz;
    const impactSpeed = Math.abs(dot);
    if (dot < 0) {
        const bounce = 0.82;
        ball.velocity.x -= (1 + bounce) * dot * nx;
        ball.velocity.z -= (1 + bounce) * dot * nz;
    }
    if (impactSpeed > 0.4) {
        spawnImpactParticles({ x: nx, z: nz }, impactSpeed);
        playSfx("bounce", impactSpeed / 3.5);
    }
    return true;
}

function resolveWindmillCollision(obstacle) {
    const relative = tmpVec.copy(ball.position).sub(obstacle.mesh.position);
    const local = relative.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -obstacle.mesh.rotation.y);

    const hitsXArm = Math.abs(local.x) <= obstacle.armLength + ball.radius && Math.abs(local.z) <= obstacle.armThickness + ball.radius;
    const hitsZArm = Math.abs(local.z) <= obstacle.armLength + ball.radius && Math.abs(local.x) <= obstacle.armThickness + ball.radius;
    if (!hitsXArm && !hitsZArm) return;

    let nxLocal = 0;
    let nzLocal = 0;
    if (hitsXArm && Math.abs(local.z) <= Math.abs(local.x)) {
        const sign = local.z >= 0 ? 1 : -1;
        local.z = sign * (obstacle.armThickness + ball.radius);
        nzLocal = sign;
    } else {
        const sign = local.x >= 0 ? 1 : -1;
        local.x = sign * (obstacle.armThickness + ball.radius);
        nxLocal = sign;
    }

    const worldLocal = local.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), obstacle.mesh.rotation.y);
    ball.position.x = obstacle.mesh.position.x + worldLocal.x;
    ball.position.z = obstacle.mesh.position.z + worldLocal.z;

    const normalLocal = new THREE.Vector3(nxLocal, 0, nzLocal);
    const normalWorld = normalLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), obstacle.mesh.rotation.y);

    const bladeVelX = obstacle.speed * worldLocal.z;
    const bladeVelZ = -obstacle.speed * worldLocal.x;

    const relVelX = ball.velocity.x - bladeVelX;
    const relVelZ = ball.velocity.z - bladeVelZ;

    const dot = relVelX * normalWorld.x + relVelZ * normalWorld.z;

    if (dot < 0) {
        const bounce = 0.5;
        ball.velocity.x -= (1 + bounce) * dot * normalWorld.x;
        ball.velocity.z -= (1 + bounce) * dot * normalWorld.z;
        
        const impactSpeed = Math.abs(dot);
        if (impactSpeed > 0.5) {
            spawnImpactParticles({ x: normalWorld.x, z: normalWorld.z }, impactSpeed);
            playSfx("bounce", Math.min(impactSpeed / 4, 1.0));
        }
    }
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

function getFrictionInfo() {
    let max = 1; let min = 1;
    let maxType = "grass"; let minType = "grass";
    
    for (const zone of floorZones) {
        if (ball.position.x >= zone.minX && ball.position.x <= zone.maxX && ball.position.z >= zone.minZ && ball.position.z <= zone.maxZ) {
            if (ball.position.y >= (zone.height || 0) - 0.05 && ball.position.y <= (zone.height || 0) + 0.5) {
                let m = 1;
                if (zone.type === "ice") m = 0.25;
                if (zone.type === "sand") m = 4.5;
                if (m > max) { max = m; maxType = zone.type; }
                if (m < min) { min = m; minType = zone.type; }
            }
        }
    }
    
    for (const zone of frictionZones) {
        if (ball.position.x >= zone.minX && ball.position.x <= zone.maxX && ball.position.z >= zone.minZ && ball.position.z <= zone.maxZ) {
            if (zone.multiplier > max) { max = zone.multiplier; maxType = zone.type; }
            if (zone.multiplier < min) { min = zone.multiplier; minType = zone.type; }
        }
    }
    const useMin = min < 1;
    return { multiplier: useMin ? min : max, type: useMin ? minType : maxType };
}

function getBoostZoneAtPosition(position) {
    for (const zone of boostZones) {
        if (position.x >= zone.minX && position.x <= zone.maxX && position.z >= zone.minZ && position.z <= zone.maxZ) return zone;
    }
    return null;
}

function updateBall(dt) {
    if (game.won) {
        const targetY = hole.pos.y - hole.depth + ball.radius;
        if (ball.position.y > targetY) {
            ball.position.y = Math.max(targetY, ball.position.y - 2 * dt);
            ball.position.x += (hole.pos.x - ball.position.x) * 8 * dt;
            ball.position.z += (hole.pos.z - ball.position.z) * 8 * dt;
            if (ball.mesh) ball.mesh.position.copy(ball.position);
        }
        return;
    }

    if (!ball.moving) return;

    const prevX = ball.position.x;
    const prevZ = ball.position.z;
    const prevY = ball.position.y;

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

    const boostZone = getBoostZoneAtPosition(ball.position);
    if (boostZone) {
        if (ball.lastBoostZone !== boostZone.id) {
            ball.velocity.addScaledVector(boostZone.dir, boostZone.strength);
            ball.lastBoostZone = boostZone.id;
            spawnBoostParticles(ball.position);
            playSfx("boost", boostZone.strength / 6);
        }
    } else {
        ball.lastBoostZone = -1;
    }

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
            } else if (prevX >= rightX + margin && ball.position.x < rightX + margin) {
                ball.position.x = rightX + margin;
                ball.velocity.x *= -0.82;
            }
        }
    }

    const baseDrag = 1.4;
    const surface = getFrictionInfo();
    ball.surfaceType = surface.type;
    const drag = baseDrag * surface.multiplier;
    ball.velocity.multiplyScalar(Math.exp(-drag * dt));

    if (surface.type === "sand" && ball.velocity.lengthSq() > 0.25) {
        spawnSandSplash(ball.velocity.length() * 0.25);
    }

    for (const obstacle of movingObstacles) resolveObstacleCollision(obstacle);
    for (const box of colliders) resolveAABBCollision(box);
    clampBallInsideBounds();

    const speedSq = ball.velocity.lengthSq();
    const movedSq = (ball.position.x - prevX) ** 2 + (ball.position.z - prevZ) ** 2;

    const toHole = tmpVecB.copy(hole.pos).sub(ball.position);
    if (!game.won && Math.hypot(toHole.x, toHole.z) < hole.radius * 0.82 && Math.hypot(ball.velocity.x, ball.velocity.z) < 2.2) {
        game.won = true; ball.moving = false; ball.velocity.set(0, 0, 0);
        const newBest = recordScore(game.currentMap, game.strokes);
        const recordText = newBest ? "<br><small>Novo recorde!</small>" : "";
        if (message) {
            message.innerHTML = `🏁 ${game.mapName} concluído!<br>Tacadas: <b>${game.strokes}</b>${recordText}<br><small>Esc = menu | R = repetir | 1-${mapNames.length} = mapa</small>`;
            message.classList.add("visible");
        }
        startCelebration();
        playSfx("hole", 1);
        renderMenuMaps();
        renderMenuScores();
    }

    let targetGroundY = null;
    let onFloor = false;
    let floorHeight = null;

    for (const f of floorZones) {
        if (ball.position.x >= f.minX - 0.05 && ball.position.x <= f.maxX + 0.05 &&
            ball.position.z >= f.minZ - 0.05 && ball.position.z <= f.maxZ + 0.05) {
            if (prevY < (f.height ?? 0) - 0.05) continue;
            onFloor = true;
            // don't break here -- there may be multiple overlapping floor zones
            // we need to pick the highest floor under the ball
            floorHeight = Math.max(floorHeight ?? -Infinity, f.height ?? 0);
        }
    }

    if (onFloor) targetGroundY = floorHeight ?? 0;

    if (!onFloor) {
        for (const zone of frictionZones) {
            if (ball.position.x >= zone.minX - 0.05 && ball.position.x <= zone.maxX + 0.05 &&
                ball.position.z >= zone.minZ - 0.05 && ball.position.z <= zone.maxZ + 0.05) {
                onFloor = true;
                if (targetGroundY === null) targetGroundY = 0;
                break;
            }
        }
    }

    if (!onFloor) {
        for (const zone of boostZones) {
            if (ball.position.x >= zone.minX - 0.05 && ball.position.x <= zone.maxX + 0.05 &&
                ball.position.z >= zone.minZ - 0.05 && ball.position.z <= zone.maxZ + 0.05) {
                onFloor = true;
                if (targetGroundY === null) targetGroundY = 0;
                break;
            }
        }
    }

    if (game.currentMap === 0) {
        if (ball.position.x > 11.9 && ball.position.x < 16.3) {
            onFloor = true;
            targetGroundY = (ball.position.x - 11.9) * 0.151;
            if (ball.velocity.x > 0) {
                ball.velocity.y = ball.velocity.x * 0.151;
            }
        }
    } else if (game.currentMap === 1) {
        if (ball.position.x > -3.4 && ball.position.x < -0.6 && ball.position.z > 0.4 && ball.position.z < 2.6) {
            onFloor = true;
            targetGroundY = ((2.6 - ball.position.z) / 2.2) * 0.42;
            if (ball.velocity.z < 0) {
                ball.velocity.y = Math.abs(ball.velocity.z) * (0.42 / 2.2);
            }
        }
    } else if (game.currentMap === 2) {
        const distParaCentroIlha = Math.hypot(ball.position.x - 15, ball.position.z - 0);
        if (ball.position.x > 12.8 && distParaCentroIlha <= 2.5) {
            onFloor = true;
            if (targetGroundY === null) targetGroundY = 0;
        }
    }

    if (onFloor && !isOnSlope) {
        if (speedSq < 0.08 && movedSq < 0.0005) ball.restTimer += dt;
        else ball.restTimer = 0;

        if (ball.restTimer > 0.22 || speedSq < 0.015) {
            ball.velocity.set(0, 0, 0); ball.moving = false; ball.restTimer = 0;
        }
    } else {
        ball.restTimer = 0;
    }

    if (!onFloor && !game.won) {
        ball.velocity.y -= 16 * dt;
        ball.position.y += ball.velocity.y * dt;
        if (ball.position.y < VOID_RESET_Y) {
            resetBall();
            game.strokes += 1;
            return;
        }
    } else {
        if (targetGroundY === null) targetGroundY = 0;
        const groundCenterY = targetGroundY + ball.radius;

        if (ball.position.y > groundCenterY) {
            ball.velocity.y -= 16 * dt;
        }

        ball.position.y += ball.velocity.y * dt;

        if (ball.position.y <= groundCenterY) {
            ball.position.y = groundCenterY;
            if (ball.velocity.y < -1.5) {
                ball.velocity.y *= -0.3;
            } else {
                ball.velocity.y = 0;
            }
        }
    }

    if (ball.mesh) {
        ball.mesh.position.copy(ball.position);
        const speed = ball.velocity.length();
        if (speed > 0.001) ball.mesh.rotateOnWorldAxis(new THREE.Vector3(ball.velocity.z, 0, -ball.velocity.x).normalize(), (speed * dt) / ball.radius);
    }
}

export { createBall, resetBall, shoot, updateBall, updateMovingObstacles };
