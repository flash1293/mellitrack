import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from './api'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import TrainingList from './pages/TrainingList'
import TrainingForm from './pages/TrainingForm'
import ExerciseList from './pages/ExerciseList'
import ProgressPage from './pages/ProgressPage'
import type { AuthCheckResponse } from '../shared/types'

function App() {
  const [auth, setAuth] = useState<boolean | null>(null)
  const [username, setUsername] = useState<string>('')

  useEffect(() => {
    api.checkAuth().then((r: AuthCheckResponse) => {
      setAuth(r.authenticated)
      if (r.authenticated && r.username) {
        setUsername(r.username)
      }
    }).catch((err) => {
      console.error('Auth check failed:', err)
      setAuth(false)
    })
  }, [])

  const handleLogin = () => {
    api.checkAuth().then((r: AuthCheckResponse) => {
      setAuth(r.authenticated)
      if (r.authenticated && r.username) {
        setUsername(r.username)
      }
    }).catch((err) => {
      console.error('Auth re-check failed:', err)
      setAuth(false)
    })
  }

  if (auth === null) return <div className="p-8 text-center">Loading...</div>

  return (
    <Routes>
      <Route path="/login" element={auth ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
      <Route path="/register" element={auth ? <Navigate to="/" /> : <Register onLogin={handleLogin} />} />
      <Route element={auth ? <Layout username={username} /> : <Navigate to="/login" />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/trainings" element={<TrainingList />} />
        <Route path="/trainings/new" element={<TrainingForm />} />
        <Route path="/trainings/:id/edit" element={<TrainingForm />} />
        <Route path="/exercises" element={<ExerciseList />} />
        <Route path="/progress/:exerciseId" element={<ProgressPage />} />
      </Route>
    </Routes>
  )
}

export default App
