"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Particles({ count = 2000 }) {
  const meshRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const temp = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 2.5; // Radius of the globe
      
      temp[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      temp[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      temp[i * 3 + 2] = r * Math.cos(phi);
    }
    return temp;
  }, [count]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
      meshRef.current.rotation.x += delta * 0.05;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color="#3b82f6"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

function Connections({ count = 100 }) {
  const lineRef = useRef<THREE.LineSegments>(null);

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 6);
    const colors = new Float32Array(count * 6);
    const color = new THREE.Color("#60a5fa");

    for (let i = 0; i < count; i++) {
      const theta1 = Math.random() * 2 * Math.PI;
      const phi1 = Math.acos(Math.random() * 2 - 1);
      const r = 2.5;
      
      const x1 = r * Math.sin(phi1) * Math.cos(theta1);
      const y1 = r * Math.sin(phi1) * Math.sin(theta1);
      const z1 = r * Math.cos(phi1);

      // Nearby point
      const theta2 = theta1 + (Math.random() - 0.5) * 0.5;
      const phi2 = phi1 + (Math.random() - 0.5) * 0.5;
      
      const x2 = r * Math.sin(phi2) * Math.cos(theta2);
      const y2 = r * Math.sin(phi2) * Math.sin(theta2);
      const z2 = r * Math.cos(phi2);

      positions[i * 6] = x1;
      positions[i * 6 + 1] = y1;
      positions[i * 6 + 2] = z1;
      positions[i * 6 + 3] = x2;
      positions[i * 6 + 4] = y2;
      positions[i * 6 + 5] = z2;

      color.toArray(colors, i * 6);
      color.toArray(colors, i * 6 + 3);
    }
    return { positions, colors };
  }, [count]);

  useFrame((state, delta) => {
    if (lineRef.current) {
      lineRef.current.rotation.y += delta * 0.15;
      lineRef.current.rotation.x += delta * 0.05;
    }
  });

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial vertexColors transparent opacity={0.15} />
    </lineSegments>
  );
}

export function Globe() {
  return (
    <div className="absolute inset-0 z-0 bg-black/90">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <Particles count={2500} />
        <Connections count={200} />
      </Canvas>
    </div>
  );
}
