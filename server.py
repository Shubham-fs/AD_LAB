import pandas as pd
import joblib
import json
from flask import Flask, request, jsonify, send_from_directory
import os

app = Flask(__name__, static_folder='.')

# Load models and data once
df = pd.read_csv('flipkart_logistics_dataset.csv')
df['order_date'] = pd.to_datetime(df['order_date'])

# Load ML artifacts
model_load_error = None
try:
    lr_model = joblib.load('lr_model.pkl')
    dt_model = joblib.load('dt_model.pkl')
    rf_model = joblib.load('rf_model.pkl')
    gb_model = joblib.load('gb_model.pkl')
    gb_threshold = joblib.load('gb_threshold.pkl')['gb_threshold']
    with open('model_metrics.json', 'r') as f:
        metrics = json.load(f)
except Exception as e:
    model_load_error = str(e)
    print(f"Error loading models: {e}")
    lr_model = dt_model = rf_model = gb_model = None
    metrics = {}

def engineer_features(df_input):
    df_input = df_input.copy()
    # Same logic as app.py/train_models.py
    city_to_state = {'Delhi':'Delhi','Mumbai':'Maharashtra','Bengaluru':'Karnataka','Kolkata':'West Bengal','Hyderabad':'Telangana','Bhopal':'Madhya Pradesh','Chandigarh':'Chandigarh','Pune':'Maharashtra'}
    if 'warehouse_city' in df_input.columns and 'customer_state' in df_input.columns:
        df_input['warehouse_state'] = df_input['warehouse_city'].map(city_to_state)
        df_input['is_interstate'] = (df_input['warehouse_state'] != df_input['customer_state']) * 1
    else: df_input['is_interstate'] = 0
    
    df_input['weight_category'] = pd.cut(df_input['product_weight_g'], bins=[0, 1000, 5000, 100000], labels=['Light', 'Medium', 'Heavy'])
    df_input['value_density'] = df_input['final_price_inr'] / (df_input['product_weight_g'] + 1)
    df_input['is_late_order'] = (df_input['order_hour'] > 14) * 1
    df_input['price_discount_interaction'] = df_input['product_price_inr'] * df_input['discount_percent'] / 100
    df_input['weight_per_price'] = df_input['product_weight_g'] / (df_input['product_price_inr'] + 1)
    df_input['risk_flag'] = (df_input.get('is_holiday',0)*1 + df_input.get('is_weekend',0)*1 + df_input.get('is_sale_period',0)*1 + (df_input['discount_percent']>30)*1)
    df_input['tight_promise'] = (df_input['promised_days'] <= 2)*1
    df_input['multi_attempt'] = (df_input['delivery_attempts'] > 1)*1
    df_input['cross_zone_flag'] = (df_input['same_zone_delivery'] == 0)*1
    df_input['attempts_sq'] = df_input['delivery_attempts'] ** 2
    df_input['promise_bucket'] = pd.cut(df_input['promised_days'], bins=[0,2,5,10,30], labels=[0,1,2,3]).astype(int)
    return df_input

FEATURES = [
    'order_hour', 'order_weekday', 'is_weekend', 'is_holiday', 'is_sale_period',
    'customer_zone', 'customer_tier', 'same_zone_delivery',
    'product_category', 'product_weight_g', 'product_price_inr', 'discount_percent',
    'final_price_inr', 'shipping_mode', 'payment_method', 'promised_days',
    'delivery_attempts', 'return_requested', 'customer_rating',
    'is_interstate', 'warehouse_load', 'weight_category', 'value_density',
    'is_late_order', 'price_discount_interaction', 'weight_per_price', 'risk_flag',
    'tight_promise', 'multi_attempt', 'cross_zone_flag',
    'promise_bucket', 'attempts_sq', 'weather_conditions', 'traffic_conditions', 'warehouse_historical_risk', 'category_historical_risk'
]

@app.route('/')
def index():
    return send_from_directory('.', 'dashboard.html')

@app.route('/api/stats')
def get_stats():
    stats = {
        'total_orders': len(df),
        'on_time_rate': float(1 - df['is_delayed'].mean()),
        'avg_delivery': float(df['actual_days'].mean()),
        'revenue': float(df['final_price_inr'].sum()),
        'metrics': metrics,
        'model_load_error': model_load_error
    }
    return jsonify(stats)

@app.route('/api/shipments')
def get_shipments():
    # Return last 100 shipments
    cols = ['order_id', 'warehouse_city', 'customer_state', 'customer_zone', 'shipping_mode', 'is_delayed', 'actual_days']
    subset = df.head(100)[cols].copy()
    subset['status'] = subset['is_delayed'].apply(lambda x: 'Delayed' if x else 'On-Time')
    return subset.to_json(orient='records')

@app.route('/api/analytics')
def get_analytics():
    # Delay by Zone
    zone_stats = df.groupby('customer_zone')['is_delayed'].mean().to_dict()
    # Delay by Category
    cat_stats = df.groupby('product_category')['is_delayed'].mean().to_dict()
    # On-Time by Zone (count)
    zone_counts = df.groupby(['customer_zone', 'is_delayed']).size().unstack(fill_value=0)
    
    return jsonify({
        'zone_delays': zone_stats,
        'cat_delays': cat_stats,
        'zone_counts': {
            'labels': list(zone_counts.index),
            'on_time': list(zone_counts[0].astype(int)),
            'delayed': list(zone_counts[1].astype(int))
        }
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.json
    # Build raw input
    raw = pd.DataFrame([data])
    
    # Fill in automated features
    warehouse_id = data.get('warehouse_id', 'WH001')
    order_date = pd.to_datetime(data.get('order_date', '2023-11-24'))
    
    wh_load = df[(df['warehouse_id'] == warehouse_id) & (df['order_date'].dt.date == order_date.date())].shape[0]
    if wh_load == 0: wh_load = df[df['warehouse_id'] == warehouse_id].groupby('order_date').size().mean()
    raw['warehouse_load'] = [wh_load]
    
    wh_risk = df.groupby('warehouse_id')['is_delayed'].mean().to_dict()
    cat_risk = df.groupby('product_category')['is_delayed'].mean().to_dict()
    raw['warehouse_historical_risk'] = [wh_risk.get(warehouse_id, 0.4)]
    raw['category_historical_risk'] = [cat_risk.get(data.get('product_category'), 0.4)]
    
    input_df = engineer_features(raw)[FEATURES]
    
    # Get predictions
    if lr_model is None:
        return jsonify({'error': 'Models not loaded', 'details': model_load_error}), 503

    res = {
        'LR': float(lr_model.predict_proba(input_df)[0][1]),
        'DT': float(dt_model.predict_proba(input_df)[0][1]),
        'RF': float(rf_model.predict_proba(input_df)[0][1]),
        'GB': float(gb_model.predict_proba(input_df)[0][1]),
        'GB_Threshold': gb_threshold
    }
    return jsonify(res)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
