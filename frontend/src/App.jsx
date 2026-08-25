import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Database, 
  Settings as SettingsIcon, 
  Terminal, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import Overview from './components/Overview';
import Editor from './components/Editor';
import SheetQueue from './components/SheetQueue';
import Analytics from './components/Analytics';
import Settings from './components/Settings';

const BACKEND_URL = 'http://localhost:5000';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [status, setStatus] = useState(null);
  const [posts, setPosts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [toast, setToast] = useState(null);

  // Parse URL parameters for direct navigation (e.g., from email alert)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    if (dateParam) {
      setSelectedDate(dateParam);
      setActiveTab('editor');
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    try {
      const [statusRes, postsRes, logsRes, settingsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/status`).then(r => r.json()),
        fetch(`${BACKEND_URL}/api/posts`).then(r => r.json()),
        fetch(`${BACKEND_URL}/api/logs`).then(r => r.json()),
        fetch(`${BACKEND_URL}/api/settings`).then(r => r.json())
      ]);

      setStatus(statusRes);
      setPosts(postsRes);
      setLogs(logsRes);
      setSettings(settingsRes);

      // Set default selected date if empty
      if (!selectedDate && postsRes.length > 0) {
        // Try to find today's post
        const todayStr = statusRes.today;
        const todayPost = postsRes.find(p => p.date === todayStr);
        if (todayPost) {
          setSelectedDate(todayPost.date);
        } else {
          setSelectedDate(postsRes[0].date);
        }
      }
    } catch (err) {
      console.error('Error fetching API data:', err);
      showToast('Could not connect to Express backend server.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    showToast('Dashboard data reloaded');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#090d16' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ border: '4px solid #1e293b', borderTop: '4px solid #8b5cf6', borderRadius: '50%', width: '50px', height: '50px', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
          <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>Loading pipeline dashboard...</p>
        </div>
      </div>
    );
  }

  // Profile metadata for Mockups
  const userProfile = {
    name: settings.LINKEDIN_USER_NAME || 'Sushanta Chowdhury',
    headline: 'Frontend Developer & UI/UX Specialist | Engineering Scalable Web Architectures',
    avatar: settings.LINKEDIN_USER_PICTURE || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120'
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">
            <LayoutDashboard size={22} />
          </div>
          <div className="logo-text">
            <h1>Antigravity</h1>
            <p>Publish Pipeline</p>
          </div>
        </div>

        <nav className="nav-menu">
          <a className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <LayoutDashboard />
            Overview
          </a>
          <a className={`nav-item ${activeTab === 'editor' ? 'active' : ''}`} onClick={() => setActiveTab('editor')}>
            <FileText />
            Post Editor
          </a>
          <a className={`nav-item ${activeTab === 'queue' ? 'active' : ''}`} onClick={() => setActiveTab('queue')}>
            <Database />
            Sheet Queue
          </a>
          <a className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
            <Terminal />
            Audit Logs
          </a>
          <a className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <SettingsIcon />
            API Settings
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="profile-card">
            <img className="profile-avatar" src={userProfile.avatar} alt={userProfile.name} />
            <div className="profile-info">
              <h4>{userProfile.name}</h4>
              <p title={userProfile.headline}>{userProfile.headline}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        <header className="page-header">
          <div className="page-title">
            <h2>
              {activeTab === 'overview' && 'System Overview'}
              {activeTab === 'editor' && 'Post Approval Editor'}
              {activeTab === 'queue' && 'Google Sheets Queue'}
              {activeTab === 'logs' && 'Audit Trails'}
              {activeTab === 'settings' && 'Integration Settings'}
            </h2>
            <p>Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {status?.demoMode && (
              <div className="banner">
                <AlertTriangle />
                <span>Demo Mode Active</span>
              </div>
            )}
            <button className="btn btn-secondary" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={refreshing ? 'spin-anim' : ''} size={16} />
              Refresh
            </button>
          </div>
        </header>

        {/* Content Pages */}
        {activeTab === 'overview' && (
          <Overview 
            status={status} 
            posts={posts} 
            logs={logs} 
            backendUrl={BACKEND_URL}
            showToast={showToast} 
            onRefresh={fetchData}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setActiveTab('editor');
            }}
          />
        )}
        {activeTab === 'editor' && (
          <Editor 
            posts={posts} 
            selectedDate={selectedDate} 
            setSelectedDate={setSelectedDate}
            profile={userProfile}
            backendUrl={BACKEND_URL}
            showToast={showToast}
            onRefresh={fetchData}
          />
        )}
        {activeTab === 'queue' && (
          <SheetQueue 
            posts={posts} 
            status={status}
            backendUrl={BACKEND_URL}
            showToast={showToast}
            onRefresh={fetchData}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setActiveTab('editor');
            }}
          />
        )}
        {activeTab === 'logs' && (
          <Analytics 
            logs={logs} 
          />
        )}
        {activeTab === 'settings' && (
          <Settings 
            settings={settings} 
            backendUrl={BACKEND_URL}
            showToast={showToast}
            onRefresh={fetchData}
          />
        )}
      </main>

      {/* Floating Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 24px',
          borderRadius: '8px',
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white',
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideUp 0.3s ease'
        }}>
          {toast.message}
        </div>
      )}

      {/* CSS Animation Keyframes Inject */}
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .spin-anim { animation: spin 1s linear infinite; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}

export default App;
