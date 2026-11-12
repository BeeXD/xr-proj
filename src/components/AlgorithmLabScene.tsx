import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls, RoundedBox, Stars, Text } from '@react-three/drei'
import { createXRStore, DefaultXRController, DefaultXRHand, useXR, XR, XROrigin, XRSpace } from '@react-three/xr'
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'
import { stationOperations } from '../data/stations'
import { currentSnapshot, getAlgorithmDefinition, treeLayout, type DsaState } from '../lib/execution'
import { useAppStore } from '../store/useAppStore'

// offerSession: false keeps entry explicit (the Quest browser would otherwise offer passthrough AR).
// The localhost Quest emulator needs WebGL2, which jsdom lacks, so it stays off under tests.
// The left controller/hand carries the menu; the right one points and clicks.
const xrStore = createXRStore({
  offerSession: false,
  emulate: import.meta.env.MODE !== 'test',
  controller: { left: LeftControllerMenu },
  hand: { left: LeftHandMenu },
})

// Calibration knobs, in meters. VR_ORIGIN: where the user stands relative to the structure.
// HAND_MENU_*: where the menu floats relative to the left grip (controller) or wrist (hand tracking).
const VR_ORIGIN: [number, number, number] = [0, -1.7, 4]
const HAND_MENU_OFFSET: [number, number, number] = [0, 0.13, 0]
const HAND_MENU_ROTATION: [number, number, number] = [-0.6, 0, 0]
const HAND_MENU_SCALE = 0.22

// Highlight for the element whose value the next operation will use.
const SELECTED_COLOR = '#f472b6'

interface AlgorithmLabSceneProps {
  state: DsaState
  previousState?: DsaState
  title: string
  description: string
  operation: string
  stepId: number
  reducedMotion: boolean
  fallback: ReactNode
}

interface CameraCommand {
  id: number
  mode: 'reset' | 'focus'
}

const STACK_BASE_Y = -0.58
const STACK_LEVEL_HEIGHT = 0.52

interface SceneErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
}

interface SceneErrorBoundaryState {
  failed: boolean
}

class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function CameraRig({ command, structure, focusTarget }: { command: CameraCommand; structure: DsaState['kind']; focusTarget: [number, number, number] }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((three) => three.camera)
  const viewportWidth = useThree((three) => three.size.width)
  const currentFocusTarget = useRef(focusTarget)
  useEffect(() => {
    currentFocusTarget.current = focusTarget
  }, [focusTarget])
  useEffect(() => {
    const target = command.mode === 'focus'
      ? new THREE.Vector3(...currentFocusTarget.current)
      : new THREE.Vector3(0, structure === 'stack' ? 0.9 : 0, 0)
    controls.current?.target.copy(target)
    const isNarrow = viewportWidth < 640
    const distance = command.mode === 'focus' ? (isNarrow ? 6.8 : 5) : (isNarrow ? 11.5 : 8.5)
    camera.position.set(target.x, target.y + (structure === 'stack' ? (isNarrow ? 1.25 : 1.7) : 2), target.z + distance)
    camera.lookAt(target)
    controls.current?.update()
  }, [camera, command.id, command.mode, structure, viewportWidth])
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan
      enableZoom
      enableRotate
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={16}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 1.8}
    />
  )
}

