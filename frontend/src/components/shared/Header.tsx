import React from 'react';
import { Bell, Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  notificationCount?: number;
  onNotificationClick?: () => void;
  onMenuToggle?: () => void;
  user?: {
    name: string;
    avatar?: string;
    role?: string;
  };
}

export default function Header({
  title,
  subtitle,
  actions,
  notificationCount = 0,
  onNotificationClick,
  onMenuToggle,
  user,
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-surface-200 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg text-surface-500 hover:bg-surface-100"
            >
              <Menu size={20} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-semibold text-surface-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-surface-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actions}

          {onNotificationClick && (
            <button
              onClick={onNotificationClick}
              className="relative p-2 rounded-lg text-surface-500 hover:bg-surface-100 transition-colors"
            >
              <Bell size={20} />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-xs font-medium text-white bg-danger-500 rounded-full">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
          )}

          {user && (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-surface-200">
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
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-surface-900">{user.name}</p>
                {user.role && (
                  <p className="text-xs text-surface-500">{user.role}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
