// -----------------------------------------------------------------------------
// Standing floor lamp - ported over from the original portfolio project
// (src/scene/props.jsx -> FloorLamp). Same procedural mesh (no .glb - it's
// just a base cylinder, a thin pole, and a warm emissive lampshade), not the
// purple lava lamp. The matching warm point light lives alongside it in
// Experience.jsx, same as it did in v1.
// -----------------------------------------------------------------------------
export default function FloorLamp({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.22, 0.06, 20]} />
        <meshStandardMaterial color="#20202a" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 1.8, 12]} />
        <meshStandardMaterial color="#2a2a34" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* shade, warm emissive */}
      <mesh position={[0, 1.95, 0]}>
        <cylinderGeometry args={[0.22, 0.32, 0.34, 20, 1, true]} />
        <meshStandardMaterial
          color="#ffcf8a"
          emissive="#ffb45a"
          emissiveIntensity={1.6}
          side={2}
          roughness={0.6}
        />
      </mesh>
    </group>
  )
}
