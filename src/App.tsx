import { useState } from 'react'
import './App.css'

import BouncingBall from './components/Labs/BouncingBall'
import StackingBars from './components/Labs/StackingBars'
import ProtractorAndRulers from './components/Labs/ProtractorAndRulers'
import Geometry from './components/Labs/Geometry'
import HooksLaw from './components/Labs/HooksLaw'


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
    name: 'Hooks Law',
    component: HooksLaw,
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


  // Look up the expected passcode for this user.
  //
  // If user = "fusion":
  // users[user] = users["fusion"] = "fusion26"
  //
  // If the user does not exist:
  // users[user] will be undefined.
  const expectedPasscode = users[user].passcode


  // User is not in our users list.
  if (expectedPasscode === undefined) {
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

        <input
          type="password"
          value={enteredPasscode}
          onChange={(event) => setEnteredPasscode(event.target.value)}
        />

        <button
          onClick={() => {
            if (enteredPasscode === expectedPasscode) {
              setAuthorized(true)
              setWrongPasscode(false)
            } else {
              setWrongPasscode(true)
            }
          }}
        >
          Enter
        </button>

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