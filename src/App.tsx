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
import PlanetaryMotion from './components/Labs/PlanetaryMotion'
import MetalAcidReaction from './components/Labs/MetalAcidReaction'

type UserInfo = {
  displayName: string
}

type Experiment = {
  name: string
  component: ComponentType
}

// Set this to true if/when passcode access is needed again.
const REQUIRE_PASSCODE = false

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
    name: 'Planetary Motion',
    component: PlanetaryMotion,
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
  {
    name: 'Metal Acid Reaction',
    component: MetalAcidReaction,
  },

]

const biologyExperiments: Experiment[] = [
]

// Help files live in public/help and are served by Vite in development and production.
// To edit instructions, change the corresponding .txt file; no App.tsx changes needed.
const helpFileFor = (name: string) =>
  `${import.meta.env.BASE_URL}help/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.txt`

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


  const [helpOpen, setHelpOpen] = useState(false)
  const [helpText, setHelpText] = useState<string | null>(null)
  const [helpError, setHelpError] = useState(false)

  const openHelp = async (name: string) => {
    setHelpOpen(true)
    setHelpText(null)
    setHelpError(false)
    try {
      const response = await fetch(helpFileFor(name), { cache: 'no-cache' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const contentType = response.headers.get('content-type') ?? ''
      const content = await response.text()
      // Some production hosts return index.html (HTTP 200) for a missing .txt file.
      if (contentType.includes('text/html') || /^\s*<(?:!doctype\s+html|html|head|body|div|script)\b/i.test(content)) {
        throw new Error('Help text file is missing')
      }
      setHelpText(content)
    } catch {
      setHelpError(true)
    }
  }


  // User exists, but has not entered the correct passcode yet.
  if (REQUIRE_PASSCODE && !authorized) {
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
    const selected = experiments[selectedExperiment]
    const Experiment = selected.component

    return (
      <>
        <div
          style={{
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
          }}
        >
          <button onClick={() => { setSelectedExperiment(null); setHelpOpen(false) }}>
            ← Back to Menu
          </button>

          <h2 style={{ margin: 0 }}>
            {selected.name}
          </h2>
          <button style={{ marginLeft: 'auto' }} onClick={() => void openHelp(selected.name)}>
            ? Help
          </button>
        </div>

        {helpOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.name} help`}
            onClick={() => setHelpOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
              zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 }}
          >
            <div onClick={(event) => event.stopPropagation()}
              style={{ background: '#fff', color: '#222', borderRadius: 12, padding: 24,
                width: 'min(560px, 100%)', maxHeight: '80vh', overflowY: 'auto', boxSizing: 'border-box' }}>
              <h2 style={{ marginTop: 0 }}>{selected.name} — Help</h2>
              {helpError ? (
                <p style={{ textAlign: 'left' }}>Help text file is missing.</p>
              ) : helpText === null ? (
                <p style={{ textAlign: 'left' }}>Loading instructions...</p>
              ) : (
                <ul style={{ lineHeight: 1.7, paddingLeft: 24, textAlign: 'left', listStylePosition: 'outside' }}>
                  {helpText.split(/\n\s*\n/).map((step, index) => (
                    <li key={index} style={{ marginBottom: 8 }}>{step.trim()}</li>
                  ))}
                </ul>
              )}
              <div style={{ textAlign: 'right' }}>
                <button onClick={() => setHelpOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        <Experiment />
      </>
    )
  }


  return (
    <div style={{ padding: '30px' }}>
      <h1>Virtual Labs</h1>

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