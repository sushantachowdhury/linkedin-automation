import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Save, 
  Send,
  ThumbsUp, 
  MessageSquare, 
  Repeat2, 
  Globe2,
  X,
  Sparkles
} from 'lucide-react';

function Editor({ posts, selectedDate, setSelectedDate, profile, backendUrl, showToast, onRefresh }) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const activePost = posts.find(p => p.date === selectedDate);

  // Initialize textarea when selected post changes
  useEffect(() => {
    if (activePost) {
      setContent(activePost.messagePayload || activePost.payload || '');
    } else {
      setContent('');
    }
  }, [selectedDate, posts]);

  const handleSave = async () => {
    if (!selectedDate) return;
    setSaving(true);
    try {
      const response = await fetch(`${backendUrl}/api/posts/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, payload: content })
      });
      if (response.ok) {
        showToast('Draft content saved successfully');
        onRefresh();
      } else {
        showToast('Failed to save changes.', 'error');
      }
    } catch (err) {
      showToast('Network error saving changes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (approveFlag) => {
    if (!selectedDate) return;
    setApproving(true);
    try {
      const response = await fetch(`${backendUrl}/api/posts/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, approved: approveFlag })
      });
      if (response.ok) {
        showToast(approveFlag ? 'Post marked as APPROVED for schedule' : 'Post unapproved');
        onRefresh();
      } else {
        showToast('Approval action failed.', 'error');
      }
    } catch (err) {
      showToast('Network error setting approval status.', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handlePublishImmediate = async () => {
    if (!selectedDate) return;
    const confirmPublish = window.confirm('Are you sure you want to publish this post to LinkedIn immediately?');
    if (!confirmPublish) return;

    setPublishing(true);
    try {
      // First save current content changes
      await fetch(`${backendUrl}/api/posts/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, payload: content })
      });

      // Mark approved first to bypass scheduler check
      await fetch(`${backendUrl}/api/posts/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, approved: true })
      });

      // Trigger Publish immediately
      const response = await fetch(`${backendUrl}/api/posts/trigger-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, step: 'publish' })
      });

      const data = await response.json();
      if (response.ok) {
        showToast('Post successfully published to LinkedIn feed!');
        onRefresh();
      } else {
        showToast(data.error || 'Failed to publish post.', 'error');
      }
    } catch (err) {
      showToast('Network error triggering instant publish.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleSelectOption = async (index) => {
    try {
      const response = await fetch(`${backendUrl}/api/posts/select-option`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, index })
      });
      if (response.ok) {
        showToast(`Draft option ${index + 1} chosen successfully!`);
        onRefresh();
      } else {
        showToast('Failed to select option.', 'error');
      }
    } catch (err) {
      showToast('Network error selecting option.', 'error');
    }
  };

  const handleRejectOptions = async () => {
    const confirmCancel = window.confirm('Are you sure you want to discard these draft options? The post will return to Pending.');
    if (!confirmCancel) return;

    try {
      const response = await fetch(`${backendUrl}/api/posts/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate })
      });
      if (response.ok) {
        showToast('Draft options discarded successfully.');
        onRefresh();
      } else {
        showToast('Failed to discard draft options.', 'error');
      }
    } catch (err) {
      showToast('Network error discarding options.', 'error');
    }
  };

  const hasOptionsToSelect = activePost && 
    activePost.draftOptions && 
    Array.isArray(activePost.draftOptions) && 
    activePost.draftOptions.length > 0 && 
    !(activePost.messagePayload || activePost.payload);

  if (hasOptionsToSelect) {
    return (
      <div className="editor-layout" style={{ gridTemplateColumns: '1fr' }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={20} color="var(--accent-secondary)" />
                Choose LinkedIn Post Alternative
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
                Topic: <strong>"{activePost.title}"</strong> | Scheduled for {activePost.date} ({activePost.time || '17:00'})
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Active Date:</label>
                <select 
                  className="form-input" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ padding: '8px 12px', minWidth: '150px' }}
                >
                  {posts.map(p => (
                    <option key={p.date} value={p.date}>
                      {p.date} ({p.status})
                    </option>
                  ))}
                </select>
              </div>
              <span className="badge awaiting">Awaiting Selection</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '10px' }}>
            {activePost.draftOptions.map((opt, idx) => (
              <div key={idx} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(30, 41, 59, 0.25)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    ✨ Option {idx + 1}
                  </span>
                </div>
                <div style={{ 
                  background: 'rgba(15, 23, 42, 0.4)', 
                  padding: '16px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid rgba(255,255,255,0.03)',
                  height: '300px', 
                  overflowY: 'auto',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  color: '#e2e8f0',
                  fontFamily: 'inherit'
                }}>
                  {opt}
                </div>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', justifyContent: 'center', gap: '8px', padding: '10px' }} 
                  onClick={() => handleSelectOption(idx)}
                >
                  <Check size={16} />
                  Choose Option {idx + 1}
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
            <button 
              className="btn" 
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', gap: '8px' }} 
              onClick={handleRejectOptions}
            >
              <X size={16} />
              Cancel & Discard Drafts
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-layout">
      {/* Left Column: Text editor */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Active Date:</label>
            <select 
              className="form-input" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ padding: '8px 12px', minWidth: '150px' }}
            >
              {posts.map(p => (
                <option key={p.date} value={p.date}>
                  {p.date} ({p.status})
                </option>
              ))}
            </select>
          </div>

          {activePost && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className={`badge ${activePost.status.toLowerCase().replace(' ', '')}`}>{activePost.status}</span>
              {activePost.approved && <span className="badge approved">Approved</span>}
            </div>
          )}
        </div>

        {activePost ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Topic: {activePost.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Scheduled: {activePost.time || '17:00'}</p>
            </div>

            <textarea
              className="editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Post draft text content..."
            ></textarea>

            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={handleSave} disabled={saving || activePost.status === 'Published'}>
                  <Save size={16} />
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>

                {activePost.approved ? (
                  <button className="btn btn-secondary" onClick={() => handleApprove(false)} disabled={approving || activePost.status === 'Published'}>
                    Unapprove
                  </button>
                ) : (
                  <button className="btn btn-success" onClick={() => handleApprove(true)} disabled={approving || activePost.status === 'Published' || !content}>
                    <Check size={16} />
                    {approving ? 'Approving...' : 'Approve for Schedule'}
                  </button>
                )}
              </div>

              <button className="btn btn-primary" onClick={handlePublishImmediate} disabled={publishing || activePost.status === 'Published' || !content}>
                <Send size={16} />
                {publishing ? 'Publishing...' : 'Publish Immediately'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Please select an active date from the schedule dropdown.
          </div>
        )}
      </div>

      {/* Right Column: LinkedIn Live Mockup */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>LinkedIn Mockup Feed Preview</h3>
        
        <div className="linkedin-mockup">
          <div className="li-header">
            <img className="li-avatar" src={profile.avatar} alt={profile.name} />
            <div className="li-meta">
              <span className="li-name">{profile.name}</span>
              <span className="li-headline">{profile.headline}</span>
              <div className="li-time-row">
                <span className="li-time">Today at 6:00 PM • Edited •</span>
                <Globe2 className="li-globe" />
              </div>
            </div>
          </div>

          <div className="li-content">
            {content || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Draft text is empty. Enter some content on the left to see the feed preview render live...</span>}
          </div>

          <div className="li-divider"></div>

          <div className="li-actions">
            <div className="li-action-btn">
              <ThumbsUp />
              <span>Like</span>
            </div>
            <div className="li-action-btn">
              <MessageSquare />
              <span>Comment</span>
            </div>
            <div className="li-action-btn">
              <Repeat2 />
              <span>Repost</span>
            </div>
            <div className="li-action-btn">
              <Send />
              <span>Send</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Editor;
