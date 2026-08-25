import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Resolve directory and db path
const dbPath = path.resolve('db.json');
const envPath = path.resolve('.env');

// Initial structure
const initialDb = {
  settings: {},
  posts: [],
  logs: []
};

// Helper to read database
export function getDb() {
  try {
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading db.json:', err);
    return initialDb;
  }
}

// Helper to write database
export function saveDb(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

// Read settings merged with process.env
export function getSettings() {
  // Reload dotenv to get fresh values
  dotenv.config({ path: envPath });
  const db = getDb();
  
  const envKeys = [
    'PORT',
    'GOOGLE_SHEET_ID',
    'GOOGLE_SERVICE_ACCOUNT_JSON',
    'GEMINI_API_KEY',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USER',
    'EMAIL_PASS',
    'EMAIL_TO',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_WHATSAPP_FROM',
    'TWILIO_WHATSAPP_TO',
    'LINKEDIN_CLIENT_ID',
    'LINKEDIN_CLIENT_SECRET',
    'LINKEDIN_REDIRECT_URI'
  ];

  const settings = { ...db.settings };
  
  // env takes precedence or acts as default
  envKeys.forEach(key => {
    if (process.env[key]) {
      settings[key] = process.env[key];
    }
  });

  return settings;
}

// Write settings to both db.json and .env file
export function saveSettings(newSettings) {
  const db = getDb();
  db.settings = { ...db.settings, ...newSettings };
  saveDb(db);

  // Read current .env content
  let envLines = [];
  if (fs.existsSync(envPath)) {
    envLines = fs.readFileSync(envPath, 'utf-8').split('\n');
  }

  // Update or append environment variables
  Object.keys(newSettings).forEach(key => {
    const value = newSettings[key] || '';
    const lineIndex = envLines.findIndex(line => line.startsWith(`${key}=`));
    
    // Escape string if needed (simple quote wrapping)
    const formattedValue = value.includes('\n') || value.includes(' ') ? `"${value.replace(/"/g, '\\"')}"` : value;

    if (lineIndex !== -1) {
      envLines[lineIndex] = `${key}=${formattedValue}`;
    } else {
      envLines.push(`${key}=${formattedValue}`);
    }
  });

  fs.writeFileSync(envPath, envLines.join('\n'), 'utf-8');
  
  // Re-inject updated keys into process.env
  Object.keys(newSettings).forEach(key => {
    process.env[key] = newSettings[key];
  });
  
  logEvent('SETTINGS_UPDATED', 'API configuration updated by user');
}

// Manage posts
export function getPosts() {
  const db = getDb();
  
  // Provide mock schedule items if posts array is empty
  if (db.posts.length === 0) {
    const mockPosts = [
      {
        date: '2026-08-25',
        time: '17:00',
        title: 'Crafting Premium Glassmorphism Dashboards in React',
        status: 'Pending',
        payload: '',
        approved: false,
        analyticsStatus: 'Pending',
        isMock: true
      },
      {
        date: '2026-08-26',
        time: '17:00',
        title: 'Mastering CSS Grid & Custom Properties (UI/UX Best Practices)',
        status: 'Pending',
        payload: '',
        approved: false,
        analyticsStatus: 'Pending',
        isMock: true
      },
      {
        date: '2026-08-27',
        time: '17:00',
        title: 'Web Accessibility (a11y) Checklists for Modern Frontend Devs',
        status: 'Pending',
        payload: '',
        approved: false,
        analyticsStatus: 'Pending',
        isMock: true
      }
    ];
    db.posts = mockPosts;
    saveDb(db);
  }

  return db.posts;
}

export function savePost(updatedPost) {
  const db = getDb();
  const index = db.posts.findIndex(p => p.date === updatedPost.date);
  
  if (index !== -1) {
    db.posts[index] = { ...db.posts[index], ...updatedPost };
  } else {
    db.posts.push(updatedPost);
  }
  
  saveDb(db);
}

// Log audit events
export function logEvent(type, message, details = {}) {
  const db = getDb();
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    message,
    details
  };
  db.logs.unshift(entry); // Newest first
  
  // Cap logs at 500
  if (db.logs.length > 500) {
    db.logs = db.logs.slice(0, 500);
  }
  
  saveDb(db);
  console.log(`[LOG - ${type}] ${message}`);
  return entry;
}

export function getLogs() {
  const db = getDb();
  return db.logs;
}
