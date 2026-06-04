import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Normal content')).toBeInTheDocument()
  })

  it('renders error UI when a child throws', () => {
    const ThrowComponent = () => {
      throw new Error('Test error message')
    }

    // Suppress console.error from React for this expected error
    const originalError = console.error
    console.error = () => {}

    render(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Ein Fehler ist aufgetreten')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
    expect(screen.getByText('Seite neu laden')).toBeInTheDocument()

    console.error = originalError
  })

  it('renders "Unbekannter Fehler" when error has no message', () => {
    const ThrowComponent = () => {
      throw new Error() // Error with empty message
    }

    const originalError = console.error
    console.error = () => {}

    render(
      <ErrorBoundary>
        <ThrowComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Unbekannter Fehler')).toBeInTheDocument()

    console.error = originalError
  })
})
