import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh } from 'three'

function Ball()
{
    const sphereRef = useRef<Mesh>(null)
    const time = useRef(0)
    const velocity_Y = useRef(0)
    const acceleration_Y = -9.81
    useFrame((state, deltaTime) => {
        sphereRef.current.position.y += velocity_Y.current * deltaTime
        if(sphereRef.current.position.y <= 1){
            velocity_Y.current = -velocity_Y.current
        }
        else
        {
            velocity_Y.current += acceleration_Y * deltaTime
        }
    })    
    return(
      <mesh ref={sphereRef} position={[0, 2, 1]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshPhysicalMaterial color="silver" />
      </mesh>
    )
}

function LabView() {
  return (
    <Canvas camera={{ position: [0, 4, 5], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[-4, 2, 8]} intensity={2} />

      <Ball />

      <mesh position={[0, -2, 0]} rotation={[-Math.PI * 0.5, 0, 0]}>
        <planeGeometry args={[6, 4]} />
        <meshStandardMaterial color="silver" />
      </mesh>
    </Canvas>
  )
}

export default LabView