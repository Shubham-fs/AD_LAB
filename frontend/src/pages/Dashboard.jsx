import React from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Package, CheckCircle, AlertTriangle, Clock, TrendingUp, TrendingDown, Warehouse } from 'lucide-react';
import { kpiMetrics, trendData, zoneData, modelMetrics } from '../data/mockData';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' } }),
};

const PIE_COLORS = ['#00ff88', '#ff4444'];

function KpiCard({ icon: Icon, label, value, sub, color, trend, index }) {
  return (
    <motion.div custom={index} variants={cardVariants} initial="hidden" animate="visible"
      className="glass-hover p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0`}
           style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          {trend > 0
            ? <TrendingUp size={11} className="text-green-400" />
            : <TrendingDown size={11} className="text-red-400" />}
          {sub}
        </p>
      </div>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-4 py-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex gap-2 items-center">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="text-white font-bold ml-auto pl-4">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const pieData = [
    { name: 'On-Time', value: kpiMetrics.onTime },
    { name: 'Delayed', value: kpiMetrics.delayed },
  ];

  const kpis = [
    { icon: Package,       label: 'Total Orders',     value: kpiMetrics.totalOrders.toLocaleString(), sub: '+5.2% from last month', color: '#00d4ff', trend: 1 },
    { icon: CheckCircle,   label: 'On-Time Deliveries', value: kpiMetrics.onTime.toLocaleString(),   sub: `${kpiMetrics.onTimeRate}% success rate`,   color: '#00ff88', trend: 1 },
    { icon: AlertTriangle, label: 'Delayed Shipments', value: kpiMetrics.delayed.toLocaleString(),   sub: `${kpiMetrics.delayRate}% delay rate`,       color: '#ff6b35', trend: -1 },
    { icon: Clock,         label: 'Avg Delivery Days', value: `${kpiMetrics.avgDeliveryDays}d`,       sub: '+0.3d from target',                         color: '#a855f7', trend: -1 },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k, i) => <KpiCard key={k.label} {...k} index={i} />)}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend line chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="glass p-5 lg:col-span-2">
          <p className="section-title">Delivery Trends (Last 30 Days)</p>
          <p className="section-sub">Daily order volume vs delays</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false}
                interval={6} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              <Line type="monotone" dataKey="orders" stroke="#00d4ff" strokeWidth={2} dot={false} name="Orders" />
              <Line type="monotone" dataKey="delayed" stroke="#ff6b35" strokeWidth={2} dot={false} name="Delayed" />
              <Line type="monotone" dataKey="onTime" stroke="#00ff88" strokeWidth={2} dot={false} name="On-Time" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass p-5">
          <p className="section-title">Delivery Ratio</p>
          <p className="section-sub">On-time vs delayed split</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70}
                dataKey="value" stroke="none">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-around mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="text-center">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  {d.name}
                </div>
                <p className="text-sm font-bold text-white mt-0.5">{d.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Zone bar chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="glass p-5">
          <p className="section-title">Delays by Zone</p>
          <p className="section-sub">On-time vs delayed orders per region</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={zoneData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="zone" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              <Bar dataKey="onTime"  fill="#00ff88" radius={[4,4,0,0]} name="On-Time" maxBarSize={30} />
              <Bar dataKey="delayed" fill="#ff6b35" radius={[4,4,0,0]} name="Delayed"  maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

      </div>
    </div>
  );
}