function LaboratoryEnvironment({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      <color attach="background" args={['#030816']} />
      <fog attach="fog" args={['#030816', 10, 25]} />
      <ambientLight intensity={0.5} color="#b5c9ff" />
      <directionalLight position={[5, 8, 5]} intensity={1.7} color="#baf8ff" />
      <pointLight position={[-4, 3, 2]} intensity={16} distance={13} color="#00d9ff" />
      <pointLight position={[4, 2, -3]} intensity={12} distance={12} color="#9b6dff" />
      <Stars radius={35} depth={20} count={reducedMotion ? 250 : 650} factor={2.4} fade speed={reducedMotion ? 0 : 0.25} />
      <gridHelper args={[24, 48, '#087e9a', '#142444']} position={[0, -1.65, 0]} />
      <mesh position={[0, -1.7, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#050b19" metalness={0.64} roughness={0.35} />
      </mesh>
      <mesh position={[0, -1.32, 0]}>
        <cylinderGeometry args={[3.8, 4.1, 0.22, 64]} />
        <meshStandardMaterial color="#0c1830" metalness={0.58} roughness={0.24} transparent opacity={0.88} />
      </mesh>
      <mesh position={[0, -1.19, 0]}>
        <cylinderGeometry args={[3.7, 3.8, 0.025, 64]} />
        <meshStandardMaterial color="#091428" emissive="#07657b" emissiveIntensity={0.42} metalness={0.45} roughness={0.25} />
      </mesh>
      <mesh position={[0, -1.2, 0]}>
        <torusGeometry args={[3.83, 0.025, 8, 96]} />
        <meshStandardMaterial color="#32e6f5" emissive="#06b6d4" emissiveIntensity={1.5} />
      </mesh>
    </>
  )
}

function SceneHeading({ title, description, operation }: { title: string; description: string; operation: string }) {
  const label = operation.replaceAll('-', ' ').toUpperCase()
  const narrow = useThree((three) => three.size.width < 640)
  return (
    <group position={[0, 3.4, 0]}>
      <Text fontSize={narrow ? 0.16 : 0.13} color="#75edf5" anchorX="center" anchorY="middle" letterSpacing={0.08}>{title.toUpperCase()}</Text>
      <Text position={[0, -0.25, 0]} fontSize={narrow ? 0.11 : 0.09} color="#93a4c4" anchorX="center" anchorY="middle" maxWidth={7} textAlign="center">{description}</Text>
      <Text position={[0, -0.5, 0]} fontSize={narrow ? 0.12 : 0.095} color={operation === 'overflow' || operation === 'underflow' ? '#fda4af' : '#9cebd0'} anchorX="center" anchorY="middle">{`● ${label}`}</Text>
    </group>
  )
}

// The headset owns the camera in VR, so orbit controls and the floating heading give way to the hand menu.
function ViewRig({ command, state, title, description, operation }: { command: CameraCommand; state: DsaState; title: string; description: string; operation: string }) {
  const inVR = useXR((xr) => xr.session != null)
  if (inVR) return <XROrigin position={VR_ORIGIN} />
  return <>
    <CameraRig command={command} structure={state.kind} focusTarget={focusTargetFor(state)} />
    <SceneHeading title={title} description={description} operation={operation} />
  </>
}

// No ray from the menu hand: it would sit inside its own menu and fight the right hand's pointer.
function LeftControllerMenu() {
  return <>
    <DefaultXRController rayPointer={false} />
    <XRSpace space="grip-space"><HandMenu /></XRSpace>
  </>
}

function LeftHandMenu() {
  return <>
    <DefaultXRHand rayPointer={false} />
    <XRSpace space="wrist"><HandMenu /></XRSpace>
  </>
}

function HandMenu() {
  return (
    <group position={HAND_MENU_OFFSET} rotation={HAND_MENU_ROTATION} scale={HAND_MENU_SCALE}>
      <VrPanel />
      <group position={[1.05, 0, 0]}><VrValueMenu /></group>
    </group>
  )
}

function VrPanel() {
  const session = useAppStore((app) => app.executionSession)
  const algorithmId = useAppStore((app) => app.currentAlgorithmId)
  const stationId = useAppStore((app) => app.activeStationId)
  const [error, setError] = useState('')
  const definition = getAlgorithmDefinition(algorithmId)
  const { previousExecution, setExecutionPlaying, advanceExecution, resetExecution, randomizeExecution, runStationAlgorithm } = useAppStore.getState()
  const step = session.steps[session.currentStepIndex]
  const playing = session.status === 'playing'
  const transport: Array<[string, () => void]> = [
    ['Prev', previousExecution],
    [playing ? 'Pause' : 'Play', () => setExecutionPlaying(!playing)],
    ['Next', advanceExecution],
    ['Reset', resetExecution],
    ['Shuffle', randomizeExecution],
  ]
  // Stack and queue share a station; VR has no algorithm dropdown, so offer both sets here.
  const operations = stationId === 'stacks' ? [...stationOperations.stacks, ...stationOperations.queues] : stationOperations[stationId] ?? []
  const run = (id: string) => {
    try {
      runStationAlgorithm(id)
      setError('')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'This operation could not run.')
    }
  }
  return (
    <group>
      <RoundedBox args={[1.5, 0.74, 0.03]} radius={0.015} smoothness={2}>
        <meshStandardMaterial color="#0b1530" emissive="#06213a" emissiveIntensity={0.6} />
      </RoundedBox>
      <Text position={[0, 0.31, 0.02]} fontSize={0.05} color="#75edf5" anchorY="middle">{`${definition?.title ?? ''} · Step ${session.currentStepIndex + 1} / ${session.steps.length}`}</Text>
      <Text position={[0, 0.22, 0.02]} fontSize={0.036} color={error ? '#fda4af' : '#e2e8f0'} anchorY="middle" maxWidth={1.4} textAlign="center">{error || step.description}</Text>
      <Text position={[0, 0.13, 0.02]} fontSize={0.032} color="#9cebd0" anchorY="middle" maxWidth={1.4} textAlign="center">{definition?.pseudocode[step.pseudocodeLine] ?? ''}</Text>
      {transport.map(([label, onClick], index) => (
        <VrButton key={index} label={label} position={[(index - 2) * 0.28, 0.02, 0.02]} onClick={() => { setError(''); onClick() }} />
      ))}
      {operations.map(({ id, label }, index) => (
        <VrButton key={id} label={label} fontSize={0.028} position={[((index % 5) - 2) * 0.28, -0.11 - Math.floor(index / 5) * 0.12, 0.02]} onClick={() => run(id)} />
      ))}
    </group>
  )
}

const KEYPAD = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '±', '0', 'Del']

