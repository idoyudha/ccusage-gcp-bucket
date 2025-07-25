#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if ccusage is installed globally
if ! command -v ccusage &> /dev/null; then
    echo "ccusage is not installed. Installing ccusage globally..."
    npm install -g ccusage
    if [ $? -ne 0 ]; then
        echo "Failed to install ccusage"
        exit 1
    fi
fi

# Set default account name if not provided
ACCOUNT_NAME=${ACCOUNT_NAME:-"unknown"}

# Function to format date as YYYYMMDD
format_date() {
    date -d "$1" +%Y%m%d
}

# Function to get last week's Sunday to Saturday range
get_last_week_range() {
    # Get current day of week (0=Sunday, 6=Saturday)
    current_day=$(date +%w)
    
    # Calculate days to last Sunday
    if [ $current_day -eq 0 ]; then
        days_to_last_sunday=7
    else
        days_to_last_sunday=$((current_day + 7))
    fi
    
    # Calculate last Sunday and Saturday
    last_sunday=$(date -d "$days_to_last_sunday days ago" +%Y-%m-%d)
    last_saturday=$(date -d "$((days_to_last_sunday - 6)) days ago" +%Y-%m-%d)
    
    echo "$last_sunday $last_saturday"
}

# Function to upload to GCS using gsutil
upload_to_gcs() {
    local data_file=$1
    local start_date=$2
    local end_date=$3
    local type=$4
    
    local start_str=$(format_date "$start_date")
    local end_str=$(format_date "$end_date")
    local file_name="weekly-${start_str}-to-${end_str}-${ACCOUNT_NAME}.json"
    
    # Parse bucket and folder path
    local bucket_path="$GCP_BUCKET_NAME"
    local type_folder="DAILY"
    if [ "$type" = "session" ]; then
        type_folder="SESSION"
    fi
    
    # Construct full GCS path
    local gcs_path="gs://${bucket_path}/${type_folder}/${file_name}"
    
    echo "Uploading ${type} data to ${gcs_path}..."
    
    # Upload using gsutil
    gsutil -h "Content-Type:application/json" cp "$data_file" "$gcs_path"
    
    if [ $? -eq 0 ]; then
        echo "Successfully uploaded ${file_name}"
    else
        echo "Failed to upload ${file_name}"
        return 1
    fi
}

# Main function
main() {
    echo "[$(date -Iseconds)] Starting weekly usage collection..."
    echo "Account name: ${ACCOUNT_NAME}"
    
    # Get last week's date range
    read last_sunday last_saturday <<< $(get_last_week_range)
    
    local start_str=$(format_date "$last_sunday")
    local end_str=$(format_date "$last_saturday")
    
    echo "Collecting usage from ${start_str} to ${end_str}..."
    
    # Create temporary directory for JSON files
    temp_dir=$(mktemp -d)
    trap "rm -rf $temp_dir" EXIT
    
    # Fetch daily usage data
    echo "Fetching daily usage data..."
    daily_json="${temp_dir}/daily_usage.json"
    ccusage daily --since "$start_str" --until "$end_str" --json > "$daily_json"
    
    if [ $? -ne 0 ]; then
        echo "Failed to fetch daily usage data"
        exit 1
    fi
    
    # Add account name to daily JSON
    daily_modified="${temp_dir}/daily_modified.json"
    jq --arg account "$ACCOUNT_NAME" '. + {account: $account}' "$daily_json" > "$daily_modified"
    
    # Fetch session usage data
    echo "Fetching session usage data..."
    session_json="${temp_dir}/session_usage.json"
    ccusage session --since "$start_str" --until "$end_str" --json > "$session_json"
    
    if [ $? -ne 0 ]; then
        echo "Failed to fetch session usage data"
        exit 1
    fi
    
    # Add account name to session JSON
    session_modified="${temp_dir}/session_modified.json"
    jq --arg account "$ACCOUNT_NAME" '. + {account: $account}' "$session_json" > "$session_modified"
    
    # Upload both files
    echo "Uploading daily usage data..."
    upload_to_gcs "$daily_modified" "$last_sunday" "$last_saturday" "daily"
    
    echo "Uploading session usage data..."
    upload_to_gcs "$session_modified" "$last_sunday" "$last_saturday" "session"
    
    echo "[$(date -Iseconds)] Process completed successfully"
}

# Check if jq is installed (needed for JSON manipulation)
if ! command -v jq &> /dev/null; then
    echo "jq is not installed. Installing jq..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y jq
    elif command -v yum &> /dev/null; then
        sudo yum install -y jq
    elif command -v brew &> /dev/null; then
        brew install jq
    else
        echo "Could not install jq. Please install it manually."
        exit 1
    fi
fi

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo "gsutil is not installed. Please install Google Cloud SDK first."
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Authenticate with service account if key file is provided
if [ -n "$GCP_KEY_FILE" ] && [ -f "$GCP_KEY_FILE" ]; then
    echo "Authenticating with service account..."
    gcloud auth activate-service-account --key-file="$GCP_KEY_FILE"
    if [ $? -ne 0 ]; then
        echo "Failed to authenticate with service account"
        exit 1
    fi
fi

# Run main function
main