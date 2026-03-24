// Mock dataset for Flipkart Logistics Dashboard
import { subDays, format, addDays } from './dateUtils';

const zones = ['North', 'South', 'East', 'West', 'Central'];
const categories = ['Electronics', 'Fashion', 'Grocery', 'Furniture', 'Books', 'Toys', 'Beauty', 'Sports'];
const shippingModes = ['Standard', 'Express', 'Same-Day'];
const statuses = ['On-Time', 'Delayed', 'In-Transit'];
const cities = {
  North: ['Delhi', 'Chandigarh', 'Jaipur', 'Lucknow'],
  South: ['Bangalore', 'Chennai', 'Hyderabad', 'Kochi'],
  East: ['Kolkata', 'Bhubaneswar', 'Patna', 'Guwahati'],
  West: ['Mumbai', 'Pune', 'Ahmedabad', 'Surat'],
  Central: ['Bhopal', 'Nagpur', 'Raipur', 'Indore'],
};
const warehouses = ['WH-BLR-01', 'WH-DEL-02', 'WH-MUM-03', 'WH-HYD-04', 'WH-KOL-05'];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Shipments ────────────────────────────────────────────────────────────────
export const shipments = Array.from({ length: 200 }, (_, i) => {
  const zone = pick(zones);
  const srcZone = pick(zones);
  const status = Math.random() < 0.42 ? 'Delayed' : Math.random() < 0.15 ? 'In-Transit' : 'On-Time';
  const promised = rand(1, 7);
  const actual = status === 'Delayed' ? promised + rand(1, 5) : status === 'On-Time' ? promised : promised;
  const orderDate = subDays(new Date(), rand(0, 60));
  return {
    id: `FK${String(100000 + i).slice(1)}`,
    orderDate: format(orderDate),
    expectedDate: format(addDays(orderDate, promised)),
    actualDate: status !== 'In-Transit' ? format(addDays(orderDate, actual)) : null,
    source: pick(cities[srcZone]),
    destination: pick(cities[zone]),
    zone,
    warehouse: pick(warehouses),
    category: pick(categories),
    shippingMode: pick(shippingModes),
    status,
    delayDays: status === 'Delayed' ? actual - promised : 0,
    weight: rand(100, 20000),
    price: rand(200, 50000),
  };
});

// ── KPI Metrics ──────────────────────────────────────────────────────────────
const totalOrders = 15000;
const delayedCount = Math.round(totalOrders * 0.418);
const onTimeCount = totalOrders - delayedCount;
export const kpiMetrics = {
  totalOrders,
  onTime: onTimeCount,
  delayed: delayedCount,
  avgDeliveryDays: 3.7,
  delayRate: ((delayedCount / totalOrders) * 100).toFixed(1),
  onTimeRate: ((onTimeCount / totalOrders) * 100).toFixed(1),
  avgDelayDays: 2.4,
  totalWarehouses: 12,
};

// ── Trend Data (last 30 days) ─────────────────────────────────────────────
export const trendData = Array.from({ length: 30 }, (_, i) => {
  const d = subDays(new Date(), 29 - i);
  const orders = rand(380, 620);
  const delayed = Math.round(orders * (0.35 + Math.random() * 0.15));
  return {
    date: format(d, 'MMM dd'),
    orders,
    delayed,
    onTime: orders - delayed,
  };
});

// ── Region / Zone Delays ─────────────────────────────────────────────────
export const zoneData = zones.map(zone => ({
  zone,
  orders: rand(2500, 4500),
  delayed: rand(800, 1800),
  onTime: rand(1800, 2800),
  avgDelay: (Math.random() * 3 + 0.5).toFixed(1),
}));

// ── Warehouse Performance ─────────────────────────────────────────────────
export const warehouseData = warehouses.map(wh => ({
  warehouse: wh,
  ordersHandled: rand(800, 2500),
  onTimeRate: rand(65, 95),
  avgProcessingTime: (Math.random() * 2 + 0.5).toFixed(1),
  delayRate: rand(8, 38),
}));

// ── Category Breakdown ───────────────────────────────────────────────────
export const categoryData = categories.map(cat => ({
  category: cat,
  orders: rand(500, 3000),
  delayRate: rand(20, 55),
  avgDays: (Math.random() * 4 + 1).toFixed(1),
}));

// ── Weekly Heatmap (zone × day) ──────────────────────────────────────────
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const heatmapData = zones.flatMap(zone =>
  days.map(day => ({
    zone,
    day,
    value: rand(5, 45),
  }))
);

// ── Route Analysis ───────────────────────────────────────────────────────
export const routeData = [
  { route: 'Delhi → Mumbai', orders: 1240, delayPct: 47, avgDelay: 2.8 },
  { route: 'Bangalore → Delhi', orders: 980, delayPct: 42, avgDelay: 3.1 },
  { route: 'Mumbai → Kolkata', orders: 870, delayPct: 39, avgDelay: 2.6 },
  { route: 'Chennai → Pune', orders: 760, delayPct: 36, avgDelay: 1.9 },
  { route: 'Hyderabad → Jaipur', orders: 650, delayPct: 33, avgDelay: 2.2 },
  { route: 'Kolkata → Bhopal', orders: 590, delayPct: 31, avgDelay: 2.0 },
  { route: 'Pune → Chennai', orders: 520, delayPct: 29, avgDelay: 1.7 },
  { route: 'Ahmedabad → Delhi', orders: 480, delayPct: 28, avgDelay: 2.4 },
];

// ── Model Metrics ────────────────────────────────────────────────────────
export const modelMetrics = [
  { model: 'Logistic Regression', accuracy: 85.2, precision: 85.3, recall: 78.0, f1: 81.5, color: '#00d4ff' },
  { model: 'Decision Tree',       accuracy: 81.3, precision: 79.0, recall: 75.2, f1: 77.1, color: '#a855f7' },
  { model: 'Random Forest',       accuracy: 88.8, precision: 88.9, recall: 83.6, f1: 86.2, color: '#00ff88' },
  { model: 'Gradient Boosting',   accuracy: 87.2, precision: 85.6, recall: 83.2, f1: 84.4, color: '#f97316' },
];
