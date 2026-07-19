/**
 * Player.tsx — 第三人称运动学控制器 + 相机跟随
 * 重力 / 地面检测 / 土狼时间 / 跳跃缓冲 / 重力反转模式 / 虚空坠落重生。
 * 正式版：灵核速度拖尾（ribbon）、落地尘环、冲刺 FOV 推进、零分配相机数学。
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { LevelData } from './level';
import type { VisualPalette } from './palettes';
import { PlayerBall } from './Entities';
import { input, relays, showSubtitle } from './bus';
import { useRunStore } from './runStore';
import { fx } from './fx';
import { sound } from './audio';

const MOVE_SPEED = 6;
const CAM_DIST = 7.4;
const STEP_UP = 0.62;

// 模块级临时对象（避免每帧分配）
const tmpHigh = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();
const tmpPortal = new THREE.Vector3();

// ── 速度拖尾 ─────────────────────────────────────────

const TRAIL_N = 22;

function PlayerTrail({ palette }: { palette: VisualPalette }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const points = useRef<Float32Array>(new Float32Array(TRAIL_N * 3));
  const ages = useRef<Float32Array>(new Float32Array(TRAIL_N));
  const initialized = useRef(false);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(TRAIL_N * 2 * 3);
    const col = new Float32Array(TRAIL_N * 2 * 3);
    const idx: number[] = [];
    for (let i = 0; i < TRAIL_N - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setIndex(idx);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
  }, []);

  const baseColor = useMemo(() => new THREE.Color(palette.primary), [palette]);

  useFrame(({ camera }, delta) => {
    if (!meshRef.current) return;
    const s = useRunStore.getState();
    const dt = Math.min(delta, 0.05);
    const px = relays.playerX;
    const py = relays.playerY + 0.42;
    const pz = relays.playerZ;

    if (!initialized.current) {
      initialized.current = true;
      for (let i = 0; i < TRAIL_N; i++) {
        points.current[i * 3] = px;
        points.current[i * 3 + 1] = py;
        points.current[i * 3 + 2] = pz;
        ages.current[i] = 0;
      }
    }

    // 瞬移/重生（位移突变 >6m）：整条拖尾重置到当前位置，避免跨屏拉线
    {
      const jx = px - points.current[0];
      const jy = py - points.current[1];
      const jz = pz - points.current[2];
      if (jx * jx + jy * jy + jz * jz > 36) {
        for (let i = 0; i < TRAIL_N; i++) {
          points.current[i * 3] = px;
          points.current[i * 3 + 1] = py;
          points.current[i * 3 + 2] = pz;
        }
      }
    }

    // 头部前移，老化
    for (let i = TRAIL_N - 1; i > 0; i--) {
      points.current[i * 3] = points.current[(i - 1) * 3];
      points.current[i * 3 + 1] = points.current[(i - 1) * 3 + 1];
      points.current[i * 3 + 2] = points.current[(i - 1) * 3 + 2];
      ages.current[i] = ages.current[i - 1];
    }
    points.current[0] = px;
    points.current[1] = py;
    points.current[2] = pz;
    ages.current[0] = 1;

    const speedVisible = s.status === 'playing' || s.status === 'portal';
    meshRef.current.visible = speedVisible && !s.settings.reduceMotion;

    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    const colArr = colAttr.array as Float32Array;

    const camX = camera.position.x;
    const camY = camera.position.y;
    const camZ = camera.position.z;

    for (let i = 0; i < TRAIL_N; i++) {
      const x = points.current[i * 3];
      const y = points.current[i * 3 + 1];
      const z = points.current[i * 3 + 2];
      // 段方向
      const nx = points.current[Math.min(i + 1, TRAIL_N - 1) * 3];
      const ny = points.current[Math.min(i + 1, TRAIL_N - 1) * 3 + 1];
      const nz = points.current[Math.min(i + 1, TRAIL_N - 1) * 3 + 2];
      let dx = x - nx;
      let dy = y - ny;
      let dz = z - nz;
      const dl = Math.hypot(dx, dy, dz) || 1;
      dx /= dl;
      dy /= dl;
      dz /= dl;
      // 视线方向 × 段方向 = 侧向
      let vx = camX - x;
      let vy = camY - y;
      let vz = camZ - z;
      const vl = Math.hypot(vx, vy, vz) || 1;
      vx /= vl;
      vy /= vl;
      vz /= vl;
      let sx = dy * vz - dz * vy;
      let sy = dz * vx - dx * vz;
      let sz = dx * vy - dy * vx;
      const sl = Math.hypot(sx, sy, sz) || 1;
      sx /= sl;
      sy /= sl;
      sz /= sl;
      const age = 1 - i / (TRAIL_N - 1);
      const w = 0.16 * age + 0.02;
      posArr[i * 6] = x + sx * w;
      posArr[i * 6 + 1] = y + sy * w;
      posArr[i * 6 + 2] = z + sz * w;
      posArr[i * 6 + 3] = x - sx * w;
      posArr[i * 6 + 4] = y - sy * w;
      posArr[i * 6 + 5] = z - sz * w;
      // 加色混合：尾端黑=透明
      const glow = age * age * 0.55;
      colArr[i * 6] = baseColor.r * glow;
      colArr[i * 6 + 1] = baseColor.g * glow;
      colArr[i * 6 + 2] = baseColor.b * glow;
      colArr[i * 6 + 3] = baseColor.r * glow;
      colArr[i * 6 + 4] = baseColor.g * glow;
      colArr[i * 6 + 5] = baseColor.b * glow;
      void dt;
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
      <meshBasicMaterial vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── 玩家 ─────────────────────────────────────────────

interface PlayerProps {
  level: LevelData;
  palette: VisualPalette;
  gravityFactor: number;
}

export function Player({ level, palette, gravityFactor }: PlayerProps) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const pos = useRef(new THREE.Vector3(level.spawn.x, level.spawn.y, level.spawn.z));
  const vel = useRef(new THREE.Vector3(0, 0, 0));
  const grounded = useRef(false);
  const coyote = useRef(0);
  const jumpBuffer = useRef(0);
  const prevJumpHeld = useRef(false);
  const lastSafe = useRef(new THREE.Vector3(level.spawn.x, level.spawn.y, level.spawn.z));
  const facing = useRef(Math.PI);
  const squash = useRef(0);
  const wasAirborne = useRef(false);
  const fallStart = useRef(0);

  const yaw = useRef(0);
  const pitch = useRef(0.34);
  const roll = useRef(0);
  const intro = useRef(0);
  const camPos = useRef(new THREE.Vector3(level.spawn.x + 16, level.spawn.y + 26, level.spawn.z + 26));
  const fov = useRef(55);

  const g = 19 * gravityFactor;
  const jumpV = 8.1 * Math.sqrt(gravityFactor);

  useFrame((state, delta) => {
    const s = useRunStore.getState();
    const dt = Math.min(delta, 0.05);
    const playing = s.status === 'playing';

    // ── 视角 ──
    if (playing || s.status === 'paused') {
      yaw.current -= input.lookDX * 0.0048;
      pitch.current = THREE.MathUtils.clamp(pitch.current + input.lookDY * 0.0036, -0.12, 1.15);
    }
    input.lookDX = 0;
    input.lookDY = 0;

    const flipped = s.gravityFlipped;
    const dir = flipped ? -1 : 1; // 重力方向（1=向下）

    // ── 移动输入（相机相对） ──
    let mx = playing ? input.keyX + input.joyX : 0;
    let mz = playing ? input.keyZ + input.joyY : 0;
    const mLen = Math.hypot(mx, mz);
    if (mLen > 1) {
      mx /= mLen;
      mz /= mLen;
    }
    const fx0 = -Math.sin(yaw.current);
    const fz0 = -Math.cos(yaw.current);
    const wishX = fx0 * -mz + -fz0 * mx;
    const wishZ = fz0 * -mz + fx0 * mx;

    // 冲刺阶段：世界将倾，脚步加快
    const speedNow = s.phase === 'sprint' ? MOVE_SPEED * 1.18 : MOVE_SPEED;
    const accel = grounded.current ? 14 : 5.5;
    vel.current.x = THREE.MathUtils.damp(vel.current.x, wishX * speedNow, accel, dt);
    vel.current.z = THREE.MathUtils.damp(vel.current.z, wishZ * speedNow, accel, dt);

    // ── 跳跃（缓冲 + 土狼时间） ──
    if (playing && input.jump && !prevJumpHeld.current) jumpBuffer.current = 0.13;
    prevJumpHeld.current = input.jump;
    if (jumpBuffer.current > 0) jumpBuffer.current -= dt;
    if (grounded.current) coyote.current = 0.11;
    else if (coyote.current > 0) coyote.current -= dt;

    if (playing && jumpBuffer.current > 0 && (grounded.current || coyote.current > 0)) {
      vel.current.y = jumpV * dir;
      grounded.current = false;
      coyote.current = 0;
      jumpBuffer.current = 0;
      squash.current = -0.5; // 起跳拉伸
      fallStart.current = pos.current.y;
      sound.jump();
      // 教学：在矮障碍附近起跳
      for (const p of level.platforms) {
        if (p.kind !== 'obstacle') continue;
        if (Math.hypot(pos.current.x - p.x, pos.current.z - p.z) < 3.2) {
          s.tutorialMark('jumpedObstacle');
          break;
        }
      }
    }

    // ── 非游玩状态（过场/结算）：冻结物理，只保留相机 ──
    if (!playing) {
      vel.current.set(0, 0, 0);
    } else {
      // ── 重力 ──
      if (!grounded.current) {
        vel.current.y -= g * dir * (flipped ? 0.62 : 1) * dt;
        vel.current.y = THREE.MathUtils.clamp(vel.current.y, -30, 30);
      } else {
        vel.current.y = 0;
      }

      // ── 击退冲量 ──
      if (relays.knockX !== 0 || relays.knockZ !== 0) {
        vel.current.x += relays.knockX;
        vel.current.z += relays.knockZ;
        if (grounded.current) {
          grounded.current = false;
          vel.current.y = 2.5 * dir;
        }
        relays.knockX = 0;
        relays.knockZ = 0;
      }

      // ── 水平位移 + 阻挡 ──
      const feetY = pos.current.y;
      const tryAxis = (nx: number, nz: number): boolean => {
        if (level.isBlocked(nx, nz, feetY)) return false;
        pos.current.x = nx;
        pos.current.z = nz;
        return true;
      };
      const nx = pos.current.x + vel.current.x * dt;
      const nz = pos.current.z + vel.current.z * dt;
      if (!tryAxis(nx, nz)) {
        const okX = tryAxis(nx, pos.current.z);
        const okZ = tryAxis(pos.current.x, nz);
        if (!okX && !okZ) {
          vel.current.x *= 0.2;
          vel.current.z *= 0.2;
        }
      }
      // 场地边界
      const rr = Math.hypot(pos.current.x, pos.current.z);
      if (rr > level.radius + 8) {
        pos.current.x *= (level.radius + 8) / rr;
        pos.current.z *= (level.radius + 8) / rr;
      }

      // ── 垂直位移 + 着陆 ──
      if (!flipped) {
        const gh = level.groundHeight(pos.current.x, pos.current.z, pos.current.y + STEP_UP);
        if (grounded.current) {
          if (gh > -500 && gh >= pos.current.y - 1.25) {
            pos.current.y = gh; // 贴地（含下台阶）
          } else {
            grounded.current = false;
            wasAirborne.current = true;
            fallStart.current = pos.current.y;
          }
        }
        if (!grounded.current) {
          pos.current.y += vel.current.y * dt;
          if (vel.current.y <= 0 && gh > -500 && pos.current.y <= gh) {
            pos.current.y = gh;
            grounded.current = true;
            vel.current.y = 0;
            if (wasAirborne.current) {
              squash.current = 0.6;
              // 落地尘环（高落差更明显）
              const fall = Math.abs(fallStart.current - pos.current.y);
              if (fall > 1.2) {
                fx.shockwave(pos.current.x, pos.current.y, pos.current.z, palette.primary, Math.min(3.4, 1 + fall * 0.35), 0.55);
                fx.burst(pos.current.x, pos.current.y + 0.15, pos.current.z, {
                  color: palette.primary,
                  count: Math.min(14, 4 + Math.round(fall * 2)),
                  speed: 2.6,
                  size: 0.16,
                  life: 0.5,
                  up: 0.7,
                  flat: true,
                });
                sound.land(Math.min(1, fall / 6));
              }
            }
            wasAirborne.current = false;
          }
        }
        // 虚空坠落 → 回到最后立足点
        if (pos.current.y < -22) {
          pos.current.copy(lastSafe.current);
          pos.current.y += 0.2;
          vel.current.set(0, 0, 0);
          grounded.current = true;
          s.damage(3);
          s.addEvent('hazard', '坠入虚空，被世界推了回来');
          relays.flashRedAt = Date.now();
          showSubtitle('虚空把你推了回来 · 稳定度 -3');
        }
      } else {
        // 重力反转：落点是"天空地面"
        const ceil = level.skyFloorY;
        if (grounded.current) {
          pos.current.y = ceil;
        }
        if (!grounded.current) {
          pos.current.y += vel.current.y * dt;
          if (vel.current.y >= 0 && pos.current.y >= ceil) {
            pos.current.y = ceil;
            grounded.current = true;
            vel.current.y = 0;
            if (wasAirborne.current) {
              squash.current = 0.6;
              fx.shockwave(pos.current.x, pos.current.y - 1.2, pos.current.z, palette.primary, 2.2, 0.5);
              sound.land(0.5);
            }
            wasAirborne.current = false;
          }
          // 从天花板"跳下"后又被拉回，不会坠出世界
        }
        if (pos.current.y < -4) {
          // 极端情况兜底：拉回天花板
          pos.current.y = ceil;
          vel.current.y = 0;
          grounded.current = true;
        }
      }
    } // end if (playing)

    if (grounded.current) {
      lastSafe.current.copy(pos.current);
    }

    // ── 教学：前进 3 米 ──
    if (playing) {
      relays.distanceMoved += (Math.abs(vel.current.x) + Math.abs(vel.current.z)) * dt;
      if (relays.distanceMoved >= 3) s.tutorialMark('moved');
    }

    // ── 写入总线 ──
    relays.playerX = pos.current.x;
    relays.playerY = pos.current.y;
    relays.playerZ = pos.current.z;
    relays.grounded = grounded.current;

    // ── 玩家模型 ──
    if (group.current) {
      group.current.position.copy(pos.current);
      const speedXZ = Math.hypot(vel.current.x, vel.current.z);
      if (speedXZ > 0.6) {
        const targetFacing = Math.atan2(vel.current.x, vel.current.z);
        let d = targetFacing - facing.current;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        facing.current += d * Math.min(1, dt * 10);
      }
      squash.current = THREE.MathUtils.damp(squash.current, 0, 8, dt);
      if (inner.current) {
        inner.current.rotation.y = facing.current;
        const sq = squash.current;
        inner.current.scale.set(1 + sq * 0.18, 1 - sq * 0.28, 1 + sq * 0.18);
        inner.current.position.y = 0.42 + (grounded.current && speedXZ > 1 ? Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.05 : 0);
        // 速度倾斜（前进方向微俯）
        const tilt = THREE.MathUtils.clamp(speedXZ / MOVE_SPEED, 0, 1.3) * 0.22;
        inner.current.rotation.x = THREE.MathUtils.damp(inner.current.rotation.x, tilt * dir, 6, dt);
      }
    }

    // ── 相机 ──
    intro.current = Math.min(1, intro.current + dt / 3);
    const ease = 1 - Math.pow(1 - intro.current, 3);
    const cosP = Math.cos(pitch.current);
    const tx = pos.current.x + Math.sin(yaw.current) * cosP * CAM_DIST;
    const ty = pos.current.y + 1.7 + Math.sin(pitch.current) * CAM_DIST;
    const tz = pos.current.z + Math.cos(yaw.current) * cosP * CAM_DIST;
    if (s.status === 'portal') {
      // 穿门：镜头推向传送门
      const portalY = (flipped ? level.skyFloorY : level.portal.y) + 2.6;
      tmpPortal.set(level.portal.x, portalY, level.portal.z);
      camPos.current.lerp(tmpPortal, Math.min(1, dt * 2.2));
    } else {
      tmpHigh.set(pos.current.x + 16, pos.current.y + 28, pos.current.z + 26);
      tmpTarget.set(tx, ty, tz);
      tmpTarget.lerpVectors(tmpHigh, tmpTarget, ease);
      const dampK = intro.current < 1 ? 2.2 : 9;
      camPos.current.x = THREE.MathUtils.damp(camPos.current.x, tmpTarget.x, dampK, dt);
      camPos.current.y = THREE.MathUtils.damp(camPos.current.y, tmpTarget.y, dampK, dt);
      camPos.current.z = THREE.MathUtils.damp(camPos.current.z, tmpTarget.z, dampK, dt);
    }
    camera.position.copy(camPos.current);
    camera.lookAt(pos.current.x, pos.current.y + 1.25, pos.current.z);
    // 重力反转：镜头绕 Z 轴翻转（低晕动模式下保持正立，仅提示）
    const targetRoll = flipped && !s.settings.lowMotionSickness ? Math.PI : 0;
    roll.current = THREE.MathUtils.damp(roll.current, targetRoll, 1.1, dt);
    if (Math.abs(roll.current) > 0.001) camera.rotateZ(roll.current);

    // ── FOV：速度 + 冲刺推进 ──
    const speedXZ2 = Math.hypot(vel.current.x, vel.current.z);
    const fovTarget = 55 + Math.min(1, speedXZ2 / MOVE_SPEED) * 3.5 + (s.phase === 'sprint' ? 5 : 0);
    const fovNext = THREE.MathUtils.damp(fov.current, fovTarget, 3, dt);
    if (Math.abs(fovNext - fov.current) > 0.01 && camera instanceof THREE.PerspectiveCamera) {
      fov.current = fovNext;
      camera.fov = fovNext;
      camera.updateProjectionMatrix();
    }
  });

  return (
    <>
      <group ref={group} position={[level.spawn.x, level.spawn.y, level.spawn.z]}>
        <group ref={inner}>
          <PlayerBall palette={palette} />
        </group>
      </group>
      <PlayerTrail palette={palette} />
    </>
  );
}

/** 键盘输入注册（WASD/方向键/空格），挂载一次 */
export function useKeyboardInput(): void {
  useEffect(() => {
    const keys = new Set<string>();
    const apply = () => {
      input.keyX =
        (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      input.keyZ =
        (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) -
        (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        input.jump = true;
        e.preventDefault();
        return;
      }
      keys.add(e.code);
      apply();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        input.jump = false;
        return;
      }
      keys.delete(e.code);
      apply();
    };
    const onBlur = () => {
      keys.clear();
      input.jump = false;
      apply();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
}
