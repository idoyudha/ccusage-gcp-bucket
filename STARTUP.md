# Automatic Startup Setup

This package can be configured to run automatically when your system starts up.

## Setup Instructions

### For Linux Systems with systemd

1. First, install the package globally:
   ```bash
   npm install -g .
   ```

2. Then run the setup script:
   ```bash
   npm run setup-startup
   ```

   This will:
   - Install a systemd service file
   - Enable the service to run at startup
   - The service will run once when your system boots

### Manual Testing

To test the service immediately without restarting:
```bash
sudo systemctl start ccusage-weekly.service
```

To check if the service ran successfully:
```bash
sudo systemctl status ccusage-weekly.service
```

To view the service logs:
```bash
sudo journalctl -u ccusage-weekly.service
```

### Disabling Automatic Startup

If you want to disable automatic startup:
```bash
sudo systemctl disable ccusage-weekly.service
sudo systemctl stop ccusage-weekly.service
```

### For Other Systems

For systems without systemd (macOS, Windows, or other init systems):

**macOS**: Create a LaunchAgent plist file in `~/Library/LaunchAgents/`
**Windows**: Use Task Scheduler to create a startup task
**Other Linux**: Add to crontab with `@reboot` or use your init system

## How It Works

When the system starts:
1. The service runs the `index.js` script once
2. It collects usage data from the previous week (Sunday to Saturday)
3. Uploads both daily and session data to your configured GCS bucket
4. The service exits after completion

The service only runs once per startup, not continuously.