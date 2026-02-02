import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Gamepad2, Trophy, User, History, Settings, LogOut } from 'lucide-react';
import { authService } from '@/services/authService';

export const Sidebar: React.FC = () => {
  const currentUser = authService.getCurrentUser();

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/lobby', icon: Gamepad2, label: 'Find Game' },
    { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { path: '/history', icon: History, label: 'Game History' },
    { path: '/profile', icon: User, label: 'Profile' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      authService.signOut();
    }
  };

  return (
    <div className="h-screen w-64 bg-slate-900 border-r-2 border-slate-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold text-white">IgKnight Chess</h1>
        <p className="text-slate-400 text-sm">Online Chess Platform</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3 p-3 bg-slate-800 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{currentUser?.username || 'Guest'}</p>
            <p className="text-slate-400 text-xs">{currentUser?.email || ''}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
};
