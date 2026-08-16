import { useState } from 'react'
import './App.css'

import BouncingBall from './components/Labs/BouncingBall'
import StackingBars from './components/Labs/StackingBars'
import ProtractorAndRulers from './components/Labs/ProtractorAndRulers'
import Geometry from './components/Labs/Geometry'


const experiments = [
  {
    name: 'Bouncing Ball',
    component: BouncingBall,
  },
  {
    name: 'Stacking Bars',
    component: StackingBars,
  },
  {
    name: 'Protractor And Rulers',
    component: ProtractorAndRulers,
  },
  {
    name: 'Geometry',
    component: Geometry,
  },
]


function App() {
  const [selectedExperiment, setSelectedExperiment] = useState<number | null>(null)


  if (selectedExperiment !== null) {
    const Experiment = experiments[selectedExperiment].component

    return (
      <>
        <div style={{ padding: '10px' }}>
          <button onClick={() => setSelectedExperiment(null)}>
            ← Back to Menu
          </button>
        </div>

        <Experiment />
      </>
    )
  }


  return (
    <div style={{ padding: '30px' }}>
      <h1>Virtual Lab</h1>

      <h2>Select an Experiment</h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '250px',
        }}
      >
        {experiments.map((experiment, index) => (
          <button
            key={experiment.name}
            onClick={() => setSelectedExperiment(index)}
          >
            {experiment.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default App