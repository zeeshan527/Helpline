import { Loader2, PackageOpen } from 'lucide-react'

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <Loader2 className={`animate-spin text-primary-600 ${sizes[size]} ${className}`} />
  )
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title = 'No data found',
  description = 'There are no items to display.',
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon size={32} className="text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 mb-4 max-w-sm">{description}</p>
      {action}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading the data.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6">
      <div className="w-16 h-16 bg-danger-50 rounded-full flex items-center justify-center mb-4">
        <span className="text-danger-600 text-3xl">!</span>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Try again
        </button>
      )}
    </div>
  )
}
