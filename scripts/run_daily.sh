#!/bin/bash
# Daily Oil Price Tracker Runner
# Sends alerts via OpenClaw session

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/oil_price_tracker.py"
ALERT_FILE="/tmp/oil_price_alerts.json"

# Run the tracker and capture alerts
cd "$SCRIPT_DIR/../"
python3 "$PYTHON_SCRIPT" > /tmp/oil_price_tracker.log 2>&1
EXIT_CODE=$?

# If alerts were generated, send notification
if [ $EXIT_CODE -eq 1 ] && [ -f "$ALERT_FILE" ]; then
    # Send via OpenClaw sessions_send (if available)
    # Or just log for now
    echo "⚠️ OIL PRICE ALERTS detected!" >> /tmp/oil_price_tracker.log
    cat "$ALERT_FILE" >> /tmp/oil_price_tracker.log
fi

exit $EXIT_CODE