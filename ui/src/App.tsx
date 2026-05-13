import { Navigate, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import ExplorePage from './pages/ExplorePage'
import LivePage from './pages/LivePage'
import ReplayPage from './pages/ReplayPage'

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Navigate to="/explore" replace />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/replay" element={<ReplayPage />} />
      </Routes>
    </>
  )
}

export default App
