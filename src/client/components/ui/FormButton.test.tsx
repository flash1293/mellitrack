import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FormButton from './FormButton'

describe('FormButton', () => {
  it('renders children', () => {
    render(<FormButton>Click me</FormButton>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('applies primary variant by default', () => {
    render(<FormButton>Primary</FormButton>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-blue-600')
  })

  it('applies secondary variant', () => {
    render(<FormButton variant="secondary">Secondary</FormButton>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('border-gray-300')
  })

  it('applies danger variant', () => {
    render(<FormButton variant="danger">Danger</FormButton>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-red-600')
  })

  it('applies ghost variant', () => {
    render(<FormButton variant="ghost">Ghost</FormButton>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('text-blue-600')
  })

  it('shows spinner when loading', () => {
    render(<FormButton loading>Loading</FormButton>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    // Spinner element should be present
    expect(button.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('is disabled when disabled prop is set', () => {
    render(<FormButton disabled>Disabled</FormButton>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when loading', () => {
    render(<FormButton loading>Loading</FormButton>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('fires onClick handler', () => {
    const handleClick = vi.fn()
    render(<FormButton onClick={handleClick}>Click</FormButton>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire onClick when disabled', () => {
    const handleClick = vi.fn()
    render(<FormButton disabled onClick={handleClick}>Click</FormButton>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })
})
