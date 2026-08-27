// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { AnnotatedResume } from '@/components/AnnotatedResume'

describe('AnnotatedResume', () => {
  it('renders the resume text and a highlighted issue span', () => {
    render(
      <AnnotatedResume
        text={'I am responsible for X.'}
        issues={[
          {
            line: 1,
            start: 5,
            end: 21,
            severity: 'warning',
            category: 'verbs',
            message: 'Weak action verb "responsible for"',
            suggestion: 'Replace with "led".',
            original: 'responsible for',
          },
        ]}
      />,
    )
    expect(screen.getByLabelText(/resume text with highlighted issues/i)).toBeInTheDocument()
    // The issue list shows the message.
    expect(screen.getByText(/weak action verb/i)).toBeInTheDocument()
    // Jump control for line 1 exists.
    expect(screen.getByRole('button', { name: /jump to line 1/i })).toBeInTheDocument()
  })

  it('shows an empty state when there are no issues', () => {
    render(<AnnotatedResume text={'Clean resume text'} issues={[]} />)
    expect(screen.getByText(/no line-level issues detected/i)).toBeInTheDocument()
  })
})
