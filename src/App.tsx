import { useState } from 'react'
import './App.css'

import BouncingBall from './components/Labs/BouncingBall'
import StackingBars from './components/Labs/StackingBars'
import ProtractorAndRulers from './components/Labs/ProtractorAndRulers'
import Geometry from './components/Labs/Geometry'
import HooksLaw from './components/Labs/HooksLaw'
import VerticalHooksLaw from './components/Labs/VerticalHooksLaw'
import BalancingWeights from './components/Labs/BalancingWeights'

type UserInfo = {
  passcode: string
  displayName: string
}

const users: Record<string, UserInfo> = {
  fusion: {
    passcode: 'fusion26',
    displayName: 'Fusion Academy',
  },

  test: {
    passcode: 'test26',
    displayName: 'Test Academy',
  },
}

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
  {
    name: 'Horizontal Hooks Law',
    component: HooksLaw,
  },
  {
    name: 'Vertical Hooks Law',
    component: VerticalHooksLaw,
  },
  {
    name: 'Balancing Weights',
    component: BalancingWeights,
  },    
]


function App() {
  const [selectedExperiment, setSelectedExperiment] =
    useState<number | null>(null)

  const [enteredPasscode, setEnteredPasscode] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [wrongPasscode, setWrongPasscode] = useState(false)


  // Example:
  // /fusion -> fusion
  // /test   -> test
  const user = window.location.pathname.split('/')[1]


  // User is not in our users list.
  if (users[user] === undefined) {
    return (
      <div style={{ padding: '30px' }}>
        <h2>
          You are not authorized to use this page, your IP address has been recorded.
        </h2>
      </div>
    )
  }

  // User exists, but has not entered the correct passcode yet.
  if (!authorized) {
    return (
      <div style={{ padding: '30px' }}>
        <h1>{users[user].displayName} Virtual Labs</h1>

        <p>Please enter your passcode:</p>

        <form
          onSubmit={(event) => {
            event.preventDefault()

            if (enteredPasscode === users[user].passcode) {
              setAuthorized(true)
              setWrongPasscode(false)
            } else {
              setWrongPasscode(true)
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
      <h1>{users[user].displayName} Virtual Labs</h1>

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