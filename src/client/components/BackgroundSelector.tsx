import { useEffect, useState } from 'react'

const THEMES = [
  { id: 'default', label: 'Standard', emoji: '⚪' },
  { id: 'rosengarten', label: 'Rosengarten', emoji: '🌸' },
  { id: 'lila-ornamente', label: 'Lila Ornamente', emoji: '💜' },
  { id: 'herzchenregen', label: 'Herzchenregen', emoji: '💕' },
  { id: 'silber-gitter', label: 'Silber-Gitter', emoji: '🪟' },
  { id: 'graphit-streifen', label: 'Graphit-Streifen', emoji: '⬛' },
  { id: 'diamant', label: 'Diamant', emoji: '💎' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

const STORAGE_KEY = 'mellitrack-theme'

export function getCurrentTheme(): ThemeId {
  if (typeof window === 'undefined') return 'default'
  return (localStorage.getItem(STORAGE_KEY) as ThemeId) || 'default'
}

export function applyTheme(themeId: ThemeId) {
  document.documentElement.classList.remove(
    'bg-theme-default',
    'bg-theme-rosengarten',
    'bg-theme-lila-ornamente',
    'bg-theme-herzchenregen',
    'bg-theme-silber-gitter',
    'bg-theme-graphit-streifen',
    'bg-theme-diamant',
  )
  document.documentElement.classList.add(`bg-theme-${themeId}`)
}

export default function BackgroundSelector() {
  const [current, setCurrent] = useState<ThemeId>('default')

  useEffect(() => {
    const saved = getCurrentTheme()
    setCurrent(saved)
    applyTheme(saved)
  }, [])

  const handleChange = (themeId: ThemeId) => {
    setCurrent(themeId)
    localStorage.setItem(STORAGE_KEY, themeId)
    applyTheme(themeId)
  }

  return (
    <div className="px-3 py-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Hintergrund
      </p>
      <div className="flex flex-col gap-1">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => handleChange(theme.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              current === theme.id
                ? 'bg-pink-100 text-pink-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="text-base">{theme.emoji}</span>
            <span>{theme.label}</span>
            {current === theme.id && (
              <span className="ml-auto text-pink-500">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
