/**
 * Entities.tsx — 碎片 / 能量节点 / Boss / 出口传送门 / 玩家灵核
 * 正式版：全部实体建模精细化（晶体簇 / 方尖塔 / 刻度门环 / 六形 Boss），
 * 关键事件挂接 fx 粒子爆发与冲击环。距离检测逻辑与原版一致。
 */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import type { Boss, WorldDNA } from '@/engine';
import type { LevelData } from './level';
import type { VisualPalette } from './palettes';
import { relays, requestShake, showSubtitle } from './bus';
import { useRunStore } from './runStore';
import { sound } from './audio';
import { fx } from './fx';
import { BOSS_LABELS } from './palettes';

const tmpV = new THREE.Vector3();

// ── 碎片（记忆晶体） ───────────────────────────────────

interface ShardsProps {
  level: LevelData;
  palette: VisualPalette;
}

export function Shards({ level, palette }: ShardsProps) {
  const groupRefs = useRef<Array<THREE.Group | null>>([]);
  const states = useRef(level.shards.map(() => ({ collected: false, fly: 0 })));
  const collectOne = useRunStore((s) => s.collectOne);
  const addEvent = useRunStore((s) => s.addEvent);
  const tutorialMark = useRunStore((s) => s.tutorialMark);
  const firstRef = useRef(true);

  useFrame((state, delta) => {
    const { gravityFlipped, status } = useRunStore.getState();
    if (status !== 'playing') return;
    const t = state.clock.elapsedTime;
    const px = relays.playerX;
    const py = relays.playerY;
    const pz = relays.playerZ;
    const targetY = gravityFlipped ? level.skyFloorY - 1.7 : -1;

    level.shards.forEach((spot, i) => {
      const g = groupRefs.current[i];
      const st = states.current[i];
      if (!g || !st) return;
      if (st.collected) {
        // 飞向玩家后隐藏
        st.fly += delta * 5;
        g.position.lerp(tmpV.set(px, py + 0.5, pz), Math.min(1, st.fly));
        const s = Math.max(0.001, 1 - st.fly);
        g.scale.setScalar(s);
        g.visible = st.fly < 1;
        return;
      }
      // 重力反转：未收集碎片缓缓升向"天空地面"
      if (gravityFlipped && g.position.y < targetY - 0.05) {
        g.position.y = Math.min(targetY, g.position.y + delta * 6);
      }
      // 吸附：3m 内被玩家吸引
      const dx = px - g.position.x;
      const dy = py + 0.5 - g.position.y;
      const dz = pz - g.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 3) {
        const pull = (3 - dist) * 4 * delta;
        g.position.x += (dx / (dist || 1)) * pull;
        g.position.y += (dy / (dist || 1)) * pull;
        g.position.z += (dz / (dist || 1)) * pull;
        g.rotation.y += delta * 6; // 被吸附时加速旋转
      } else if (!gravityFlipped) {
        g.position.y = spot.y + Math.sin(t * 1.6 + i) * 0.18;
      }
      if (dist < 1.15) {
        st.collected = true;
        collectOne(useRunStore.getState().runSeconds);
        tutorialMark('collectedOne');
        sound.collect(useRunStore.getState().combo);
        relays.flashCyanAt = Date.now();
        fx.burst(g.position.x, g.position.y, g.position.z, {
          color: palette.shard,
          count: 16,
          speed: 4.5,
          size: 0.2,
          life: 0.7,
        });
        if (firstRef.current) {
          firstRef.current = false;
          addEvent('collect', '拾得第一块碎片');
        }
        const left = useRunStore.getState().total - useRunStore.getState().collected;
        if (left === 0) {
          addEvent('collect', '碎片集齐了');
          showSubtitle('碎片集齐了 · 去激活出口');
        } else if (left === 3) {
          showSubtitle('还剩最后三块');
        }
        return;
      }
      g.rotation.y = t * 1.4 + i;
      g.rotation.x = Math.sin(t * 0.9 + i) * 0.3;
    });
  });

  return (
    <group>
      {level.shards.map((spot, i) => (
        <group key={spot.id} position={[spot.x, spot.y, spot.z]} ref={(el) => { groupRefs.current[i] = el; }}>
          {/* 主晶体：拉长双锥（色盲辅助=菱形） */}
          <mesh scale={[0.34, 0.6, 0.34]}>
            <octahedronGeometry args={[1]} />
            <meshStandardMaterial color={palette.shard} emissive={palette.shard} emissiveIntensity={2.1} roughness={0.25} />
          </mesh>
          {/* 内亮核 */}
          <mesh>
            <sphereGeometry args={[0.14, 10, 10]} />
            <meshBasicMaterial color="#FFFFFF" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          {/* 外壳光晕 */}
          <mesh>
            <icosahedronGeometry args={[0.52, 0]} />
            <meshBasicMaterial color={palette.shard} transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          {/* 环绕微星（倾斜轨道，随母体旋转形成环绕） */}
          <group rotation={[0.7, 0, 0.4]}>
            {[0, 1, 2].map((k) => {
              const a = (k / 3) * Math.PI * 2;
              return (
                <mesh key={k} position={[Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62]}>
                  <sphereGeometry args={[0.055, 6, 6]} />
                  <meshBasicMaterial color={palette.shard} transparent opacity={0.95} />
                </mesh>
              );
            })}
          </group>
          {/* 底托光环 */}
          <mesh position={[0, -0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.3, 0.44, 20]} />
            <meshBasicMaterial color={palette.shard} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          {/* 远处可见的标记光柱（双层） */}
          <mesh position={[0, 4.4, 0]}>
            <cylinderGeometry args={[0.09, 0.16, 8, 6, 1, true]} />
            <meshBasicMaterial color={palette.shard} transparent opacity={0.13} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 4.4, 0]}>
            <cylinderGeometry args={[0.03, 0.05, 8, 5, 1, true]} />
            <meshBasicMaterial color={palette.shard} transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── 能量节点（方尖塔） ─────────────────────────────────

export function EnergyNodes({ level, palette }: ShardsProps) {
  const nodesLit = useRunStore((s) => s.nodesLit);
  const bossSpawned = useRunStore((s) => s.bossSpawned);
  const bossDefeated = useRunStore((s) => s.bossDefeated);
  const groupRefs = useRef<Array<THREE.Group | null>>([]);
  const spinRefs = useRef<Array<THREE.Group | null>>([]);
  const prevLitCount = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const s = useRunStore.getState();
    const flipped = s.gravityFlipped;

    // 新激活的节点 → 金色爆发 + 冲击环
    if (s.nodesLit.length > prevLitCount.current) {
      const newIds = s.nodesLit.slice(prevLitCount.current);
      prevLitCount.current = s.nodesLit.length;
      for (const id of newIds) {
        const n = level.nodes[id];
        if (n) {
          const gy = flipped ? level.skyFloorY - 1.7 : n.y;
          fx.burst(n.x, gy + 1.8, n.z, { color: '#E8C876', count: 26, speed: 6, size: 0.24, life: 0.9 });
          fx.shockwave(n.x, gy + 0.1, n.z, '#E8C876', 5, 0.8);
        }
      }
    }

    groupRefs.current.forEach((g, i) => {
      if (!g) return;
      // 重力反转：节点升向"天空地面"，保证可达
      const targetY = flipped ? level.skyFloorY - 1.7 : level.nodes[i].y;
      g.position.y += (targetY - g.position.y) * Math.min(1, delta * 2.5);
      const lit = nodesLit.includes(i);
      const spin = spinRefs.current[i];
      if (spin) {
        spin.position.y = 1.85 + Math.sin(t * 1.2 + i * 2) * 0.22;
        spin.rotation.y = t * (lit ? 0.5 : 1.9);
        spin.children.forEach((c, k) => {
          c.rotation.x = lit ? t * 0.3 : t * (k % 2 ? -0.9 : 0.9);
        });
      }
    });
  });

  const emphasized = bossSpawned && !bossDefeated;

  return (
    <group>
      {level.nodes.map((node, i) => {
        const lit = nodesLit.includes(i);
        const color = lit ? '#E8C876' : palette.accent;
        return (
          <group key={node.id} position={[node.x, node.y, node.z]} ref={(el) => { groupRefs.current[i] = el; }}>
            {/* 三层阶梯基座 */}
            <mesh position={[0, 0.14, 0]}>
              <cylinderGeometry args={[1.15, 1.3, 0.28, 8]} />
              <meshStandardMaterial color="#0A0F1A" roughness={0.7} flatShading />
            </mesh>
            <mesh position={[0, 0.38, 0]}>
              <cylinderGeometry args={[0.92, 1.1, 0.24, 8]} />
              <meshStandardMaterial color="#0D1420" roughness={0.65} flatShading />
            </mesh>
            <mesh position={[0, 0.62, 0]}>
              <cylinderGeometry args={[0.62, 0.85, 0.3, 8]} />
              <meshStandardMaterial color="#0A0F1A" roughness={0.6} flatShading />
            </mesh>
            {/* 基座光缝 */}
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.95, 0.97, 0.05, 8]} />
              <meshBasicMaterial color={color} transparent opacity={0.7} />
            </mesh>
            {/* 短柱 */}
            <mesh position={[0, 1.05, 0]}>
              <cylinderGeometry args={[0.22, 0.4, 0.75, 8]} />
              <meshStandardMaterial color="#0D1420" roughness={0.55} flatShading />
            </mesh>
            {/* 浮空核心：双四面体（色盲辅助=三角锥） */}
            <group position={[0, 1.85, 0]} ref={(el) => { spinRefs.current[i] = el; }}>
              <mesh>
                <tetrahedronGeometry args={[0.52]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={lit ? 2.4 : 1.2} roughness={0.3} />
              </mesh>
              <mesh rotation={[Math.PI, 0, 0]}>
                <tetrahedronGeometry args={[0.4]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={lit ? 2 : 0.9} roughness={0.3} />
              </mesh>
              <mesh>
                <tetrahedronGeometry args={[0.88]} />
                <meshBasicMaterial color={color} transparent opacity={lit ? 0.2 : 0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
              </mesh>
            </group>
            {/* 激活后的冲天光束 */}
            {lit && (
              <mesh position={[0, 6.5, 0]}>
                <cylinderGeometry args={[0.1, 0.22, 10, 6, 1, true]} />
                <meshBasicMaterial color={color} transparent opacity={0.32} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
              </mesh>
            )}
            {emphasized && !lit && (
              <mesh position={[0, 5, 0]}>
                <cylinderGeometry args={[0.2, 0.34, 9, 6, 1, true]} />
                <meshBasicMaterial color={color} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
              </mesh>
            )}
            {/* 地面双环 */}
            <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.1, 1.35, 28]} />
              <meshBasicMaterial color={color} transparent opacity={lit ? 0.55 : 0.28} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.55, 1.62, 28]} />
              <meshBasicMaterial color={color} transparent opacity={lit ? 0.3 : 0.12} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ── Boss ─────────────────────────────────────────────

interface BossProps {
  dna: WorldDNA;
  level: LevelData;
  palette: VisualPalette;
}

const BOSS_RED = '#FF4D5E';

/** 通用红色眼核 */
function Eye({ r = 0.22, y = 0 }: { r?: number; y?: number }) {
  return (
    <group position={[0, y, 0]}>
      <mesh>
        <sphereGeometry args={[r, 12, 12]} />
        <meshBasicMaterial color={BOSS_RED} />
      </mesh>
      <mesh>
        <sphereGeometry args={[r * 2, 10, 10]} />
        <meshBasicMaterial color={BOSS_RED} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Boss 抽象形态：从照片主体物变形的追逐体（全部含内部动画） */
function BossBody({ kind, palette }: { kind: Boss; palette: VisualPalette }) {
  const anim = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const reduceMotion = useRunStore((s) => s.settings.reduceMotion);

  useFrame((state) => {
    if (reduceMotion) return;
    const t = state.clock.elapsedTime;
    if (anim.current) {
      switch (kind) {
        case 'ember_maw':
          // 颌部张合
          anim.current.children[0].rotation.x = -0.28 - Math.abs(Math.sin(t * 1.8)) * 0.35;
          anim.current.children[1].rotation.x = 0.28 + Math.abs(Math.sin(t * 1.8)) * 0.35;
          break;
        case 'static_howler': {
          const k = 1 + Math.sin(t * 6) * 0.12;
          anim.current.scale.setScalar(k);
          break;
        }
        case 'mirror_double':
          anim.current.position.x = Math.sin(t * 13) * 0.05;
          anim.current.position.z = Math.cos(t * 11) * 0.05;
          break;
        case 'cursor_m01':
          anim.current.rotation.z = -0.4 + Math.sin(t * 2.2) * 0.12;
          break;
        default:
          break;
      }
    }
    if (spin.current) spin.current.rotation.y = t * (kind === 'null_shepherd' ? 0.8 : 1.4);
  });

  switch (kind) {
    case 'cursor_m01':
      return (
        <group ref={anim} rotation={[0, 0, -0.4]}>
          <mesh>
            <coneGeometry args={[1.1, 2.6, 3]} />
            <meshStandardMaterial color="#0A0F1A" emissive={BOSS_RED} emissiveIntensity={0.5} roughness={0.4} flatShading />
          </mesh>
          {/* 描边光棱 */}
          <mesh scale={1.12}>
            <coneGeometry args={[1.1, 2.6, 3]} />
            <meshBasicMaterial color={BOSS_RED} transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.BackSide} />
          </mesh>
          <mesh position={[0, -1.6, 0]}>
            <boxGeometry args={[0.5, 1, 0.5]} />
            <meshStandardMaterial color="#0A0F1A" emissive={BOSS_RED} emissiveIntensity={0.4} flatShading />
          </mesh>
          <group position={[0, 0.3, 0]}>
            <Eye r={0.24} />
          </group>
          {/* 环绕碎片指针 */}
          <group ref={spin}>
            {[0, 1, 2].map((i) => {
              const a = (i / 3) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 1.7, Math.sin(t2(i)) * 0.2, Math.sin(a) * 1.7]} rotation={[0.5, a, 0]}>
                  <tetrahedronGeometry args={[0.22]} />
                  <meshBasicMaterial color={BOSS_RED} transparent opacity={0.85} />
                </mesh>
              );
            })}
          </group>
        </group>
      );
    case 'umbrella_warden':
      return (
        <group>
          {/* 伞盖 */}
          <mesh position={[0, 0.7, 0]}>
            <coneGeometry args={[1.7, 1.2, 8]} />
            <meshStandardMaterial color="#0A0F1A" emissive={BOSS_RED} emissiveIntensity={0.45} roughness={0.5} flatShading />
          </mesh>
          {/* 伞骨 + 垂珠 */}
          <group ref={spin} position={[0, 0.7, 0]}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <group key={i} rotation={[0, a, 0]}>
                  <mesh position={[0.85, -0.28, 0]} rotation={[0, 0, -0.42]}>
                    <cylinderGeometry args={[0.03, 0.03, 1.75, 4]} />
                    <meshStandardMaterial color="#0D1420" emissive={BOSS_RED} emissiveIntensity={0.3} roughness={0.5} />
                  </mesh>
                  <mesh position={[1.62, -0.62, 0]}>
                    <sphereGeometry args={[0.09, 8, 8]} />
                    <meshBasicMaterial color={BOSS_RED} transparent opacity={0.9} />
                  </mesh>
                </group>
              );
            })}
          </group>
          {/* 伞柄 + 弯钩 */}
          <mesh position={[0, -0.7, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 1.8, 6]} />
            <meshStandardMaterial color="#0A0F1A" emissive={BOSS_RED} emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0.22, -1.62, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.22, 0.06, 6, 14, Math.PI]} />
            <meshStandardMaterial color="#0A0F1A" emissive={BOSS_RED} emissiveIntensity={0.4} />
          </mesh>
          <Eye r={0.2} y={0.1} />
        </group>
      );
    case 'static_howler':
      return (
        <group ref={anim}>
          <mesh>
            <icosahedronGeometry args={[1.1, 0]} />
            <meshStandardMaterial color="#0A0F1A" emissive={BOSS_RED} emissiveIntensity={0.6} roughness={0.3} flatShading />
          </mesh>
          {/* 内亮核 */}
          <mesh>
            <icosahedronGeometry args={[0.55, 0]} />
            <meshBasicMaterial color={BOSS_RED} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          {/* 嚎刺 */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = (i / 8) * Math.PI * 2;
            const tilt = i % 2 ? 0.6 : -0.4;
            return (
              <mesh key={i} position={[Math.cos(a) * 1.25, 0.3 + (i % 3) * 0.15, Math.sin(a) * 1.25]} rotation={[tilt, a, 0]}>
                <coneGeometry args={[0.16, 1, 4]} />
                <meshBasicMaterial color={BOSS_RED} transparent opacity={0.85} />
              </mesh>
            );
          })}
          {/* 电弧 */}
          {[0, 1, 2].map((i) => {
            const a = (i / 3) * Math.PI * 2 + 0.5;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.9, 0.2, Math.sin(a) * 0.9]} rotation={[Math.PI / 2.4, a, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 2.4, 4]} />
                <meshBasicMaterial color="#FFD7DB" transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
              </mesh>
            );
          })}
        </group>
      );
    case 'null_shepherd':
      return (
        <group>
          <mesh>
            <sphereGeometry args={[1, 18, 18]} />
            <meshStandardMaterial color="#05070D" emissive={BOSS_RED} emissiveIntensity={0.4} roughness={0.2} />
          </mesh>
          {/* 眼缝 */}
          <mesh position={[0, 0.15, 0.86]} rotation={[0.1, 0, 0]}>
            <boxGeometry args={[0.6, 0.07, 0.3]} />
            <meshBasicMaterial color={BOSS_RED} />
          </mesh>
          {/* 三重牧环 */}
          <group ref={spin}>
            <mesh rotation={[Math.PI / 2.4, 0, 0]}>
              <torusGeometry args={[1.6, 0.08, 6, 36]} />
              <meshBasicMaterial color={BOSS_RED} transparent opacity={0.75} />
            </mesh>
            <mesh rotation={[Math.PI / 1.7, 0.5, 0]}>
              <torusGeometry args={[1.95, 0.05, 6, 36]} />
              <meshBasicMaterial color={BOSS_RED} transparent opacity={0.45} />
            </mesh>
            <mesh rotation={[Math.PI / 3, -0.4, 0.3]}>
              <torusGeometry args={[2.25, 0.035, 6, 40]} />
              <meshBasicMaterial color={palette.primary} transparent opacity={0.3} />
            </mesh>
            {/* 放牧的虚空幼体 */}
            {[0, 1, 2, 3].map((i) => {
              const a = (i / 4) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 2.2, Math.sin(a * 2) * 0.4, Math.sin(a) * 2.2]} rotation={[a, a * 1.3, 0]}>
                  <boxGeometry args={[0.24, 0.24, 0.24]} />
                  <meshStandardMaterial color="#0A0F1A" emissive={BOSS_RED} emissiveIntensity={0.5} flatShading />
                </mesh>
              );
            })}
          </group>
        </group>
      );
    case 'ember_maw':
      return (
        <group>
          <group ref={anim}>
            {/* 上颌 */}
            <group>
              <mesh position={[0, 0.62, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[1.1, 1.6, 6]} />
                <meshStandardMaterial color="#1A0B08" emissive="#FF8A5C" emissiveIntensity={0.7} flatShading />
              </mesh>
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const a = (i / 6) * Math.PI * 2;
                return (
                  <mesh key={i} position={[Math.cos(a) * 0.85, 0.02, Math.sin(a) * 0.85]} rotation={[Math.PI, 0, 0]}>
                    <coneGeometry args={[0.12, 0.5, 4]} />
                    <meshStandardMaterial color="#FFD7C4" emissive="#FF8A5C" emissiveIntensity={0.5} flatShading />
                  </mesh>
                );
              })}
            </group>
            {/* 下颌 */}
            <group>
              <mesh position={[0, -0.62, 0]}>
                <coneGeometry args={[1.1, 1.6, 6]} />
                <meshStandardMaterial color="#1A0B08" emissive={BOSS_RED} emissiveIntensity={0.6} flatShading />
              </mesh>
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const a = (i / 6) * Math.PI * 2 + 0.3;
                return (
                  <mesh key={i} position={[Math.cos(a) * 0.85, -0.02, Math.sin(a) * 0.85]}>
                    <coneGeometry args={[0.12, 0.5, 4]} />
                    <meshStandardMaterial color="#FFD7C4" emissive={BOSS_RED} emissiveIntensity={0.5} flatShading />
                  </mesh>
                );
              })}
            </group>
          </group>
          {/* 喉中热核 */}
          <mesh>
            <sphereGeometry args={[0.42, 14, 14]} />
            <meshBasicMaterial color="#FFB25C" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.8, 12, 12]} />
            <meshBasicMaterial color="#FF8A5C" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <Sparkles count={26} scale={[2.6, 2.6, 2.6]} size={2.4} speed={0.8} color="#FF8A5C" opacity={0.8} />
        </group>
      );
    case 'mirror_double':
      return (
        <group ref={anim}>
          <mesh>
            <sphereGeometry args={[0.9, 20, 20]} />
            <meshStandardMaterial color={palette.primary} emissive={BOSS_RED} emissiveIntensity={0.35} roughness={0.08} metalness={0.95} />
          </mesh>
          {/* 裂纹 */}
          {[0.5, 1.9, 3.6].map((a, i) => (
            <mesh key={i} position={[Math.cos(a) * 0.62, Math.sin(a * 1.4) * 0.5, Math.sin(a) * 0.62]} rotation={[a * 0.7, a, 0.4]}>
              <boxGeometry args={[0.7, 0.03, 0.03]} />
              <meshBasicMaterial color={BOSS_RED} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          ))}
          <mesh>
            <sphereGeometry args={[1.25, 14, 14]} />
            <meshBasicMaterial color={BOSS_RED} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          {/* 镜像卫星 */}
          <group ref={spin}>
            {[0, 1, 2, 3].map((i) => {
              const a = (i / 4) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 1.8, Math.sin(a * 1.7) * 0.3, Math.sin(a) * 1.8]}>
                  <sphereGeometry args={[0.16, 10, 10]} />
                  <meshStandardMaterial color={palette.primary} emissive={BOSS_RED} emissiveIntensity={0.6} roughness={0.15} metalness={0.8} />
                </mesh>
              );
            })}
          </group>
        </group>
      );
  }
}

