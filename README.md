# ccusage-gcp-bucket

A shell script that fetches Claude Code usage statistics in JSON format using [ccusage](https://www.npmjs.com/package/ccusage) and uploads them to a Google Cloud Storage bucket.

## Features

- Fetches weekly Claude Code usage statistics (Sunday to Saturday)
- Uploads both daily and session usage data
- Automatic JSON formatting with account name
- Google Cloud Storage integration via gsutil
- Automatic dependency checking and installation
- Organized storage in DAILY/ and SESSION/ folders

## Prerequisites

- Node.js (for ccusage CLI)
- Google Cloud SDK (gsutil)
- jq (for JSON processing)
- Google Cloud Platform account with Storage access
- Service account key for GCP authentication (optional)

## Installation

```bash
# Clone the repository
git clone https://github.com/idoyudha/ccusage-gcp-bucket.git
cd ccusage-gcp-bucket

# Make the script executable
chmod +x ccusage-upload.sh
```

The script will automatically:
- Check if Node.js is installed
- Install ccusage globally if not present
- Install jq if not present (on supported systems)

## Configuration

1. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

2. Configure your environment variables:

```env
# Google Cloud Configuration
GCP_PROJECT_ID=your-project-id
GCP_BUCKET_NAME=your-bucket-name  # Can include path: bucket-name/folder/subfolder
GCP_KEY_FILE=./service-account-key.json
ACCOUNT_NAME=your.email@example.com
```

3. If using a service account, place your Google Cloud service account key file in the project directory (or update the path in `.env`)

4. Ensure you have authenticated with Google Cloud:
```bash
# Using service account (automatic if GCP_KEY_FILE is set)
gcloud auth activate-service-account --key-file=./service-account-key.json

# Or using your personal account
gcloud auth login
```

## Usage

Run the script to upload last week's usage data:

```bash
./ccusage-upload.sh
```

The script will:
1. Calculate the previous week's date range (Sunday to Saturday)
2. Fetch daily usage data using `ccusage daily`
3. Fetch session usage data using `ccusage session`
4. Add your account name to the JSON data
5. Upload to GCS in the following structure:
   - `gs://your-bucket/DAILY/weekly-YYYYMMDD-to-YYYYMMDD-account.name.json`
   - `gs://your-bucket/SESSION/weekly-YYYYMMDD-to-YYYYMMDD-account.name.json`

## Output Format

Files are organized in GCS with the following structure:

```
your-bucket/
├── DAILY/
│   └── weekly-YYYYMMDD-to-YYYYMMDD-account.name.json
└── SESSION/
    └── weekly-YYYYMMDD-to-YYYYMMDD-account.name.json
```

For example:
- `DAILY/weekly-20250114-to-20250120-john.doe@example.com.json`
- `SESSION/weekly-20250114-to-20250120-john.doe@example.com.json`

Each JSON file contains:
- The usage data from ccusage for the specific period
- An added `account` field with your account name