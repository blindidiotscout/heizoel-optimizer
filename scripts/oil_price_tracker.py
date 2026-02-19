#!/usr/bin/env python3
"""
Oil Price Tracker
Fetches global oil prices from OilPriceAPI and stores historical data.
Alerts on significant price jumps.
"""

import json
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path
import sys

# Config
API_URL = "https://api.oilpriceapi.com/v1/demo/prices"
DATA_FILE = Path(__file__).parent.parent / "data" / "oil_prices_history.json"
THRESHOLD_PERCENT = 5.0  # Alert bei >5% Änderung

# Relevant commodities for heating oil
RELEVANT = ["BRENT_CRUDE_USD", "WTI_USD", "HEATING_OIL_USD", "DIESEL_USD"]


def fetch_prices():
    """Fetch current prices from API"""
    try:
        req = urllib.request.Request(
            API_URL,
            headers={"Content-Type": "application/json", "User-Agent": "HeizoelOptimizer/1.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
        
        if data.get("status") != "success":
            raise Exception(f"API returned status: {data.get('status')}")
        
        return data["data"]["prices"]
    except Exception as e:
        print(f"❌ Error fetching prices: {e}")
        return None


def load_history():
    """Load historical price data"""
    if DATA_FILE.exists():
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return {"history": [], "alerts": []}


def save_history(data):
    """Save historical price data"""
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)
    print(f"💾 Saved to {DATA_FILE}")


def detect_alerts(prices, history):
    """Detect significant price changes"""
    alerts = []
    
    if not history["history"]:
        return alerts
    
    last_entry = history["history"][-1]
    last_prices = {p["code"]: p["price"] for p in last_entry["prices"]}
    
    for price in prices:
        if price["code"] not in RELEVANT:
            continue
        
        code = price["code"]
        current = price["price"]
        previous = last_prices.get(code)
        
        if previous and previous > 0:
            change_percent = ((current - previous) / previous) * 100
            
            if abs(change_percent) >= THRESHOLD_PERCENT:
                direction = "📈" if change_percent > 0 else "📉"
                alerts.append({
                    "date": datetime.now().isoformat(),
                    "commodity": price["name"],
                    "code": code,
                    "previous_price": previous,
                    "current_price": current,
                    "change_percent": round(change_percent, 2),
                    "message": f"{direction} {price['name']}: {previous:.2f} → {current:.2f} USD ({'+' if change_percent > 0 else ''}{change_percent:.1f}%)"
                })
    
    return alerts


def main():
    print(f"🛢️ Oil Price Tracker - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 50)
    
    # Fetch current prices
    prices = fetch_prices()
    if not prices:
        sys.exit(1)
    
    # Filter relevant commodities
    relevant_prices = [p for p in prices if p["code"] in RELEVANT]
    
    # Display current prices
    print("\n📊 Aktuelle Preise:")
    for p in relevant_prices:
        change = p.get("change_24h")
        change_str = f"({'+' if change and change > 0 else ''}{change})" if change else ""
        print(f"  {p['name']}: ${p['price']:.2f} {change_str}")
    
    # Load history
    history = load_history()
    
    # Detect alerts
    alerts = detect_alerts(relevant_prices, history)
    if alerts:
        print(f"\n⚠️ ALERTS ({len(alerts)}):")
        for alert in alerts:
            print(f"  {alert['message']}")
        history["alerts"].extend(alerts)
    
    # Add to history
    entry = {
        "date": datetime.now().isoformat(),
        "prices": relevant_prices
    }
    history["history"].append(entry)
    
    # Keep last 365 days
    if len(history["history"]) > 365:
        history["history"] = history["history"][-365:]
    
    # Save
    save_history(history)
    
    # Return alerts for further processing (e.g., send to Telegram)
    if alerts:
        return alerts
    
    print("\n✅ Done.")
    return []


if __name__ == "__main__":
    alerts = main()
    # Exit code 0 = no alerts, 1 = alerts present
    sys.exit(1 if alerts else 0)