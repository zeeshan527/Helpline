export default function Badge({ children, variant = 'gray', className = '' }) {
  const variants = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    gray: 'badge-gray',
  }

  return (
    <span className={`${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const statusConfig = {
    active: { label: 'Active', variant: 'success' },
    inactive: { label: 'Inactive', variant: 'gray' },
    pending: { label: 'Pending', variant: 'warning' },
    suspended: { label: 'Suspended', variant: 'danger' },
    completed: { label: 'Completed', variant: 'success' },
    cancelled: { label: 'Cancelled', variant: 'danger' },
  }

  const config = statusConfig[status] || { label: status, variant: 'gray' }

  return <Badge variant={config.variant}>{config.label}</Badge>
}
