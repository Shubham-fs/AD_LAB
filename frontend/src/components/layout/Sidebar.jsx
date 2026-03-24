import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import {
  LayoutDashboard, Truck, Brain, BarChart3, Settings,
  Package, ChevronRight, Shield, Eye
} from 'lucide-react';

const navItems = [
  { id: 'dashboard',  label: 'Dashboard',    Icon: LayoutDashboard },
  { id: 'shipments',  label: 'Shipments',     Icon: Truck },
  { id: 'prediction', label: 'ML Prediction', Icon: Brain },
  { id: 'analytics',  label: 'Analytics',     Icon: BarChart3 },
  { id: 'admin',      label: 'Admin Panel',   Icon: Settings },
];

export default function Sidebar() {
  const { activePage, setActivePage, role, setRole } = useAppStore();

  return (
    <aside className="w-64 flex-shrink-0 bg-surface-800 border-r border-white/5 flex flex-col h-full z-10">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Package size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">Flipkart</p>
            <p className="text-xs text-gray-500 mt-0.5">Logistics Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-3 mb-3">Navigation</p>
        {navItems.map(({ id, label, Icon }) => {
          const isActive = activePage === id;
          return (
            <button
              key={id}
              onClick={() => setActivePage(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative
                ${isActive
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute inset-0 bg-brand-500/10 rounded-xl border border-brand-500/20"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon size={17} className={isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'} />
              <span className="relative z-10">{label}</span>
              {isActive && <ChevronRight size={14} className="ml-auto text-brand-400" />}
            </button>
          );
        })}
      </nav>

      {/* Role Switcher */}
      <div className="px-4 py-4 border-t border-white/5">
        <p className="text-xs text-gray-600 mb-2 font-medium">Role</p>
        <div className="flex gap-2">
          {['admin', 'viewer'].map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${role === r ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-gray-500 hover:text-gray-300 border border-white/5'}`}
            >
              {r === 'admin' ? <Shield size={11} /> : <Eye size={11} />}
              {r === 'admin' ? 'Admin' : 'Viewer'}
            </button>
          ))}
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-brand-500 flex items-center justify-center text-xs font-bold text-white">
            K
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Kumar</p>
            <p className="text-xs text-gray-500 truncate capitalize">{role}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
        </div>
      </div>
    </aside>
  );
}
