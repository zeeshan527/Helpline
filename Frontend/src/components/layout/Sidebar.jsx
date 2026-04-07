import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  Users,
  Heart,
  MapPin,
  Package,
  PackagePlus,
  PackageMinus,
  FileBarChart,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, permission: null },
  { name: 'Beneficiaries', href: '/beneficiaries', icon: Users, permission: 'beneficiaries.read' },
  { name: 'Donors', href: '/donors', icon: Heart, permission: 'donors.read' },
  { name: 'Locations', href: '/locations', icon: MapPin, permission: 'locations.read' },
  {
    name: 'Inventory',
    icon: Package,
    permission: 'inventory.read',
    children: [
      { name: 'Stock In', href: '/inventory/stock-in', icon: PackagePlus },
      { name: 'Stock Out', href: '/inventory/stock-out', icon: PackageMinus },
    ],
  },
  { name: 'Reports', href: '/reports', icon: FileBarChart, permission: 'reports.read' },
]

const adminNavigation = [
  { name: 'Users', href: '/users', icon: Users, permission: 'users.read' },
  { name: 'Settings', href: '/settings', icon: Settings, permission: null },
]

export default function Sidebar() {
  const { user, logout, hasPermission, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [expandedItems, setExpandedItems] = useState(['Inventory'])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleExpand = (name) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    )
  }

  const canAccess = (permission) => {
    if (!permission) return true
    return hasPermission(permission)
  }

  const renderNavItem = (item) => {
    if (!canAccess(item.permission)) return null

    if (item.children) {
      const isExpanded = expandedItems.includes(item.name)
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleExpand(item.name)}
            className="sidebar-link sidebar-link-inactive w-full justify-between"
          >
            <span className="flex items-center gap-3">
              <item.icon size={20} />
              {item.name}
            </span>
            <ChevronDown
              size={16}
              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children.map((child) => (
                <NavLink
                  key={child.href}
                  to={child.href}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`
                  }
                >
                  <child.icon size={18} />
                  {child.name}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <NavLink
        key={item.href}
        to={item.href}
        className={({ isActive }) =>
          `sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`
        }
        end={item.href === '/'}
      >
        <item.icon size={20} />
        {item.name}
      </NavLink>
    )
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-200">
        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
          <Building2 className="text-white" size={24} />
        </div>
        <div>
          <h1 className="font-bold text-gray-900">Helpline</h1>
          <p className="text-xs text-gray-500">NGO Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map(renderNavItem)}

        {isAdmin() && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Admin
              </p>
            </div>
            {adminNavigation.map(renderNavItem)}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-link sidebar-link-inactive w-full text-danger-600 hover:bg-danger-50 hover:text-danger-700"
        >
          <LogOut size={20} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
