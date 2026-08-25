import React, { useState } from 'react';
import { 
  FileText, 
  Send, 
  CheckCircle, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Cpu,
  AlertCircle
} from 'lucide-react';

function Overview({ status, posts, logs, backendUrl, showToast, onRefresh, onSelectDate }) {
  const [triggering, setTriggering] = useState(null);
  
  const todayStr = status?.today;
  const todayPost = posts.find(p => p.date === todayStr);

  // Statistics calculation
  const totalPosts = posts.length;
  const draftedPosts = posts.filter(p => p.status === 'Drafted' || p.status === 'Awaiting Approval' || p.status === 'Approved').length;
  const approvedPosts = posts.filter(p => p.approved).length;
  const publishedPosts = posts.filter(p => p.status === 'Published').length;

  // Determine stage index based on today's post status
  // Steps: 
  // 0 - Not started
  // 1 - Drafted (at 17:00)
  // 2 - Alerts sent / Awaiting Approval (at 17:15)
  // 3 - Approved
  // 4 - Published (at 18:00)
  let currentStageIndex = 0;
  if (todayPost) {
    if (todayPost.status === 'Drafted') currentStageIndex = 1;
    else if (todayPost.status === 'Awaiting Approval') currentStageIndex = 2;
    else if (todayPost.approved && todayPost.status !== 'Published') currentStageIndex = 3;
    else if (todayPost.status === 'Published') currentStageIndex = 4;
  }

  const triggerStep = async (stepName) => {
    if (!todayPost) {
      showToast('No scheduled post configured for today.', 'error');
      return;
    }

    setTriggering(stepName);
    try {
      const response = await fetch(`${backendUrl}/api/posts/trigger-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr, step: stepName })
      });

      const data = await response.json();
      if (response.ok) {
        showToast(
          stepName === 'generate' ? 'Content generated successfully!' :
          stepName === 'alert' ? 'Email and WhatsApp alerts dispatched!' :
          'Post published successfully to LinkedIn!'
        );
        onRefresh();
      } else {
        showToast(data.error || 'Trigger action failed.', 'error');
      }
    } catch (err) {
      showToast('Network error triggering workflow step.', 'error');
    } finally {
      setTriggering(null);
    }
  };

  const getStepClass = (index) => {
    if (currentStageIndex > index) return 'completed';
    if (currentStageIndex === index) return 'active';
    return '';
  };

  const renderLogs = logs.slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Stats row */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-header">
            <span>Total Queue Posts</span>
            <div className="stat-icon" style={{ color: 'var(--color-info)' }}><Clock size={18} /></div>
          </div>
          <span className="stat-value">{totalPosts}</span>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <span>Drafted Content</span>
            <div className="stat-icon" style={{ color: 'var(--accent-secondary)' }}><FileText size={18} /></div>
          </div>
          <span className="stat-value">{draftedPosts}</span>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <span>Approved by User</span>
            <div className="stat-icon" style={{ color: 'var(--color-success)' }}><CheckCircle size={18} /></div>
          </div>
          <span className="stat-value">{approvedPosts}</span>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            <span>Published Posts</span>
            <div className="stat-icon" style={{ color: 'var(--color-success)' }}><TrendingUp size={18} /></div>
          </div>
          <span className="stat-value">{publishedPosts}</span>
        </div>
      </div>

      {/* Today's Timeline status */}
      <div className="glass-panel timeline-card">
        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Today's Publishing Timeline ({todayStr})</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '-10px' }}>
          Schedule cycles execute automatically. You can also trigger them manually using the actions below.
        </p>

        <div className="timeline-container">
          <div className="timeline-line"></div>
          <div className="timeline-line-progress" style={{ width: `${(Math.min(currentStageIndex, 3) / 3) * 100}%` }}></div>
          
          <div className={`timeline-step ${getStepClass(0)}`}>
            <div className="step-node">1</div>
            <span className="step-time">16:30</span>
            <span className="step-name">Draft Post</span>
          </div>

          <div className={`timeline-step ${getStepClass(1)}`}>
            <div className="step-node">2</div>
            <span className="step-time">16:45</span>
            <span className="step-name">Email/WA Alerts</span>
          </div>

          <div className={`timeline-step ${getStepClass(2)}`}>
            <div className="step-node">3</div>
            <span className="step-time">Pending Approval</span>
            <span className="step-name">User Review</span>
          </div>

          <div className={`timeline-step ${getStepClass(4)}`}>
            <div className="step-node">4</div>
            <span className="step-time">18:00</span>
            <span className="step-name">LinkedIn Publish</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => triggerStep('generate')} 
            disabled={triggering !== null || !todayPost || currentStageIndex >= 4}
          >
            <Cpu size={16} />
            {triggering === 'generate' ? 'Drafting...' : '16:30: Generate Draft'}
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={() => triggerStep('alert')} 
            disabled={triggering !== null || !todayPost || currentStageIndex < 1 || currentStageIndex >= 4}
          >
            <Send size={16} />
            {triggering === 'alert' ? 'Sending...' : '16:45: Dispatch Review Alerts'}
          </button>

          <button 
            className="btn btn-success" 
            onClick={() => triggerStep('publish')} 
            disabled={triggering !== null || !todayPost || currentStageIndex < 2 || !todayPost.approved || currentStageIndex >= 4}
          >
            <TrendingUp size={16} />
            {triggering === 'publish' ? 'Posting...' : '18:00: Publish to LinkedIn'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        
        {/* Today's Post summary card */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Today's Scheduled Post Details</h3>
          
          {todayPost ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1 }}>
              <div>
                <span className={`badge ${todayPost.status.toLowerCase().replace(' ', '')}`}>{todayPost.status}</span>
                <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Approved: <strong>{todayPost.approved ? 'Yes' : 'No'}</strong>
                </span>
              </div>
              
              <h4 style={{ fontSize: '16px', fontWeight: 600 }}>{todayPost.title}</h4>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {(todayPost.messagePayload || todayPost.payload) ? (todayPost.messagePayload || todayPost.payload) : 'Post draft content is empty. Trigger drafting or click view below to write manually.'}
              </p>

              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
                <button className="btn btn-secondary" onClick={() => onSelectDate(todayPost.date)} style={{ width: '100%', justifyContent: 'center' }}>
                  Open Approval Editor
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px', color: 'var(--text-muted)' }}>
              <AlertCircle size={40} style={{ marginBottom: '12px' }} />
              <p>No post scheduled for today ({todayStr})</p>
            </div>
          )}
        </div>

        {/* Audit Logs */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Recent Activity</h3>
          
          <div className="logs-list">
            {renderLogs.length > 0 ? (
              renderLogs.map((log, idx) => (
                <div className={`log-item ${log.type.toLowerCase().split('_')[1] || 'info'}`} key={idx}>
                  <div className="log-meta">
                    <span className="log-tag">{log.type}</span>
                    <span style={{ fontWeight: 500 }}>{log.message}</span>
                  </div>
                  <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No activity logged yet.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

export default Overview;
