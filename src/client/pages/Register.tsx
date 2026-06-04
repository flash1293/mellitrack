import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import FormInput from '../components/ui/FormInput'
import FormButton from '../components/ui/FormButton'
import ErrorBanner from '../components/ui/ErrorBanner'

export default function Register({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      setLoading(false)
      return
    }

    try {
      await api.register(username, password)
      onLogin()
      navigate('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
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
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Benutzername wählen"
            autoFocus
          />
          <FormInput
            label="Passwort"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort"
          />
          <FormInput
            label="Passwort bestätigen"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Passwort wiederholen"
          />
          <ErrorBanner message={error} />
          <FormButton
            type="submit"
            loading={loading}
            className="w-full"
          >
            Registrieren
          </FormButton>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Bereits ein Konto?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  )
}
