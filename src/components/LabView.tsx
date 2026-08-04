import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh } from 'three'

function Ball()
{
    const sphereRef = useRef<Mesh>(null)
    let time = 0
    useFrame((state, deltaTime) => {
    time += deltaTime
    //sphereRef.current.position.z = 1*Math.cos(time)**2
    sphereRef.current.position.x = 1*Math.sin(time)**2
    })    
    return(
      <mesh ref={sphereRef} position={[0, 2, 1]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshPhysicalMaterial color="metallic" />
      </mesh>
    )
}

function LabView() {
  return (
    <Canvas camera={{ position: [2, 2, 10], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[-4, 2, 8]} intensity={2} />

      <Ball />

      <mesh position={[1, 0, -1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 6]} />
        <meshStandardMaterial color="silver" />
      </mesh>
    </Canvas>
  )
}

export default LabView