import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  Home, 
  Gamepad2, 
  Trophy, 
  History, 
  User, 
  Settings, 
  Menu, 
  X,
  Crown,
  LogOut
} from 'lucide-react';
import { authService } from '@/services/authService';

export const Layout: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const currentUser = authService.getCurrentUser();

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      authService.signOut();
    }
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/lobby', label: 'Find Game', icon: Gamepad2 },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { path: '/history', label: 'History', icon: History },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Skip to main content link for keyboard navigation */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        Skip to main content
      </a>

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r-2 border-slate-800">
        {/* Logo */}
        <div className="p-6 border-b-2 border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Chess Arena</h1>
              <p className="text-xs text-slate-400">Master the game</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info */}
        <div className="p-4 border-t-2 border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold">
                {currentUser?.username.substring(0, 2).toUpperCase() || 'GM'}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">
                {currentUser?.username || 'Guest'}
              </p>
              <p className="text-slate-400 text-xs">
                Rating: {currentUser?.rating || 1200}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b-2 border-slate-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white">Chess Arena</h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="border-t-2 border-slate-800 bg-slate-900">
            <nav className="p-4">
              <ul className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                          active
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 pt-4 border-t-2 border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Log Out</span>
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main id="main-content" className="flex-1 overflow-auto">
        <div className="lg:p-8 p-4 pt-20 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};