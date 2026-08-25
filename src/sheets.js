import { google } from 'googleapis';
import { getPosts, savePost, logEvent } from './store.js';

// Helper to authenticate and get Google Sheets client
function getSheetsClient(serviceAccountJson) {
  try {
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    return google.sheets({ version: 'v4', auth });
  } catch (err) {
    throw new Error(`Failed to parse Google Service Account JSON: ${err.message}`);
  }
}

/**
 * Fetch rows from Google Sheets or fall back to local store
 * @param {Object} settings 
 * @returns {Promise<Array>} List of post objects
 */
export async function getSheetQueue(settings) {
  const sheetId = settings.GOOGLE_SHEET_ID;
  const serviceAccount = settings.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!sheetId || !serviceAccount) {
    logEvent('SHEETS_WARN', 'Google Sheets not configured. Falling back to local store.');
    return getPosts(); // local store
  }

  try {
    const sheets = getSheetsClient(serviceAccount);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:E', // Date, Time, Title, Analytics_Status, Message_Payload
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      logEvent('SHEETS_INFO', 'Google Sheet is empty.');
      return [];
    }

    // Parse header and map rows
    // Expected fields: Date, Time, Title, Analytics_Status, Message_Payload
    const header = rows[0].map(h => h.trim().toLowerCase());
    const dateIdx = header.indexOf('date');
    const timeIdx = header.indexOf('time');
    const titleIdx = header.indexOf('title');
    const statusIdx = header.indexOf('analytics_status');
    const payloadIdx = header.indexOf('message_payload');
    const imageIdx = header.findIndex(h => h === 'image_url' || h === 'banner_url' || h === 'media_url');

    if (dateIdx === -1 || titleIdx === -1) {
      throw new Error('Google Sheet must at least contain "Date" and "Title" columns.');
    }

    const posts = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[dateIdx]) continue; // Skip rows without date
      
      const date = row[dateIdx]?.trim();
      const time = timeIdx !== -1 && row[timeIdx] ? row[timeIdx].trim() : '17:00';
      const title = titleIdx !== -1 && row[titleIdx] ? row[titleIdx].trim() : '';
      const analyticsStatus = statusIdx !== -1 && row[statusIdx] ? row[statusIdx].trim() : 'Pending';
      const messagePayload = payloadIdx !== -1 && row[payloadIdx] ? row[payloadIdx].trim() : '';
      const imageUrl = imageIdx !== -1 && row[imageIdx] ? row[imageIdx].trim() : '';

      posts.push({
        date,
        time,
        title,
        analyticsStatus,
        messagePayload,
        imageUrl,
        status: messagePayload ? 'Drafted' : 'Pending',
        approved: false // local DB manages approval state
      });
    }

    // Sync sheet posts to local storage to preserve state (e.g. approved flag)
    const localPosts = getPosts();
    const syncedPosts = posts.map(sheetPost => {
      const localMatch = localPosts.find(p => p.date === sheetPost.date);
      if (localMatch) {
        return {
          ...sheetPost,
          approved: localMatch.approved,
          status: localMatch.status === 'Published' ? 'Published' : sheetPost.status,
          imageUrl: sheetPost.imageUrl || localMatch.imageUrl
        };
      }
      return sheetPost;
    });

    // Save synced data to local store
    syncedPosts.forEach(p => savePost(p));

    return syncedPosts;
  } catch (err) {
    logEvent('SHEETS_ERROR', `Error fetching Google Sheet: ${err.message}`);
    // Fall back to local store
    return getPosts();
  }
}

/**
 * Update a cell range in Google Sheet
 * @param {Object} settings 
 * @param {String} date 
 * @param {Object} updates { analyticsStatus, messagePayload }
 */
export async function updateSheetQueue(settings, date, updates) {
  // Always update local store first
  const localPosts = getPosts();
  const localMatch = localPosts.find(p => p.date === date);
  if (localMatch) {
    const updated = { ...localMatch, ...updates };
    if (updates.messagePayload) updated.status = 'Drafted';
    if (updates.analyticsStatus === 'Published') updated.status = 'Published';
    savePost(updated);
  }

  const sheetId = settings.GOOGLE_SHEET_ID;
  const serviceAccount = settings.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!sheetId || !serviceAccount) {
    logEvent('SHEETS_INFO', `Local post for ${date} updated. Sheets not configured.`);
    return;
  }

  try {
    const sheets = getSheetsClient(serviceAccount);
    
    // First, find the row index for the target date
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1!A:A', // Dates are in column A
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('Google Sheet date column is empty.');
    }

    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0]?.trim() === date) {
        rowIndex = i + 1; // 1-indexed for Sheets API
        break;
      }
    }

    if (rowIndex === -1) {
      logEvent('SHEETS_WARN', `Date ${date} not found in Sheet. Cannot sync updates.`);
      return;
    }

    // Now query the header to find columns for analytics_status, message_payload and image_url
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Sheet1!1:1',
    });

    const header = headerResponse.data.values[0].map(h => h.trim().toLowerCase());
    const statusColIdx = header.indexOf('analytics_status');
    const payloadColIdx = header.indexOf('message_payload');
    const imageColIdx = header.findIndex(h => h === 'image_url' || h === 'banner_url' || h === 'media_url');

    // Convert column indices to Letters (0 -> A, 1 -> B, etc.)
    const getColLetter = (index) => String.fromCharCode(65 + index);

    const updatePromises = [];

    if (statusColIdx !== -1 && updates.analyticsStatus !== undefined) {
      const colLetter = getColLetter(statusColIdx);
      updatePromises.push(
        sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `Sheet1!${colLetter}${rowIndex}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[updates.analyticsStatus]] }
        })
      );
    }

    if (payloadColIdx !== -1 && updates.messagePayload !== undefined) {
      const colLetter = getColLetter(payloadColIdx);
      updatePromises.push(
        sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `Sheet1!${colLetter}${rowIndex}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[updates.messagePayload]] }
        })
      );
    }

    if (imageColIdx !== -1 && updates.imageUrl !== undefined) {
      const colLetter = getColLetter(imageColIdx);
      updatePromises.push(
        sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `Sheet1!${colLetter}${rowIndex}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[updates.imageUrl]] }
        })
      );
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      logEvent('SHEETS_SUCCESS', `Google Sheet row ${rowIndex} updated for date ${date}`);
    }
  } catch (err) {
    logEvent('SHEETS_ERROR', `Error updating Google Sheet row for date ${date}: ${err.message}`);
  }
}
