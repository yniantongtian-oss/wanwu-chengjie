/**
 * GameScene.tsx — R3F 场景装配：灯光 / 雾 / 天空 / 地形 / 实体 / 主循环（五段式）
 * 正式版：泛光后期、特效粒子层、玩家跟随动态阴影。
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { WorldDNA } from '@/engine';
import type { LevelData } from './level';
import type { VisualPalette } from './palettes';
import { PALETTE_MAP, BOSS_LABELS, MUTATION_HINTS, MUTATION_LABELS } from './palettes';
import { GameSky, WeatherParticles } from './scene/SkyAndWeather';
import { GameTerrain } from './scene/Terrain';
import { GameStructures } from './scene/Structures';
import { Shards, EnergyNodes, BossEntity, Portal } from './Entities';
import { Player } from './Player';
import PostFX from './PostFX';
import { FxLayer, fx } from './fx';
import { relays, requestShake, showSubtitle } from './bus';
import { useRunStore } from './runStore';
import { sound } from './audio';

export type Quality = 'high' | 'low';

// ── 灯光 ─────────────────────────────────────────────

function Lights({ dna, palette, shadows }: { dna: WorldDNA; palette: VisualPalette; shadows: boolean }) {
  const ambient = useRef<THREE.AmbientLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const accent = useRef<THREE.PointLight>(null);

  const accentPos = useMemo<[number, number, number]>(() => {
    switch (dna.lighting) {
      case 'lamp_sun':
        return [14, 26, 10];
      case 'backlit_rain':
        return [-8, 18, -30];
      case 'moon_glow':
        return [-18, 30, -12];
      case 'node_pulse':
        return [0, 12, -20];
      case 'ember_fall':
        return [8, 20, -6];
      case 'portal_rim':
        return [0, 8, -40];
    }
  }, [dna.lighting]);

  const accentColor = dna.lighting === 'lamp_sun' || dna.lighting === 'ember_fall' || dna.lighting === 'node_pulse'
    ? palette.accent
    : palette.primary;

  useFrame((state, delta) => {
    const s = useRunStore.getState();
    const k = Math.min(1, delta * 1.6); // 2s 内衰减（太阳熄灭）
    const dim = s.blackout ? 0.08 : 1;
    if (ambient.current) {
      ambient.current.intensity = THREE.MathUtils.lerp(ambient.current.intensity, 0.55 * dim, k);
    }
    if (key.current) {
      key.current.intensity = THREE.MathUtils.lerp(key.current.intensity, 1.15 * dim, k);
      // 动态阴影：光源与目标跟随玩家，保证阴影范围清晰
      if (shadows) {
        const px = relays.playerX;
        const py = relays.playerY;
        const pz = relays.playerZ;
        key.current.position.set(px + 14, py + 26, pz + 10);
        key.current.target.position.set(px, py, pz);
        key.current.target.updateMatrixWorld();
      }
    }
    if (accent.current) {
      const pulse = dna.lighting === 'node_pulse' && !s.settings.reduceMotion ? 1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.25 : 1;
      accent.current.intensity = THREE.MathUtils.lerp(accent.current.intensity, 60 * (s.blackout ? 0.35 : 1) * pulse, k);
    }
  });

  return (
    <group>
      <ambientLight ref={ambient} intensity={0.55} color={palette.primary} />
      <directionalLight
        ref={key}
        position={[18, 32, 12]}
        intensity={1.15}
        color="#E8F0FF"
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0004}
      />
      <pointLight ref={accent} position={accentPos} intensity={60} distance={70} decay={1.8} color={accentColor} />
      {/* 台灯小太阳：可见光源体 */}
      {dna.lighting === 'lamp_sun' && (
        <mesh position={accentPos}>
          <sphereGeometry args={[2.2, 18, 18]} />
          <meshBasicMaterial color={palette.accent} />
        </mesh>
      )}
    </group>
  );
}

// ── 雾控制（开局 3s 雾散） ────────────────────────────

function FogController({ palette }: { palette: VisualPalette }) {
  const ref = useRef<THREE.FogExp2>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    t.current = Math.min(1, t.current + delta / 3);
    const s = useRunStore.getState();
    const base = THREE.MathUtils.lerp(0.055, 0.016, t.current);
    const target = s.blackout ? base * 1.5 : base;
    if (ref.current) ref.current.density = THREE.MathUtils.damp(ref.current.density, target, 2, delta);
  });
  return <fogExp2 ref={ref} attach="fog" args={[palette.fog, 0.055]} />;
}

// ── 主循环 ───────────────────────────────────────────

type MutationKind = 'gravity_flip' | 'sun_blackout' | 'shift';

function mutationKind(m: WorldDNA['mutation']): MutationKind {
  if (m === 'gravity_flip') return 'gravity_flip';
  if (m === 'sun_blackout') return 'sun_blackout';
  return 'shift';
}

