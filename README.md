# ccusage-gcp-bucket

A simple npm package that fetches Claude Code daily usage statistics in JSON format using [ccusage](https://www.npmjs.com/package/ccusage) and uploads them to a Google Cloud Storage bucket.

## Features

- Automated daily upload of Claude Code usage statistics in JSON format
- Configurable scheduling (default: 5:00 PM local time)
- Google Cloud Storage integration
- Manual upload options with `--now` (today) or `--date YYYYMMDD` (specific date)
- Automatic filename generation: `YYYYMMDD-account.name.json`

## Prerequisites

- Node.js v20.19.4 or higher
- Google Cloud Platform account with Storage access
- Service account key for GCP authentication

## Installation

### Install from npm (when published)

```bash
npm install -g ccusage-gcp-bucket
```

### Install locally without publishing

```bash
# Clone the repository
git clone https://github.com/idoyudha/ccusage-gcp-bucket.git
cd ccusage-gcp-bucket

# Install globally from local directory
npm install -g .

# Or use npm link for development
npm link
```

After local installation, the `ccusage-gcp` command will be available globally.

## Configuration

1. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

2. Configure your environment variables:

```env
# Google Cloud Configuration
GCP_PROJECT_ID=your-project-id
GCP_BUCKET_NAME=your-bucket-name
GCP_KEY_FILE=./service-account-key.json
ACCOUNT_NAME=your.email@example.com

# Schedule Configuration (optional)
# Default is 5:00 PM (17:00) daily
SCHEDULE_TIME=0 17 * * *
```

3. Place your Google Cloud service account key file in the project directory (or update the path in `.env`)

## Usage

### Start the scheduler (runs continuously)

```bash
npm start
# or
node index.js
```

### Upload today's usage data immediately

```bash
npm run upload-now
# or
node index.js --now
```

### Upload usage data for a specific date

```bash
node index.js --date 20250723
```

### Use as a global command (after npm install -g)

```bash
ccusage-gcp
```

## Schedule Configuration

The schedule uses cron syntax. Common examples:

- `0 17 * * *` - 5:00 PM daily (default)
- `0 9 * * *` - 9:00 AM daily
- `0 */6 * * *` - Every 6 hours
- `0 12 * * 1-5` - 12:00 PM on weekdays

## Output Format

Usage data is saved as JSON files with the filename format:
```
YYYYMMDD-account.name.json
```

For example:
- `20250723-john.doe@example.com.json`
- `20250724-john.doe@example.com.json`

Each file contains the JSON output from the `ccusage daily` command for the specific date.

## Scheduling Notes

When running on a schedule, the package will fetch **today's** usage data. For example:
- If scheduled to run at 5:00 PM on July 24th, it will fetch and upload usage data for July 24th
- Use `--now` to manually fetch today's current usage data
- Use `--date YYYYMMDD` to fetch data for any specific date

## License

ISC