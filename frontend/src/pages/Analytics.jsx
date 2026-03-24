import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Cell
} from 'recharts';
import { TrendingUp, MapPin, Warehouse, Route } from 'lucide-react';
import { warehouseData, categoryData, heatmapData, routeData, zoneData } from '../data/mockData';

const HEAT_COLORS = ['#1a1a2e','#16213e','#0f3460','#533483','#e94560','#ff6b35','#ffd700'];
function heatColor(val) {
  const idx = Math.min(HEAT_COLORS.length - 1, Math.floor(val / 100 * HEAT_COLORS.length));
  return HEAT_COLORS[idx];
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-4 py-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex gap-2">
          {p.name}: <span className="text-white font-bold ml-2">{p.value}{p.unit || ''}</span>
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [trend, setTrend] = useState('weekly');
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const zones = ['North','South','East','West','Central'];

  return (
    <div className="space-y-6">
      {/* Warehouse Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-5">
          <div className="flex items-center gap-2 mb-1">
            <Warehouse size={16} className="text-brand-400" />
            <p className="section-title text-sm !mb-0">Warehouse Performance</p>
          </div>
          <p className="section-sub">On-time rate per warehouse</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={warehouseData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
              <XAxis type="number" domain={[0,100]} tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="warehouse" tick={{ fill: '#6b7280', fontSize: 10 }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="onTimeRate" radius={[0,4,4,0]} name="On-Time Rate" unit="%" maxBarSize={20}>
                {warehouseData.map((entry, i) => (
                  <Cell key={i} fill={entry.onTimeRate > 80 ? '#00ff88' : entry.onTimeRate > 65 ? '#f97316' : '#ff4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Category Delay Rates */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-brand-400" />
            <p className="section-title text-sm !mb-0">Category Delay Rate</p>
          </div>
          <p className="section-sub">Which product types delay most</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} margin={{ top: 5, right: 10, bottom: 30, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="category" tick={{ fill: '#6b7280', fontSize: 9, angle: -35, textAnchor: 'end' }} tickLine={false} interval={0} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} unit="%" tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="delayRate" radius={[4,4,0,0]} name="Delay Rate" unit="%" maxBarSize={30}>
                {categoryData.map((entry, i) => (
                  <Cell key={i} fill={`hsl(${30 - entry.delayRate * 0.4}, 90%, 55%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Heatmap */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass p-5">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={16} className="text-brand-400" />
          <p className="section-title text-sm !mb-0">Delay Heatmap — Zone × Day of Week</p>
        </div>
        <p className="section-sub">Higher values mean more delays on that day/zone combination</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs mt-2">
            <thead>
              <tr>
                <th className="pb-2 text-gray-600 text-left font-medium w-20">Zone</th>
                {days.map(d => <th key={d} className="pb-2 text-gray-500 font-medium px-1">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {zones.map(zone => (
                <tr key={zone}>
                  <td className="py-1 text-gray-400 font-medium pr-3">{zone}</td>
                  {days.map(day => {
                    const cell = heatmapData.find(h => h.zone === zone && h.day === day);
                    const v = cell?.value ?? 0;
                    return (
                      <td key={day} className="py-0.5 px-0.5">
                        <div className="relative group rounded-lg h-9 flex items-center justify-center text-xs font-bold cursor-default transition-transform hover:scale-110"
                          style={{ background: heatColor(v), color: v > 25 ? '#fff' : '#9ca3af', border: '1px solid rgba(255,255,255,0.05)' }}>
                          {v}%
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-surface-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 border border-white/10">
                            {zone} {day}: {v}% delayed
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
            <span>Low</span>
            <div className="flex gap-0.5">
              {HEAT_COLORS.map((c, i) => (
                <div key={i} className="w-6 h-3 rounded" style={{ background: c }} />
              ))}
            </div>
            <span>High</span>
          </div>
        </div>
      </motion.div>

      {/* Top Routes */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass p-5">
        <div className="flex items-center gap-2 mb-1">
          <Route size={16} className="text-brand-400" />
          <p className="section-title text-sm !mb-0">Top Problematic Routes</p>
        </div>
        <p className="section-sub">Routes with highest delay percentages</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="border-b border-white/5 text-left">
                {['Rank','Route','Orders','Delay %','Avg Delay (days)','Risk'].map(h => (
                  <th key={h} className="pb-2 text-xs text-gray-600 font-semibold uppercase tracking-wider pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {routeData.map((r, i) => (
                <motion.tr key={r.route} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.04 }} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 text-gray-600 font-bold pr-4">#{i+1}</td>
                  <td className="py-3 text-gray-300 font-medium pr-4">{r.route}</td>
                  <td className="py-3 text-gray-400 pr-4">{r.orders.toLocaleString()}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface-600 rounded-full w-20">
                        <div className="h-full rounded-full bg-red-500" style={{ width: `${r.delayPct}%` }} />
                      </div>
                      <span className="text-red-400 font-bold text-xs">{r.delayPct}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-gray-400 pr-4">{r.avgDelay}d</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                      ${r.delayPct > 40 ? 'bg-red-500/20 text-red-400' :
                        r.delayPct > 30 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'}`}>
                      {r.delayPct > 40 ? 'High' : r.delayPct > 30 ? 'Medium' : 'Low'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