function RunLoop({ dna, level }: { dna: WorldDNA; level: LevelData }) {
  const omenAt = useRef(-1);
  const transformAt = useRef(-1);
  const endAt = useRef(-1);
  const heartbeatAt = useRef(0);
  const hazardTick = useRef(0);
  const hazardHintAt = useRef(0);
  const fpsFrames = useRef(0);
  const fpsWindowStart = useRef(0);

  useFrame((_, delta) => {
    const s = useRunStore.getState();

    // FPS 采样（每 5s 写入 sessionStorage，供性能分级复核）
    fpsFrames.current += 1;
    const nowMs = performance.now();
    if (fpsWindowStart.current === 0) fpsWindowStart.current = nowMs;
    if (nowMs - fpsWindowStart.current >= 5000) {
      const fps = Math.round((fpsFrames.current * 1000) / (nowMs - fpsWindowStart.current));
      fpsFrames.current = 0;
      fpsWindowStart.current = nowMs;
      try {
        window.sessionStorage.setItem('k3:lastFps', String(fps));
      } catch {
        // ignore
      }
    }

    // 终局过场
    if (s.status === 'portal' || s.status === 'collapsing') {
      if (endAt.current < 0) endAt.current = performance.now();
      const need = s.status === 'portal' ? 1100 : 1700;
      if (performance.now() - endAt.current > need) s.setStatus('ended');
      return;
    }
    if (s.status !== 'playing') return;

    const dt = Math.min(delta, 0.05);
    s.addTime(dt);
    const t = s.runSeconds;
    const remaining = s.totalSeconds - t;

    // 失败：超时或稳定度归零
    if (remaining <= 0 || s.stability <= 0) {
      s.addEvent('system', s.stability <= 0 ? '稳定度归零' : '计时归零');
      s.setVictory(false);
      s.setStatus('collapsing');
      sound.chime(false);
      sound.stopAmbient();
      return;
    }

    // 心跳（≤15s）
    if (remaining <= 15 && performance.now() - heartbeatAt.current > 1000) {
      heartbeatAt.current = performance.now();
      sound.heartbeat();
    }

    // 观察 → 行动
    if (s.phase === 'observe' && t >= 8) {
      s.setPhase('act');
    }

    // 行动 → 突变
    if (s.phase === 'act' && t >= dna.mutationAtSeconds) {
      s.setPhase('mutate');
      s.setMutationStage('omen');
      omenAt.current = t;
      relays.particlesFrozen = true;
      sound.stopAmbient();
      sound.omen();
      showSubtitle('世界安静了一瞬');
    }

    // 突变分镜
    if (s.phase === 'mutate' && omenAt.current >= 0) {
      if (s.mutationStage === 'omen' && t - omenAt.current >= 0.5) {
        s.setMutationStage('transform');
        transformAt.current = t;
        relays.particlesFrozen = false;
        s.applyMutation(mutationKind(dna.mutation));
        s.damage(15);
        sound.mutationBoom();
        requestShake(2);
        fx.shockwave(relays.playerX, relays.playerY + 0.1, relays.playerZ, '#F5B84C', 12, 1.2);
        fx.burst(relays.playerX, relays.playerY + 1, relays.playerZ, { color: '#F5B84C', count: 30, speed: 9, size: 0.26, life: 1.1, gravity: 3 });
        s.addEvent('mutation', `世界突变 · ${MUTATION_LABELS[dna.mutation]}`);
        showSubtitle(MUTATION_HINTS[dna.mutation]);
      }
      if (s.mutationStage === 'transform' && t - transformAt.current >= 2.2) {
        s.setMutationStage('done');
        s.setPhase('boss');
        sound.startAmbient(true);
        if (s.hasBoss) {
          s.spawnBoss();
          s.addEvent('boss', `${BOSS_LABELS[dna.boss]} 现身`);
        } else {
          s.defeatBoss();
        }
      }
    }

    // 节点注入请求（HUD 长按 1s 完成）
    if (s.pendingNodeId !== null) {
      const id = s.pendingNodeId;
      const node = level.nodes[id];
      if (node && !s.nodesLit.includes(id)) {
        const d = Math.hypot(relays.playerX - node.x, relays.playerZ - node.z);
        if (d < 3.4) {
          s.litNode(id);
          sound.nodeActivate();
          relays.flashGoldAt = Date.now();
          s.addEvent('system', `能量节点点亮 ${s.nodesLit.length}/${s.nodeGoal}`);
          if (s.nodesLit.length >= s.nodeGoal) {
            s.defeatBoss();
            sound.bossDown();
            s.addEvent('boss', `${BOSS_LABELS[dna.boss]} 解体成星尘`);
            showSubtitle('它解体成了星尘');
          }
        } else {
          s.clearPendingNode();
        }
      } else {
        s.clearPendingNode();
      }
    }

    // 最近节点距离（供 HUD 显示「注入能量」）
    let nearest = Infinity;
    let nearestId = -1;
    level.nodes.forEach((node, i) => {
      if (s.nodesLit.includes(i)) return;
      const d = Math.hypot(relays.playerX - node.x, relays.playerZ - node.z);
      if (d < nearest) {
        nearest = d;
        nearestId = i;
      }
    });
    relays.nearestNodeDist = nearest;
    relays.nearestNodeId = nearestId;

    // 阶段推进
    if (s.portalActive && s.phase !== 'sprint') {
      s.setPhase('sprint');
      s.addEvent('portal', '出口已开启');
    }

    // 进入传送门 → 胜利（重力反转时出口在天空地面）
    if (s.portalActive) {
      const portalY = s.gravityFlipped ? level.skyFloorY : level.portal.y;
      const d = Math.hypot(relays.playerX - level.portal.x, relays.playerZ - level.portal.z);
      if (d < 2.1 && Math.abs(relays.playerY - portalY) < 4.5) {
        s.addEvent('portal', '穿过那扇门');
        s.setVictory(true);
        s.setStatus('portal');
        sound.chime(true);
        sound.stopAmbient();
        return;
      }
    }

    // 危险区：稳定度缓慢流失
    hazardTick.current += dt;
    if (hazardTick.current > 0.6) {
      hazardTick.current = 0;
      for (const hz of level.hazards) {
        const gy = level.terrainHeight(hz.x, hz.z);
        if (
          Math.hypot(relays.playerX - hz.x, relays.playerZ - hz.z) < hz.r &&
          Math.abs(relays.playerY - (gy === -1000 ? 0.4 : gy)) < 3
        ) {
          s.damage(1);
          relays.flashRedAt = Date.now();
          if (performance.now() - hazardHintAt.current > 4000) {
            hazardHintAt.current = performance.now();
            showSubtitle('危险地带 · 稳定度在流失');
          }
          break;
        }
      }
    }
  });

  return null;
}

