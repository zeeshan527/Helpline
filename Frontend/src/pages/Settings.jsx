import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { authAPI } from '../services/api'
import Card, { CardHeader, CardBody } from '../components/common/Card'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import {
  User,
  Lock,
  Bell,
  Globe,
  Save,
} from 'lucide-react'

export default function Settings() {
  const { user, checkAuth } = useAuth()
  const { success, error: showError } = useToast()
  const [activeTab, setActiveTab] = useState('profile')
  const [submitting, setSubmitting] = useState(false)

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch,
  } = useForm()

  const newPassword = watch('newPassword')

  const onProfileSubmit = async (data) => {
    try {
      setSubmitting(true)
      await authAPI.updateMe(data)
      await checkAuth()
      success('Profile updated successfully')
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSubmitting(false)
    }
  }

  const onPasswordSubmit = async (data) => {
    try {
      setSubmitting(true)
      await authAPI.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      resetPassword()
      success('Password changed successfully')
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to change password')
    } finally {
      setSubmitting(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card className="lg:col-span-1 p-2 h-fit">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={18} />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            ))}
          </nav>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Profile Information</h3>
                <p className="text-sm text-gray-500">Update your personal information</p>
              </CardHeader>
              <CardBody>
                <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="flex items-center gap-6 pb-6 border-b">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{user?.name}</h4>
                      <p className="text-gray-500 capitalize">{user?.role}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      placeholder="Enter your name"
                      error={profileErrors.name?.message}
                      {...registerProfile('name', { required: 'Name is required' })}
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="Enter your email"
                      error={profileErrors.email?.message}
                      {...registerProfile('email', { 
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        }
                      })}
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" icon={Save} loading={submitting}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          )}

          {activeTab === 'password' && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Change Password</h3>
                <p className="text-sm text-gray-500">Update your account password</p>
              </CardHeader>
              <CardBody>
                <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                    placeholder="Enter current password"
                    error={passwordErrors.currentPassword?.message}
                    {...registerPassword('currentPassword', { required: 'Current password is required' })}
                  />
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="Enter new password"
                    error={passwordErrors.newPassword?.message}
                    {...registerPassword('newPassword', { 
                      required: 'New password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters',
                      }
                    })}
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    placeholder="Confirm new password"
                    error={passwordErrors.confirmPassword?.message}
                    {...registerPassword('confirmPassword', { 
                      required: 'Please confirm your password',
                      validate: value => value === newPassword || 'Passwords do not match'
                    })}
                  />

                  <div className="flex justify-end pt-4">
                    <Button type="submit" icon={Save} loading={submitting}>
                      Change Password
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Notification Settings</h3>
                <p className="text-sm text-gray-500">Manage how you receive notifications</p>
              </CardHeader>
              <CardBody>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-500">Receive email notifications for important updates</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Low Stock Alerts</p>
                      <p className="text-sm text-gray-500">Get notified when inventory is running low</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Policy Violation Alerts</p>
                      <p className="text-sm text-gray-500">Get notified about distribution policy violations</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Weekly Summary</p>
                      <p className="text-sm text-gray-500">Receive a weekly summary of activities</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {activeTab === 'preferences' && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Preferences</h3>
                <p className="text-sm text-gray-500">Customize your experience</p>
              </CardHeader>
              <CardBody>
                <div className="space-y-6">
                  <div>
                    <label className="label">Language</label>
                    <select className="input w-full md:w-64">
                      <option value="en">English</option>
                      <option value="ur">Urdu</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Date Format</label>
                    <select className="input w-full md:w-64">
                      <option value="MMM dd, yyyy">MMM dd, yyyy (Jan 01, 2024)</option>
                      <option value="dd/MM/yyyy">dd/MM/yyyy (01/01/2024)</option>
                      <option value="yyyy-MM-dd">yyyy-MM-dd (2024-01-01)</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Currency</label>
                    <select className="input w-full md:w-64">
                      <option value="PKR">PKR - Pakistani Rupee</option>
                      <option value="USD">USD - US Dollar</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Items Per Page</label>
                    <select className="input w-full md:w-64">
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
