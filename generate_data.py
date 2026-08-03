import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# 1. Setup Date Range (365 Days)
start_date = datetime(2025, 8, 1)
dates = [start_date + timedelta(days=i) for i in range(365)]

data = []

# Packaging Weight Definitions (in kg)
WEIGHT_5KG = 5
WEIGHT_35KG = 35
WEIGHT_40KG = 40
WEIGHT_50KG = 50
WEIGHT_70KG = 70

holy_week_dates = {
    "2025": [datetime(2025, 4, 17) + timedelta(days=i) for i in range(4)],
    "2026": [datetime(2026, 4, 2) + timedelta(days=i) for i in range(4)]
}

for d in dates:
    day_name = d.strftime("%A")
    month = d.month
    day_of_month = d.day
    year_str = str(d.year)
    
    # Baseline daily demand in KILOGRAMS (~3,500 kg normal weekday baseline)
    base_demand_kg = 3500 
    
    # 1. Day of Week Multiplier
    dow_multiplier = 1.0
    if day_name in ["Friday", "Saturday"]:
        dow_multiplier = 1.45
    elif day_name == "Sunday":
        dow_multiplier = 1.25
        
    # 2. Temperature Multiplier
    if month in [3, 4, 5, 6]:
        avg_temp = np.random.uniform(32.0, 37.0)
        temp_multiplier = 1.35
    else:
        avg_temp = np.random.uniform(26.0, 31.0)
        temp_multiplier = 1.0
        
    # 3. Payday Multiplier
    is_payday = day_of_month in [14, 15, 16, 29, 30, 31]
    payday_multiplier = 1.2 if is_payday else 1.0
    
    # 4. Event Overrides
    event_multiplier = 1.0
    event_name = "Normal Day"

    if (month == 12 and day_of_month in [24, 25, 30, 31]) or (month == 1 and day_of_month == 1):
        event_multiplier = np.random.uniform(1.8, 2.2)
        event_name = "Christmas/New Year Peak"
    elif month == 10 and day_of_month == 31:
        event_multiplier = np.random.uniform(1.3, 1.5)
        event_name = "Halloween Gathering"
    elif month == 11 and day_of_month in [1, 2]:
        event_multiplier = np.random.uniform(0.7, 0.8)
        event_name = "Undas Manila Exodus"
    elif any(d.date() == hw_date.date() for hw_date in holy_week_dates.get(year_str, [])):
        event_multiplier = np.random.uniform(0.4, 0.6)
        event_name = "Holy Week Exodus"

    # Calculate Total Demand in KG
    calc_kg = base_demand_kg * dow_multiplier * temp_multiplier * payday_multiplier * event_multiplier
    noise_kg = np.random.normal(0, 150)
    calculated_total_kg = int(max(500, calc_kg + noise_kg))
    
    # Distribute the total kg into product types:
    kg_5kg = calculated_total_kg * 0.20
    kg_35_40kg = calculated_total_kg * 0.45
    kg_50_70kg = calculated_total_kg * 0.35
    
    bags_5kg = int(kg_5kg / WEIGHT_5KG)
    sacks_35kg = int((kg_35_40kg * 0.5) / WEIGHT_35KG)
    sacks_40kg = int((kg_35_40kg * 0.5) / WEIGHT_40KG)
    sacks_50kg = int((kg_50_70kg * 0.7) / WEIGHT_50KG)
    crates_70kg = int((kg_50_70kg * 0.3) / WEIGHT_70KG)

    # Actual total weight calculated from rounded variant quantities
    final_demand_kg = (
        (bags_5kg * WEIGHT_5KG) + 
        (sacks_35kg * WEIGHT_35KG) + 
        (sacks_40kg * WEIGHT_40KG) + 
        (sacks_50kg * WEIGHT_50KG) + 
        (crates_70kg * WEIGHT_70KG)
    )

    data.append({
        "date": d.strftime("%Y-%m-%d"),
        "day_of_week": day_name,
        "event_tag": event_name,
        "total_kg_demanded": final_demand_kg,
        "total_kg_produced": int(final_demand_kg * np.random.uniform(0.98, 1.05)),
        "bags_5kg": bags_5kg,
        "sacks_35kg": sacks_35kg,
        "sacks_40kg": sacks_40kg,
        "sacks_50kg": sacks_50kg,
        "crates_70kg": crates_70kg,
        "avg_temperature_c": round(avg_temp, 1),
        "is_payday_weekend": is_payday
    })

df = pd.DataFrame(data)
df.to_csv("historical_ice_demand.csv", index=False)
print("✅ Generated CSV: historical_ice_demand.csv successfully!")