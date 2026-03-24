import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, RefreshCw, CheckCircle, Cpu, Database, FileText, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { modelMetrics } from '../data/mockData';

export default function Admin() {
  const { role, retraining, setRetraining, uploadProgress, setUploadProgress } = useAppStore();
  const fileRef = useRef();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadDone, setUploadDone] = useState(false);
  const [retrainLog, setRetrainLog] = useState([]);
  const [retrainDone, setRetrainDone] = useState(false);

  if (role !== 'admin') {
    return (
      <div className="glass p-12 flex flex-col items-center justify-center gap-4 text-center">
        <AlertCircle size={48} className="text-red-400" />
        <h2 className="text-xl font-bold text-white">Admin Access Only</h2>
        <p className="text-gray-500">Switch to Admin role in the sidebar to access this panel.</p>
      </div>
    );
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setUploadDone(false);
    setUploadProgress(0);
    let prog = 0;
    const iv = setInterval(() => {
      prog += Math.random() * 15 + 5;
      if (prog >= 100) { prog = 100; clearInterval(iv); setUploadDone(true); }
      setUploadProgress(Math.round(prog));
    }, 200);
  }

  function handleRetrain() {
    setRetraining(true);
    setRetrainDone(false);
    setRetrainLog([]);
    const steps = [
      '✅ Loading dataset…',
      '✅ Preprocessing features…',
      '✅ Training Logistic Regression…',
      '✅ Training Decision Tree…',
      '✅ Training Random Forest…',
      '✅ Training Gradient Boosting…',
      '✅ Tuning prediction threshold…',
      '✅ Saving model artifacts…',
      '🎉 Retraining complete! Best model: Random Forest (F1: 86.18%)',
    ];
    steps.forEach((s, i) => {
      setTimeout(() => {
        setRetrainLog(l => [...l, s]);
        if (i === steps.length - 1) { setRetraining(false); setRetrainDone(true); }
      }, (i + 1) * 700);
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Dataset */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <Database size={17} className="text-blue-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Upload Dataset</p>
              <p className="text-xs text-gray-500">Replace training data (CSV)</p>
            </div>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-brand-500/40 hover:bg-brand-500/5 transition-all">
            <Upload size={32} className={uploadDone ? 'text-green-400' : 'text-gray-600'} />
            {uploadedFile
              ? <p className="text-sm text-gray-300 font-medium">{uploadedFile.name}</p>
              : <p className="text-sm text-gray-500">Drop your CSV here or <span className="text-brand-400">browse</span></p>}
            <p className="text-xs text-gray-600">Supported: .csv files up to 50MB</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />

          <AnimatePresence>
            {uploadedFile && !uploadDone && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Uploading…</span><span>{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-surface-600 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${uploadProgress}%` }} transition={{ duration: 0.1 }} />
                </div>
              </motion.div>
            )}
            {uploadDone && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mt-4 flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle size={16} />
                <span className="font-medium">Upload successful — ready to retrain</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Retrain */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
              <Cpu size={17} className="text-brand-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Model Retraining</p>
              <p className="text-xs text-gray-500">Trigger ML pipeline</p>
            </div>
          </div>

          <button onClick={handleRetrain} disabled={retraining}
            className="btn-primary w-full flex items-center justify-center gap-2 mb-4">
            <RefreshCw size={15} className={retraining ? 'animate-spin' : ''} />
            {retraining ? 'Training in progress…' : 'Retrain All Models'}
          </button>

          <div className="bg-surface-900 rounded-xl p-4 font-mono text-xs min-h-32 space-y-1 border border-white/5">
            {retrainLog.length === 0
              ? <p className="text-gray-700">$ Waiting for retrain trigger…</p>
              : retrainLog.map((line, i) => (
                <motion.p key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                  className={line.startsWith('🎉') ? 'text-green-400 font-bold' : 'text-gray-400'}>
                  {line}
                </motion.p>
              ))}
            {retraining && <span className="text-brand-400 animate-pulse">█</span>}
          </div>

          {retrainDone && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mt-3 flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle size={16} />
              <span className="font-medium">Models updated successfully</span>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Model Status Cards */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-brand-400" />
          <p className="section-title text-sm !mb-0">Deployed Model Status</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {modelMetrics.map((m) => (
            <div key={m.model} className="rounded-xl p-4 border transition-all hover:border-white/20"
              style={{ background: `${m.color}08`, borderColor: `${m.color}20` }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-300">{m.model}</p>
                <span className="badge-green">Active</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {[['Accuracy', m.accuracy], ['F1-Score', m.f1], ['Precision', m.precision], ['Recall', m.recall]].map(([k,v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-600">{k}</span>
                    <span className="font-bold" style={{ color: m.color }}>{v}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
