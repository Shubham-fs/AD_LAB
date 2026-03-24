import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { shipments } from '../data/mockData';

const PAGE_SIZE = 12;
const STATUS_OPTIONS = ['all', 'On-Time', 'Delayed', 'In-Transit'];
const ZONE_OPTIONS   = ['all', 'North', 'South', 'East', 'West', 'Central'];

function StatusBadge({ status }) {
  if (status === 'On-Time')    return <span className="badge-green">●&nbsp;On-Time</span>;
  if (status === 'Delayed')    return <span className="badge-red">●&nbsp;Delayed</span>;
  return <span className="badge-yellow">●&nbsp;In-Transit</span>;
}

export default function Shipments() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [sortKey, setSortKey] = useState('orderDate');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let data = [...shipments];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(s =>
        s.id.toLowerCase().includes(q) ||
        s.source.toLowerCase().includes(q) ||
        s.destination.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') data = data.filter(s => s.status === statusFilter);
    if (zoneFilter !== 'all')   data = data.filter(s => s.zone === zoneFilter);
    data.sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    return data;
  }, [search, statusFilter, zoneFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  const SortIcon = ({ k }) => (
    <ArrowUpDown size={12} className={`ml-1 inline ${sortKey === k ? 'text-brand-400' : 'text-gray-600'}`} />
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by ID, source, destination…"
              className="input-dark pl-8 text-sm" />
          </div>
          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-gray-500" />
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                  ${statusFilter === s ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-gray-500 hover:text-gray-300 border border-white/5'}`}>
                {s === 'all' ? 'All Status' : s}
              </button>
            ))}
          </div>
          {/* Zone filter */}
          <select value={zoneFilter} onChange={e => { setZoneFilter(e.target.value); setPage(1); }}
            className="input-dark text-sm w-40 py-2">
            {ZONE_OPTIONS.map(z => <option key={z} value={z}>{z === 'all' ? 'All Zones' : z}</option>)}
          </select>
        </div>
        <p className="text-xs text-gray-600 mt-2">{filtered.length} shipments found</p>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                {[
                  ['id','Order ID'], ['source','Source'], ['destination','Destination'],
                  ['zone','Zone'], ['shippingMode','Mode'], ['expectedDate','Expected'],
                  ['actualDate','Delivered'], ['status','Status'], ['delayDays','Delay']
                ].map(([key, label]) => (
                  <th key={key} onClick={() => handleSort(key)}
                    className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 transition-colors whitespace-nowrap">
                    {label}<SortIcon k={key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paged.map((s, i) => (
                <motion.tr key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-white/5 transition-colors group">
                  <td className="px-4 py-3 font-mono text-brand-400 text-xs font-medium">{s.id}</td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{s.source}</td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{s.destination}</td>
                  <td className="px-4 py-3 text-gray-500">{s.zone}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium
                      ${s.shippingMode === 'Express' ? 'bg-blue-500/15 text-blue-400' :
                        s.shippingMode === 'Same-Day' ? 'bg-purple-500/15 text-purple-400' :
                        'bg-gray-500/15 text-gray-400'}`}>{s.shippingMode}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{s.expectedDate}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{s.actualDate || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-center">
                    {s.delayDays > 0
                      ? <span className="text-red-400 font-bold">+{s.delayDays}d</span>
                      : <span className="text-green-400">—</span>}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
          <p className="text-xs text-gray-500">
            Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
              <ChevronLeft size={15} className="text-gray-400" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  className={`w-7 h-7 text-xs rounded-lg transition-all ${page === pg
                    ? 'bg-brand-500 text-white font-bold' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                  {pg}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30 transition-colors">
              <ChevronRight size={15} className="text-gray-400" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
