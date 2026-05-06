import DataOverview from './components/DataOverview'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import VisualizationPanel from './components/VisualizationPanel'

function App() {
  return (
    <div>
      <Header />
      <Sidebar />
      <div style={{ padding: '10px 10px 10px 520px' }}>
        <DataOverview
          dataProjectDict={null}
          logTransform={false}
          percentiles={[0, 100]}
        />
        <VisualizationPanel
          latentSpaceJobId={null}
          clusteringJobId={null}
          projectName=""
          latentSpaceReady={false}
          clusteringReady={false}
          dataProjectDict={null}
        />
      </div>
    </div>
  )
}

export default App
