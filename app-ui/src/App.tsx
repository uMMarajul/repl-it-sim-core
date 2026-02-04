import './App.css'
import { ChatAssistant } from './components/ChatAssistant'
import { ProjectionCharts } from './components/ProjectionCharts'
import { ScenarioControls } from './components/ScenarioControls'
import { ScenarioExplorer } from './components/ScenarioExplorer'
import { ScenarioProvider } from './state/scenarioStore'

function App() {
  return (
    <ScenarioProvider>
      <div className="app-container">
        <header className="app-header">
          <h1>🚀 Financial Simulation Dev Console</h1>
          <p>Interactive scenario modeling with AI assistance</p>
        </header>

        <div className="app-layout">
          {/* Left Panel */}
          <aside className="left-panel">
            <ScenarioControls />
          </aside>

          {/* Middle Panel */}
          <main className="middle-panel">
            <ProjectionCharts />
          </main>

          {/* Right Panel */}
          <aside className="right-panel">
            <ScenarioExplorer />
          </aside>
        </div>

        {/* Floating Chat Assistant */}
        <ChatAssistant />
      </div>
    </ScenarioProvider>
  )
}

export default App
