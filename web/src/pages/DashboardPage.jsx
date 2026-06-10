import { dashboardApi } from '../api/endpoints.js';
import { useFetch } from '../lib/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner, ErrorBanner, StatusBadge, Avatar, Empty } from '../components/ui.jsx';
import { STATUS_ORDER } from '../lib/constants.js';
import { humanizeAction, relativeTime } from '../lib/format.js';
import { Link } from '../router/router.jsx';

function StatCard({ label, value, tone }) {
  return (
    <div className={`stat-card ${tone ? `tone-${tone}` : ''}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function StatusBreakdown({ byStatus, total }) {
  return (
    <div className="card">
      <div className="card-head">
        <h3>Tasks by status</h3>
      </div>
      <div className="breakdown">
        {STATUS_ORDER.map((s) => {
          const count = byStatus[s] || 0;
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <div key={s} className="breakdown-row">
              <StatusBadge status={s} />
              <div className="bar-track">
                <div className={`bar-fill status-bg-${s}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="breakdown-count">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useFetch(() => dashboardApi.get(), []);

  if (loading) return <div className="page"><Spinner /></div>;
  if (error)
    return (
      <div className="page">
        <ErrorBanner error={error} onRetry={reload} />
      </div>
    );

  const d = data.data;
  const t = d.tasks;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">
            {d.scope === 'ADMIN' && 'Organization-wide overview'}
            {d.scope === 'MANAGER' && 'Your team’s workload and progress'}
            {d.scope === 'USER' && 'Your personal task overview'}
          </p>
        </div>
        <span className="badge scope">{d.scope}</span>
      </header>

      <div className="stat-grid">
        <StatCard label="Total tasks" value={t.total} />
        <StatCard label="In progress" value={t.byStatus.IN_PROGRESS || 0} tone="info" />
        <StatCard label="In review" value={t.byStatus.IN_REVIEW || 0} tone="warn" />
        <StatCard label="Done" value={t.byStatus.DONE || 0} tone="good" />
        <StatCard label="Overdue" value={t.overdue} tone={t.overdue ? 'bad' : undefined} />
        {d.scope === 'ADMIN' && (
          <>
            <StatCard label="Users" value={d.totals.users} />
            <StatCard label="Teams" value={d.totals.teams} />
          </>
        )}
      </div>

      <div className="grid-2">
        <StatusBreakdown byStatus={t.byStatus} total={t.total} />

        {d.scope === 'MANAGER' && (
          <div className="card">
            <div className="card-head">
              <h3>Team workload</h3>
              <span className="muted">by open priority weight</span>
            </div>
            {d.workload.length === 0 ? (
              <Empty>No team members yet.</Empty>
            ) : (
              <ul className="list">
                {d.workload.map((w) => (
                  <li key={w.user.userId} className="list-row">
                    <div className="row-main">
                      <Avatar name={w.user.name} />
                      <div>
                        <div className="row-title">{w.user.name}</div>
                        <div className="muted small">{w.user.email}</div>
                      </div>
                    </div>
                    <div className="row-meta">
                      <span className="pill">{w.openTasks} open</span>
                      <span className="pill pill-strong">score {w.workloadScore}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {d.scope === 'USER' && (
          <div className="card">
            <div className="card-head">
              <h3>Recent activity</h3>
              <Link to="/activity" className="link">
                View all
              </Link>
            </div>
            {(!d.recentActivity || d.recentActivity.length === 0) ? (
              <Empty>No recent activity.</Empty>
            ) : (
              <ul className="timeline">
                {d.recentActivity.map((a) => (
                  <li key={a.logId || a.createdAt} className="timeline-row">
                    <span className="dot" />
                    <div>
                      <div className="row-title">{humanizeAction(a.action)}</div>
                      <div className="muted small">{relativeTime(a.createdAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {d.scope === 'ADMIN' && (
          <div className="card">
            <div className="card-head">
              <h3>At a glance</h3>
            </div>
            <ul className="list">
              <li className="list-row">
                <span>Active users</span>
                <strong>{d.totals.users}</strong>
              </li>
              <li className="list-row">
                <span>Teams</span>
                <strong>{d.totals.teams}</strong>
              </li>
              <li className="list-row">
                <span>Total tasks</span>
                <strong>{d.totals.tasks}</strong>
              </li>
              <li className="list-row">
                <span>Signed in as</span>
                <strong>{user.name}</strong>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
