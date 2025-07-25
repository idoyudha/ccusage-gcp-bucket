# ccusage-gcp-bucket

A simple npm package that fetches Claude Code usage statistics in JSON format using [ccusage](https://www.npmjs.com/package/ccusage) and uploads them to a Google Cloud Storage bucket.

## Features

- Automated daily and weekly upload of Claude Code usage statistics in JSON format
- Google Cloud Storage integration
- Manual upload options:
  - `--now` for today's usage
  - `--date YYYYMMDD` for specific date
  - `--weekly` for last week's usage (Sunday to Saturday)
- Automatic filename generation:
  - Daily: `YYYYMMDD-account.name.json`
  - Weekly: `YYYYMMDD-YYYYMMDD-weekly-account.name.json`

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
```

3. Place your Google Cloud service account key file in the project directory (or update the path in `.env`)

## Usage

### Upload today's usage data

```bash
npm run upload-now
# or
node index.js --now
# or (after global install)
ccusage-gcp --now
```

### Upload usage data for a specific date

```bash
node index.js --date 20250723
# or (after global install)
ccusage-gcp --date 20250723
```

### Upload last week's usage data

```bash
node index.js --weekly
# or (after global install)
ccusage-gcp --weekly
```

## Output Format

Usage data is saved as JSON files with the following filename formats:

### Daily usage:
```
YYYYMMDD-account.name.json
```

### Weekly usage:
```
YYYYMMDD-YYYYMMDD-weekly-account.name.json
```

For example:
- Daily: `20250723-john.doe@example.com.json`
- Weekly: `20250714-20250720-weekly-john.doe@example.com.json`

Each file contains the JSON output from the `ccusage` command for the specific period.

## License

ISC