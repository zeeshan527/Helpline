import { forwardRef } from 'react'

const Textarea = forwardRef(({
  label,
  error,
  rows = 3,
  className = '',
  ...props
}, ref) => {
  return (
    <div className={className}>
      {label && (
        <label className="label">{label}</label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={`input resize-none ${error ? 'input-error' : ''}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-danger-600">{error}</p>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'

export default Textarea
