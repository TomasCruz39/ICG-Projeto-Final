import * as THREE from "three";
import { scene, timeState } from "../core/scene.js";
import { ball, hole } from "../core/state.js";

class ParticleSystem {
    constructor(options) {
        this.max = options.max;
        this.gravity = options.gravity ?? 6.5;
        this.drag = options.drag ?? 0.9;
        this.size = options.size ?? 0.08;
        this.opacity = options.opacity ?? 0.9;
        this.colors = options.colors || [options.color || 0xffffff];
        this.positions = new Float32Array(this.max * 3);
        this.velocities = new Float32Array(this.max * 3);
        this.lifetimes = new Float32Array(this.max);
        this.ages = new Float32Array(this.max);
        this.colorAttrib = new Float32Array(this.max * 3);
        this.cursor = 0;

        for (let i = 0; i < this.max; i++) {
            this.positions[i * 3 + 1] = -9999;
        }

        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colorAttrib, 3));
        this.material = new THREE.PointsMaterial({
            size: this.size,
            transparent: true,
            opacity: this.opacity,
            vertexColors: true,
            depthWrite: false,
        });
        this.points = new THREE.Points(this.geometry, this.material);
        this.points.frustumCulled = false;
        scene.add(this.points);
    }

    spawn(position, count, options = {}) {
        const spread = options.spread ?? 0.4;
        const lifetime = options.lifetime ?? 0.6;
        const speed = options.speed ?? 2.1;
        const speedVariance = options.speedVariance ?? 0.7;
        const direction = options.direction || null;
        const directionStrength = options.directionStrength ?? 0;
        const colors = options.colors || this.colors;
        let colorUpdate = false;

        for (let i = 0; i < count; i++) {
            const idx = this.cursor++ % this.max;
            const base = idx * 3;
            const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
            const theta = Math.random() * Math.PI * 2;
            const up = Math.random() * 0.6 + 0.4;
            const radial = Math.sqrt(1 - up * up);
            const spreadSpeed = speed * (1 + (Math.random() - 0.5) * speedVariance);

            let vx = Math.cos(theta) * radial * spreadSpeed;
            let vy = up * spreadSpeed;
            let vz = Math.sin(theta) * radial * spreadSpeed;

            if (direction) {
                vx += direction.x * directionStrength;
                vy += direction.y * directionStrength;
                vz += direction.z * directionStrength;
            }

            this.positions[base] = position.x + (Math.random() - 0.5) * spread;
            this.positions[base + 1] = position.y + (Math.random() - 0.2) * spread;
            this.positions[base + 2] = position.z + (Math.random() - 0.5) * spread;
            this.velocities[base] = vx;
            this.velocities[base + 1] = vy;
            this.velocities[base + 2] = vz;
            this.lifetimes[idx] = lifetime;
            this.ages[idx] = 0;
            this.colorAttrib[base] = color.r;
            this.colorAttrib[base + 1] = color.g;
            this.colorAttrib[base + 2] = color.b;
            colorUpdate = true;
        }

        if (colorUpdate) this.geometry.attributes.color.needsUpdate = true;
    }

    update(dt) {
        let needsUpdate = false;
        for (let i = 0; i < this.max; i++) {
            if (this.lifetimes[i] <= 0) continue;
            this.ages[i] += dt;
            if (this.ages[i] >= this.lifetimes[i]) {
                this.lifetimes[i] = 0;
                this.positions[i * 3 + 1] = -9999;
                needsUpdate = true;
                continue;
            }
            const base = i * 3;
            this.velocities[base + 1] -= this.gravity * dt;
            this.velocities[base] *= this.drag;
            this.velocities[base + 1] *= this.drag;
            this.velocities[base + 2] *= this.drag;
            this.positions[base] += this.velocities[base] * dt;
            this.positions[base + 1] += this.velocities[base + 1] * dt;
            this.positions[base + 2] += this.velocities[base + 2] * dt;
            needsUpdate = true;
        }
        if (needsUpdate) this.geometry.attributes.position.needsUpdate = true;
    }
}

const particles = {
    grass: new ParticleSystem({ max: 240, size: 0.08, color: 0x7bdc74, gravity: 7, drag: 0.92, opacity: 0.9 }),
    sand: new ParticleSystem({ max: 220, size: 0.06, color: 0xd4c394, gravity: 6, drag: 0.9, opacity: 0.85 }),
    confetti: new ParticleSystem({
        max: 520,
        size: 0.1,
        gravity: 4,
        drag: 0.94,
        opacity: 0.95,
        colors: [0x5eead4, 0x38bdf8, 0xf97316, 0xfacc15, 0xa78bfa],
    }),
};

const boostDirection = new THREE.Vector3(0, 1, 0);

const celebration = {
    active: false,
    time: 0,
    duration: 2.6,
    nextBurst: 0,
};

function spawnImpactParticles(normal, intensity) {
    if (ball.surfaceType !== "grass") return;
    if (timeState.now - ball.lastImpactTime < 0.12) return;
    ball.lastImpactTime = timeState.now;

    const strength = THREE.MathUtils.clamp(intensity, 0.4, 2.2);
    const direction = new THREE.Vector3(normal.x, 0.55, normal.z).normalize();
    particles.grass.spawn(ball.position, Math.round(8 * strength), {
        spread: 0.35,
        speed: 1.8 * strength,
        lifetime: 0.55,
        direction,
        directionStrength: 0.8 * strength,
    });
}

function spawnSandSplash(intensity) {
    if (timeState.now - ball.lastSandTime < 0.18) return;
    ball.lastSandTime = timeState.now;
    const strength = THREE.MathUtils.clamp(intensity, 0.4, 1.6);
    particles.sand.spawn(ball.position, Math.round(6 * strength), {
        spread: 0.4,
        speed: 1.4 * strength,
        lifetime: 0.6,
        direction: boostDirection,
        directionStrength: 0.5 * strength,
    });
}

function spawnBoostParticles(position) {
    particles.grass.spawn(position, 10, {
        spread: 0.3,
        speed: 1.6,
        lifetime: 0.45,
        colors: [0x5eead4, 0x38bdf8],
        direction: boostDirection,
        directionStrength: 0.6,
    });
}

function startCelebration() {
    celebration.active = true;
    celebration.time = 0;
    celebration.nextBurst = 0;
}

function updateCelebration(dt) {
    if (!celebration.active) return;
    celebration.time += dt;
    if (celebration.time > celebration.duration) {
        celebration.active = false;
        return;
    }
    if (celebration.time >= celebration.nextBurst) {
        particles.confetti.spawn(new THREE.Vector3(hole.pos.x, 0.4, hole.pos.z), 40, {
            spread: 0.8,
            speed: 2.4,
            lifetime: 1.1,
            direction: boostDirection,
            directionStrength: 1.2,
        });
        celebration.nextBurst = celebration.time + 0.18 + Math.random() * 0.12;
    }
}

function updateParticles(dt) {
    particles.grass.update(dt);
    particles.sand.update(dt);
    particles.confetti.update(dt);
    updateCelebration(dt);
}

export { spawnImpactParticles, spawnSandSplash, spawnBoostParticles, startCelebration, updateParticles };
