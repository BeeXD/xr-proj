import { Canvas } from '@react-three/fiber'
import { Float, OrbitControls, Stars } from '@react-three/drei'
import { useMemo } from 'react'

interface LabSceneProps {
  reducedMotion?: boolean
  cameraSensitivity?: number
}

function DataOrb({
  position,
  color,
  reducedMotion,
  scale = 0.4,
}: {
  position: [number, number, number]
  color: string
  reducedMotion: boolean
  scale?: number
}) {
  return (
    <Float
      speed={reducedMotion ? 0 : 1.2}
      rotationIntensity={reducedMotion ? 0 : 1.1}
      floatIntensity={reducedMotion ? 0 : 1.2}
    >
      <mesh position={position}>
        <icosahedronGeometry args={[scale, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} />
      </mesh>
    </Float>
  )
}

function LabStage({ reducedMotion }: { reducedMotion: boolean }) {
  const nodes = useMemo(
    () => [
      { position: [-2.8, 1.45, -0.3] as [number, number, number], color: '#22d3ee', scale: 0.32 },
      { position: [0, 2.05, -1.4] as [number, number, number], color: '#a78bfa', scale: 0.24 },
      { position: [2.75, 1.1, 0.8] as [number, number, number], color: '#f472b6', scale: 0.34 },
      { position: [-1.65, -0.05, 1.55] as [number, number, number], color: '#34d399', scale: 0.23 },
      { position: [1.8, -0.35, 1.2] as [number, number, number], color: '#60a5fa', scale: 0.28 },
    ],
    [],
  )

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -1.6, 0]} receiveShadow>
        <circleGeometry args={[6.5, 64]} />
        <meshStandardMaterial color="#080f21" metalness={0.55} roughness={0.4} />
      </mesh>
      <gridHelper args={[14, 28, '#155e75', '#17243a']} position={[0, -1.57, 0]} />
      {nodes.map((node, index) => (
        <DataOrb
          key={`orb-${index}`}
          position={node.position}
          color={node.color}
          scale={node.scale}
          reducedMotion={reducedMotion}
        />
      ))}
      <group position={[0, 0.35, -1.2]}>
        <mesh>
          <torusGeometry args={[1.65, 0.045, 12, 120]} />
          <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={0.85} />
        </mesh>
        <mesh>
          <torusGeometry args={[1.83, 0.012, 8, 120]} />
          <meshStandardMaterial color="#a78bfa" emissive="#8b5cf6" emissiveIntensity={0.45} />
        </mesh>
        <mesh>
          <circleGeometry args={[1.48, 64]} />
          <meshBasicMaterial color="#083344" transparent opacity={0.12} side={2} />
        </mesh>
      </group>
      <mesh position={[0, 0.35, -1.35]}>
        <icosahedronGeometry args={[0.48, 1]} />
        <meshStandardMaterial color="#164e63" emissive="#0891b2" emissiveIntensity={0.65} wireframe />
      </mesh>
    </group>
  )
}

export function LabScene({ reducedMotion = false, cameraSensitivity = 1 }: LabSceneProps) {
  return (
    <div className="lab-scene">
      <Canvas camera={{ position: [0, 0.8, 7.2], fov: 40 }}>
        <color attach="background" args={['#020817']} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[5, 5, 5]} intensity={1.05} color="#a5f3fc" />
        <pointLight position={[-3, 1.5, 2]} intensity={1.2} color="#22d3ee" />
        <pointLight position={[3, 2, -1]} intensity={0.9} color="#8b5cf6" />
        <Stars radius={38} depth={16} count={1000} factor={3} fade speed={reducedMotion ? 0 : 0.45} />
        <LabStage reducedMotion={reducedMotion} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping={!reducedMotion}
          autoRotate={false}
          rotateSpeed={cameraSensitivity}
          minPolarAngle={Math.PI / 2.8}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </div>
  )
}
