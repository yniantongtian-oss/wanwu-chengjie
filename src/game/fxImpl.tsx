/**
 * fx.ts — 事件驱动的瞬时特效池（不进 React 状态）
 * - burst: 粒子爆发（收集 / 节点激活 / Boss 解体 / 落地尘埃 / 传送门）
 * - shockwave: 地面扩散冲击环
 * 由 <FxLayer/> 在 Canvas 内统一渲染与推进。
 */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// ── 公共 API（模块级队列，Canvas 内外均可调用） ─────────

export interface BurstOpts {
  color: string;
  count?: number;
  speed?: number;
  size?: number;
  life?: number;
  /** 向上偏移的初速（尘埃用较小值） */
  up?: number;
  /** 重力加速度（正=下落） */
  gravity?: number;
  /** 水平圆盘式扩散（冲击尘埃用） */
  flat?: boolean;
}

interface BurstReq extends Required<Omit<BurstOpts, 'color'>> {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
}

interface WaveReq {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
  maxR: number;
  life: number;
}

const burstQueue: BurstReq[] = [];
const waveQueue: WaveReq[] = [];

export const fx = {
  burst(x: number, y: number, z: number, opts: BurstOpts): void {
    if (burstQueue.length > 24) burstQueue.shift();
    burstQueue.push({
      x,
      y,
      z,
      color: new THREE.Color(opts.color),
      count: opts.count ?? 18,
      speed: opts.speed ?? 5,
      size: opts.size ?? 0.22,
      life: opts.life ?? 0.8,
      up: opts.up ?? 1.6,
      gravity: opts.gravity ?? 7,
      flat: opts.flat ?? false,
    });
  },
  shockwave(x: number, y: number, z: number, color: string, maxR = 4, life = 0.7): void {
    if (waveQueue.length > 10) waveQueue.shift();
    waveQueue.push({ x, y, z, color: new THREE.Color(color), maxR, life });
  },
  clear(): void {
    burstQueue.length = 0;
    waveQueue.length = 0;
  },
};

// ── 粒子池 ─────────────────────────────────────────────

const MAX_PARTICLES = 640;
const MAX_WAVES = 12;

