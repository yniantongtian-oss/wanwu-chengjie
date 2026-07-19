/**
 * SkyAndWeather.tsx — 天空（6 套 + 渐变穹顶）与天气粒子（6 种）
 * 正式版：双色渐变天穹（skyTop/skyBottom 全量启用）、星云多层团雾、
 * 极光幕布波动、双月辉光、蚀环日冕。
 */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Stars, Sparkles } from '@react-three/drei';
import type { Sky, Weather } from '@/engine';
import type { VisualPalette } from '../palettes';
import { relays } from '../bus';

interface SkyProps {
  sky: Sky;
  palette: VisualPalette;
  blackout: boolean;
  reduceMotion: boolean;
}

// ── 渐变天穹 ─────────────────────────────────────────

const domeVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const domeFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uGlow;
  uniform float uDim;
  varying vec3 vDir;
  void main() {
    float h = vDir.y;
    float k = smoothstep(-0.22, 0.62, h);
    vec3 col = mix(uBottom, uTop, k);
    // 地平线微光带
    float horizon = exp(-abs(h + 0.02) * 9.0);
    col += uGlow * horizon * 0.16;
    gl_FragColor = vec4(col * uDim, 1.0);
  }
`;

export function SkyDome({ palette, blackout }: { palette: VisualPalette; blackout: boolean }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: domeVertex,
        fragmentShader: domeFragment,
        uniforms: {
          uTop: { value: new THREE.Color(palette.skyTop) },
          uBottom: { value: new THREE.Color(palette.skyBottom) },
          uGlow: { value: new THREE.Color(palette.primary) },
          uDim: { value: 1 },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [palette],
  );
  useFrame((_, delta) => {
    const target = blackout ? 0.22 : 1;
    mat.uniforms.uDim.value = THREE.MathUtils.damp(mat.uniforms.uDim.value, target, 2, delta);
  });
  return (
    <mesh material={mat} frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[150, 32, 18]} />
    </mesh>
  );
}

/** 暗室星云：星 + 大尺度彩色雾团（双层错位，营造纵深） */
function Nebula({ palette }: { palette: VisualPalette }) {
  const geo = useMemo(() => new THREE.SphereGeometry(1, 18, 18), []);
  const blobs = useMemo(
    () => [
      { p: [-40, 26, -60], s: 26, c: palette.primary, o: 0.05 },
      { p: [45, 18, -45], s: 20, c: palette.accent, o: 0.04 },
      { p: [0, 40, -90], s: 34, c: '#8B7CF6', o: 0.045 },
      { p: [-20, 12, -80], s: 15, c: palette.primary, o: 0.06 },
      { p: [30, 34, -70], s: 22, c: '#E8C876', o: 0.03 },
      { p: [-55, 30, -30], s: 17, c: palette.accent, o: 0.035 },
    ],
    [palette],
  );
  return (
    <group>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.p as [number, number, number]} geometry={geo} scale={b.s}>
          <meshBasicMaterial color={b.c} transparent opacity={b.o} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** 双月（带辉光晕轮） */
function TwinMoons({ palette }: { palette: VisualPalette }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.01;
  });
  return (
    <group ref={ref}>
      <mesh position={[-28, 34, -70]}>
        <sphereGeometry args={[6, 28, 28]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.95} />
      </mesh>
      <mesh position={[-28, 34, -70]}>
        <sphereGeometry args={[8.6, 24, 24]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* 月面暗斑 */}
      <mesh position={[-29.5, 35, -64.6]} rotation={[0.3, -0.2, 0]}>
        <circleGeometry args={[1.6, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} />
      </mesh>
      <mesh position={[22, 40, -85]}>
        <sphereGeometry args={[3.6, 24, 24]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.8} />
      </mesh>
      <mesh position={[22, 40, -85]}>
        <sphereGeometry args={[5.4, 20, 20]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** 静电虚空：缓慢旋转的网格穹顶 */
function GridDome({ palette }: { palette: VisualPalette }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.008;
  });
  return (
    <mesh ref={ref} position={[0, -4, 0]}>
      <sphereGeometry args={[90, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      <meshBasicMaterial color={palette.primary} wireframe transparent opacity={0.07} side={THREE.BackSide} />
    </mesh>
  );
}

/** 极光尘：多层半透明光幕（顶点波动 + 漂移 + 呼吸） */
function Aurora({ palette, reduceMotion }: { palette: VisualPalette; reduceMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const geos = useMemo(
    () =>
      [0, 1, 2].map(
        () => new THREE.PlaneGeometry(76, 15, 42, 6),
      ),
    [],
  );
  const bases = useMemo(
    () =>
      geos.map((g) => {
        const pos = g.getAttribute('position') as THREE.BufferAttribute;
        return new Float32Array(pos.array as Float32Array);
      }),
    [geos],
  );

  useFrame((state) => {
    if (reduceMotion || !group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((c, i) => {
      c.position.x = Math.sin(t * 0.05 + i * 2) * 9;
      const m = c as THREE.Mesh;
      (m.material as THREE.MeshBasicMaterial).opacity = 0.05 + (Math.sin(t * 0.24 + i * 2.1) + 1) * 0.02;
      const pos = geos[i].getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const base = bases[i];
      for (let v = 0; v < pos.count; v++) {
        const bx = base[v * 3];
        const by = base[v * 3 + 1];
        arr[v * 3 + 2] = Math.sin(bx * 0.09 + t * 0.7 + i * 1.9) * (1.4 + by * 0.05);
      }
      pos.needsUpdate = true;
    });
  });

  return (
    <group ref={group}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} geometry={geos[i]} position={[i * 15 - 15, 34 + i * 5, -75 - i * 8]} rotation={[0.25, 0, 0.15 * (i - 1)]}>
          <meshBasicMaterial
            color={i % 2 === 0 ? palette.primary : palette.accent}
            transparent
            opacity={0.06}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/** 蚀环：天空中的巨大光环 + 日冕芒刺 */
function EclipseRing({ palette }: { palette: VisualPalette }) {
  const corona = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (corona.current) {
      (corona.current.material as THREE.MeshBasicMaterial).opacity =
        0.5 + Math.sin(state.clock.elapsedTime * 0.8) * 0.18;
    }
  });
  return (
    <group position={[0, 38, -80]} rotation={[0.35, 0, 0]}>
      <mesh>
        <torusGeometry args={[16, 0.7, 12, 72]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.85} />
      </mesh>
      <mesh ref={corona}>
        <ringGeometry args={[16.6, 19.5, 72]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <circleGeometry args={[15, 48]} />
        <meshBasicMaterial color="#020308" transparent opacity={0.92} />
      </mesh>
      {/* 芒刺 */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 18.4, Math.sin(a) * 18.4, 0]} rotation={[0, 0, a]}>
            <coneGeometry args={[0.5, 3.2, 4]} />
            <meshBasicMaterial color={palette.accent} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

export function GameSky({ sky, palette, blackout, reduceMotion }: SkyProps) {
  return (
    <group>
      <SkyDome palette={palette} blackout={blackout} />
      <Stars radius={110} depth={40} count={blackout ? 3600 : 2200} factor={blackout ? 5 : 3.4} saturation={0} fade speed={reduceMotion ? 0 : 0.6} />
      {sky === 'dark_room_nebula' && <Nebula palette={palette} />}
      {sky === 'twin_moons' && <TwinMoons palette={palette} />}
      {sky === 'starless_grid' && <GridDome palette={palette} />}
      {sky === 'aurora_dust' && <Aurora palette={palette} reduceMotion={reduceMotion} />}
      {sky === 'eclipse_ring' && <EclipseRing palette={palette} />}
      {sky === 'rain_void' && (
        <Sparkles count={90} scale={[90, 50, 90]} position={[0, 22, 0]} size={2.4} speed={reduceMotion ? 0 : 0.5} color={palette.primary} opacity={0.5} />
      )}
    </group>
  );
}

// ── 天气粒子 ─────────────────────────────────────────

interface WeatherProps {
  weather: Weather;
  palette: VisualPalette;
  density: number; // 0–1 设备分级
  reduceMotion: boolean;
  gravityFlipped: boolean;
}

interface DriftConfig {
  count: number;
  size: number;
  color: string;
  area: [number, number, number];
  vel: [number, number, number];
  sway: number;
  opacity: number;
}

function weatherConfig(weather: Weather, palette: VisualPalette, density: number): DriftConfig | null {
  const d = Math.max(0.25, density);
  switch (weather) {
    case 'floating_dust':
      return { count: Math.round(320 * d), size: 0.09, color: palette.primary, area: [90, 26, 90], vel: [0, 0.35, 0], sway: 0.4, opacity: 0.55 };
    case 'reverse_rain':
      return { count: Math.round(420 * d), size: 0.11, color: '#9BE8F2', area: [90, 34, 90], vel: [0, 7, 0], sway: 0.06, opacity: 0.5 };
    case 'time_snow':
      return { count: Math.round(260 * d), size: 0.13, color: '#E8F0FF', area: [90, 26, 90], vel: [0, -0.8, 0], sway: 0.5, opacity: 0.6 };
    case 'static_sparks':
      return { count: Math.round(140 * d), size: 0.15, color: palette.accent, area: [80, 18, 80], vel: [0, 0.15, 0], sway: 1.6, opacity: 0.7 };
    case 'petal_drift':
      return { count: Math.round(200 * d), size: 0.16, color: '#F5B84C', area: [90, 24, 90], vel: [0.3, -0.5, 0.15], sway: 0.9, opacity: 0.65 };
    case 'clear':
      return null;
  }
}

export function WeatherParticles({ weather, palette, density, reduceMotion, gravityFlipped }: WeatherProps) {
  const cfg = useMemo(() => weatherConfig(weather, palette, density), [weather, palette, density]);
  const ref = useRef<THREE.Points>(null);
  const seeds = useMemo(() => {
    if (!cfg) return null;
    const pos = new Float32Array(cfg.count * 3);
    const phase = new Float32Array(cfg.count);
    for (let i = 0; i < cfg.count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * cfg.area[0];
      pos[i * 3 + 1] = Math.random() * cfg.area[1];
      pos[i * 3 + 2] = (Math.random() - 0.5) * cfg.area[2];
      phase[i] = Math.random() * Math.PI * 2;
    }
    return { pos, phase };
  }, [cfg]);

  useFrame((state, delta) => {
    if (!cfg || !seeds || !ref.current || reduceMotion) return;
    if (relays.particlesFrozen) return; // 突变预兆：粒子悬停
    const attr = ref.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const flip = gravityFlipped ? -1 : 1;
    for (let i = 0; i < cfg.count; i++) {
      const j = i * 3;
      arr[j] += cfg.vel[0] * dt + Math.sin(t * 0.6 + seeds.phase[i]) * cfg.sway * dt;
      arr[j + 1] += cfg.vel[1] * flip * dt;
      arr[j + 2] += cfg.vel[2] * dt + Math.cos(t * 0.5 + seeds.phase[i]) * cfg.sway * dt;
      // 环绕回收
      if (arr[j + 1] > cfg.area[1]) arr[j + 1] = 0;
      if (arr[j + 1] < 0) arr[j + 1] = cfg.area[1];
      if (arr[j] > cfg.area[0] / 2) arr[j] = -cfg.area[0] / 2;
      if (arr[j] < -cfg.area[0] / 2) arr[j] = cfg.area[0] / 2;
      if (arr[j + 2] > cfg.area[2] / 2) arr[j + 2] = -cfg.area[2] / 2;
      if (arr[j + 2] < -cfg.area[2] / 2) arr[j + 2] = cfg.area[2] / 2;
    }
    attr.needsUpdate = true;
  });

  if (!cfg || !seeds || reduceMotion) return null;
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[seeds.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={cfg.size}
        color={cfg.color}
        transparent
        opacity={cfg.opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
