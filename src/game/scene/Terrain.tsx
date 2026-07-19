/**
 * Terrain.tsx — 三套地形骨架渲染 + 平台/障碍 + 危险区可视化
 * 正式版：顶点上色（高度渐变 + 主路径微光 + 噪声斑驳）、浮岛分层岩体、
 * 平台收边与角柱、危险区动态脉冲。
 */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createRng } from '@/engine';
import type { LevelData } from '../level';
import type { VisualPalette } from '../palettes';
import { useRunStore } from '../runStore';

const GRID_SIZE = 116;
const SEGMENTS = 96;

interface TerrainProps {
  level: LevelData;
  palette: VisualPalette;
}

/** 位置哈希 → [0,1)，确定性斑驳噪声（无需种子） */
function hash2(x: number, z: number): number {
  let h = Math.imul(Math.floor(x * 7), 374761393) ^ Math.imul(Math.floor(z * 7), 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** steps / canyon：顶点位移平面 + 顶点上色 */
function DisplacedGround({ level, palette }: TerrainProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE, SEGMENTS, SEGMENTS);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;

    const ground = new THREE.Color(palette.ground);
    const high = new THREE.Color(palette.ground).lerp(new THREE.Color(palette.primary), 0.34);
    const low = new THREE.Color(palette.groundSide);
    const pathTint = new THREE.Color(palette.ground).lerp(new THREE.Color(palette.primary), 0.2);
    const tmp = new THREE.Color();

    // 先采样高度范围
    const hs = new Float32Array(pos.count);
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = level.terrainHeight(x, z);
      const y = h === -1000 ? -8 : h;
      hs[i] = y;
      pos.setY(i, y);
      if (y < min) min = y;
      if (y > max) max = y;
    }

    const colors = new Float32Array(pos.count * 3);
    const span = Math.max(0.001, max - min);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const k = (hs[i] - min) / span;
      // 高度渐变：低→基色，高→微青
      tmp.copy(low).lerp(ground, Math.min(1, k * 2.2));
      if (k > 0.45) tmp.lerp(high, (k - 0.45) * 0.9);
      // 主路径微光
      const w = Math.max(0, 1 - Math.abs(x - level.pathX(z)) / 7);
      if (w > 0) tmp.lerp(pathTint, w * 0.6);
      // 噪声斑驳
      const n = 0.92 + hash2(x, z) * 0.16;
      colors[i * 3] = tmp.r * n;
      colors[i * 3 + 1] = tmp.g * n;
      colors[i * 3 + 2] = tmp.b * n;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [level, palette]);

  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial color="#FFFFFF" vertexColors roughness={0.92} metalness={0.08} flatShading />
      </mesh>
      {/* 发光线框覆层（克制的青） */}
      <mesh geometry={geometry} position={[0, 0.04, 0]}>
        <meshBasicMaterial color={palette.primary} wireframe transparent opacity={0.045} />
      </mesh>
    </group>
  );
}

