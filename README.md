# 🚀 Automated LinkedIn Publishing Pipeline

An automated, intelligent LinkedIn publishing pipeline that coordinates content drafting, approval workflows, multi-channel notifications, and scheduling. It leverages Google Gemini AI for smart content generation, Google Sheets as a content calendar queue, and provides a sleek React-based administrative control panel.

---

## ✨ Features

- **Google Sheets Integration**: Periodically pulls upcoming post ideas, schedules, and draft data directly from a specified Google Sheet.
- **AI-Powered Drafts (Google Gemini)**: Automatically drafts professional, highly engaging LinkedIn posts from raw topics using the `gemini-2.5-flash` model, adapting to the user's authentic professional voice.
- **Draft & Edit Interface**: A clean React Dashboard to review, edit, approve, and manually trigger steps in the publishing pipeline.
- **Multi-Channel Alert System**: Sends notifications when posts are drafted and require approval, or when publications succeed/fail, utilizing:
  - 📧 **SMTP Email** (Nodemailer)
  - 💬 **WhatsApp / SMS** (Twilio)
- **Official LinkedIn Integration**: Full OAuth 2.0 implementation and publishing automation via the LinkedIn UGC (User Generated Content) Post API.
- **Automated Scheduler**: Robust daily pipeline execution powered by `node-cron`.

---

## 📁 Repository Structure

```text
linkedin-automation/
├── src/                    # Backend API and Pipeline Logic
│   ├── index.js            # Express API Server and entrypoint
│   ├── store.js            # Local file-based JSON DB storage helper
│   ├── sheets.js           # Google Sheets API integration
│   ├── gemini.js           # Google GenAI (Gemini) API drafting
│   ├── linkedin.js         # LinkedIn OAuth 2.0 and publishing logic
│   ├── scheduler.js        # Cron jobs, orchestrator, and step triggers
│   └── alerts.js           # Twilio and SMTP Email notifications
├── frontend/               # React + Vite Frontend (Dashboard)
│   ├── src/
│   │   ├── components/     # Overview, Editor, Settings, SheetQueue, Analytics
│   │   ├── App.jsx         # UI Layout & Router
│   │   └── main.jsx        # Frontend entrypoint
│   └── package.json
├── db.json                 # Local data store (created at runtime)
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
└── package.json            # Node backend package configuration
```

---

## 🛠️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A [Google Cloud Console](https://console.cloud.google.com/) project with **Sheets API** enabled and a Service Account JSON.
- A [Google AI Studio](https://aistudio.google.com/) account for a Gemini API Key.
- A LinkedIn Developer Account with the **Share on LinkedIn** and **Sign In with LinkedIn** permissions.
- (Optional) A Twilio account for WhatsApp alerts and an SMTP email account.

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd linkedin-automation
   ```

2. **Install Backend dependencies:**
   ```bash
   npm install
   ```

3. **Install Frontend dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Set up environment variables:**
   Copy the `.env.example` file to `.env` in the root directory:
   ```bash
   cp .env.example .env
   ```
   Fill in the required credentials or manage them dynamically from the dashboard's Settings tab.

### Running the Application

You can run both the Backend server and Frontend dev server concurrently using the root package script:

```bash
npm run dev
```

- **Backend API**: Runs on [http://localhost:5000](http://localhost:5000)
- **Frontend Dashboard**: Runs on [http://localhost:5173](http://localhost:5173)

---

## ⚙️ Environment Configuration

| Variable | Description |
| :--- | :--- |
| `PORT` | Backend server port (Default: `5000`). |
| `GOOGLE_SHEET_ID` | The ID of your Google Sheet containing the queue. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | The single-line JSON string credentials for your service account. |
| `GEMINI_API_KEY` | Your Google Gemini API key. |
| `EMAIL_USER` / `EMAIL_PASS` | SMTP credentials to send approval and status emails. |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Twilio account credentials. |
| `TWILIO_WHATSAPP_FROM` / `TWILIO_WHATSAPP_TO` | Source and destination numbers for WhatsApp alerts (prefixed with `whatsapp:`). |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | Credentials from your LinkedIn developer application. |
| `LINKEDIN_REDIRECT_URI` | Auth callback URL (default: `http://localhost:5000/api/linkedin/callback`). |

---

## 🧩 Google Sheets Layout Schema

Ensure your Google Sheet (named `Sheet1`) has the following headers in the first row (case-insensitive):

| Date | Time | Title | Analytics_Status | Message_Payload |
| :--- | :--- | :--- | :--- | :--- |
| `YYYY-MM-DD` | `HH:MM` | Topic/Idea | Metrics or prompt context | Generated draft content (filled by pipeline) |

---

## 🤝 Contribution Guidelines

1. Create a feature branch (`git checkout -b feature/amazing-feature`).
2. Commit your changes (`git commit -m 'Add amazing feature'`).
3. Push to your branch (`git push origin feature/amazing-feature`).
4. Open a Pull Request.

---

## 📄 License
This project is open-source and available under the MIT License.
