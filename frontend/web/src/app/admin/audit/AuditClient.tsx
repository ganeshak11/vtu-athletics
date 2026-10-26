'use client';

interface Props {
  logs: any[];
}

export default function AuditClient({ logs }: Props) {
  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-title-group">
          <h2>Administrative Action Audit Log</h2>
          <p>Immutable operational audit trail of registration toggles, financial decisions, and bib generation events</p>
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '180px' }}>Timestamp</th>
              <th style={{ width: '180px' }}>Action Type</th>
              <th style={{ width: '140px' }}>Performed By</th>
              <th>Action Metadata & Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📜</div>
                  <div style={{ fontWeight: 600, color: '#475569' }}>No audit events logged yet</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                    Actions performed in the admin portal will automatically be recorded here.
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                let badgeColor = '#64748b';
                let badgeBg = '#f1f5f9';

                if (log.action.includes('OPEN')) {
                  badgeColor = '#059669';
                  badgeBg = '#ecfdf5';
                } else if (log.action.includes('CLOSE')) {
                  badgeColor = '#dc2626';
                  badgeBg = '#fef2f2';
                } else if (log.action.includes('BIB')) {
                  badgeColor = '#2563eb';
                  badgeBg = '#eff6ff';
                } else if (log.action.includes('APPROVED')) {
                  badgeColor = '#16a34a';
                  badgeBg = '#dcfce7';
                } else if (log.action.includes('REJECTED')) {
                  badgeColor = '#b91c1c';
                  badgeBg = '#fee2e2';
                }

                return (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }} suppressHydrationWarning>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : 'Just now'}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          color: badgeColor,
                          background: badgeBg,
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>
                      {log.performed_by || 'Administrator'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#334155', fontFamily: 'monospace' }}>
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
