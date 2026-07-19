/**
 * Structures.tsx — 12 种程序化建筑模块（低多边形 + 自发光描边）
 * 正式版：每个模块补全基座/顶饰/发光缝线/小饰件，轮廓更精致；
 * 动画（悬浮/闪烁/环绕）遵循 reduceMotion 与突变预兆冻结。
 */

import { useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { createRng } from '@/engine';
import type { StructureSpot } from '../level';
import type { VisualPalette } from '../palettes';
import { relays } from '../bus';
import { useRunStore } from '../runStore';

interface ModuleProps {
  palette: VisualPalette;
  seed: number;
}

/** 统一的轻微悬浮动画（尊重减动效与冻结） */
function useBob(ref: RefObject<THREE.Group | null>, base: number, amp: number, speed: number, phase = 0) {
  const reduceMotion = useRunStore((s) => s.settings.reduceMotion);
  useFrame((state) => {
    if (ref.current && !reduceMotion && !relays.particlesFrozen) {
      ref.current.position.y = base + Math.sin(state.clock.elapsedTime * speed + phase) * amp;
    }
  });
}

/** 杯塔：托盘基座 + 双层杯身 + 杯口光环 + 把手 + 盖钮 + 窗缝光 */
function CupTower({ palette }: ModuleProps) {
  return (
    <group>
      {/* 托盘 */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[1.7, 1.85, 0.24, 12]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.66, 24]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      {/* 杯身下段 */}
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.9, 1.3, 2.6, 12]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.7} flatShading />
      </mesh>
      {/* 杯身上段 */}
      <mesh position={[0, 3.4, 0]}>
        <cylinderGeometry args={[1.15, 0.9, 1.3, 12]} />
        <meshStandardMaterial color={palette.ground} roughness={0.7} flatShading />
      </mesh>
      {/* 杯口光环 + 液面光 */}
      <mesh position={[0, 4.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 1.05, 16]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 4.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.68, 16]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* 盖钮 */}
      <mesh position={[0, 4.45, 0]}>
        <sphereGeometry args={[0.2, 10, 10]} />
        <meshBasicMaterial color={palette.accent} />
      </mesh>
      {/* 把手 */}
      <mesh position={[1.35, 2.6, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.7, 0.1, 6, 16, Math.PI]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.65} />
      </mesh>
      {/* 窗缝光 */}
      {[1.6, 2.3].map((y) => (
        <mesh key={y} position={[0, y, 1.18]}>
          <boxGeometry args={[0.5, 0.07, 0.06]} />
          <meshBasicMaterial color={palette.primary} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** 数据线藤蔓：顶部锚块 + 垂落管线 + 沿途焊珠 + 端点光 */
function CableVines({ palette, seed }: ModuleProps) {
  const tubes = useMemo(() => {
    const rng = createRng(seed);
    return [0, 1, 2, 3].map((i) => {
      const x = rng.range(-1.6, 1.6);
      const z = rng.range(-1.6, 1.6);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x * 0.5, 7 + rng.range(0, 2), z * 0.5),
        new THREE.Vector3(x + rng.range(-1, 1), 4.6, z + rng.range(-1, 1)),
        new THREE.Vector3(x + rng.range(-1.6, 1.6), 2.2, z + rng.range(-1.6, 1.6)),
        new THREE.Vector3(x + rng.range(-2, 2), 0.2, z + rng.range(-2, 2)),
      ]);
      return {
        key: i,
        geo: new THREE.TubeGeometry(curve, 14, 0.06, 5, false),
        tip: curve.getPoint(1),
        beadA: curve.getPoint(0.38),
        beadB: curve.getPoint(0.68),
        accent: rng.next() < 0.5,
      };
    });
  }, [seed]);
  return (
    <group>
      {/* 悬浮锚块 */}
      <mesh position={[0, 7.6, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[1.6, 0.9, 1.6]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.6} metalness={0.3} flatShading />
      </mesh>
      <mesh position={[0, 7.6, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[1.66, 0.12, 1.66]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 7.6, 0]}>
        <sphereGeometry args={[1.9, 12, 12]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {tubes.map((t) => (
        <group key={t.key}>
          <mesh geometry={t.geo}>
            <meshBasicMaterial color={palette.primary} transparent opacity={0.75} />
          </mesh>
          <mesh position={t.beadA}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color={t.accent ? palette.accent : palette.primary} />
          </mesh>
          <mesh position={t.beadB}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color={palette.primary} transparent opacity={0.9} />
          </mesh>
          <mesh position={t.tip}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color={palette.accent} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 路灯浮标：悬浮灯柱 + 灯罩 + 光锥 + 底座 */
function StreetlampBeacon({ palette }: ModuleProps) {
  const ref = useRef<THREE.Group>(null);
  useBob(ref, 0.35, 0.15, 0.8);
  return (
    <group ref={ref}>
      {/* 底座 */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.28, 0.4, 0.6, 8]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.7} flatShading />
      </mesh>
      {/* 主杆 */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.07, 0.11, 3.4, 6]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.03, 6, 12]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.7} />
      </mesh>
      {/* 弯臂 */}
      <mesh position={[0.5, 3.7, 0]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.05, 0.05, 1.2, 5]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.6} />
      </mesh>
      {/* 灯罩 + 灯芯 + 光晕 */}
      <mesh position={[0.95, 3.5, 0]}>
        <coneGeometry args={[0.42, 0.35, 8]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.6} flatShading />
      </mesh>
      <mesh position={[0.95, 3.3, 0]}>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshBasicMaterial color={palette.accent} />
      </mesh>
      <mesh position={[0.95, 3.3, 0]}>
        <sphereGeometry args={[0.66, 12, 12]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* 投地光锥 */}
      <mesh position={[0.95, 1.55, 0]}>
        <coneGeometry args={[1.1, 3.2, 12, 1, true]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.05} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** 光桥：双层拱带 + 桥柱 + 垂珠 + 端点光 */
function WhiskerBridge({ palette }: ModuleProps) {
  const beads = useMemo(() => {
    const pts: Array<[number, number, number]> = [];
    for (let i = 1; i <= 5; i++) {
      const a = (i / 6) * Math.PI;
      pts.push([Math.cos(a) * 3.2, Math.sin(a) * 3.2 + 1.6 - 0.32, 0]);
    }
    return pts;
  }, []);
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 1.6, 0]}>
        <torusGeometry args={[3.2, 0.09, 6, 28, Math.PI]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.85} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 1.6, 0]}>
        <torusGeometry args={[2.86, 0.045, 6, 28, Math.PI]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.5} />
      </mesh>
      {[-3.2, 3.2].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 1.2, 6]} />
            <meshStandardMaterial color={palette.groundSide} roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.28, 0]}>
            <sphereGeometry args={[0.14, 8, 8]} />
            <meshBasicMaterial color={palette.primary} />
          </mesh>
        </group>
      ))}
      {beads.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial color={i % 2 ? palette.accent : palette.primary} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** 芯片高塔：方塔 + 发光走线 + 侧鳍 + 针脚 + 闪烁顶灯 */
function ChipSpire({ palette }: ModuleProps) {
  const tip = useRef<THREE.Mesh>(null);
  const reduceMotion = useRunStore((s) => s.settings.reduceMotion);
  useFrame((state) => {
    if (tip.current && !reduceMotion) {
      const k = (Math.sin(state.clock.elapsedTime * 2.6) + 1) / 2;
      (tip.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + k * 0.65;
    }
  });
  return (
    <group>
      {/* 插座基座 */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[2.4, 0.3, 2.4]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.8} flatShading />
      </mesh>
      {/* 塔身 */}
      <mesh position={[0, 2.4, 0]}>
        <boxGeometry args={[1.8, 4.8, 1.8]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.55} metalness={0.3} flatShading />
      </mesh>
      {/* 走线光带 */}
      {[0.9, 2.1, 3.3].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[1.86, 0.06, 1.86]} />
          <meshBasicMaterial color={palette.primary} transparent opacity={0.8} />
        </mesh>
      ))}
      {/* 侧鳍 */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.06, 2.6, 0]}>
          <boxGeometry args={[0.1, 2.4, 0.7]} />
          <meshStandardMaterial color={palette.ground} roughness={0.6} metalness={0.2} flatShading />
        </mesh>
      ))}
      {/* 顶灯（闪烁） */}
      <mesh position={[0, 5.05, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshBasicMaterial color={palette.accent} />
      </mesh>
      <mesh ref={tip} position={[0, 5.05, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* 针脚 */}
      {[-0.7, 0, 0.7].map((x) => (
        <mesh key={x} position={[x, -0.3, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.8, 5]} />
          <meshStandardMaterial color={palette.groundSide} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/** 焊点：底座 + 琥珀能量球簇 + 连丝 + 环绕轨 */
function SolderNode({ palette, seed }: ModuleProps) {
  const balls = useMemo(() => {
    const rng = createRng(seed);
    return Array.from({ length: 5 }, (_, i) => ({
      key: i,
      p: [rng.range(-0.9, 0.9), rng.range(0.35, 1.5), rng.range(-0.9, 0.9)] as [number, number, number],
      s: rng.range(0.22, 0.5),
    }));
  }, [seed]);
  return (
    <group>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1.3, 1.5, 0.2, 10]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.05, 1.22, 20]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      {balls.map((b) => (
        <group key={b.key}>
          {/* 连丝 */}
          <mesh position={[b.p[0] / 2, b.p[1] / 2 + 0.1, b.p[2] / 2]} rotation={[Math.atan2(Math.hypot(b.p[0], b.p[2]), b.p[1]), 0, Math.atan2(b.p[0], b.p[2]) * 0.4]}>
            <cylinderGeometry args={[0.025, 0.025, Math.hypot(b.p[0], b.p[1], b.p[2]), 4]} />
            <meshBasicMaterial color={palette.primary} transparent opacity={0.5} />
          </mesh>
          <mesh position={b.p} scale={b.s}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial color={palette.accent} transparent opacity={0.9} />
          </mesh>
          <mesh position={b.p} scale={b.s * 1.8}>
            <sphereGeometry args={[1, 10, 10]} />
            <meshBasicMaterial color={palette.accent} transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 墨方尖碑：阶梯基座 + 碑身 + 刻纹光带 + 碑顶晶 */
function InkObelisk({ palette }: ModuleProps) {
  return (
    <group>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[2.2, 0.3, 2.2]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.7, 0.26, 1.7]} />
        <meshStandardMaterial color={palette.ground} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <coneGeometry args={[1.1, 4.4, 4]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.5} flatShading />
      </mesh>
      {[1.4, 2.5, 3.4].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[Math.max(0.2, 0.95 - y * 0.13), 0.05, Math.max(0.2, 0.95 - y * 0.13)]} />
          <meshBasicMaterial color={palette.primary} transparent opacity={0.8} />
        </mesh>
      ))}
      {/* 侧面铭文 */}
      {[1.9, 2.9].map((y) => (
        <mesh key={y} position={[0, y, Math.max(0.2, 0.68 - y * 0.1)]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.3, 0.04, 0.03]} />
          <meshBasicMaterial color={palette.accent} transparent opacity={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 4.9, 0]}>
        <octahedronGeometry args={[0.28]} />
        <meshBasicMaterial color={palette.accent} />
      </mesh>
      <mesh position={[0, 4.9, 0]}>
        <octahedronGeometry args={[0.46]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** 玻璃温室：透明罩 + 龙骨肋 + 内部浮空光核 */
function GlassConservatory({ palette }: ModuleProps) {
  const core = useRef<THREE.Group>(null);
  useBob(core as RefObject<THREE.Group | null>, 1.05, 0.18, 1.1, 1.3);
  return (
    <group>
      {/* 罩体 */}
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[1.5, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={palette.primary} transparent opacity={0.13} roughness={0.1} metalness={0.2} side={THREE.DoubleSide} />
      </mesh>
      {/* 龙骨肋 */}
      {[0, Math.PI / 3, (Math.PI * 2) / 3].map((a) => (
        <mesh key={a} position={[0, 1.3, 0]} rotation={[0, a, 0]}>
          <torusGeometry args={[1.5, 0.035, 5, 24, Math.PI * 0.55]} />
          <meshBasicMaterial color={palette.primary} transparent opacity={0.5} />
        </mesh>
      ))}
      {/* 底环 + 培养基 */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.3, 1.55, 28]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.3, 24]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.16} />
      </mesh>
      {/* 浮空光核 */}
      <group ref={core}>
        <mesh>
          <icosahedronGeometry args={[0.42, 0]} />
          <meshBasicMaterial color={palette.accent} />
        </mesh>
        <mesh rotation={[0.6, 0.4, 0]}>
          <torusGeometry args={[0.72, 0.03, 6, 20]} />
          <meshBasicMaterial color={palette.accent} transparent opacity={0.6} />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[0.72, 0]} />
          <meshBasicMaterial color={palette.accent} transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

/** 环形门：门柱 + 三层环 + 环绕碎星 + 门心微光 */
function RingGate({ palette, seed }: ModuleProps) {
  const orbit = useRef<THREE.Group>(null);
  const reduceMotion = useRunStore((s) => s.settings.reduceMotion);
  const shards = useMemo(() => {
    const rng = createRng(seed);
    return Array.from({ length: 4 }, (_, i) => ({
      key: i,
      a: (i / 4) * Math.PI * 2,
      r: rng.range(2.3, 2.8),
      s: rng.range(0.1, 0.2),
    }));
  }, [seed]);
  useFrame((state) => {
    if (orbit.current && !reduceMotion && !relays.particlesFrozen) {
      orbit.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });
  return (
    <group>
      {/* 门柱 */}
      {[-2.5, 2.5].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[0.5, 1.8, 0.5]} />
            <meshStandardMaterial color={palette.groundSide} roughness={0.7} flatShading />
          </mesh>
          <mesh position={[0, 1.86, 0]}>
            <boxGeometry args={[0.6, 0.12, 0.6]} />
            <meshBasicMaterial color={palette.primary} transparent opacity={0.7} />
          </mesh>
        </group>
      ))}
      {/* 主环 */}
      <mesh position={[0, 2.6, 0]}>
        <torusGeometry args={[2, 0.16, 8, 40]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 2.6, 0]}>
        <torusGeometry args={[1.72, 0.05, 6, 40]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 2.6, 0]} rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[2.3, 0.04, 6, 40]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.4} />
      </mesh>
      {/* 门心微光 */}
      <mesh position={[0, 2.6, 0]}>
        <circleGeometry args={[1.6, 32]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.05} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* 环绕碎星 */}
      <group position={[0, 2.6, 0]}>
        <group ref={orbit}>
          {shards.map((s) => (
            <mesh key={s.key} position={[Math.cos(s.a) * s.r, Math.sin(s.a) * s.r, 0]} scale={s.s}>
              <tetrahedronGeometry args={[1]} />
              <meshBasicMaterial color={palette.accent} transparent opacity={0.9} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/** 锚形神龛：祭坛 + 锚体 + 圣环 + 链节 + 顶晶 */
function AnchorShrine({ palette }: ModuleProps) {
  return (
    <group>
      {/* 祭坛 */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[2.4, 0.4, 2.4]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <coneGeometry args={[1.3, 0.7, 4]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.8} flatShading />
      </mesh>
      {/* 锚杆 */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 2.4, 6]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.6} />
      </mesh>
      {/* 锚冠环 */}
      <mesh position={[0, 3.35, 0]}>
        <torusGeometry args={[0.5, 0.1, 6, 20]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.35, 0]}>
        <torusGeometry args={[0.72, 0.035, 6, 20]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.6} />
      </mesh>
      {/* 锚爪弧光 */}
      <mesh position={[0, 1.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.9, 0.09, 6, 20, Math.PI]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.85} />
      </mesh>
      {/* 横杆 */}
      <mesh position={[0, 2.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 1.4, 5]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.6} />
      </mesh>
      {/* 链节 */}
      {[-0.85, 0.85].map((x) =>
        [0, 1, 2].map((k) => (
          <mesh key={`${x}-${k}`} position={[x, 2.1 - k * 0.24, 0]} rotation={[Math.PI / 2, 0, k % 2 ? Math.PI / 2 : 0]}>
            <torusGeometry args={[0.09, 0.025, 5, 10]} />
            <meshStandardMaterial color={palette.groundSide} roughness={0.55} />
          </mesh>
        )),
      )}
      {/* 顶晶 */}
      <mesh position={[0, 4.05, 0]}>
        <octahedronGeometry args={[0.2]} />
        <meshBasicMaterial color={palette.accent} />
      </mesh>
    </group>
  );
}

/** 墙段：端柱 + 墙体 + 顶檐光 + 铭文刻线 */
function WallSegment({ palette }: ModuleProps) {
  return (
    <group>
      {[-2.2, 2.2].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 1.25, 0]}>
            <boxGeometry args={[0.5, 2.5, 0.7]} />
            <meshStandardMaterial color={palette.groundSide} roughness={0.85} flatShading />
          </mesh>
          <mesh position={[0, 2.58, 0]}>
            <boxGeometry args={[0.56, 0.14, 0.76]} />
            <meshBasicMaterial color={palette.accent} transparent opacity={0.6} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[4.2, 2.2, 0.5]} />
        <meshStandardMaterial color={palette.groundSide} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 2.26, 0]}>
        <boxGeometry args={[4.6, 0.07, 0.56]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.7} />
      </mesh>
      {/* 铭文刻线 */}
      {[-1.2, 0, 1.2].map((x) => (
        <mesh key={x} position={[x, 1.35, 0.27]}>
          <boxGeometry args={[0.6, 0.05, 0.03]} />
          <meshBasicMaterial color={palette.primary} transparent opacity={0.65} />
        </mesh>
      ))}
      <mesh position={[0, 0.7, 0.27]}>
        <boxGeometry args={[2.8, 0.05, 0.03]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

/** 悬浮平台模块（装饰性）：台面 + 底锥 + 底晶 + 环绕尘 */
function FloatingPlatformModule({ palette }: ModuleProps) {
  const ref = useRef<THREE.Group>(null);
  const mote = useRef<THREE.Group>(null);
  const reduceMotion = useRunStore((s) => s.settings.reduceMotion);
  useFrame((state) => {
    if (reduceMotion || relays.particlesFrozen) return;
    const t = state.clock.elapsedTime;
    if (ref.current) {
      ref.current.position.y = 3.2 + Math.sin(t * 0.6) * 0.25;
      ref.current.rotation.y = t * 0.05;
    }
    if (mote.current) mote.current.rotation.y = t * 1.2;
  });
  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[2.4, 0.35, 2.4]} />
        <meshStandardMaterial color={palette.ground} roughness={0.7} flatShading />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[2.45, 0.05, 2.45]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.6} />
      </mesh>
      {/* 台面四边光 */}
      {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 1.22, 0.02, Math.sin(a) * 1.22]} rotation={[0, -a + Math.PI / 2, 0]}>
          <boxGeometry args={[2.4, 0.06, 0.05]} />
          <meshBasicMaterial color={palette.primary} transparent opacity={0.5} />
        </mesh>
      ))}
      <mesh position={[0, -0.6, 0]}>
        <coneGeometry args={[1.1, 1.3, 4]} />
        <meshStandardMaterial color={palette.groundSide} roughness={1} flatShading />
      </mesh>
      <mesh position={[0, -1.5, 0]}>
        <octahedronGeometry args={[0.28]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, -1.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.72, 20]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <group ref={mote}>
        <mesh position={[1.6, 0.5, 0]}>
          <sphereGeometry args={[0.07, 6, 6]} />
          <meshBasicMaterial color={palette.accent} />
        </mesh>
      </group>
    </group>
  );
}