/** cursor_m01 环绕碎片的高度抖动（确定性伪相位） */
function t2(i: number): number {
  return i * 2.1;
}

export function BossEntity({ dna, level, palette }: BossProps) {
  const root = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const spawned = useRunStore((s) => s.bossSpawned);
  const defeated = useRunStore((s) => s.bossDefeated);
  const pos = useRef(new THREE.Vector3(level.bossSpawn.x, level.bossSpawn.y, level.bossSpawn.z));
  const stunUntil = useRef(0);
  const touchCooldown = useRef(0);
  const dieT = useRef(-1);
  const prevLit = useRef(0);
  const warned = useRef(false);

  useFrame((state, delta) => {
    const s = useRunStore.getState();
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    if (!root.current) return;

    if (!spawned || s.status !== 'playing') {
      root.current.visible = false;
      return;
    }
    root.current.visible = true;

    // Boss 预警（字幕 + 红脉冲由 HUD/灯光承担）
    if (!warned.current) {
      warned.current = true;
      showSubtitle(`${BOSS_LABELS[dna.boss]} 盯上了你`);
      sound.bossWarn();
      requestShake(2);
      fx.burst(pos.current.x, pos.current.y, pos.current.z, { color: BOSS_RED, count: 30, speed: 7, size: 0.26, life: 1 });
    }

    // 节点激活 → 僵直
    if (s.nodesLit.length > prevLit.current) {
      prevLit.current = s.nodesLit.length;
      stunUntil.current = t + 2.5;
      relays.flashGoldAt = Date.now();
      showSubtitle('它僵直了一瞬 · 继续');
      fx.burst(pos.current.x, pos.current.y + 0.5, pos.current.z, { color: '#E8C876', count: 18, speed: 5, size: 0.22, life: 0.8 });
    }

    if (s.bossDefeated) {
      // 解体动画
      if (dieT.current < 0) {
        dieT.current = t;
        fx.burst(pos.current.x, pos.current.y + 0.5, pos.current.z, { color: BOSS_RED, count: 44, speed: 9, size: 0.3, life: 1.2 });
        fx.burst(pos.current.x, pos.current.y + 0.5, pos.current.z, { color: '#FFFFFF', count: 18, speed: 5, size: 0.2, life: 0.9 });
        fx.shockwave(pos.current.x, pos.current.y - 1.6, pos.current.z, BOSS_RED, 7, 1);
      }
      const k = (t - dieT.current) / 1.2;
      root.current.scale.setScalar(Math.max(0.001, 1 - k));
      root.current.rotation.y += dt * 12;
      if (lightRef.current) lightRef.current.intensity = Math.max(0, 14 * (1 - k));
      if (k > 1) root.current.visible = false;
      relays.bossActive = false;
      return;
    }

    const stunned = t < stunUntil.current;
    const speedBase = dna.difficulty === 'gentle' ? 3.4 : dna.difficulty === 'intense' ? 5 : 4.2;
    const px = relays.playerX;
    const pz = relays.playerZ;
    const dx = px - pos.current.x;
    const dz = pz - pos.current.z;
    const distXZ = Math.sqrt(dx * dx + dz * dz);

    if (!stunned && distXZ > 0.6) {
      const speed = speedBase * (distXZ > 14 ? 1.25 : 1);
      pos.current.x += (dx / distXZ) * speed * dt;
      pos.current.z += (dz / distXZ) * speed * dt;
    }

    // 悬浮高度：贴地 +2.2（虚空上也不坠落）；重力反转时贴着"天空地面"
    const g = level.groundHeight(pos.current.x, pos.current.z, 500);
    const baseY = s.gravityFlipped ? level.skyFloorY : g === -1000 ? relays.playerY : g;
    const targetY = baseY + (s.gravityFlipped ? -2.2 : 2.2) + Math.sin(t * 1.7) * 0.3;
    pos.current.y += (targetY - pos.current.y) * Math.min(1, dt * 3);

    root.current.position.copy(pos.current);
    root.current.rotation.y = Math.atan2(dx, dz);
    if (bodyRef.current) {
      bodyRef.current.rotation.y = stunned ? 0 : t * 1.1;
      bodyRef.current.rotation.z = stunned ? Math.sin(t * 30) * 0.08 : 0;
    }
    // 红色预警脉冲光
    if (lightRef.current) {
      const near = distXZ < 12;
      lightRef.current.intensity = s.settings.reduceMotion ? 6 : 6 + Math.sin(t * (near ? 9 : 4)) * (near ? 4 : 2);
    }

    relays.bossX = pos.current.x;
    relays.bossY = pos.current.y;
    relays.bossZ = pos.current.z;
    relays.bossActive = true;

    // 触碰：稳定度 -8 + 击退（冷却 1.5s）
    if (touchCooldown.current > 0) touchCooldown.current -= dt;
    if (distXZ < 1.8 && Math.abs(relays.playerY - pos.current.y) < 2.4 && touchCooldown.current <= 0 && !stunned) {
      touchCooldown.current = 1.5;
      s.damage(8);
      s.addEvent('boss', `被 ${BOSS_LABELS[dna.boss]} 触碰`);
      sound.bossHit();
      relays.flashRedAt = Date.now();
      requestShake(2);
      fx.burst(relays.playerX, relays.playerY + 0.6, relays.playerZ, { color: BOSS_RED, count: 14, speed: 5, size: 0.22, life: 0.6 });
      const kx = distXZ > 0.01 ? -dx / distXZ : 0;
      const kz = distXZ > 0.01 ? -dz / distXZ : 0;
      relays.knockX = kx * 9;
      relays.knockZ = kz * 9;
      showSubtitle('稳定度 -8 · 甩开它');
    }
  });

  return (
    <group ref={root} visible={false}>
      <group ref={bodyRef}>
        <BossBody kind={dna.boss} palette={palette} />
      </group>
      <pointLight ref={lightRef} color={BOSS_RED} intensity={6} distance={16} decay={1.6} />
      {!defeated && spawned && (
        <mesh position={[0, -1.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.25, 28]} />
          <meshBasicMaterial color={BOSS_RED} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ── 出口传送门 ───────────────────────────────────────

const swirlVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const swirlFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uActive;
  varying vec2 vUv;
  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;
    float a = atan(c.y, c.x);
    float swirl = sin(a * 3.0 + r * 9.0 - uTime * 2.6);
    float bands = smoothstep(0.15, 1.0, 0.5 + 0.5 * swirl);
    float fall = smoothstep(1.0, 0.12, r);
    float core = smoothstep(0.34, 0.0, r);
    vec3 col = mix(uColor, vec3(1.0), core * 0.7);
    float alpha = (bands * 0.5 + core * 0.65) * fall * uActive;
    if (alpha < 0.012) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function Portal({ level, palette }: ShardsProps) {
  const active = useRunStore((s) => s.portalActive);
  const rootRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const prevActive = useRef(false);

  const swirl = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: swirlVertex,
        fragmentShader: swirlFragment,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(palette.primary) },
          uActive: { value: 0.1 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [palette],
  );

  // 门环刻度
  const ticks = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return { key: i, a, long: i % 4 === 0 };
      }),
    [],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    // 重力反转：出口升向天空地面（与碎片/节点一致）
    if (rootRef.current) {
      const flipped = useRunStore.getState().gravityFlipped;
      const targetY = (flipped ? level.skyFloorY : level.portal.y) + 2.6;
      rootRef.current.position.y += (targetY - rootRef.current.position.y) * Math.min(1, delta * 2.2);
    }
    // 激活瞬间：冲击环 + 爆发
    if (active && !prevActive.current && rootRef.current) {
      prevActive.current = true;
      const p = rootRef.current.position;
      fx.shockwave(p.x, p.y - 2.4, p.z, palette.primary, 8, 1);
      fx.burst(p.x, p.y, p.z, { color: palette.primary, count: 36, speed: 8, size: 0.26, life: 1.1 });
    }
    if (ringRef.current) ringRef.current.rotation.z = active ? t * 0.5 : 0;
    if (innerRef.current) innerRef.current.rotation.z = active ? -t * 0.85 : 0;
    swirl.uniforms.uTime.value = t;
    swirl.uniforms.uActive.value = THREE.MathUtils.damp(swirl.uniforms.uActive.value, active ? 1 : 0.1, 3, delta);
    if (lightRef.current) lightRef.current.intensity = active ? 30 + Math.sin(t * 2.4) * 6 : 2;
  });

  return (
    <group ref={rootRef} position={[level.portal.x, level.portal.y + 2.6, level.portal.z]}>
      {/* 外环 + 刻度 */}
      <mesh ref={ringRef}>
        <torusGeometry args={[2.1, 0.18, 10, 56]} />
        <meshStandardMaterial
          color={active ? palette.primary : '#2A3446'}
          emissive={active ? palette.primary : '#1B2330'}
          emissiveIntensity={active ? 2 : 0.4}
          roughness={0.4}
        />
        {ticks.map((tk) => (
          <mesh key={tk.key} position={[Math.cos(tk.a) * 2.1, Math.sin(tk.a) * 2.1, 0]} rotation={[0, 0, tk.a]}>
            <boxGeometry args={[tk.long ? 0.34 : 0.18, 0.07, 0.07]} />
            <meshBasicMaterial color={active ? palette.primary : '#3A4A60'} transparent opacity={active ? 0.95 : 0.5} />
          </mesh>
        ))}
      </mesh>
      {/* 内环（反向旋转） */}
      <mesh ref={innerRef}>
        <torusGeometry args={[1.62, 0.06, 8, 48]} />
        <meshBasicMaterial color={active ? palette.primary : '#2A3446'} transparent opacity={active ? 0.9 : 0.35} />
      </mesh>
      {/* 漩涡面盘（色盲辅助：出口=圆环+内盘） */}
      <mesh material={swirl}>
        <circleGeometry args={[1.85, 48]} />
      </mesh>
      {active && <Sparkles count={48} scale={[5, 6, 2]} size={3} speed={0.7} color={palette.primary} opacity={0.85} />}
      <pointLight ref={lightRef} color={palette.primary} intensity={2} distance={18} decay={1.6} />
      {/* 门柱基座：三层台 + 地面纹章 */}
      <mesh position={[0, -2.95, 0]}>
        <cylinderGeometry args={[1.7, 2.05, 0.3, 12]} />
        <meshStandardMaterial color="#0A0F1A" roughness={0.7} flatShading />
      </mesh>
      <mesh position={[0, -2.72, 0]}>
        <cylinderGeometry args={[1.35, 1.6, 0.24, 12]} />
        <meshStandardMaterial color="#0D1420" roughness={0.65} flatShading />
      </mesh>
      <mesh position={[0, -2.56, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.05, 1.28, 32]} />
        <meshBasicMaterial color={active ? palette.primary : '#3A4A60'} transparent opacity={active ? 0.7 : 0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -2.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.68, 24]} />
        <meshBasicMaterial color={active ? palette.primary : '#3A4A60'} transparent opacity={active ? 0.5 : 0.2} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** 玩家灵核（运动控制器在 Player.tsx）：内核 + 壳 + 赤道环 + 环绕微星 + 场光 */
