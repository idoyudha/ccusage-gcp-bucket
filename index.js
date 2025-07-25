#!/usr/bin/env node

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

// Function to get last week's Sunday to Saturday range
function getLastWeekRange() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // Calculate days to last Sunday (start of last week)
  // If today is Sunday (0), we need to go back 7 days to get last Sunday
  // Otherwise, go back current day + 7 days
  const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek + 7;
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - daysToLastSunday);
  
  // Calculate last Saturday (end of last week)
  const lastSaturday = new Date(lastSunday);
  lastSaturday.setDate(lastSunday.getDate() + 6);
  
  return {
    startDate: lastSunday,
    endDate: lastSaturday
  };
}

// Function to run ccusage and get JSON output for a date range
async function getClaudeUsageJSON(startDate, endDate, type = 'daily') {
  try {
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);
    console.log(`Fetching Claude Code ${type} usage from ${startStr} to ${endStr}...`);
    
    const command = `ccusage ${type} --since ${startStr} --until ${endStr} --json`;
    console.log(`Running: ${command}`);
    
    const output = execSync(command, { encoding: 'utf8' });
    return output;
  } catch (error) {
    console.error(`Error fetching ${type} usage data:`, error.message);
    throw error;
  }
}

// Function to upload to GCS
async function uploadToGCS(data, startDate, endDate, type = 'daily') {
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);
  const fileName = `weekly-${startStr}-to-${endStr}-${accountName}.json`;
  
  // Check if bucket name includes a path
  let actualBucketName = bucketName;
  let folderPath = '';
  
  if (bucketName && bucketName.includes('/')) {
    const parts = bucketName.split('/');
    actualBucketName = parts[0];
    folderPath = parts.slice(1).join('/') + '/';
  }
  
  // Add DAILY or SESSION folder based on type
  const typeFolder = type === 'session' ? 'SESSION' : 'DAILY';
  folderPath = folderPath + typeFolder + '/';
  
  // Create the actual bucket object with just the bucket name
  const actualBucket = storage.bucket(actualBucketName);
  const fullPath = folderPath + fileName;
  const file = actualBucket.file(fullPath);
  

  try {
    await file.save(data, {
      metadata: {
        contentType: 'application/json',
        metadata: {
          reportStartDate: startStr,
          reportEndDate: endStr,
          accountName: accountName,
          reportType: type,
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

// Main function to fetch and upload weekly usage
async function fetchAndUploadWeeklyUsage() {
  try {
    const { startDate, endDate } = getLastWeekRange();
    
    console.log(`[${new Date().toISOString()}] Starting weekly usage collection from ${formatDate(startDate)} to ${formatDate(endDate)}...`);
    
    // Fetch both daily and session data
    console.log('Fetching daily usage data...');
    const dailyUsageData = await getClaudeUsageJSON(startDate, endDate, 'daily');
    
    console.log('Fetching session usage data...');
    const sessionUsageData = await getClaudeUsageJSON(startDate, endDate, 'session');
    
    // Parse and modify daily data
    const dailyUsageJSON = JSON.parse(dailyUsageData);
    const modifiedDailyJSON = {
      account: accountName,
      ...dailyUsageJSON
    };
    const modifiedDailyData = JSON.stringify(modifiedDailyJSON, null, 2);
    
    // Parse and modify session data
    const sessionUsageJSON = JSON.parse(sessionUsageData);
    const modifiedSessionJSON = {
      account: accountName,
      ...sessionUsageJSON
    };
    const modifiedSessionData = JSON.stringify(modifiedSessionJSON, null, 2);
    
    // Upload both files
    console.log('Uploading daily usage data...');
    await uploadToGCS(modifiedDailyData, startDate, endDate, 'daily');
    
    console.log('Uploading session usage data...');
    await uploadToGCS(modifiedSessionData, startDate, endDate, 'session');
    
    console.log(`[${new Date().toISOString()}] Process completed successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in process:`, error.message);
    throw error;
  }
}

// Function to run weekly usage collection on startup
async function runOnStartup() {
  console.log(`Running weekly usage collection on startup...`);
  console.log(`Account name: ${accountName}`);
  
  try {
    await fetchAndUploadWeeklyUsage();
    console.log('Weekly usage collection completed successfully.');
  } catch (error) {
    console.error('Failed to collect weekly usage on startup:', error.message);
  }
}

// Run weekly collection on startup
runOnStartup().then(() => {
  console.log('Startup task completed.');
  process.exit(0);
}).catch((error) => {
  console.error('Startup task failed:', error);
  process.exit(1);
});