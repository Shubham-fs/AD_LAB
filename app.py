import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import joblib
import json
import os

st.set_page_config(page_title="Flipkart Logistics Analysis", page_icon="📦", layout="wide")

@st.cache_data
def load_data():
    df = pd.read_csv('flipkart_logistics_dataset.csv')
    df['order_date'] = pd.to_datetime(df['order_date'])
    return df

@st.cache_resource
def load_models():
    if os.path.exists('lr_model.pkl'):
        lr = joblib.load('lr_model.pkl')
        dt = joblib.load('dt_model.pkl')
        rf = joblib.load('rf_model.pkl')
        gb = joblib.load('gb_model.pkl') if os.path.exists('gb_model.pkl') else None
        gb_thresh_data = joblib.load('gb_threshold.pkl') if os.path.exists('gb_threshold.pkl') else {'gb_threshold': 0.5}
        with open('model_metrics.json') as f:
            metrics = json.load(f)
        return lr, dt, rf, gb, gb_thresh_data['gb_threshold'], metrics
    return None, None, None, None, 0.5, None


def engineer_features(df):
    """Mirror the same feature engineering used in training."""
    df = df.copy()
    
    # 1. Route Efficiency: is_interstate
    city_to_state = {
        'Delhi': 'Delhi', 'Mumbai': 'Maharashtra', 'Bengaluru': 'Karnataka',
        'Kolkata': 'West Bengal', 'Hyderabad': 'Telangana', 'Bhopal': 'Madhya Pradesh',
        'Chandigarh': 'Chandigarh', 'Pune': 'Maharashtra'
    }
    # warehouse_city and customer_state must be present
    if 'warehouse_city' in df.columns and 'customer_state' in df.columns:
        df['warehouse_state'] = df['warehouse_city'].map(city_to_state)
        df['is_interstate'] = (df['warehouse_state'] != df['customer_state']) * 1
    else:
        df['is_interstate'] = 0

    # 2. Warehouse Load
    # (In app.py, load is passed in as a pre-calculated value or mocked if missing)
    if 'warehouse_load' not in df.columns:
        df['warehouse_load'] = 50 # Default/Median

    # 3. Package Complexity
    df['weight_category'] = pd.cut(
        df['product_weight_g'], bins=[0, 1000, 5000, 100000],
        labels=['Light', 'Medium', 'Heavy']
    )

    # 4. Value Density
    df['value_density'] = df['final_price_inr'] / (df['product_weight_g'] + 1)

    # 5. Operational Timing
    df['is_late_order'] = (df['order_hour'] > 14) * 1

    # Original engineered
    df['price_discount_interaction'] = df['product_price_inr'] * df['discount_percent'] / 100
    df['weight_per_price'] = df['product_weight_g'] / (df['product_price_inr'] + 1)
    df['risk_flag'] = (df['is_holiday'] * 1 +
                       df['is_weekend'] * 1 +
                       df['is_sale_period'] * 1 +
                       (df['discount_percent'] > 30) * 1)
    df['tight_promise'] = (df['promised_days'] <= 2) * 1
    df['multi_attempt'] = (df['delivery_attempts'] > 1) * 1
    df['cross_zone_flag'] = (df['same_zone_delivery'] == 0) * 1
    df['attempts_sq'] = df['delivery_attempts'] ** 2
    df['promise_bucket'] = pd.cut(
        df['promised_days'], bins=[0,2,5,10,30], labels=[0,1,2,3]
    ).astype(int)
    
    return df

# Updated FEATURES list to match train_models.py
FEATURES = [
    'order_hour', 'order_weekday', 'is_weekend', 'is_holiday', 'is_sale_period',
    'customer_zone', 'customer_tier', 'same_zone_delivery',
    'product_category', 'product_weight_g', 'product_price_inr', 'discount_percent',
    'final_price_inr', 'shipping_mode', 'payment_method', 'promised_days',
    'delivery_attempts', 'return_requested', 'customer_rating',
    'is_interstate', 'warehouse_load', 'weight_category', 'value_density',
    'is_late_order',
    'price_discount_interaction', 'weight_per_price', 'risk_flag',
    'tight_promise', 'multi_attempt', 'cross_zone_flag',
    'promise_bucket', 'attempts_sq',
    'warehouse_historical_risk', 'category_historical_risk'
]


