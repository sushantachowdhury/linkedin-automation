import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { 
  getSettings, 
  saveSettings, 
  getLogs, 
  logEvent, 
  getPosts, 
  savePost 
} from './store.js';
import { getSheetQueue, updateSheetQueue } from './sheets.js';
import { 
  triggerContentGen, 
  triggerAlert, 
  triggerPublish, 
  startScheduler,
  getLocalDateString 
} from './scheduler.js';
import { getLinkedInAuthUrl, handleLinkedInCallback } from './linkedin.js';

const app = express();
app.use(cors());
app.use(express.json());

// Load settings
const settings = getSettings();
const PORT = settings.PORT || 5000;

// API Endpoints

// 1. Pipeline Status
app.get('/api/status', (req, res) => {
  const currentSettings = getSettings();
  const today = getLocalDateString();
  const posts = getPosts();
  const todayPost = posts.find(p => p.date === today);

  const missingCreds = [];
  if (!currentSettings.GEMINI_API_KEY) missingCreds.push('Gemini API Key');
  if (!currentSettings.GOOGLE_SHEET_ID || !currentSettings.GOOGLE_SERVICE_ACCOUNT_JSON) missingCreds.push('Google Sheets Link');
  if (!currentSettings.EMAIL_USER || !currentSettings.EMAIL_PASS) missingCreds.push('SMTP Email config');
  if (!currentSettings.LINKEDIN_ACCESS_TOKEN) missingCreds.push('LinkedIn Auth Link');

  res.json({
    today,
    currentTime: new Date().toLocaleTimeString(),
    schedulerActive: true,
    demoMode: missingCreds.length > 0,
    missingCreds,
    todayPostStatus: todayPost ? todayPost.status : 'Pending',
    todayPostApproved: todayPost ? todayPost.approved : false
  });
});

// 2. Settings Management
app.get('/api/settings', (req, res) => {
  const currentSettings = getSettings();
  // Mask sensitive values before returning
  const responseSettings = { ...currentSettings };
  const sensitiveKeys = ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GEMINI_API_KEY', 'EMAIL_PASS', 'TWILIO_AUTH_TOKEN', 'LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_CLIENT_SECRET'];
  
  sensitiveKeys.forEach(key => {
    if (responseSettings[key]) {
      responseSettings[key] = responseSettings[key].length > 8 
        ? `${responseSettings[key].substring(0, 8)}... (Configured)` 
        : 'Configured';
    }
  });

  res.json(responseSettings);
});

app.post('/api/settings', (req, res) => {
  const newSettings = req.body;
  // Filter out masked placeholders so we don't overwrite real keys
  const filteredSettings = {};
  Object.keys(newSettings).forEach(key => {
    const val = newSettings[key];
    if (val && !val.endsWith('... (Configured)') && val !== 'Configured') {
      filteredSettings[key] = val;
    }
  });

  saveSettings(filteredSettings);
  res.json({ success: true, message: 'Settings saved successfully' });
});

// 3. Post Queue Management
app.get('/api/posts', async (req, res) => {
  const currentSettings = getSettings();
  const posts = await getSheetQueue(currentSettings);
  res.json(posts);
});

app.post('/api/posts/approve', async (req, res) => {
  const { date, approved } = req.body;
  const currentSettings = getSettings();
  
  const posts = getPosts();
  const post = posts.find(p => p.date === date);

  if (!post) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  post.approved = approved;
  post.status = approved ? 'Approved' : 'Drafted';
  savePost(post);

  logEvent('POST_APPROVAL', `Post for date ${date} marked as ${approved ? 'APPROVED' : 'UNAPPROVED'}`);
  res.json({ success: true, post });
});

app.post('/api/posts/edit', async (req, res) => {
  const { date, payload } = req.body;
  const currentSettings = getSettings();

  const posts = getPosts();
  const post = posts.find(p => p.date === date);

  if (!post) {
    return res.status(404).json({ error: 'Post not found.' });
  }

  await updateSheetQueue(currentSettings, date, {
    messagePayload: payload
  });

  logEvent('POST_EDIT', `Post content for date ${date} edited by user`);
  res.json({ success: true, message: 'Post content updated.' });
});

// 4. Manual execution trigger
app.post('/api/posts/trigger-step', async (req, res) => {
  const { date, step } = req.body;
  let result;

  if (step === 'generate') {
    result = await triggerContentGen(date);
  } else if (step === 'alert') {
    result = await triggerAlert(date);
  } else if (step === 'publish') {
    result = await triggerPublish(date);
  } else {
    return res.status(400).json({ error: 'Invalid step name.' });
  }

  if (result.success) {
    res.json({ success: true, post: result.post });
  } else {
    res.status(500).json({ error: result.error });
  }
});

// 5. Audit logs
app.get('/api/logs', (req, res) => {
  res.json(getLogs());
});

// 6. LinkedIn Authentication redirect & callback
app.get('/api/linkedin/auth', (req, res) => {
  const currentSettings = getSettings();
  const authUrl = getLinkedInAuthUrl(currentSettings);
  if (authUrl === '#') {
    return res.status(400).send('LinkedIn Client ID is not configured in Settings.');
  }
  res.redirect(authUrl);
});

app.get('/api/linkedin/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const currentSettings = getSettings();

  if (error) {
    return res.status(400).send(`LinkedIn Login Error: ${error}`);
  }

  try {
    const profile = await handleLinkedInCallback(currentSettings, code);
    
    // Redirect back to frontend dashboard
    const isDev = process.env.NODE_ENV === 'development';
    const redirectUrl = isDev ? 'http://localhost:5173/?connected=true' : '/?connected=true';
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>LinkedIn Connection Successful</title>
        <style>
          body { background: #0f172a; color: #f1f5f9; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); text-align: center; max-width: 400px; }
          h2 { color: #10b981; margin-bottom: 10px; }
          p { color: #94a3b8; line-height: 1.5; }
          .loader { border: 4px solid #334155; border-top: 4px solid #8b5cf6; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
        <script>
          setTimeout(() => {
            window.location.href = "${redirectUrl}";
          }, 3000);
        </script>
      </head>
      <body>
        <div class="card">
          <h2>Linked Connected!</h2>
          <p>Account <strong>${profile.name}</strong> was linked successfully.</p>
          <div class="loader"></div>
          <p style="font-size: 13px;">Redirecting back to dashboard...</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`Authentication Failed: ${err.message}`);
  }
});

// Serve static React files in production mode
const frontendPath = path.resolve('frontend/dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('LinkedIn Automation backend is running. Frontend build files not found. Launch client in dev mode.');
  });
}

// Start Server and Scheduler
app.listen(PORT, () => {
  logEvent('SYSTEM', `Express backend listening on port ${PORT} in ${process.env.NODE_ENV || 'production'} mode.`);
  startScheduler();
});
