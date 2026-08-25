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
