import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut } from 'lucide-react';
import Logo from '../brand/Logo';

interface SidebarItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  badge?: number;
}

interface SidebarProps {
  items: SidebarItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
  user?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  logo?: React.ReactNode;
}

export default function Sidebar({
  items,
  currentPath,
  onNavigate,
  onLogout,
  user,
  logo,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md text-surface-600"
      >
        {collapsed ? <X size={20} /> : <Menu size={20} />}
      </button>

      <AnimatePresence>
        {collapsed && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCollapsed(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-surface-200 z-40 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          collapsed ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-surface-200">
          {logo || <Logo size={32} variant="mono" />}
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  onNavigate(item.path);
                  setCollapsed(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                }`}
              >
                <span className={isActive ? 'text-primary-600' : 'text-surface-400'}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-danger-100 text-danger-700">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {user && (
          <div className="p-3 border-t border-surface-200">
            <div className="flex items-center gap-3 px-3 py-2">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-700">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 truncate">{user.name}</p>
                {user.role && (
                  <p className="text-xs text-surface-500 truncate">{user.role}</p>
                )}
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