export function PlayerBall({ palette }: { palette: VisualPalette }) {
  const ring = useRef<THREE.Mesh>(null);
  const mote = useRef<THREE.Group>(null);
  const reduceMotion = useRunStore((s) => s.settings.reduceMotion);

  useFrame((state) => {
    if (reduceMotion) return;
    const t = state.clock.elapsedTime;
    if (ring.current) {
      ring.current.rotation.x = Math.PI / 2 + Math.sin(t * 1.4) * 0.35;
      ring.current.rotation.y = t * 2.2;
    }
    if (mote.current) {
      mote.current.rotation.y = t * 3.1;
      mote.current.rotation.z = 0.5 + Math.sin(t * 0.9) * 0.3;
    }
  });

  return (
    <group>
      {/* 外壳 */}
      <mesh castShadow>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshStandardMaterial color="#0D1622" emissive={palette.primary} emissiveIntensity={0.55} roughness={0.22} metalness={0.55} />
      </mesh>
      {/* 内核 */}
      <mesh>
        <icosahedronGeometry args={[0.26, 1]} />
        <meshStandardMaterial color={palette.primary} emissive={palette.primary} emissiveIntensity={2.2} roughness={0.3} />
      </mesh>
      {/* 赤道环 */}
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.56, 0.03, 8, 36]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* 环绕微星 */}
      <group ref={mote}>
        <mesh position={[0.72, 0, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshBasicMaterial color={palette.accent} />
        </mesh>
      </group>
      {/* 外层辉光 */}
      <mesh>
        <sphereGeometry args={[0.58, 16, 16]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.13} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight color={palette.primary} intensity={7} distance={9} decay={1.7} />
    </group>
  );
}