// Keypad for choosing the value the next operation places (Push, Insert…) or targets (Delete, Search…).
function VrValueMenu() {
  const value = useAppStore((app) => app.executionInput)
  const index = useAppStore((app) => app.executionIndex)
  const isList = useAppStore((app) => currentSnapshot(app.executionSession).kind === 'list')
  const { pressValueKey, setExecutionIndex } = useAppStore.getState()
  return (
    <group>
      <RoundedBox args={[0.5, 0.74, 0.03]} radius={0.015} smoothness={2}>
        <meshStandardMaterial color="#0b1530" emissive="#06213a" emissiveIntensity={0.6} />
      </RoundedBox>
      <Text position={[0, 0.31, 0.02]} fontSize={0.035} color="#93a4c4" anchorY="middle">VALUE</Text>
      <Text position={[0, 0.24, 0.02]} fontSize={0.07} color={SELECTED_COLOR} anchorY="middle">{String(value)}</Text>
      {isList && <>
        <VrButton label="<" width={0.08} position={[-0.17, 0.15, 0.02]} onClick={() => setExecutionIndex(Math.max(0, index - 1))} />
        <Text position={[0, 0.15, 0.02]} fontSize={0.032} color="#e2e8f0" anchorY="middle">{`Index ${index}`}</Text>
        <VrButton label=">" width={0.08} position={[0.17, 0.15, 0.02]} onClick={() => setExecutionIndex(index + 1)} />
      </>}
      {KEYPAD.map((key, keyIndex) => (
        <VrButton key={key} label={key} width={0.13} position={[((keyIndex % 3) - 1) * 0.15, 0.04 - Math.floor(keyIndex / 3) * 0.11, 0.02]} onClick={() => pressValueKey(key)} />
      ))}
    </group>
  )
}

function VrButton({ label, position, onClick, width = 0.26, fontSize = 0.04 }: { label: string; position: [number, number, number]; onClick: () => void; width?: number; fontSize?: number }) {
  const [hovered, setHovered] = useState(false)
  return (
    <group position={position} onClick={(event) => { event.stopPropagation(); onClick() }} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <RoundedBox args={[width, 0.09, 0.03]} radius={0.015} smoothness={2}>
        <meshStandardMaterial color={hovered ? '#0891b2' : '#164e63'} emissive="#06b6d4" emissiveIntensity={hovered ? 0.7 : 0.15} />
      </RoundedBox>
      <Text position={[0, 0, 0.02]} fontSize={fontSize} color="#fff" anchorY="middle" maxWidth={width - 0.02} textAlign="center">{label}</Text>
    </group>
  )
}