/** 单个浮岛：台面盖 + 岩身 + 根锥 + 岛沿光环 + 装饰晶簇 */
function Isle({ x, z, r, topY, index, palette }: { x: number; z: number; r: number; topY: number; index: number; palette: VisualPalette }) {
  const deco = useMemo(() => {
    const rng = createRng(index * 7919 + 1013);
    const count = r > 3.6 ? 3 : 2;
    return Array.from({ length: count }, (_, i) => {
      const a = rng.range(0, Math.PI * 2);
      const d = rng.range(0.35, 0.72) * r;
      return {
        key: i,
        x: Math.cos(a) * d,
        z: Math.sin(a) * d,
        s: rng.range(0.14, 0.3),
        h: rng.range(1.6, 2.6),
        accent: rng.next() < 0.4,
        tilt: rng.range(-0.25, 0.25),
      };
    });
  }, [index, r]);

  const bodyH = topY + 7;
  return (
    <group position={[x, 0, z]}>
      {/* 岩身（上粗下收） */}
      <mesh position={[0, topY - bodyH / 2, 0]} receiveShadow>
        <cylinderGeometry args={[r, r * 0.66, bodyH, 12]} />
        <meshStandardMaterial color={palette.ground} roughness={0.9} metalness={0.1} flatShading />
      </mesh>
      {/* 中部岩层节理（两圈收分环） */}
      <mesh position={[0, topY - bodyH * 0.38, 0]}>
        <cylinderGeometry args={[r * 0.86, r * 0.78, 0.5, 12]} />
        <meshStandardMaterial color={palette.groundSide} roughness={1} flatShading />
      </mesh>
      {/* 根锥 */}
      <mesh position={[0, topY - bodyH - 2.2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[r * 0.66, 4.6, 12]} />
        <meshStandardMaterial color={palette.groundSide} roughness={1} flatShading />
      </mesh>
      {/* 台面盖（微亮，像被世界"养"着的表皮） */}
      <mesh position={[0, topY - 0.14, 0]} receiveShadow>
        <cylinderGeometry args={[r * 0.985, r, 0.32, 12]} />
        <meshStandardMaterial color={new THREE.Color(palette.ground).lerp(new THREE.Color(palette.primary), 0.16)} roughness={0.85} flatShading />
      </mesh>
      {/* 岛沿发光描边 */}
      <mesh position={[0, topY + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r - 0.14, r, 32]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      {/* 装饰晶簇（小型双锥，暗光，不与碎片混淆） */}
      {deco.map((d) => (
        <mesh key={d.key} position={[d.x, topY + (d.h * d.s) / 2 - 0.05, d.z]} rotation={[d.tilt, 0, d.tilt]} scale={[d.s, d.s * d.h, d.s]}>
          <octahedronGeometry args={[1]} />
          <meshStandardMaterial
            color={d.accent ? palette.accent : palette.primary}
            emissive={d.accent ? palette.accent : palette.primary}
            emissiveIntensity={0.55}
            roughness={0.35}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

/** isles：分层浮岛群 + 深渊底 */
function IslesGround({ level, palette }: TerrainProps) {
  return (
    <group>
      {level.isles.map((isle, i) => (
        <Isle key={i} x={isle.x} z={isle.z} r={isle.r} topY={isle.topY} index={i} palette={palette} />
      ))}
      {/* 深渊底：极暗圆盘，避免纯黑无参照 */}
      <mesh position={[0, -26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[130, 40]} />
        <meshBasicMaterial color="#02040A" />
      </mesh>
      {/* 深渊微光雾盘 */}
      <mesh position={[0, -14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[110, 32]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.04} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** 平台与教学障碍：基座 + 顶面光膜 + 收边 + 角柱 */
function Platforms({ level, palette }: TerrainProps) {
  return (
    <group>
      {level.platforms.map((p, i) => {
        const isObstacle = p.kind === 'obstacle';
        const h = isObstacle ? 0.55 : p.h;
        const glow = isObstacle ? palette.accent : palette.primary;
        return (
          <group key={i} position={[p.x, 0, p.z]}>
            {/* 基座（略宽的暗色底） */}
            {!isObstacle && (
              <mesh position={[0, p.topY - h - 0.18, 0]}>
                <boxGeometry args={[p.w * 0.82, 0.36, p.d * 0.82]} />
                <meshStandardMaterial color={palette.groundSide} roughness={0.95} flatShading />
              </mesh>
            )}
            {/* 主体 */}
            <mesh position={[0, p.topY - h / 2, 0]} receiveShadow>
              <boxGeometry args={[p.w, h, p.d]} />
              <meshStandardMaterial color={isObstacle ? palette.groundSide : palette.ground} roughness={0.85} flatShading />
            </mesh>
            {/* 顶面光膜 */}
            <mesh position={[0, p.topY + 0.02, 0]}>
              <boxGeometry args={[p.w, 0.05, p.d]} />
              <meshBasicMaterial color={glow} transparent opacity={isObstacle ? 0.5 : 0.3} />
            </mesh>
            {/* 顶面四边收边光条 */}
            {[
              { x: 0, z: p.d / 2, w: p.w, d: 0.06 },
              { x: 0, z: -p.d / 2, w: p.w, d: 0.06 },
              { x: p.w / 2, z: 0, w: 0.06, d: p.d },
              { x: -p.w / 2, z: 0, w: 0.06, d: p.d },
            ].map((e, k) => (
              <mesh key={k} position={[e.x, p.topY + 0.015, e.z]}>
                <boxGeometry args={[e.w, 0.05, e.d]} />
                <meshBasicMaterial color={glow} transparent opacity={0.55} />
              </mesh>
            ))}
            {/* 角柱（仅可站立平台，标记落点） */}
            {!isObstacle &&
              [
                [p.w / 2 - 0.14, p.d / 2 - 0.14],
                [-p.w / 2 + 0.14, p.d / 2 - 0.14],
                [p.w / 2 - 0.14, -p.d / 2 + 0.14],
                [-p.w / 2 + 0.14, -p.d / 2 + 0.14],
              ].map(([cx, cz], k) => (
                <mesh key={k} position={[cx, p.topY + 0.09, cz]}>
                  <boxGeometry args={[0.12, 0.18, 0.12]} />
                  <meshBasicMaterial color={palette.primary} transparent opacity={0.85} />
                </mesh>
              ))}
            {/* 悬浮平台底部反重力光晕 */}
            {p.kind === 'platform' && (
              <mesh position={[0, p.topY - p.h - 0.5, 0]}>
                <boxGeometry args={[p.w * 0.5, 0.55, p.d * 0.5]} />
                <meshBasicMaterial color={palette.primary} transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} />
              </mesh>
            )}
            {/* 障碍侧面警示纹 */}
            {isObstacle &&
              [-0.9, 0, 0.9].map((ox) => (
                <mesh key={ox} position={[ox, p.topY - 0.28, p.d / 2 + 0.01]} rotation={[0, 0, 0.5]}>
                  <boxGeometry args={[0.1, 0.5, 0.02]} />
                  <meshBasicMaterial color={palette.accent} transparent opacity={0.7} />
                </mesh>
              ))}
          </group>
        );
      })}
    </group>
  );
}

/** 危险区可视化：脉冲环 + 旋转棘刺 + 微光柱 */
function Hazards({ level, palette }: TerrainProps) {
  const reduceMotion = useRunStore((s) => s.settings.reduceMotion);
  const groups = useRef<Array<THREE.Group | null>>([]);

  useFrame((state) => {
    if (reduceMotion) return;
    const t = state.clock.elapsedTime;
    groups.current.forEach((g, i) => {
      if (!g) return;
      const ring = g.children[0] as THREE.Mesh;
      const disc = g.children[1] as THREE.Mesh;
      const pulse = 0.32 + Math.sin(t * 2.4 + i * 1.7) * 0.14;
      (ring.material as THREE.MeshBasicMaterial).opacity = pulse + 0.12;
      (disc.material as THREE.MeshBasicMaterial).opacity = pulse * 0.3;
      const spikes = g.children[3];
      if (spikes) spikes.rotation.y = t * 0.5 + i;
    });
  });

  return (
    <group>
      {level.hazards.map((h, i) => {
        const y = level.terrainHeight(h.x, h.z);
        const base = y === -1000 ? 0.4 : y;
        const color = h.kind === 'lava_seam' || h.kind === 'static_field' ? '#FF4D5E' : palette.accent;
        return (
          <group key={i} position={[h.x, base, h.z]} ref={(el) => { groups.current[i] = el; }}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
              <ringGeometry args={[h.r * 0.55, h.r, 32]} />
              <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
              <circleGeometry args={[h.r * 0.55, 24]} />
              <meshBasicMaterial color={color} transparent opacity={0.1} />
            </mesh>
            {/* 微弱警示光柱 */}
            <mesh position={[0, 2.2, 0]}>
              <cylinderGeometry args={[h.r * 0.5, h.r * 0.72, 4.4, 12, 1, true]} />
              <meshBasicMaterial color={color} transparent opacity={0.05} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            {!reduceMotion && (
              <group>
                {[0, 1, 2].map((k) => (
                  <HazardSpike key={k} angle={(k / 3) * Math.PI * 2 + i} r={h.r * 0.6} color={color} />
                ))}
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

function HazardSpike({ angle, r, color }: { angle: number; r: number; color: string }) {
  return (
    <mesh position={[Math.cos(angle) * r, 0.35, Math.sin(angle) * r]} rotation={[0, angle, 0.3]}>
      <coneGeometry args={[0.16, 0.9, 5]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.6} />
    </mesh>
  );
}

export function GameTerrain(props: TerrainProps) {
  const { level } = props;
  return (
    <group>
      {level.skeleton === 'isles' ? <IslesGround {...props} /> : <DisplacedGround {...props} />}
      <Platforms {...props} />
      <Hazards {...props} />
    </group>
  );
}
