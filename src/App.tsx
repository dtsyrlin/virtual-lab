import { useState } from 'react'
import './App.css'

import BouncingBall from './components/Labs/BouncingBall'
import LabView from './components/LabView'

type Page = 'menu' | 'bouncingBall' | 'labView'

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

  if (page === 'labView') {
    return (
      <>
        <div style={{ padding: '10px' }}>
          <button onClick={() => setPage('menu')}>
            ← Back to Menu
          </button>
        </div>

        <LabView />
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

        <button onClick={() => setPage('labView')}>
          Lab View
        </button>
      </div>
    </div>
  )
}

export default App