function Module({ spot, palette }: { spot: StructureSpot; palette: VisualPalette }) {
  const props: ModuleProps = { palette, seed: spot.seed };
  switch (spot.kind) {
    case 'cup_tower':
      return <CupTower {...props} />;
    case 'cable_vines':
      return <CableVines {...props} />;
    case 'streetlamp_beacon':
      return <StreetlampBeacon {...props} />;
    case 'whisker_bridge':
      return <WhiskerBridge {...props} />;
    case 'chip_spire':
      return <ChipSpire {...props} />;
    case 'solder_node':
      return <SolderNode {...props} />;
    case 'ink_obelisk':
      return <InkObelisk {...props} />;
    case 'glass_conservatory':
      return <GlassConservatory {...props} />;
    case 'ring_gate':
      return <RingGate {...props} />;
    case 'anchor_shrine':
      return <AnchorShrine {...props} />;
    case 'wall_segment':
      return <WallSegment {...props} />;
    case 'floating_platform':
      return <FloatingPlatformModule {...props} />;
  }
}

export function GameStructures({ spots, palette }: { spots: StructureSpot[]; palette: VisualPalette }) {
  return (
    <group>
      {spots.map((s, i) => (
        <group key={i} position={[s.x, s.y, s.z]} rotation={[0, s.rotY, 0]} scale={s.scale}>
          <Module spot={s} palette={palette} />
        </group>
      ))}
    </group>
  );
}
