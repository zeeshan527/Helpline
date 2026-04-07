import { forwardRef } from 'react'

const Input = forwardRef(({
  label,
  error,
  type = 'text',
  className = '',
  ...props
}, ref) => {
  return (
    <div className={className}>
      {label && (
        <label className="label">{label}</label>
      )}
      <input
        ref={ref}
        type={type}
        className={`input ${error ? 'input-error' : ''}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-danger-600">{error}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
