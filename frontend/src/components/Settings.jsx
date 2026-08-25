import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Database, 
  Mail, 
  MessageSquare,
  Key,
  ShieldCheck,
  Globe2
} from 'lucide-react';

// Custom inline SVG for LinkedIn because brand icons are deprecated in recent Lucide versions
const LinkedInIcon = ({ size = 16, style = {} }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    fill="currentColor" 
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
  >
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
);

function Settings({ settings, backendUrl, showToast, onRefresh }) {
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleInputChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${backendUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        showToast('Settings saved successfully');
        onRefresh();
      } else {
        showToast('Failed to save settings.', 'error');
      }
    } catch (err) {
      showToast('Network error saving settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectLinkedIn = async () => {
    const confirm = window.confirm('Are you sure you want to disconnect your LinkedIn account?');
    if (!confirm) return;

    try {
      const response = await fetch(`${backendUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          LINKEDIN_ACCESS_TOKEN: '',
          LINKEDIN_USER_URN: '',
          LINKEDIN_USER_NAME: '',
          LINKEDIN_USER_PICTURE: ''
        })
      });
      if (response.ok) {
        showToast('LinkedIn profile disconnected.');
        onRefresh();
      } else {
        showToast('Failed to disconnect LinkedIn.', 'error');
      }
    } catch (err) {
      showToast('Network error disconnecting LinkedIn.', 'error');
    }
  };

  const hasLinkedInCreds = formData.LINKEDIN_CLIENT_ID;
  const isLinkedInConnected = settings.LINKEDIN_ACCESS_TOKEN;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* LinkedIn Integration Panel */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LinkedInIcon size={20} style={{ color: '#0077b5' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>LinkedIn Account Connection</h3>
        </div>

        {isLinkedInConnected ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '20px', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img 
                src={settings.LINKEDIN_USER_PICTURE || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120'} 
                alt="Avatar" 
                style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid var(--color-success)' }} 
              />
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 700 }}>{settings.LINKEDIN_USER_NAME}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '2px' }}>URN: {settings.LINKEDIN_USER_URN}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-success)', fontSize: '12px', fontWeight: 700, marginTop: '6px' }}>
                  <ShieldCheck size={14} /> Linked via OAuth 2.0
                </div>
              </div>
            </div>
            
            <button className="btn btn-secondary" onClick={handleDisconnectLinkedIn} style={{ color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              Disconnect Account
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Connect LinkedIn Profile</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', maxWidth: '500px' }}>
                Linking your account allows the automated scheduler to publish posts on your behalf. Configure your Client ID and Client Secret below, then click connect.
              </p>
            </div>

            {hasLinkedInCreds ? (
              <a href={`${backendUrl}/api/linkedin/auth`} className="btn btn-primary">
                <LinkedInIcon size={16} />
                &nbsp;Connect Profile
              </a>
            ) : (
              <button className="btn btn-primary" disabled title="Configure Client ID below to connect">
                Configure Credentials Below
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SettingsIcon style={{ color: 'var(--accent-secondary)' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>API & Integration Credentials</h3>
        </div>

        <div className="settings-form">
          {/* Gemini section */}
          <div className="form-group full-width" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '20px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Key size={16} style={{ color: 'var(--color-info)' }} />
              <h4 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gemini AI Config</h4>
            </div>
            <div className="form-group">
              <label>Gemini API Key</label>
              <input 
                type="password" 
                className="form-input" 
                value={formData.GEMINI_API_KEY || ''} 
                onChange={(e) => handleInputChange('GEMINI_API_KEY', e.target.value)} 
                placeholder="Enter Gemini API key..." 
              />
            </div>
          </div>

          {/* Sheets section */}
          <div className="form-group full-width" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '20px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Database size={16} style={{ color: 'var(--accent-secondary)' }} />
              <h4 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Google Sheets Config</h4>
            </div>
            <div className="settings-form">
              <div className="form-group">
                <label>Google Sheet Spreadsheet ID</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.GOOGLE_SHEET_ID || ''} 
                  onChange={(e) => handleInputChange('GOOGLE_SHEET_ID', e.target.value)} 
                  placeholder="Enter Spreadsheet ID..." 
                />
              </div>
              <div className="form-group">
                <label>Google Service Account JSON</label>
                <textarea 
                  className="form-input" 
                  value={formData.GOOGLE_SERVICE_ACCOUNT_JSON || ''} 
                  onChange={(e) => handleInputChange('GOOGLE_SERVICE_ACCOUNT_JSON', e.target.value)} 
                  placeholder='Paste Service Account Private Key JSON string here {"type": "service_account", ...}'
                  rows={2}
                  style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          {/* Email section */}
          <div className="form-group" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Mail size={16} style={{ color: 'var(--color-warning)' }} />
              <h4 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SMTP Email Alerts</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label>SMTP Host</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.EMAIL_HOST || ''} 
                  onChange={(e) => handleInputChange('EMAIL_HOST', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>SMTP Port</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.EMAIL_PORT || ''} 
                  onChange={(e) => handleInputChange('EMAIL_PORT', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>SMTP Username (Sender Email)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.EMAIL_USER || ''} 
                  onChange={(e) => handleInputChange('EMAIL_USER', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>SMTP Password (App Password)</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={formData.EMAIL_PASS || ''} 
                  onChange={(e) => handleInputChange('EMAIL_PASS', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Recipient Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={formData.EMAIL_TO || ''} 
                  onChange={(e) => handleInputChange('EMAIL_TO', e.target.value)} 
                />
              </div>
            </div>
          </div>

          {/* Twilio section */}
          <div className="form-group" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <MessageSquare size={16} style={{ color: 'var(--color-success)' }} />
              <h4 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Twilio WhatsApp Config</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label>Twilio Account SID</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.TWILIO_ACCOUNT_SID || ''} 
                  onChange={(e) => handleInputChange('TWILIO_ACCOUNT_SID', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Twilio Auth Token</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={formData.TWILIO_AUTH_TOKEN || ''} 
                  onChange={(e) => handleInputChange('TWILIO_AUTH_TOKEN', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Twilio WhatsApp From (Sender)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.TWILIO_WHATSAPP_FROM || ''} 
                  onChange={(e) => handleInputChange('TWILIO_WHATSAPP_FROM', e.target.value)} 
                  placeholder="whatsapp:+14155238886"
                />
              </div>
              <div className="form-group">
                <label>WhatsApp Target (Recipient)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.TWILIO_WHATSAPP_TO || ''} 
                  onChange={(e) => handleInputChange('TWILIO_WHATSAPP_TO', e.target.value)} 
                  placeholder="whatsapp:+918017129474"
                />
              </div>
            </div>
          </div>

          {/* LinkedIn API credentials */}
          <div className="form-group full-width" style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <LinkedInIcon size={16} style={{ color: '#0077b5' }} />
              <h4 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>LinkedIn Developer Credentials</h4>
            </div>
            <div className="settings-form">
              <div className="form-group">
                <label>LinkedIn Client ID</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.LINKEDIN_CLIENT_ID || ''} 
                  onChange={(e) => handleInputChange('LINKEDIN_CLIENT_ID', e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>LinkedIn Client Secret</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={formData.LINKEDIN_CLIENT_SECRET || ''} 
                  onChange={(e) => handleInputChange('LINKEDIN_CLIENT_SECRET', e.target.value)} 
                />
              </div>
              <div className="form-group full-width">
                <label>OAuth Redirect URI (Must match developer console setting)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.LINKEDIN_REDIRECT_URI || ''} 
                  onChange={(e) => handleInputChange('LINKEDIN_REDIRECT_URI', e.target.value)} 
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px', textAlign: 'right' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            Save All API Settings
          </button>
        </div>
      </form>

    </div>
  );
}

export default Settings;
