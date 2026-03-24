import pandas as pd
import numpy as np
import joblib
import json
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import warnings
warnings.filterwarnings('ignore')


def engineer_features(df):
    """
    Add derived features to improve model signal.

    Derived features:
    - Route Efficiency (is_interstate)
    - Warehouse Load (orders per wh per day)
    - Package Complexity (weight_category)
    - Value Density (price per gram)
    - Operational Timing (is_late_order > 2pm)
    """
    df = df.copy()

    # 1. Route Efficiency: is_interstate
    city_to_state = {
        'Delhi': 'Delhi', 'Mumbai': 'Maharashtra', 'Bengaluru': 'Karnataka',
        'Kolkata': 'West Bengal', 'Hyderabad': 'Telangana', 'Bhopal': 'Madhya Pradesh',
        'Chandigarh': 'Chandigarh', 'Pune': 'Maharashtra'
    }
    df['warehouse_state'] = df['warehouse_city'].map(city_to_state)
    df['is_interstate'] = (df['warehouse_state'] != df['customer_state']) * 1

    # 2. Warehouse Load (Orders per warehouse per day)
    df['warehouse_load'] = df.groupby(['warehouse_id', 'order_date'])['order_id'].transform('count')

    # 3. Package Complexity: weight_category
    df['weight_category'] = pd.cut(
        df['product_weight_g'], bins=[0, 1000, 5000, 100000],
        labels=['Light', 'Medium', 'Heavy']
    )

    # 4. Value Density
    df['value_density'] = df['final_price_inr'] / (df['product_weight_g'] + 1)

    # 5. Operational Timing: is_late_order (After 2:00 PM)
    df['is_late_order'] = (df['order_hour'] > 14) * 1

    # Original features
    # Price sensitivity: heavy discounts on expensive items may cause delays
    df['price_discount_interaction'] = df['product_price_inr'] * df['discount_percent'] / 100
    # Weight-to-price ratio: heavier cheap items are harder to prioritise
    df['weight_per_price'] = df['product_weight_g'] / (df['product_price_inr'] + 1)
    # Cumulative risk flag (holiday + weekend + sale + big discount)
    df['risk_flag'] = (df['is_holiday'] * 1 +
                       df['is_weekend'] * 1 +
                       df['is_sale_period'] * 1 +
                       (df['discount_percent'] > 30) * 1)
    # Aggressive promise window
    df['tight_promise'] = (df['promised_days'] <= 2) * 1
    # Multiple delivery attempts = harder delivery
    df['multi_attempt'] = (df['delivery_attempts'] > 1) * 1
    df['attempts_sq'] = df['delivery_attempts'] ** 2
    # Cross-zone delivery penalty
    df['cross_zone_flag'] = (df['same_zone_delivery'] == 0) * 1
    # Promised days bucket
    df['promise_bucket'] = pd.cut(
        df['promised_days'], bins=[0, 2, 5, 10, 30], labels=[0, 1, 2, 3]
    ).astype(int)
    return df


