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
  const daysToLastSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
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
async function getClaudeUsageJSON(startDate, endDate) {
  try {
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);
    console.log(`Fetching Claude Code usage from ${startStr} to ${endStr}...`);
    
    const command = `ccusage daily --since ${startStr} --until ${endStr} --json`;
    console.log(`Running: ${command}`);
    
    const output = execSync(command, { encoding: 'utf8' });
    return output;
  } catch (error) {
    console.error('Error fetching usage data:', error.message);
    throw error;
  }
}

// Function to upload to GCS
async function uploadToGCS(data, startDate, endDate) {
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
    
    const usageData = await getClaudeUsageJSON(startDate, endDate);
    
    // Parse the JSON and add account field
    const usageJSON = JSON.parse(usageData);
    const modifiedJSON = {
      account: accountName,
      ...usageJSON
    };
    
    // Convert back to string for upload
    const modifiedData = JSON.stringify(modifiedJSON, null, 2);
    
    await uploadToGCS(modifiedData, startDate, endDate);
    
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