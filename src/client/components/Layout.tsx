import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api'
import { useState } from 'react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/trainings', label: 'Trainings', icon: '💪' },
  { path: '/exercises', label: 'Übungen', icon: '📝' },
]

export default function Layout({ username }: { username: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await api.logout()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile header */}
      <header className="bg-blue-600 text-white p-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-bold">❤️ Mellitrack</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm hidden sm:inline">{username}</span>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-20 bg-black/50" onClick={() => setMenuOpen(false)}>
          <nav
            className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-4">
              <button onClick={() => setMenuOpen(false)} className="p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-3 py-2 mb-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">Angemeldet als</p>
              <p className="font-medium">{username}</p>
            </div>
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMenuOpen(false) }}
                className={`w-full text-left p-3 rounded-lg mb-2 flex items-center gap-3 transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="w-full text-left p-3 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-3 mt-4"
            >
              <span>🚪</span>
              <span className="font-medium">Abmelden</span>
            </button>
          </nav>
        </div>
      )}

      {/* Desktop sidebar + content */}
      <div className="flex-1 flex">
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 p-4">
          <div className="px-3 py-2 mb-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600">Angemeldet als</p>
            <p className="font-medium">{username}</p>
          </div>
          <nav className="flex-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full text-left p-3 rounded-lg mb-2 flex items-center gap-3 transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
          <button
            onClick={handleLogout}
            className="w-full text-left p-3 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-3"
          >
            <span>🚪</span>
            <span className="font-medium">Abmelden</span>
          </button>
        </aside>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-10">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center p-2 rounded-lg min-w-[64px] ${
              location.pathname === item.path
                ? 'text-blue-600'
                : 'text-gray-500'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="md:hidden h-20" />
    </div>
  )
}