def main():
    st.sidebar.title("📦 Navigation")
    pages = ["Overview & EDA", "Temporal & Efficiency Analysis", "Delay Prediction Models"]
    selection = st.sidebar.radio("Go to", pages)

    df = load_data()
    lr_model, dt_model, rf_model, gb_model, gb_threshold, metrics = load_models()

    # ------------------------------------------------------------------ #
    #  PAGE 1 – Overview & EDA
    # ------------------------------------------------------------------ #
    if selection == "Overview & EDA":
        st.title("📊 Flipkart Logistics Management Overview")
        st.markdown("This dashboard provides an in-depth analysis of Flipkart's delivery performance.")

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Orders", f"{len(df):,}")
        with col2:
            delayed_pct = df['is_delayed'].mean() * 100
            st.metric("Delayed Orders", f"{delayed_pct:.1f}%")
        with col3:
            avg_delay = df[df['is_delayed'] == 1]['delay_days'].mean()
            st.metric("Avg Delay (Days)", f"{avg_delay:.1f}")
        with col4:
            st.metric("Total Warehouses", df['warehouse_id'].nunique())

        st.markdown("---")
        st.subheader("1️⃣ Delivery Delay Analysis")

        c1, c2 = st.columns(2)
        with c1:
            fig1 = px.pie(df, names='is_delayed',
                          title='On-Time Vs Delayed Deliveries (0=On Time, 1=Delayed)',
                          color_discrete_sequence=['#2E86C1', '#E74C3C'], hole=0.4)
            st.plotly_chart(fig1, use_container_width=True)

        with c2:
            delay_cats = df['delay_category'].value_counts().reset_index()
            delay_cats.columns = ['delay_category', 'count']
            fig2 = px.bar(delay_cats, x='delay_category', y='count',
                          title='Delay Categories Distribution', color='delay_category')
            st.plotly_chart(fig2, use_container_width=True)

        st.markdown("### Delay Distribution")
        fig3 = px.histogram(df[df['is_delayed'] == 1], x='delay_days', nbins=20,
                            title='Distribution of Delay Days',
                            color_discrete_sequence=['indianred'])
        st.plotly_chart(fig3, use_container_width=True)

    # ------------------------------------------------------------------ #
    #  PAGE 2 – Temporal & Efficiency Analysis
    # ------------------------------------------------------------------ #
    elif selection == "Temporal & Efficiency Analysis":
        st.title("⏱️ Temporal & Efficiency Analysis")

        st.subheader("2️⃣ Temporal Analysis: When do delays happen?")

        c1, c2 = st.columns(2)
        with c1:
            weekend_delay = df.groupby('is_weekend')['is_delayed'].mean().reset_index()
            weekend_delay['is_weekend'] = weekend_delay['is_weekend'].map({0: 'Weekday', 1: 'Weekend'})
            fig4 = px.bar(weekend_delay, x='is_weekend', y='is_delayed',
                          title='Delay Rate: Weekday vs Weekend',
                          text_auto='.1%', color='is_weekend',
                          color_discrete_sequence=['#5DADE2', '#F4D03F'])
            st.plotly_chart(fig4, use_container_width=True)

        with c2:
            sale_delay = df.groupby('is_sale_period')['is_delayed'].mean().reset_index()
            sale_delay['is_sale_period'] = sale_delay['is_sale_period'].map(
                {0: 'Regular Period', 1: 'Sale Period'})
            fig5 = px.bar(sale_delay, x='is_sale_period', y='is_delayed',
                          title='Delay Rate: Regular vs Sale Period',
                          text_auto='.1%', color='is_sale_period',
                          color_discrete_sequence=['#48C9B0', '#E67E22'])
            st.plotly_chart(fig5, use_container_width=True)

        st.markdown("---")
        st.subheader("3️⃣ Delivery Efficiency Analysis")

        fig6 = px.scatter(df, x='promised_days', y='actual_days', color='is_delayed',
                          title='Promised vs Actual Delivery Days', opacity=0.5,
                          trendline="ols")
        fig6.add_trace(go.Scatter(
            x=[0, df['promised_days'].max()], y=[0, df['promised_days'].max()],
            mode='lines', name='Perfect Efficiency (Actual = Promised)',
            line=dict(color='black', dash='dash')))
        st.plotly_chart(fig6, use_container_width=True)

        st.write("> **Analysis Interpretations:**")
        st.write("* Points exactly on the dashed line mean Actual = Promised (Efficient).")
        st.write("* Points above the line represent delayed orders (Actual > Promised).")
        st.write("* Points below the line are early deliveries.")

    # ------------------------------------------------------------------ #
    #  PAGE 3 – Delay Prediction Models
    # ------------------------------------------------------------------ #
    elif selection == "Delay Prediction Models":
        st.title("🤖 Predict Delivery Delays")

        if lr_model is None:
            st.warning("Models not found. Please run `python train_models.py` first.")
            return

        st.markdown("""
        ### Enter Order Details to Predict Delay Probability
        We use features available **at the time of the order** to prevent data leakage.
        Models available: Logistic Regression, Decision Tree, Random Forest, **Gradient Boosting**.
        """)

        with st.form("prediction_form"):
            c1, c2, c3 = st.columns(3)
            with c1:
                order_date = st.date_input("Order Date", value=pd.to_datetime('2023-11-24'))
                order_hour = st.number_input("Order Hour (0-23)", min_value=0, max_value=23, value=14)
                order_weekday = order_date.strftime('%A')
                st.write(f"Weekday: **{order_weekday}**")
                
                is_weekend = 1 if order_weekday in ['Saturday', 'Sunday'] else 0
                is_holiday = st.selectbox("Is Holiday?", [0, 1])
                is_sale_period = st.selectbox("Is Sale Period?", [0, 1])
                promised_days = st.number_input("Promised Delivery Days", min_value=1, max_value=30, value=3)
                delivery_attempts = st.number_input("Delivery Attempts", min_value=1, max_value=10, value=1)
                
            with c2:
                warehouse_id = st.selectbox("Warehouse ID", sorted(df['warehouse_id'].unique()))
                wh_city = df[df['warehouse_id'] == warehouse_id]['warehouse_city'].iloc[0]
                st.write(f"Warehouse City: **{wh_city}**")
                
                customer_state = st.selectbox("Customer State", sorted(df['customer_state'].unique()))
                customer_zone = st.selectbox("Customer Zone", ['North', 'South', 'East', 'West', 'Central'])
                customer_tier = st.selectbox("Customer Tier", ['Tier1', 'Tier2', 'Tier3'])
                same_zone_delivery = st.selectbox("Same Zone Delivery?", [0, 1])
                shipping_mode = st.selectbox("Shipping Mode", ['Standard', 'Express', 'Same-Day'])

            with c3:
                product_category = st.selectbox("Product Category",
                    ['Electronics', 'Books', 'Furniture', 'Fashion', 'Toys',
                     'Automotive', 'Beauty', 'Home & Kitchen', 'Sports', 'Grocery'])
                product_weight_g = st.number_input("Weight (grams)", min_value=10, max_value=50000, value=1500)
                product_price_inr = st.number_input("Original Price (INR)", min_value=10, max_value=200000, value=2500)
                discount_percent = st.number_input("Discount Percent", min_value=0, max_value=100, value=10)
                final_price_inr = product_price_inr * (1 - (discount_percent / 100))
                st.write(f"**Calculated Final Price:** ₹{final_price_inr:.2f}")
                customer_rating = st.slider("Customer Historical Rating", 1.0, 5.0, 3.5, 0.1)
                return_requested = 0

            submit = st.form_submit_button("🔮 Predict")

        if submit:
            # Build raw input
            raw_input = pd.DataFrame({
                'order_hour': [order_hour], 'order_weekday': [order_weekday],
                'is_weekend': [is_weekend], 'is_holiday': [is_holiday],
                'is_sale_period': [is_sale_period], 'customer_zone': [customer_zone],
                'customer_tier': [customer_tier], 'same_zone_delivery': [same_zone_delivery],
                'product_category': [product_category], 'product_weight_g': [product_weight_g],
                'product_price_inr': [product_price_inr], 'discount_percent': [discount_percent],
                'final_price_inr': [final_price_inr], 'shipping_mode': [shipping_mode],
                'payment_method': ['UPI'], 'promised_days': [promised_days],
                'delivery_attempts': [delivery_attempts], 'return_requested': [return_requested],
                'customer_rating': [customer_rating],
                'warehouse_id': [warehouse_id], 'warehouse_city': [wh_city],
                'customer_state': [customer_state], 'order_date': [str(order_date)]
            })

            # Calculate Aggregate features (Load & Historical Risk) from the dataset
            # To avoid complexity, we'll use pre-calculated or dataset-wide means
            wh_load = df[(df['warehouse_id'] == warehouse_id) & (df['order_date'].dt.date == order_date)].shape[0]
            if wh_load == 0: wh_load = df[df['warehouse_id'] == warehouse_id].groupby('order_date').size().mean()
            raw_input['warehouse_load'] = [wh_load]
            
            wh_risk = df.groupby('warehouse_id')['is_delayed'].mean().to_dict()
            cat_risk = df.groupby('product_category')['is_delayed'].mean().to_dict()
            raw_input['warehouse_historical_risk'] = [wh_risk.get(warehouse_id, 0.4)]
            raw_input['category_historical_risk'] = [cat_risk.get(product_category, 0.4)]

            input_data = engineer_features(raw_input)[FEATURES]

            st.markdown("### 🎯 Prediction Results")
            cols = st.columns(4)

            # LR
            lr_pred = lr_model.predict(input_data)[0]
            lr_prob = lr_model.predict_proba(input_data)[0][1]
            cols[0].metric("Logistic Regression",
                           "🔴 Delayed" if lr_pred == 1 else "🟢 On Time",
                           f"Prob: {lr_prob*100:.1f}%")

            # DT
            dt_pred = dt_model.predict(input_data)[0]
            dt_prob = dt_model.predict_proba(input_data)[0][1]
            cols[1].metric("Decision Tree",
                           "🔴 Delayed" if dt_pred == 1 else "🟢 On Time",
                           f"Prob: {dt_prob*100:.1f}%")

            # RF
            rf_pred = rf_model.predict(input_data)[0]
            rf_prob = rf_model.predict_proba(input_data)[0][1]
            cols[2].metric("Random Forest",
                           "🔴 Delayed" if rf_pred == 1 else "🟢 On Time",
                           f"Prob: {rf_prob*100:.1f}%")

            # GB (best model, with threshold)
            if gb_model is not None:
                gb_prob = gb_model.predict_proba(input_data)[0][1]
                gb_pred = int(gb_prob >= gb_threshold)
                cols[3].metric("⭐ Gradient Boosting",
                               "🔴 Delayed" if gb_pred == 1 else "🟢 On Time",
                               f"Prob: {gb_prob*100:.1f}%")




if __name__ == '__main__':
    main()
