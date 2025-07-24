#!/usr/bin/env node

const cron = require('node-cron');
const { Storage } = require('@google-cloud/storage');
const { execSync } = require('child_process');
require('dotenv').config();

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE
});

const bucketName = process.env.GCP_BUCKET_NAME;
const accountName = process.env.ACCOUNT_NAME || 'unknown';


// Function to format date as YYYYMMDD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Function to get today's date
function getTodayDate() {
  return new Date();
}

// Function to run ccusage and get JSON output
async function getClaudeUsageJSON(targetDate) {
  try {
    const dateStr = formatDate(targetDate);
    console.log(`Fetching Claude Code usage for ${dateStr}...`);
    
    const command = `ccusage daily --since ${dateStr} --until ${dateStr} --json`;
    console.log(`Running: ${command}`);
    
    const output = execSync(command, { encoding: 'utf8' });
    return output;
  } catch (error) {
    console.error('Error fetching usage data:', error.message);
    throw error;
  }
}

// Function to upload to GCS
async function uploadToGCS(data, targetDate) {
  const dateStr = formatDate(targetDate);
  const fileName = `${dateStr}-${accountName}.json`;
  
  // Check if bucket name includes a path
  let actualBucketName = bucketName;
  let folderPath = '';
  
  if (bucketName && bucketName.includes('/')) {
    const parts = bucketName.split('/');
    actualBucketName = parts[0];
    folderPath = parts.slice(1).join('/') + '/';
  }
  
  // Create the actual bucket object with just the bucket name
  const actualBucket = storage.bucket(actualBucketName);
  const fullPath = folderPath + fileName;
  const file = actualBucket.file(fullPath);
  

  try {
    await file.save(data, {
      metadata: {
        contentType: 'application/json',
        metadata: {
          reportDate: dateStr,
          accountName: accountName,
          uploadedAt: new Date().toISOString()
        }
      }
    });
    console.log(`Successfully uploaded ${fullPath} to ${actualBucketName}`);
    return fileName;
  } catch (error) {
    console.error('Error uploading to GCS:', error.message);
    throw error;
  }
}

// Main function to fetch and upload usage
async function fetchAndUploadUsage(targetDate = null) {
  try {
    // If no date specified, use today
    const dateToProcess = targetDate || getTodayDate();
    
    console.log(`[${new Date().toISOString()}] Starting usage collection for ${formatDate(dateToProcess)}...`);
    
    const usageData = await getClaudeUsageJSON(dateToProcess);
    await uploadToGCS(usageData, dateToProcess);
    
    console.log(`[${new Date().toISOString()}] Process completed successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in process:`, error.message);
    throw error;
  }
}

// Function to start the scheduler
function startScheduler() {
  const scheduleTime = process.env.SCHEDULE_TIME || '0 17 * * *'; // Default to 5:00 PM
  
  console.log(`Scheduler started. Will run at ${process.env.SCHEDULE_TIME || '5:00 PM'} daily.`);
  console.log(`Using cron expression: ${scheduleTime}`);
  console.log(`Account name: ${accountName}`);
  
  // Schedule the task
  cron.schedule(scheduleTime, () => {
    fetchAndUploadUsage();
  });

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('Scheduler stopped.');
    process.exit(0);
  });
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--now')) {
  // Run for today if --now is specified
  const today = new Date();
  fetchAndUploadUsage(today).then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
} else if (args.includes('--date')) {
  // Run for specific date if --date YYYYMMDD is specified
  const dateIndex = args.indexOf('--date');
  if (dateIndex !== -1 && args[dateIndex + 1]) {
    const dateStr = args[dateIndex + 1];
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const targetDate = new Date(year, month, day);
    
    fetchAndUploadUsage(targetDate).then(() => {
      process.exit(0);
    }).catch(() => {
      process.exit(1);
    });
  } else {
    console.error('Please provide date in YYYYMMDD format after --date');
    process.exit(1);
  }
} else {
  // Start the scheduler
  startScheduler();
}