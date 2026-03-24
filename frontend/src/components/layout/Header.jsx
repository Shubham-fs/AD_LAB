import React, { useState } from 'react';
import { Search, Bell, RefreshCw, Download } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { kpiMetrics } from '../../data/mockData';

const pageNames = {
  dashboard: 'Smart Dashboard',
  shipments: 'Shipment Tracking',
  prediction: 'ML Prediction Panel',
  analytics: 'Insights & Analytics',
  admin: 'Admin Panel',
};

export default function Header() {
  const activePage = useAppStore(s => s.activePage);
  const [notifications] = useState(3);

  return (
    <header className="h-16 flex-shrink-0 border-b border-white/5 bg-surface-800/50 backdrop-blur-sm flex items-center px-6 gap-4 z-10">
      {/* Page title */}
      <div className="flex-1">
        <h1 className="text-base font-bold text-white">{pageNames[activePage] || 'Dashboard'}</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {kpiMetrics.totalOrders.toLocaleString()} total orders · {kpiMetrics.delayRate}% delay rate
        </p>
      </div>

      {/* Search */}
      <div className="relative hidden md:block">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search orders…"
          className="pl-8 pr-4 py-2 bg-surface-700 border border-white/10 rounded-xl text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500/50 w-48"
        />
      </div>

      {/* Live badge */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs font-medium text-green-400">Live</span>
      </div>

      {/* Actions */}
      <button className="btn-ghost p-2 rounded-xl" title="Refresh">
        <RefreshCw size={16} className="text-gray-400" />
      </button>
      <button className="btn-ghost p-2 rounded-xl" title="Export">
        <Download size={16} className="text-gray-400" />
      </button>

      {/* Notifications */}
      <button className="relative p-2 rounded-xl hover:bg-white/5 transition-colors">
        <Bell size={16} className="text-gray-400" />
        {notifications > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500 shadow-sm shadow-brand-500/50" />
        )}
      </button>
    </header>
  );
}
