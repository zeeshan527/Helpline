import { Link } from 'react-router-dom'
import { ShieldX, ArrowLeft } from 'lucide-react'
import Button from '../components/common/Button'

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <div className="w-20 h-20 bg-danger-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX size={40} className="text-danger-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-8 max-w-md">
          You don't have permission to access this page. Please contact your administrator if you believe this is a mistake.
        </p>
        <Link to="/">
          <Button icon={ArrowLeft}>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
