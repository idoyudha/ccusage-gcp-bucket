#!/bin/bash

# Create scripts directory if it doesn't exist
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_FILE="$SCRIPT_DIR/../ccusage-weekly.service"

# Check if running on systemd-enabled system
if ! command -v systemctl &> /dev/null; then
    echo "systemctl not found. This script requires systemd."
    echo "For other systems, please set up startup manually."
    exit 1
fi

# Copy service file to systemd directory
echo "Installing ccusage-weekly service..."
sudo cp "$SERVICE_FILE" /etc/systemd/system/

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable the service to run at startup
sudo systemctl enable ccusage-weekly.service

echo "Service installed and enabled!"
echo "The service will run once at system startup."
echo ""
echo "To manually test the service, run:"
echo "  sudo systemctl start ccusage-weekly.service"
echo ""
echo "To check service status:"
echo "  sudo systemctl status ccusage-weekly.service"
echo ""
echo "To view logs:"
echo "  sudo journalctl -u ccusage-weekly.service"