// ── 性能看门狗：连续低帧自动降级（关泛光 + 渲染分辨率降到 1x） ──

function PerfWatchdog() {
  const setDpr = useThree((s) => s.setDpr);
  const strikes = useRef(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = useRunStore.getState();
      if (s.perfDegraded || s.status !== 'playing') return;
      let fps = 0;
      try {
        fps = Number(window.sessionStorage.getItem('k3:lastFps') || 0);
      } catch {
        return;
      }
      if (fps > 0 && fps < 24) {
        strikes.current += 1;
        if (strikes.current >= 2) {
          s.setPerfDegraded(true);
          setDpr(1);
          showSubtitle('世界稳定了些 · 画质已自动调低');
        }
      } else {
        strikes.current = 0;
      }
    }, 3500);
    return () => window.clearInterval(id);
  }, [setDpr]);
  return null;
}

// ── 场景装配 ─────────────────────────────────────────

interface GameSceneProps {
  dna: WorldDNA;
  level: LevelData;
  quality: Quality;
}

export default function GameScene({ dna, level, quality }: GameSceneProps) {
  const palette = PALETTE_MAP[dna.palette];
  const paused = useRunStore((s) => s.status === 'paused');
  const reduceMotion = useRunStore((s) => s.settings.reduceMotion);
  const gravityFlipped = useRunStore((s) => s.gravityFlipped);
  const blackout = useRunStore((s) => s.blackout);
  const high = quality === 'high';

  // 重开一局时清空残留特效
  useEffect(() => {
    fx.clear();
  }, []);

  return (
    <Canvas
      frameloop={paused ? 'never' : 'always'}
      dpr={quality === 'low' ? [1, 1.25] : [1, 1.35]}
      gl={{ antialias: !high, powerPreference: 'high-performance' }}
      shadows={high}
      camera={{ fov: 55, near: 0.1, far: 300, position: [level.spawn.x + 16, level.spawn.y + 26, level.spawn.z + 26] }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={[blackout ? '#020308' : palette.skyTop]} />
      <FogController palette={palette} />
      <Lights dna={dna} palette={palette} shadows={high} />
      <GameSky sky={dna.sky} palette={palette} blackout={blackout} reduceMotion={reduceMotion} />
      <WeatherParticles
        weather={dna.weather}
        palette={palette}
        density={quality === 'low' ? 0.45 : 1}
        reduceMotion={reduceMotion}
        gravityFlipped={gravityFlipped}
      />
      <GameTerrain level={level} palette={palette} />
      <GameStructures spots={level.structures} palette={palette} />
      <Shards level={level} palette={palette} />
      <EnergyNodes level={level} palette={palette} />
      <BossEntity dna={dna} level={level} palette={palette} />
      <Portal level={level} palette={palette} />
      <Player level={level} palette={palette} gravityFactor={dna.gravity} />
      <FxLayer reduceMotion={reduceMotion} />
      <RunLoop dna={dna} level={level} />
      <PerfWatchdog />
      {high && <PostFX />}
    </Canvas>
  );
}
