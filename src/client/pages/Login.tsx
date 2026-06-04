import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import FormInput from '../components/ui/FormInput'
import FormButton from '../components/ui/FormButton'
import ErrorBanner from '../components/ui/ErrorBanner'

export default function Login({ onLogin }: { onLogin: (username: string) => void }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.login(username, password)
      onLogin(username)
      navigate('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Mellitrack</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Benutzername"
            name="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Benutzername"
            autoFocus
          />
          <FormInput
            label="Passwort"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
          />
          <ErrorBanner message={error} />
          <FormButton
            type="submit"
            loading={loading}
            className="w-full"
          >
            Anmelden
          </FormButton>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Noch kein Konto?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Registrieren
          </Link>
        </p>
      </div>
    </div>
  )
}
