import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from './store/useAppStore';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Shipments from './pages/Shipments';
import Prediction from './pages/Prediction';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';

const pages = { dashboard: Dashboard, shipments: Shipments, prediction: Prediction, analytics: Analytics, admin: Admin };
const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

export default function App() {
  const activePage = useAppStore(s => s.activePage);
  const PageComponent = pages[activePage] || Dashboard;

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div key={activePage} variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
