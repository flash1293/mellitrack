import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('renders the main message', () => {
    render(<EmptyState message="No data available" />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('renders the icon when provided', () => {
    render(<EmptyState icon="📊" message="No data" />)
    expect(screen.getByText('📊')).toBeInTheDocument()
  })

  it('does not render icon when not provided', () => {
    const { container } = render(<EmptyState message="No data" />)
    // Should not have the emoji div
    expect(container.querySelector('.text-4xl')).toBeNull()
  })

  it('renders secondary message when provided', () => {
    render(<EmptyState message="No data" secondaryMessage="Try adding some" />)
    expect(screen.getByText('Try adding some')).toBeInTheDocument()
  })

  it('does not render secondary message when not provided', () => {
    render(<EmptyState message="No data" />)
    expect(screen.queryByText('Try adding some')).toBeNull()
  })

  it('renders CTA button when text and handler are provided', () => {
    const handleClick = vi.fn()
    render(<EmptyState message="No data" ctaText="Add item" onCtaClick={handleClick} />)
    const button = screen.getByText('Add item')
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not render CTA button when text is provided without handler', () => {
    render(<EmptyState message="No data" ctaText="Add item" />)
    expect(screen.queryByText('Add item')).toBeNull()
  })

  it('does not render CTA button when handler is provided without text', () => {
    const handleClick = vi.fn()
    render(<EmptyState message="No data" onCtaClick={handleClick} />)
    // No CTA text should appear
    expect(screen.queryByRole('button')).toBeNull()
  })
})
