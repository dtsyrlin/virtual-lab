import { useState } from 'react'
import './App.css'

import BouncingBall from './components/Labs/BouncingBall'
import StackingBars from './components/Labs/StackingBars'

type Page = 'menu' | 'bouncingBall' | 'StackingBars'

function App() {
  const [page, setPage] = useState<Page>('menu')

  if (page === 'bouncingBall') {
    return (
      <>
        <div style={{ padding: '10px' }}>
          <button onClick={() => setPage('menu')}>
            ← Back to Menu
          </button>
        </div>

        <BouncingBall />
      </>
    )
  }

  if (page === 'StackingBars') {
    return (
      <>
        <div style={{ padding: '10px' }}>
          <button onClick={() => setPage('menu')}>
            ← Back to Menu
          </button>
        </div>

        <StackingBars />
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
        <button onClick={() => setPage('bouncingBall')}>
          Bouncing Ball
        </button>

        <button onClick={() => setPage('StackingBars')}>
          Stacking Bars
        </button>
      </div>
    </div>
  )
}

export default App