function ActiveValue({ position, label, color, active, reducedMotion, animation, onSelect }: {
  position: [number, number, number]
  label: string
  color: string
  active: boolean
  reducedMotion: boolean
  animation: string
  onSelect: (value: string) => void
}) {
  const group = useRef<THREE.Group>(null)
  const material = useRef<THREE.MeshStandardMaterial>(null)
  const [hovered, setHovered] = useState(false)
  const [x, y, z] = position
  const target = useMemo(() => new THREE.Vector3(x, y, z), [x, y, z])
  const labelTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to create a 2D label texture for the stack value.')
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#041322'
    context.font = `700 ${Math.min(78, 180 / label.length)}px "Segoe UI", sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(label, canvas.width / 2, canvas.height / 2)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }, [label])
  useEffect(() => () => labelTexture.dispose(), [labelTexture])
  useEffect(() => {
    if (!group.current) return
    if (!reducedMotion && (animation === 'push' || animation === 'randomize')) {
      group.current.position.y = y + 3 + (animation === 'randomize' ? Math.max(0, y + 1) * 0.18 : 0)
      group.current.scale.setScalar(0.92)
    } else {
      group.current.position.set(x, y, z)
      group.current.scale.setScalar(1)
    }
  }, [animation, reducedMotion, target, x, y, z])
  useFrame((frame, delta) => {
    if (!group.current) return
    group.current.position.lerp(target, reducedMotion ? 1 : 1 - Math.exp(-delta * 5))
    const pulse = animation === 'peek' && !reducedMotion ? Math.sin(frame.clock.elapsedTime * 5) * 0.045 : 0
    const scaleTarget = active || hovered ? 1.07 + pulse : 1
    group.current.scale.lerp(new THREE.Vector3(scaleTarget, scaleTarget, scaleTarget), reducedMotion ? 1 : 1 - Math.exp(-delta * 7))
    if (material.current) material.current.emissiveIntensity = THREE.MathUtils.damp(material.current.emissiveIntensity, active || hovered ? 1.35 : 0.2, 5, delta)
  })
  return (
    <group ref={group} position={position} onClick={(event) => { event.stopPropagation(); onSelect(label) }} onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }} onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}>
      <RoundedBox args={[0.9, 0.48, 0.62]} radius={0.09} smoothness={3}>
        <meshStandardMaterial ref={material} color={color} emissive={color} emissiveIntensity={active ? 1.35 : 0.2} metalness={0.42} roughness={0.22} />
      </RoundedBox>
      <mesh position={[0, 0, 0.34]} renderOrder={10}>
        <planeGeometry args={[0.62, 0.3]} />
        <meshBasicMaterial map={labelTexture} transparent depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

function EmptySlot({ position, warning }: { position: [number, number, number]; warning: boolean }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.92, 0.5, 0.64]} />
      <meshPhysicalMaterial color={warning ? '#fb923c' : '#64dff0'} transparent opacity={0.12} wireframe roughness={0.2} metalness={0.25} />
    </mesh>
  )
}

function PoppingValue({ value, y }: { value: number; y: number }) {
  const group = useRef<THREE.Group>(null)
  const material = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((_, delta) => {
    if (group.current) group.current.position.y += delta * 1.8
    if (material.current) material.current.opacity = Math.max(0, material.current.opacity - delta * 1.8)
  })
  return (
    <group ref={group} position={[0, y, 0]}>
      <RoundedBox args={[0.9, 0.48, 0.62]} radius={0.09} smoothness={3}>
        <meshStandardMaterial ref={material} color="#fb7185" emissive="#fb425e" emissiveIntensity={1.1} transparent opacity={0.72} />
      </RoundedBox>
      <Text position={[0, 0, 0.34]} fontSize={0.22} color="#fff">{value}</Text>
    </group>
  )
}

function StackStructure({ state, previousState, stepId, reducedMotion, selected, onSelect }: {
  state: Extract<DsaState, { kind: 'stack' }>
  previousState?: DsaState
  stepId: number
  reducedMotion: boolean
  selected?: string
  onSelect: (value: string) => void
}) {
  const narrow = useThree((three) => three.size.width < 640)
  const previous = previousState?.kind === 'stack' ? previousState.values : state.values
  const removed = state.operation === 'pop' && previous.length > state.values.length ? previous.at(-1) : undefined
  const isError = state.operation === 'overflow' || state.operation === 'underflow'
  const isPeek = state.operation === 'peek'
  const warningField = useRef<THREE.MeshPhysicalMaterial>(null)
  const warningBase = useRef<THREE.MeshStandardMaterial>(null)
  const values = state.values.slice(-12)
  const capacity = Math.min(state.capacity, 12)
  const start = Math.max(0, state.values.length - values.length)
  useFrame((frame) => {
    if (!isError) return
    const pulse = reducedMotion ? 0.83 : 0.55 + (Math.sin(frame.clock.elapsedTime * 8) + 1) * 0.28
    if (warningField.current) warningField.current.emissiveIntensity = pulse
    if (warningBase.current) warningBase.current.emissiveIntensity = pulse + 0.2
  })
  return (
    <group>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[1.1, 1.2, 3, 32, 1, true]} />
        <meshPhysicalMaterial ref={warningField} color={isError ? '#fb7185' : '#0ce7f5'} emissive={isError ? '#fb2c4f' : '#00d9ed'} emissiveIntensity={isError ? 0.75 : 0.18} transparent opacity={0.07} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.78, 0]}>
        <cylinderGeometry args={[1.12, 1.12, 0.06, 32]} />
        <meshStandardMaterial ref={warningBase} color={isError ? '#7f1d1d' : '#164e63'} emissive={isError ? '#ef4444' : '#0891b2'} emissiveIntensity={isError ? 1.1 : 0.65} metalness={0.6} roughness={0.24} />
      </mesh>
      {Array.from({ length: capacity }, (_, index) => {
        const logicalIndex = capacity - index - 1
        const y = STACK_BASE_Y + logicalIndex * STACK_LEVEL_HEIGHT
        return <EmptySlot key={`slot-${logicalIndex}`} position={[0, y, 0]} warning={isError} />
      })}
      {values.map((value, index) => {
        const logicalIndex = start + index
        const y = STACK_BASE_Y + logicalIndex * STACK_LEVEL_HEIGHT
        const active = logicalIndex === state.topIndex || isPeek
        const animation = !previousState && stepId === 0 && state.values.length
          ? 'randomize'
          : state.operation === 'push' && state.values.length > previous.length && logicalIndex === state.topIndex
          ? 'push'
          : state.operation === 'peek' && logicalIndex === state.topIndex ? 'peek' : ''
        return <group key={`stack-slot-${logicalIndex}`}>
          <ActiveValue position={[0, y, 0]} label={String(value)} color={String(value) === selected ? SELECTED_COLOR : state.operation === 'complete' ? '#34d399' : isPeek ? '#a78bfa' : '#06b6d4'} active={active} reducedMotion={reducedMotion} animation={animation} onSelect={onSelect} />
        </group>
      })}
      {removed !== undefined && !reducedMotion && <PoppingValue key={`removed-${stepId}`} value={removed} y={STACK_BASE_Y + state.values.length * STACK_LEVEL_HEIGHT} />}
      {state.topIndex >= 0 && <Text position={[0.72, STACK_BASE_Y + state.topIndex * STACK_LEVEL_HEIGHT, 0]} fontSize={0.16} color="#67e8f9" anchorX="left" anchorY="middle">← TOP</Text>}
      {state.bottomIndex >= 0 && <Text position={[-0.72, STACK_BASE_Y + state.bottomIndex * STACK_LEVEL_HEIGHT, 0]} fontSize={0.14} color="#c4b5fd" anchorX="right" anchorY="middle">BOTTOM →</Text>}
      <Text position={[narrow ? -1.1 : 1.05, 1.3, 0]} fontSize={narrow ? 0.15 : 0.11} color="#b7c7df" anchorX={narrow ? 'right' : 'left'}>SIZE {state.values.length} / {state.capacity}</Text>
      {state.result !== undefined && <Text position={[narrow ? -1.1 : 1.05, 1.05, 0]} fontSize={narrow ? 0.15 : 0.11} color="#86efac" anchorX={narrow ? 'right' : 'left'}>RESULT {state.result}</Text>}
      {state.message && <Text position={[0, -1.48, 0.8]} fontSize={0.11} color={isError ? '#fda4af' : '#9cebd0'} anchorX="center" maxWidth={5}>{state.message}</Text>}
    </group>
  )
}

function GraphStructure({ state, selected, onSelect }: {
  state: Extract<DsaState, { kind: 'graph' }>
  selected?: string
  onSelect: (value: string) => void
}) {
  const positions = useMemo(() => new Map(state.nodes.map((node, index) => {
    const angle = (index / Math.max(1, state.nodes.length)) * Math.PI * 2
    return [node, [Math.cos(angle) * 2.1, Math.sin(angle) * 1.15, 0] as [number, number, number]]
  })), [state.nodes])
  return (
    <group>
      {state.edges.map(([from, to], index) => {
        const a = positions.get(from)
        const b = positions.get(to)
        return a && b ? <Line key={`edge-${index}`} points={[a, b]} color={state.path.includes(from) && state.path.includes(to) ? '#34d399' : state.activeEdge?.includes(from) && state.activeEdge.includes(to) ? '#67e8f9' : '#475569'} lineWidth={2} /> : null
      })}
      {state.nodes.map((node) => {
        const position = positions.get(node) ?? [0, 0, 0]
        return <group key={`graph-${node}`} position={position}>
          <mesh onClick={() => onSelect(node)}>
            <sphereGeometry args={[0.34, 32, 32]} />
            <meshStandardMaterial color={node === selected ? SELECTED_COLOR : state.path.includes(node) ? '#34d399' : state.visited.includes(node) ? '#a78bfa' : state.frontier.includes(node) ? '#fbbf24' : '#0e7490'} emissive={node === selected ? SELECTED_COLOR : state.path.includes(node) ? '#10b981' : state.visited.includes(node) ? '#8b5cf6' : '#06b6d4'} emissiveIntensity={0.9} />
          </mesh>
          <Text position={[0, 0, 0.38]} fontSize={0.18} color="#fff">{node}</Text>
        </group>
      })}
    </group>
  )
}

function Structure({ state, previousState, stepId, reducedMotion, selected, onSelect }: {
  state: DsaState
  previousState?: DsaState
  stepId: number
  reducedMotion: boolean
  selected?: string
  onSelect: (value: string) => void
}) {
  if (state.kind === 'stack') return <StackStructure state={state} previousState={previousState} stepId={stepId} reducedMotion={reducedMotion} selected={selected} onSelect={onSelect} />
  if (state.kind === 'array') return (
    <group>
      {state.values.slice(0, 16).map((value, index) => {
        const x = (index - (Math.min(state.values.length, 16) - 1) / 2) * 0.62
        const active = state.active.includes(index)
        const picked = String(value) === selected
        const height = Math.max(0.35, Math.min(2, Math.abs(value) / 20))
        return <group key={`array-slot-${index}`} position={[x, -1 + height / 2, 0]}>
          <RoundedBox args={[0.48, height, 0.52]} radius={0.06} smoothness={2} onClick={() => onSelect(String(value))}>
            <meshStandardMaterial color={picked ? SELECTED_COLOR : active ? '#67e8f9' : '#267c9a'} emissive={picked ? SELECTED_COLOR : active ? '#06b6d4' : '#083344'} emissiveIntensity={active || picked ? 1.1 : 0.35} metalness={0.4} roughness={0.24} />
          </RoundedBox>
          <Text position={[0, height / 2 + 0.18, 0.28]} fontSize={0.16} color="#e7faff" anchorX="center">{value}</Text>
          <Text position={[0, -height / 2 - 0.12, 0.28]} fontSize={0.09} color="#94a3b8" anchorX="center">[{index}]</Text>
        </group>
      })}
    </group>
  )
  if (state.kind === 'list') return (
    <group>
      {state.nodes.slice(0, 12).map((node, index) => {
        const x = (index - (Math.min(state.nodes.length, 12) - 1) / 2) * 1.15
        return <group key={`node-${node.id}`} position={[x, 0, 0]}>
          {index < state.nodes.length - 1 && <Line points={[[0.28, 0, 0], [0.87, 0, 0]]} color="#22d3ee" lineWidth={2} />}
          <mesh position={[0, 0, 0]} onClick={() => onSelect(String(node.value))}>
            <sphereGeometry args={[0.3, 32, 32]} />
            <meshStandardMaterial color={String(node.value) === selected ? SELECTED_COLOR : state.activeId === node.id ? '#a78bfa' : '#0e7490'} emissive={String(node.value) === selected ? SELECTED_COLOR : state.activeId === node.id ? '#8b5cf6' : '#06b6d4'} emissiveIntensity={0.75} metalness={0.35} roughness={0.2} />
          </mesh>
          <Text position={[0, 0, 0.33]} fontSize={0.16} color="#fff">{node.value}</Text>
          <Text position={[0, -0.48, 0]} fontSize={0.09} color="#67e8f9">{index === 0 ? 'HEAD' : index === state.nodes.length - 1 ? 'TAIL' : 'NEXT'}</Text>
        </group>
      })}
    </group>
  )
  if (state.kind === 'queue') return (
    <group>
      <Line points={[[-3, -0.5, 0], [3, -0.5, 0]]} color="#64748b" lineWidth={7} />
      {Array.from({ length: Math.min(state.capacity, 12) }, (_, index) => {
        const x = (index - (Math.min(state.capacity, 12) - 1) / 2) * 0.58
        const value = state.values[index]
        const picked = value !== undefined && String(value) === selected
        return <group key={`queue-${index}`} position={[x, -0.18, 0]}>
          <mesh onClick={() => { if (value !== undefined) onSelect(String(value)) }}>
            <boxGeometry args={[0.48, 0.48, 0.42]} />
            <meshStandardMaterial color={value === undefined ? '#1e293b' : picked ? SELECTED_COLOR : '#0e7490'} emissive={value === undefined ? '#000000' : picked ? SELECTED_COLOR : '#06b6d4'} emissiveIntensity={value === undefined ? 0 : 0.55} transparent={value === undefined} opacity={value === undefined ? 0.3 : 1} />
          </mesh>
          {value !== undefined && <Text position={[0, 0, 0.25]} fontSize={0.15} color="#fff">{value}</Text>}
        </group>
      })}
      <Text position={[-3, 0.35, 0]} fontSize={0.13} color="#67e8f9" anchorX="left">FRONT</Text>
      <Text position={[3, 0.35, 0]} fontSize={0.13} color="#c4b5fd" anchorX="right">REAR</Text>
    </group>
  )
  if (state.kind === 'tree') {
    const nodes = state.nodes.slice(0, 16)
    const positions = treeLayout(nodes)
    return <group>
      {nodes.map((node) => {
        const [x, y] = positions.get(node.value)!
        const parent = node.parent === undefined ? undefined : positions.get(node.parent)
        return <group key={`tree-${node.value}`} position={[x, y, 0]}>
          {parent && <Line points={[[parent[0] - x, parent[1] - y, 0], [0, 0, 0]]} color="#45627f" lineWidth={2} />}
          <mesh onClick={() => onSelect(String(node.value))}>
            <sphereGeometry args={[0.3, 32, 32]} />
            <meshStandardMaterial color={String(node.value) === selected ? SELECTED_COLOR : state.visited.includes(node.value) ? '#34d399' : state.activeValue === node.value ? '#a78bfa' : '#0e7490'} emissive={String(node.value) === selected ? SELECTED_COLOR : state.visited.includes(node.value) ? '#10b981' : '#06b6d4'} emissiveIntensity={0.75} />
          </mesh>
          <Text position={[0, 0, 0.34]} fontSize={0.16} color="#fff">{node.value}</Text>
        </group>
      })}
    </group>
  }
  if (state.kind === 'graph') return <GraphStructure state={state} selected={selected} onSelect={onSelect} />
  return (
    <group>
      {state.buckets.map((bucket, index) => {
        const x = (index - (state.buckets.length - 1) / 2) * 0.95
        return <group key={`bucket-${index}`} position={[x, -0.8, 0]}>
          <mesh>
            <boxGeometry args={[0.78, 1.3, 0.72]} />
            <meshPhysicalMaterial color={state.activeBucket === index ? '#8b5cf6' : '#164e63'} emissive={state.activeBucket === index ? '#8b5cf6' : '#06b6d4'} emissiveIntensity={state.activeBucket === index ? 0.8 : 0.22} transparent opacity={0.45} wireframe />
          </mesh>
          <Text position={[0, 0.82, 0]} fontSize={0.11} color="#67e8f9">{index}</Text>
          {bucket.slice(0, 4).map((value, valueIndex) => <group key={`key-${index}-${value}`} position={[0, 0.4 - valueIndex * 0.35, 0.1]}>
            <mesh onClick={() => onSelect(String(value))}><boxGeometry args={[0.5, 0.26, 0.26]} /><meshStandardMaterial color={String(value) === selected ? SELECTED_COLOR : '#0e7490'} emissive={String(value) === selected ? SELECTED_COLOR : '#06b6d4'} emissiveIntensity={0.4} /></mesh>
            <Text position={[0, 0, 0.16]} fontSize={0.1} color="#fff">{value}</Text>
          </group>)}
        </group>
      })}
    </group>
  )
}

export function AlgorithmLabScene({ state, previousState, title, description, operation, stepId, reducedMotion, fallback }: AlgorithmLabSceneProps) {
  const [command, setCommand] = useState<CameraCommand>({ id: 0, mode: 'reset' })
  const [viewError, setViewError] = useState('')
  // The operation value doubles as the selection: graph ops take a node index, everything else a value.
  const executionInput = useAppStore((app) => app.executionInput)
  const selected = state.kind === 'graph' ? state.nodes[executionInput] : String(executionInput)
  const select = (label: string) => useAppStore.getState().setExecutionInput(state.kind === 'graph' ? state.nodes.indexOf(label) : Number(label))
  const viewport = useRef<HTMLDivElement>(null)
  const resetCamera = () => setCommand((value) => ({ id: value.id + 1, mode: 'reset' }))
  const focusVisualization = () => setCommand((value) => ({ id: value.id + 1, mode: 'focus' }))
  const toggleFullscreen = async () => {
    if (!viewport.current) return
    try {
      if (document.fullscreenElement === viewport.current) await document.exitFullscreen()
      else await viewport.current.requestFullscreen()
      setViewError('')
    } catch (error) {
      setViewError(error instanceof Error ? error.message : 'Fullscreen mode is unavailable.')
    }
  }
  const enterVR = async () => {
    try {
      await xrStore.enterVR()
      setViewError('')
    } catch (error) {
      setViewError(`VR is unavailable: ${error instanceof Error ? error.message : 'no WebXR headset found.'}`)
    }
  }
  const values = state.kind === 'array' ? state.values
    : state.kind === 'stack' || state.kind === 'queue' ? state.values
      : state.kind === 'list' ? state.nodes.map((node) => node.value)
        : state.kind === 'tree' ? state.nodes.map((node) => node.value)
          : state.kind === 'graph' ? state.nodes
            : state.buckets.flat()
  return (
    <section ref={viewport} className="algorithm-lab-viewport" aria-label={`${title} 3D visualization. Current values: ${values.join(', ') || 'empty'}. ${description}`}>
      <SceneErrorBoundary fallback={<div className="algorithm-lab-fallback">{fallback}</div>}>
        <Canvas
          className="algorithm-lab-canvas"
          dpr={[1, 1.5]}
          camera={{ position: [0, 2.4, 8.5], fov: 42, near: 0.1, far: 60 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          fallback={<div className="algorithm-lab-fallback">{fallback}</div>}
        >
          <XR store={xrStore}>
            <LaboratoryEnvironment reducedMotion={reducedMotion} />
            <ViewRig command={command} state={state} title={title} description={description} operation={operation} />
            <group scale={state.kind === 'stack' ? 1.28 : 1}>
              <Structure state={state} previousState={previousState} stepId={stepId} reducedMotion={reducedMotion} selected={selected} onSelect={select} />
            </group>
          </XR>
        </Canvas>
      </SceneErrorBoundary>
      <div className="algorithm-lab-controls" aria-label="3D visualization controls">
        <button type="button" className="lab-button ghost small" onClick={focusVisualization}>Focus visualization</button>
        <button type="button" className="lab-button ghost small" onClick={resetCamera}>Reset camera</button>
        <button type="button" className="lab-button ghost small" onClick={() => void toggleFullscreen()}>Fullscreen</button>
        {'xr' in navigator && <button type="button" className="lab-button primary small" onClick={() => void enterVR()}>Enter VR</button>}
      </div>
      {viewError && <p className="algorithm-lab-error" role="status">{viewError}</p>}
      <details className="algorithm-lab-summary">
        <summary>Textual visualization summary</summary>
        <p>{title}: {values.join(', ') || 'empty'} · Selected: {selected ?? '—'}</p>
        {values.map((value, index) => <button key={`${index}-${value}`} type="button" onClick={() => { select(String(value)); focusVisualization() }}>Select {value}</button>)}
      </details>
    </section>
  )
}

function focusTargetFor(state: DsaState): [number, number, number] {
  if (state.kind === 'stack') return [0, (STACK_BASE_Y + Math.max(0, state.topIndex) * STACK_LEVEL_HEIGHT) * 1.28, 0]
  if (state.kind === 'array') {
    const index = state.active[0] ?? Math.floor((state.values.length - 1) / 2)
    return [(index - (Math.min(state.values.length, 16) - 1) / 2) * 0.62, 0, 0]
  }
  if (state.kind === 'list') {
    const index = state.nodes.findIndex((node) => node.id === state.activeId)
    return [((index < 0 ? Math.floor((state.nodes.length - 1) / 2) : index) - (Math.min(state.nodes.length, 12) - 1) / 2) * 1.15, 0, 0]
  }
  if (state.kind === 'hash' && state.activeBucket !== undefined) return [(state.activeBucket - (state.buckets.length - 1) / 2) * 0.95, -0.8, 0]
  return [0, 0, 0]
}
