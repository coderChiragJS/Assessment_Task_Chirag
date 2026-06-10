import { useEffect, useState } from 'react';
import { activityApi } from '../api/endpoints.js';
import { Spinner, ErrorBanner, Empty } from '../components/ui.jsx';
import { formatDateTime, humanizeAction } from '../lib/format.js';

function describe(a) {
  const m = a.metadata || {};
  switch (a.action) {
    case 'TASK_STATUS_CHANGED':
      return `${m.from} → ${m.to}`;
    case 'COMMENT_ADDED':
      return `“${m.preview || ''}”`;
    case 'TASK_CREATED':
      return m.title ? `“${m.title}”` : '';
    case 'TASK_UPDATED':
      return m.fields ? m.fields.join(', ') : '';
    default:
      return '';
  }
}

export default function ActivityPage() {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [nextCursor, setNextCursor] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (cur) => {
    setLoading(true);
    setError(null);
    try {
      const res = await activityApi.mine(cur);
      setItems((prev) => (cur ? [...prev, ...res.data.activity] : res.data.activity));
      setNextCursor(res.meta?.nextCursor || null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(null);
  }, []);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>My Activity</h1>
          <p className="muted">Everything you’ve done, newest first</p>
        </div>
      </header>

      {error && <ErrorBanner error={error} onRetry={() => load(cursor)} />}
      {loading && items.length === 0 ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty>No activity yet.</Empty>
      ) : (
        <div className="card">
          <ul className="timeline">
            {items.map((a) => (
              <li key={a.logId} className="timeline-row">
                <span className="dot" />
                <div>
                  <div className="row-title">
                    {humanizeAction(a.action)} <span className="muted">{describe(a)}</span>
                  </div>
                  <div className="muted small">{formatDateTime(a.createdAt)}</div>
                </div>
              </li>
            ))}
          </ul>
          {nextCursor && (
            <button
              className="btn btn-ghost btn-block"
              disabled={loading}
              onClick={() => {
                setCursor(nextCursor);
                load(nextCursor);
              }}
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
