import React from 'react';
import { 
  Terminal, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle 
} from 'lucide-react';

function Analytics({ logs }) {
  const getLogIcon = (type) => {
    const category = type.split('_')[1] || 'INFO';
    switch (category) {
      case 'SUCCESS':
        return <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />;
      case 'WARN':
        return <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />;
      case 'ERROR':
        return <XCircle size={16} style={{ color: 'var(--color-danger)' }} />;
      default:
        return <Info size={16} style={{ color: 'var(--color-info)' }} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Terminal style={{ color: 'var(--accent-secondary)' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>System Execution Log Audit</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '-10px' }}>
          Real-time logs for backend cron activities, Google Sheet checks, Gemini drafting, and LinkedIn posting.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div 
                className={`log-item ${log.type.toLowerCase().split('_')[1] || 'info'}`} 
                key={index}
                style={{ padding: '16px', gap: '16px', alignItems: 'flex-start' }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexGrow: 1 }}>
                  {getLogIcon(log.type)}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="log-tag">{log.type}</span>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{log.message}</span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <pre style={{ margin: '8px 0 0 0', background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '4px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                  <div style={{ marginTop: '2px' }}>{new Date(log.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No system activity logs found.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default Analytics;
