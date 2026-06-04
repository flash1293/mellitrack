import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBanner from './ErrorBanner'

describe('ErrorBanner', () => {
  it('renders the error message', () => {
    render(<ErrorBanner message="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('returns null when message is null', () => {
    const { container } = render(<ErrorBanner message={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when message is empty string', () => {
    const { container } = render(<ErrorBanner message="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders with error styling', () => {
    const { container } = render(<ErrorBanner message="Error!" />)
    expect(container.firstChild).toBeInTheDocument()
    expect(container.firstChild).toHaveClass('text-red-600')
  })
})