const particleVertex = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (280.0 / max(1.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const particleFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv) * 2.0;
    float a = smoothstep(1.0, 0.25, d) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`;

interface Particle {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  r: number;
  g: number;
  b: number;
}

export function FxLayer({ reduceMotion }: { reduceMotion: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const wavesRef = useRef<THREE.Group>(null);

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: MAX_PARTICLES }, () => ({
        alive: false,
        x: 0, y: -999, z: 0,
        vx: 0, vy: 0, vz: 0,
        life: 0, maxLife: 1, size: 0.2, gravity: 7,
        r: 1, g: 1, b: 1,
      })),
    [],
  );

  const buffers = useMemo(() => {
    const pos = new Float32Array(MAX_PARTICLES * 3);
    const col = new Float32Array(MAX_PARTICLES * 3);
    const size = new Float32Array(MAX_PARTICLES);
    const alpha = new Float32Array(MAX_PARTICLES);
    pos.fill(0);
    for (let i = 0; i < MAX_PARTICLES; i++) pos[i * 3 + 1] = -999;
    return { pos, col, size, alpha };
  }, []);

  const shader = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: particleVertex,
        fragmentShader: particleFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const waves = useMemo(
    () =>
      Array.from({ length: MAX_WAVES }, () => ({
        active: false,
        t: 0,
        life: 1,
        maxR: 4,
        color: new THREE.Color('#ffffff'),
      })),
    [],
  );

  const cursor = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    // ── 吸收新爆发请求 ──
    if (!reduceMotion) {
      while (burstQueue.length > 0) {
        const req = burstQueue.shift();
        if (!req) break;
        for (let n = 0; n < req.count; n++) {
          const p = particles[cursor.current];
          cursor.current = (cursor.current + 1) % MAX_PARTICLES;
          const theta = Math.random() * Math.PI * 2;
          const up = req.flat ? Math.random() * 0.35 : (Math.random() - 0.25) * 2;
          const speed = req.speed * (0.4 + Math.random() * 0.8);
          p.alive = true;
          p.x = req.x;
          p.y = req.y;
          p.z = req.z;
          p.vx = Math.cos(theta) * speed * (req.flat ? 1 : Math.sqrt(Math.max(0.1, 1 - up * up * 0.4)));
          p.vz = Math.sin(theta) * speed * (req.flat ? 1 : Math.sqrt(Math.max(0.1, 1 - up * up * 0.4)));
          p.vy = up * req.up + req.up * 0.4;
          p.maxLife = req.life * (0.65 + Math.random() * 0.7);
          p.life = p.maxLife;
          p.size = req.size * (0.6 + Math.random() * 0.9);
          p.gravity = req.gravity;
          p.r = req.color.r;
          p.g = req.color.g;
          p.b = req.color.b;
        }
      }
    } else {
      burstQueue.length = 0;
    }

    // ── 推进粒子 ──
    const pts = pointsRef.current;
    if (pts) {
      const geo = pts.geometry;
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = geo.getAttribute('aColor') as THREE.BufferAttribute;
      const sizeAttr = geo.getAttribute('aSize') as THREE.BufferAttribute;
      const alphaAttr = geo.getAttribute('aAlpha') as THREE.BufferAttribute;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.alive = false;
          buffers.pos[i * 3 + 1] = -999;
          buffers.alpha[i] = 0;
          continue;
        }
        p.vy -= p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const k = p.life / p.maxLife;
        buffers.pos[i * 3] = p.x;
        buffers.pos[i * 3 + 1] = p.y;
        buffers.pos[i * 3 + 2] = p.z;
        buffers.col[i * 3] = p.r;
        buffers.col[i * 3 + 1] = p.g;
        buffers.col[i * 3 + 2] = p.b;
        buffers.size[i] = p.size * (0.5 + k * 0.5);
        buffers.alpha[i] = Math.min(1, k * 1.6);
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
    }

    // ── 吸收并推进冲击环 ──
    const group = wavesRef.current;
    if (group) {
      while (waveQueue.length > 0) {
        const req = waveQueue.shift();
        if (!req) break;
        const slot = waves.find((w) => !w.active) ?? waves[0];
        slot.active = true;
        slot.t = 0;
        slot.life = req.life;
        slot.maxR = req.maxR;
        slot.color.copy(req.color);
        const idx = waves.indexOf(slot);
        const mesh = group.children[idx] as THREE.Mesh | undefined;
        if (mesh) {
          mesh.visible = true;
          mesh.position.set(req.x, req.y + 0.06, req.z);
          (mesh.material as THREE.MeshBasicMaterial).color.copy(req.color);
        }
      }
      waves.forEach((w, i) => {
        if (!w.active) return;
        w.t += dt;
        const k = w.t / w.life;
        const mesh = group.children[i] as THREE.Mesh | undefined;
        if (!mesh) return;
        if (k >= 1 || reduceMotion) {
          w.active = false;
          mesh.visible = false;
          return;
        }
        const ease = 1 - Math.pow(1 - k, 2.2);
        const r = 0.3 + ease * w.maxR;
        mesh.scale.set(r, r, r);
        (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.75;
      });
    }
  });

  return (
    <group>
      <points ref={pointsRef} frustumCulled={false} material={shader}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[buffers.pos, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[buffers.col, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[buffers.size, 1]} />
          <bufferAttribute attach="attributes-aAlpha" args={[buffers.alpha, 1]} />
        </bufferGeometry>
      </points>
      <group ref={wavesRef}>
        {waves.map((_, i) => (
          <mesh key={i} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.82, 1, 48]} />
            <meshBasicMaterial transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
