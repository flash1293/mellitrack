import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FormInput from './FormInput'

describe('FormInput', () => {
  it('renders an input element', () => {
    render(<FormInput />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<FormInput label="Username" />)
    expect(screen.getByText('Username')).toBeInTheDocument()
  })

  it('associates label with input via htmlFor', () => {
    render(<FormInput label="Email" name="email" />)
    const input = screen.getByRole('textbox')
    const label = screen.getByText('Email')
    expect(label).toHaveAttribute('for', 'email')
    expect(input).toHaveAttribute('id', 'email')
  })

  it('renders error message when provided', () => {
    render(<FormInput error="This field is required" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('does not render error message when not provided', () => {
    render(<FormInput />)
    expect(screen.queryByText('This field is required')).toBeNull()
  })

  it('applies error styling when error is present', () => {
    render(<FormInput error="Error" />)
    const input = screen.getByRole('textbox')
    expect(input.className).toContain('border-red-400')
  })

  it('forwards ref to the input element', () => {
    const ref = vi.fn()
    render(<FormInput ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  it('handles value changes', () => {
    const handleChange = vi.fn()
    render(<FormInput onChange={handleChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('applies additional className', () => {
    render(<FormInput className="extra-class" />)
    const input = screen.getByRole('textbox')
    expect(input.className).toContain('extra-class')
  })
})
