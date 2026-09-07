import { useState } from 'react'
import type { ComponentType } from 'react'
import './App.css'

import BouncingBall from './components/Labs/BouncingBall'
import StackingBars from './components/Labs/StackingBars'
import ProtractorAndRulers from './components/Labs/ProtractorAndRulers'
import Geometry from './components/Labs/Geometry'
import HooksLaw from './components/Labs/HooksLaw'
import VerticalHooksLaw from './components/Labs/VerticalHooksLaw'
import BalancingWeights from './components/Labs/BalancingWeights'
import ChemicalEquations from './components/Labs/ChemicalEquations'
import DynamicsTrack from './components/Labs/DynamicsTrack'
import TorqueBalance from './components/Labs/TorqueBalance'
import Probability from './components/Labs/Probability'
import RollingTrack from './components/Labs/RollingTrack'
import VectorAddition from './components/Labs/VectorAddition'
import Pendulum from './components/Labs/Pendulum'

type UserInfo = {
  displayName: string
}

type Experiment = {
  name: string
  component: ComponentType
}

const users: Record<string, UserInfo> = {
  dilemma26: {
    displayName: 'DILEMMA',
  },

  anabelle: {
    displayName: 'Anabelle',
  },
}

const physicsExperiments: Experiment[] = [
  {
    name: 'Bouncing Ball',
    component: BouncingBall,
  },
  {
    name: 'Torque Balance',
    component: TorqueBalance,
  },
  {
    name: 'Pendulum',
    component: Pendulum,
  },
  {
    name: 'Vertical Hooks Law',
    component: VerticalHooksLaw,
  },
  {
    name: 'Horizontal Hooks Law',
    component: HooksLaw,
  },
  {
    name: 'Dynamics Track',
    component: DynamicsTrack,
  },
  {
    name: 'Rolling Track',
    component: RollingTrack,
  },
]

const mathExperiments: Experiment[] = [
  {
    name: 'Balancing Weights',
    component: BalancingWeights,
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
    name: 'Geometry Construction',
    component: Geometry,
  },  
  {
    name: 'Vector Addition',
    component: VectorAddition,
  },
  {
    name: 'Probability',
    component: Probability,
  },

]

const chemistryExperiments: Experiment[] = [
  {
    name: 'Chemical Equations',
    component: ChemicalEquations,
  },

]

const biologyExperiments: Experiment[] = [
]

const experimentColumns = [
  {
    name: 'Physics',
    experiments: physicsExperiments,
  },
  {
    name: 'Math',
    experiments: mathExperiments,
  },
  {
    name: 'Chemistry',
    experiments: chemistryExperiments,
  },
  {
    name: 'Biology',
    experiments: biologyExperiments,
  },
]

const experiments = experimentColumns.flatMap(
  (column) => column.experiments
)



function App() {
  const [selectedExperiment, setSelectedExperiment] =
    useState<number | null>(null)

  const [enteredPasscode, setEnteredPasscode] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [wrongPasscode, setWrongPasscode] = useState(false)


  // User exists, but has not entered the correct passcode yet.
  if (!authorized) {
    return (
      <div style={{ padding: '30px' }}>
        <h1>Welcome to DILEMMA!</h1>
        <h3>Digital Interactive Learning Environment for Modeling, Measurement and Analysis</h3>

        <p>Please enter your passcode:</p>

        <form
          onSubmit={(event) => {
            event.preventDefault()

            if (undefined === users[enteredPasscode]) {
              setWrongPasscode(true)
            } else {
              setAuthorized(true)
              setWrongPasscode(false)
            }
          }}
        >
          <input
            type="password"
            value={enteredPasscode}
            onChange={(event) => setEnteredPasscode(event.target.value)}
          />

          <button type="submit">
            Enter
          </button>
        </form>
        {wrongPasscode && (
          <p>Oops, something doesn't add up...</p>
        )}
      </div>
    )
  }


  // From here down, the user has entered the correct passcode.


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
      <h1>{users[enteredPasscode].displayName} Virtual Labs</h1>

      <h2>Select an Experiment</h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {experimentColumns.map((column) => (
          <div key={column.name}>
            <h3>{column.name}</h3>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {column.experiments.map((experiment) => {
                const index = experiments.indexOf(experiment)

                return (
                  <button
                    key={experiment.name}
                    onClick={() => setSelectedExperiment(index)}
                  >
                    {experiment.name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App