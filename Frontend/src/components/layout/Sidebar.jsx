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


// Navigation definitions for each role
const NAV_ITEMS = {
  admin: [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Beneficiaries', href: '/beneficiaries', icon: Users },
    { name: 'Donors', href: '/donors', icon: Heart },
    { name: 'Locations', href: '/locations', icon: MapPin },
    {
      name: 'Inventory',
      icon: Package,
      children: [
        { name: 'Stock In', href: '/inventory/stock-in', icon: PackagePlus },
        { name: 'Stock Out', href: '/inventory/stock-out', icon: PackageMinus },
      ],
    },
    { name: 'Reports', href: '/reports', icon: FileBarChart },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ],
  staff: [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Beneficiaries', href: '/beneficiaries', icon: Users },
    { name: 'Donors', href: '/donors', icon: Heart },
    { name: 'Locations', href: '/locations', icon: MapPin },
    { name: 'Reports', href: '/reports', icon: FileBarChart },
  ],    
  master_inventory_manager: [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Locations', href: '/locations', icon: MapPin },
    {
      name: 'Inventory (All Locations)',
      icon: Package,
      children: [
        { name: 'Stock In (All)', href: '/inventory/stock-in', icon: PackagePlus },
        { name: 'Stock Out (All)', href: '/inventory/stock-out', icon: PackageMinus },
      ],
    },
    { name: 'Reports', href: '/reports', icon: FileBarChart },
    // Add more inventory analytics/transfer as needed
  ],
  location_inventory_manager: [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    {
      name: 'Inventory (My Location)',
      icon: Package,
      children: [
        { name: 'Stock In (Mine)', href: '/inventory/stock-in', icon: PackagePlus },
        { name: 'Stock Out (Mine)', href: '/inventory/stock-out', icon: PackageMinus },
      ],
    },
    { name: 'Locations', href: '/locations', icon: MapPin },
    { name: 'Reports', href: '/reports', icon: FileBarChart },
  ],
}


export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [expandedItems, setExpandedItems] = useState(['Inventory'])

  // Role mapping (ensure your backend sets these role strings)
  const getRoleKey = () => {
    if (!user) return 'staff'
    if (user.role === 'admin') return 'admin'
    if (user.role === 'master_inventory_manager') return 'master_inventory_manager'
    if (user.role === 'location_inventory_manager') return 'location_inventory_manager'
    return 'staff'
  }

  const navItems = NAV_ITEMS[getRoleKey()] || NAV_ITEMS.staff

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleExpand = (name) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    )
  }

  const renderNavItem = (item) => {
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
        {navItems.map(renderNavItem)}
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