def main():
    print("Loading dataset...")
    df = pd.read_csv('flipkart_logistics_dataset.csv')
    df = engineer_features(df)

    # ------------------------------------------------------------------
    # Feature set refinement
    # ------------------------------------------------------------------
    features = [
        'order_hour', 'order_weekday', 'is_weekend', 'is_holiday', 'is_sale_period',
        'customer_zone', 'customer_tier', 'same_zone_delivery',
        'product_category', 'product_weight_g', 'product_price_inr', 'discount_percent',
        'final_price_inr', 'shipping_mode', 'payment_method', 'promised_days',
        'delivery_attempts', 'return_requested', 'customer_rating',
        # New features
        'is_interstate', 'warehouse_load', 'weight_category', 'value_density',
        'is_late_order',
        # Original engineered
        'price_discount_interaction', 'weight_per_price', 'risk_flag',
        'tight_promise', 'multi_attempt', 'cross_zone_flag',
        'promise_bucket', 'attempts_sq', 'weather_conditions', 'traffic_conditions'
    ]
    target = 'is_delayed'

    # Drop any rows with NaN in features we just created
    df = df.dropna(subset=features + [target])

    X = df[features + ['warehouse_id']]  # Keep wh_id for risk calculation
    y = df[target]

    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 6. Historical Risk Calculation (Leakage-safe)
    print("Calculating historical risk factors...")
    wh_risk = X_train_raw.assign(y=y_train).groupby('warehouse_id')['y'].mean().to_dict()
    cat_risk = X_train_raw.assign(y=y_train).groupby('product_category')['y'].mean().to_dict()
    global_mean = y_train.mean()

    for d in [X_train_raw, X_test_raw]:
        d['warehouse_historical_risk'] = d['warehouse_id'].map(wh_risk).fillna(global_mean)
        d['category_historical_risk'] = d['product_category'].map(cat_risk).fillna(global_mean)

    # Final feature list for models
    final_features = features + ['warehouse_historical_risk', 'category_historical_risk']
    
    X_train = X_train_raw[final_features]
    X_test = X_test_raw[final_features]

    categorical_features = ['order_weekday', 'customer_zone', 'customer_tier',
                            'product_category', 'shipping_mode', 'payment_method',
                            'weight_category', 'weather_conditions', 'traffic_conditions']
    numerical_features = [f for f in final_features if f not in categorical_features]

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numerical_features),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_features)
        ],
        remainder='passthrough'
    )

    evaluation_metrics = {}

    # ------------------------------------------------------------------
    # 1. Logistic Regression
    # ------------------------------------------------------------------
    print("Training Logistic Regression...")
    lr_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', LogisticRegression(
            max_iter=2000, random_state=42,
            class_weight='balanced', C=0.5, solver='lbfgs'
        ))
    ])
    lr_pipeline.fit(X_train, y_train)
    y_pred_lr = lr_pipeline.predict(X_test)
    evaluation_metrics['Logistic Regression'] = {
        'Accuracy':  round(float(accuracy_score(y_test, y_pred_lr)), 4),
        'Precision': round(float(precision_score(y_test, y_pred_lr, zero_division=0)), 4),
        'Recall':    round(float(recall_score(y_test, y_pred_lr, zero_division=0)), 4),
        'F1-Score':  round(float(f1_score(y_test, y_pred_lr, zero_division=0)), 4),
        'Confusion Matrix': confusion_matrix(y_test, y_pred_lr).tolist()
    }
    print(f"  LR  F1: {evaluation_metrics['Logistic Regression']['F1-Score']}")

    # ------------------------------------------------------------------
    # 2. Decision Tree
    # ------------------------------------------------------------------
    print("Training Decision Tree...")
    dt_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', DecisionTreeClassifier(
            max_depth=15, min_samples_split=20, min_samples_leaf=10,
            class_weight='balanced', random_state=42
        ))
    ])
    dt_pipeline.fit(X_train, y_train)
    y_pred_dt = dt_pipeline.predict(X_test)
    evaluation_metrics['Decision Tree'] = {
        'Accuracy':  round(float(accuracy_score(y_test, y_pred_dt)), 4),
        'Precision': round(float(precision_score(y_test, y_pred_dt, zero_division=0)), 4),
        'Recall':    round(float(recall_score(y_test, y_pred_dt, zero_division=0)), 4),
        'F1-Score':  round(float(f1_score(y_test, y_pred_dt, zero_division=0)), 4),
        'Confusion Matrix': confusion_matrix(y_test, y_pred_dt).tolist()
    }
    print(f"  DT  F1: {evaluation_metrics['Decision Tree']['F1-Score']}")

    # ------------------------------------------------------------------
    # 3. Random Forest
    # ------------------------------------------------------------------
    print("Training Random Forest...")
    rf_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(
            n_estimators=300, max_depth=20, min_samples_split=10, min_samples_leaf=5,
            max_features='sqrt', class_weight='balanced_subsample',
            random_state=42, n_jobs=-1
        ))
    ])
    rf_pipeline.fit(X_train, y_train)
    y_pred_rf = rf_pipeline.predict(X_test)
    evaluation_metrics['Random Forest'] = {
        'Accuracy':  round(float(accuracy_score(y_test, y_pred_rf)), 4),
        'Precision': round(float(precision_score(y_test, y_pred_rf, zero_division=0)), 4),
        'Recall':    round(float(recall_score(y_test, y_pred_rf, zero_division=0)), 4),
        'F1-Score':  round(float(f1_score(y_test, y_pred_rf, zero_division=0)), 4),
        'Confusion Matrix': confusion_matrix(y_test, y_pred_rf).tolist()
    }
    print(f"  RF  F1: {evaluation_metrics['Random Forest']['F1-Score']}")

    # ------------------------------------------------------------------
    # 4. Gradient Boosting  (best model) — with threshold tuning
    # ------------------------------------------------------------------
    print("Training Gradient Boosting (best model)...")
    gb_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', GradientBoostingClassifier(
            n_estimators=400, max_depth=5, learning_rate=0.08,
            subsample=0.8, min_samples_split=20, min_samples_leaf=8,
            random_state=42
        ))
    ])
    gb_pipeline.fit(X_train, y_train)

    # Threshold tuning on training probabilities
    y_proba_gb_train = gb_pipeline.predict_proba(X_train)[:, 1]
    best_thresh, best_f1 = 0.5, 0.0
    for thresh in np.arange(0.25, 0.75, 0.01):
        preds = (y_proba_gb_train >= thresh).astype(int)
        f = f1_score(y_train, preds, zero_division=0)
        if f > best_f1:
            best_f1, best_thresh = f, thresh
    print(f"  GB optimal threshold: {best_thresh:.2f}")

    y_proba_gb = gb_pipeline.predict_proba(X_test)[:, 1]
    y_pred_gb  = (y_proba_gb >= best_thresh).astype(int)

    evaluation_metrics['Gradient Boosting'] = {
        'Accuracy':  round(float(accuracy_score(y_test, y_pred_gb)), 4),
        'Precision': round(float(precision_score(y_test, y_pred_gb, zero_division=0)), 4),
        'Recall':    round(float(recall_score(y_test, y_pred_gb, zero_division=0)), 4),
        'F1-Score':  round(float(f1_score(y_test, y_pred_gb, zero_division=0)), 4),
        'Optimal Threshold': round(float(best_thresh), 2),
        'Confusion Matrix': confusion_matrix(y_test, y_pred_gb).tolist()
    }
    print(f"  GB  F1: {evaluation_metrics['Gradient Boosting']['F1-Score']}  "
          f"(threshold={best_thresh:.2f})")

    # ------------------------------------------------------------------
    # Save models and metadata
    # ------------------------------------------------------------------
    print("Saving models...")
    joblib.dump(lr_pipeline, 'lr_model.pkl')
    joblib.dump(dt_pipeline, 'dt_model.pkl')
    joblib.dump(rf_pipeline, 'rf_model.pkl')
    joblib.dump(gb_pipeline, 'gb_model.pkl')
    joblib.dump({'gb_threshold': float(best_thresh)}, 'gb_threshold.pkl')

    with open('model_metrics.json', 'w') as f:
        json.dump(evaluation_metrics, f, indent=4)

    print("\n=== Final Metrics ===")
    for model, metrics in evaluation_metrics.items():
        print(f"{model:22s}: Acc={metrics['Accuracy']:.4f}  "
              f"Prec={metrics['Precision']:.4f}  "
              f"Rec={metrics['Recall']:.4f}  "
              f"F1={metrics['F1-Score']:.4f}")
    print("\nTraining complete!")


if __name__ == '__main__':
    main()
