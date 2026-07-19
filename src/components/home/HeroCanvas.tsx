import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, useTexture } from '@react-three/drei';
import * as THREE from 'three';

/** 深空星尘粒子场（~1200 粒，缓慢上飘） */
function Stardust() {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 1200;
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
      speeds[i] = 0.05 + Math.random() * 0.12;
    }
    return { positions, speeds };
  }, []);

  useFrame((_, delta) => {
    const pts = ref.current;
    if (!pts) return;
    const attr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] += speeds[i] * delta;
      if (arr[i * 3 + 1] > 7) arr[i * 3 + 1] = -7;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#93A0B8" transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

const BUBBLE_CONFIGS = [
  { texture: '/world-desk.png', position: [-4.6, 1.4, -2.4] as [number, number, number], scale: 1.0, duration: 24 },
  { texture: '/world-rain.png', position: [4.8, 1.8, -2.8] as [number, number, number], scale: 0.9, duration: 30 },
  { texture: '/world-cat.png', position: [-5.2, -1.6, -3.0] as [number, number, number], scale: 0.8, duration: 27 },
  { texture: '/world-circuit.png', position: [5.4, -1.4, -2.2] as [number, number, number], scale: 1.05, duration: 33 },
  { texture: '/world-desk.png', position: [-2.8, 2.6, -4.0] as [number, number, number], scale: 0.62, duration: 21 },
  { texture: '/world-cat.png', position: [3.0, 2.9, -4.4] as [number, number, number], scale: 0.55, duration: 35 },
];

/** 微型世界气泡：玻璃球 + 内部微缩景观 */
function WorldBubble({ texture, position, scale, duration }: (typeof BUBBLE_CONFIGS)[number]) {
  const map = useTexture(texture);
  useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
  }, [map]);
  return (
    <Float speed={60 / duration} rotationIntensity={0.4} floatIntensity={1.6}>
      <group position={position} scale={scale}>
        <mesh>
          <sphereGeometry args={[0.62, 32, 32]} />
          <meshStandardMaterial
            map={map}
            emissive="#57E6F0"
            emissiveIntensity={0.08}
            emissiveMap={map}
            roughness={0.7}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.68, 32, 32]} />
          <meshPhysicalMaterial
            color="#57E6F0"
            transparent
            opacity={0.1}
            roughness={0.15}
            metalness={0}
            depthWrite={false}
          />
        </mesh>
      </group>
    </Float>
  );
}

/** 中央粒子传送门：粒子环 + portal-frame 门面 + 4s 呼吸 */
function Portal() {
  const group = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const portalMap = useTexture('/portal-frame.png');
  useMemo(() => {
    portalMap.colorSpace = THREE.SRGBColorSpace;
  }, [portalMap]);

  const ringPositions = useMemo(() => {
    const N = 700;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.35 + (Math.random() - 0.5) * 0.28;
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = Math.sin(angle) * radius;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const breathe = 1 + Math.sin((t * Math.PI) / 2) * 0.04; // 4s 周期
    if (group.current) {
      group.current.scale.setScalar(breathe);
      group.current.rotation.z = t * 0.05;
    }
    if (glow.current) {
      (glow.current.material as THREE.MeshBasicMaterial).opacity = 0.14 + Math.sin((t * Math.PI) / 2) * 0.05;
    }
  });

  return (
    <group position={[0, -0.55, -0.6]}>
      <group ref={group}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[ringPositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={0.03}
            color="#57E6F0"
            transparent
            opacity={0.85}
            sizeAttenuation
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
        <mesh ref={glow}>
          <circleGeometry args={[1.55, 48]} />
          <meshBasicMaterial color="#57E6F0" transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh>
          <circleGeometry args={[1.18, 48]} />
          <meshBasicMaterial map={portalMap} transparent depthWrite={false} />
        </mesh>
      </group>
      <pointLight position={[0, 0, 0.6]} intensity={6} distance={8} color="#57E6F0" />
    </group>
  );
}

/** 鼠标视差容器（±12px 等效） */
function ParallaxRig({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ pointer }, delta) => {
    if (!ref.current) return;
    const targetX = pointer.x * 0.22;
    const targetY = pointer.y * 0.14;
    ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, targetX, 2.5, delta);
    ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, targetY, 2.5, delta);
  });
  return <group ref={ref}>{children}</group>;
}

/**
 * 首页 Hero 3D 场景（home.md S1）
 * 深空 + 星尘 + 微型世界气泡 + 中央粒子传送门。
 */
export default function HeroCanvas() {
  const [inView, setInView] = useState(true);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.02 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0" aria-hidden>
      <Canvas
        frameloop={inView ? 'always' : 'never'}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 6]} intensity={0.9} color="#E8F0FF" />
        <Suspense fallback={null}>
          <ParallaxRig>
            <Stardust />
            {BUBBLE_CONFIGS.map((cfg, i) => (
              <WorldBubble key={i} {...cfg} />
            ))}
            <Portal />
          </ParallaxRig>
        </Suspense>
      </Canvas>
    </div>
  );
}
