/**
 * PostFX.tsx — 后期处理：UnrealBloom 泛光 + FXAA（three 内置，零新增依赖）
 * 仅 high 画质启用；接管 R3F 默认渲染循环（useFrame 优先级 1）。
 * 注意：HalfFloat + MSAA 在部分 Intel/D3D11 驱动上会崩渲染进程，
 * 因此离屏 RT 用 HalfFloat(samples=0)，抗锯齿由最后的 FXAA 承担；
 * 驱动不支持 EXT_color_buffer_float 时自动回退 R3F 默认渲染。
 */

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { useRunStore } from './runStore';

export default function PostFX() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  // 性能降级：帧率看门狗触发后立即让回默认渲染（不清算子、不重置局内状态）
  const degraded = useRunStore((s) => s.perfDegraded);

  // HDR 帧缓冲能力检测：不支持则完全不接管渲染（回退 R3F 默认渲染）
  const hdrOk = useMemo(() => {
    try {
      return !!gl.getContext().getExtension('EXT_color_buffer_float');
    } catch {
      return false;
    }
  }, [gl]);

  const active = hdrOk && !degraded;

  const { composer, fxaa } = useMemo(() => {
    if (!hdrOk) return { composer: null, fxaa: null };
    const rt = new THREE.WebGLRenderTarget(1, 1, {
      samples: 0,
      type: THREE.HalfFloatType,
    });
    const c = new EffectComposer(gl, rt);
    c.addPass(new RenderPass(scene, camera));
    // strength / radius / threshold：阈值 0.62 让自发光体泛光而暗部不糊
    c.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.75, 0.55, 0.62));
    c.addPass(new OutputPass());
    const aa = new ShaderPass(FXAAShader);
    c.addPass(aa);
    return { composer: c, fxaa: aa };
    // scene / camera 在 R3F 中为稳定引用
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, hdrOk]);

  useEffect(() => {
    if (!composer || !fxaa) return;
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
    const w = size.width * dpr;
    const h = size.height * dpr;
    (fxaa.material.uniforms.resolution.value as THREE.Vector2).set(1 / w, 1 / h);
  }, [composer, fxaa, size, dpr]);

  useEffect(
    () => () => {
      composer?.dispose();
    },
    [composer],
  );

  useFrame(() => {
    if (!active) return;
    composer?.render();
  }, active ? 1 : 0);

  return null;
}
