import React from 'react';
import { 
  ExternalLink, 
  Calendar, 
  Clock, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';

function SheetQueue({ posts, status, backendUrl, showToast, onRefresh, onSelectDate }) {
  const sheetId = status?.demoMode ? '' : posts[0]?.sheetId; // not strictly needed, we fetch from backend settings

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Banner info */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Active LinkedIn Profile Pipeline
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Automating publishing for: <a href="https://www.linkedin.com/in/sushanta-chowdhury-4818132a" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              Sushanta Chowdhury <ExternalLink size={12} />
            </a>
          </p>
        </div>

        {status?.demoMode ? (
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Google Sheet link: <strong>Mock Local Sheet (Demo Mode)</strong>
          </div>
        ) : (
          <a 
            href={`https://docs.google.com/spreadsheets/d/${status?.googleSheetId || ''}`} 
            target="_blank" 
            rel="noreferrer"
            style={{ color: 'var(--accent-secondary)', textDecoration: 'none', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
          >
            Open Live Google Sheet <ExternalLink size={14} />
          </a>
        )}
      </div>

      {/* Queue Table */}
      <div className="glass-panel table-container">
        <table className="queue-table">
          <thead>
            <tr>
              <th><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Date</div></th>
              <th><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> Time</div></th>
              <th>Topic / Post Title</th>
              <th>Status</th>
              <th>Approved?</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{post.date}</td>
                <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{post.time || '17:00'}</td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {post.title}
                </td>
                <td>
                  <span className={`badge ${post.status.toLowerCase().replace(' ', '')}`}>
                    {post.status}
                  </span>
                </td>
                <td>
                  {post.approved ? (
                    <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>YES</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>NO</span>
                  )}
                </td>
                <td>
                  <div className="action-row">
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => onSelectDate(post.date)}
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      Edit / Review
                      <ArrowRight size={12} />
                    </button>
                    {post.status === 'Published' && post.linkedinPostId && (
                      <a 
                        className="btn btn-primary"
                        href={post.linkedinPostId.startsWith('mock_') ? 'https://www.linkedin.com' : `https://www.linkedin.com/feed/update/${post.linkedinPostId}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}
                      >
                        <TrendingUp size={12} />
                        View Feed
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default SheetQueue;
