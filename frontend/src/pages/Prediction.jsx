import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Zap, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { modelMetrics } from '../data/mockData';

const WEATHER = ['Clear', 'Rainy', 'Foggy', 'Stormy', 'Cloudy'];
const TRAFFIC  = ['Low', 'Medium', 'High', 'Severe'];
const ZONES    = ['North', 'South', 'East', 'West', 'Central'];
const MODES    = ['Standard', 'Express', 'Same-Day'];

function GaugeBar({ value, color }) {
  return (
    <div className="relative h-3 bg-surface-600 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="absolute h-full rounded-full"
        style={{ background: color, boxShadow: `0 0 12px ${color}80` }}
      />
    </div>
  );
}

export default function Prediction() {
  const { predictionResult, predictionLoading, setPredictionResult, setPredictionLoading } = useAppStore();

  const [form, setForm] = useState({
    zone: 'North', shippingMode: 'Standard', promisedDays: 3,
    weight: 1500, price: 2500, discount: 10,
    weather: 'Clear', traffic: 'Low',
    warehouseLoad: 60, deliveryAttempts: 1,
    isWeekend: false, isHoliday: false, isSalePeriod: false,
    customerRating: 3.5,
  });

  function handleChange(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function runPrediction() {
    setPredictionLoading(true);
    setPredictionResult(null);
    // Simulate ML inference delay
    setTimeout(() => {
      // Heuristic scoring (mirrors actual model logic for demo)
      let risk = 0;
      if (form.weather === 'Stormy') risk += 25;
      else if (form.weather === 'Rainy' || form.weather === 'Foggy') risk += 12;
      if (form.traffic === 'Severe') risk += 22;
      else if (form.traffic === 'High') risk += 12;
      if (form.warehouseLoad > 80) risk += 15;
      if (form.isWeekend) risk += 5;
      if (form.isHoliday) risk += 10;
      if (form.isSalePeriod) risk += 8;
      if (form.promisedDays <= 2) risk += 10;
      if (form.deliveryAttempts > 1) risk += 18;
      if (form.customerRating < 2.5) risk += 12;
      if (form.discount > 30) risk += 6;
      // Base rate
      risk += 20;
      const prob = Math.min(95, Math.max(8, risk));

      const models = modelMetrics.map(m => ({
        ...m,
        confidence: Math.min(99, Math.max(50, prob + (Math.random() * 14 - 7))),
        delayed: prob + (Math.random() * 10 - 5) > 42,
      }));

      setPredictionResult({ prob, delayed: prob > 42, models });
      setPredictionLoading(false);
    }, 1800);
  }

  const InputRow = ({ label, children }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1 font-medium">{label}</label>
      {children}
    </div>
  );
  const Select = ({ field, options }) => (
    <select value={form[field]} onChange={e => handleChange(field, e.target.value)} className="input-dark text-sm">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  const NumberInput = ({ field, min, max, step = 1 }) => (
    <input type="number" value={form[field]} min={min} max={max} step={step}
      onChange={e => handleChange(field, parseFloat(e.target.value))} className="input-dark text-sm" />
  );
  const Toggle = ({ field, label }) => (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div className={`relative w-9 h-5 rounded-full transition-colors ${form[field] ? 'bg-brand-500' : 'bg-surface-500'}`}
           onClick={() => handleChange(field, !form[field])}>
        <motion.div animate={{ x: form[field] ? 16 : 2 }}
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow" />
      </div>
      <span className="text-sm text-gray-400">{label}</span>
    </label>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Form */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="glass p-6 xl:col-span-2 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
              <Brain size={18} className="text-brand-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">ML Prediction Engine</p>
              <p className="text-xs text-gray-500">4-model ensemble · 86%+ F1</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputRow label="Zone"><Select field="zone" options={ZONES} /></InputRow>
            <InputRow label="Shipping Mode"><Select field="shippingMode" options={MODES} /></InputRow>
            <InputRow label="Weather"><Select field="weather" options={WEATHER} /></InputRow>
            <InputRow label="Traffic"><Select field="traffic" options={TRAFFIC} /></InputRow>
            <InputRow label="Promised Days"><NumberInput field="promisedDays" min={1} max={15} /></InputRow>
            <InputRow label="Delivery Attempts"><NumberInput field="deliveryAttempts" min={1} max={5}/></InputRow>
            <InputRow label="Weight (g)"><NumberInput field="weight" min={100} max={30000} step={100}/></InputRow>
            <InputRow label="Price (₹)"><NumberInput field="price" min={50} max={100000} step={50}/></InputRow>
            <InputRow label="Discount %"><NumberInput field="discount" min={0} max={80}/></InputRow>
            <InputRow label="Customer Rating">
              <input type="range" min="1" max="5" step="0.1" value={form.customerRating}
                onChange={e => handleChange('customerRating', parseFloat(e.target.value))}
                className="w-full accent-brand-500" />
              <p className="text-xs text-brand-400 text-right font-bold">{form.customerRating.toFixed(1)} ★</p>
            </InputRow>
            <InputRow label="Warehouse Load %">
              <input type="range" min="10" max="100" value={form.warehouseLoad}
                onChange={e => handleChange('warehouseLoad', parseInt(e.target.value))}
                className="w-full accent-brand-500" />
              <p className="text-xs text-brand-400 text-right font-bold">{form.warehouseLoad}%</p>
            </InputRow>
          </div>

          <div className="flex flex-wrap gap-4">
            <Toggle field="isWeekend" label="Weekend" />
            <Toggle field="isHoliday" label="Holiday" />
            <Toggle field="isSalePeriod" label="Sale Period" />
          </div>

          <button onClick={runPrediction} disabled={predictionLoading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
            {predictionLoading
              ? <><Loader size={16} className="animate-spin" /> Predicting…</>
              : <><Zap size={16} /> Run Prediction</>}
          </button>
        </motion.div>

        {/* Result Panel */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="xl:col-span-3 space-y-4">

          <AnimatePresence mode="wait">
            {predictionLoading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="glass p-10 flex flex-col items-center justify-center gap-4 min-h-48">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-surface-500 border-t-brand-500 animate-spin" />
                  <Brain size={20} className="absolute inset-0 m-auto text-brand-400" />
                </div>
                <p className="text-gray-400 text-sm">Running 4-model ensemble…</p>
              </motion.div>
            )}

            {predictionResult && !predictionLoading && (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="space-y-4">
                {/* Main verdict */}
                <div className={`glass p-6 text-center gradient-border`}
                  style={{ borderColor: predictionResult.delayed ? '#ff6b35' : '#00ff88' }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3
                      ${predictionResult.delayed ? 'bg-red-500/20 border border-red-500/30' : 'bg-green-500/20 border border-green-500/30'}`}>
                    {predictionResult.delayed
                      ? <AlertTriangle size={28} className="text-red-400" />
                      : <CheckCircle size={28} className="text-green-400" />}
                  </motion.div>
                  <h2 className={`text-2xl font-bold mb-1 ${predictionResult.delayed ? 'text-red-400' : 'text-green-400'}`}>
                    {predictionResult.delayed ? '⚠️ Likely Delayed' : '✅ On-Time Expected'}
                  </h2>
                  <p className="text-gray-400 text-sm mb-4">
                    Delay probability: <span className="font-bold text-white">{predictionResult.prob.toFixed(1)}%</span>
                  </p>
                  <GaugeBar value={predictionResult.prob}
                    color={predictionResult.delayed ? '#ff6b35' : '#00ff88'} />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>0% (Safe)</span><span>42% (Threshold)</span><span>100% (High Risk)</span>
                  </div>
                </div>

                {/* Per-model breakdown */}
                <div className="grid grid-cols-2 gap-3">
                  {predictionResult.models.map((m) => (
                    <motion.div key={m.model}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="glass p-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-300">{m.model}</p>
                        <span className={m.delayed ? 'badge-red' : 'badge-green'}>
                          {m.delayed ? 'Delayed' : 'On-Time'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">Confidence</p>
                      <GaugeBar value={m.confidence} color={m.color} />
                      <div className="flex justify-between text-xs mt-1.5">
                        <span style={{ color: m.color }} className="font-bold">{m.confidence.toFixed(1)}%</span>
                        <span className="text-gray-600">F1: {m.f1}%</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {!predictionResult && !predictionLoading && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass p-12 flex flex-col items-center justify-center gap-3 text-center min-h-48">
                <Brain size={40} className="text-gray-700" />
                <p className="text-gray-500 text-sm">Fill in the order details and click<br/><span className="text-brand-400 font-semibold">Run Prediction</span> to see results</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Model Metrics Table */}
          <div className="glass p-5">
            <p className="section-title text-sm">Model Performance Reference</p>
            <table className="w-full text-xs mt-3">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  {['Model','Accuracy','Precision','Recall','F1'].map(h => (
                    <th key={h} className="pb-2 text-gray-600 font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {modelMetrics.map(m => (
                  <tr key={m.model} className={m.model === 'Random Forest' ? 'bg-brand-500/5' : ''}>
                    <td className="py-2.5 font-medium text-gray-300">{m.model}</td>
                    <td className="py-2.5" style={{ color: m.color }}>{m.accuracy}%</td>
                    <td className="py-2.5 text-gray-400">{m.precision}%</td>
                    <td className="py-2.5 text-gray-400">{m.recall}%</td>
                    <td className="py-2.5 font-bold" style={{ color: m.color }}>{m.f1}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
