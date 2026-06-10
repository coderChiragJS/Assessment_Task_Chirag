import { useEffect, useState } from 'react';
import { insightsApi, teamsApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner, ErrorBanner, Empty, StatusBadge } from '../components/ui.jsx';
import { Link } from '../router/router.jsx';
import { ROLES } from '../lib/constants.js';

export default function InsightsPage() {
  const { user } = useAuth();
  const isAdmin = user.role === ROLES.ADMIN;

  const [teamId, setTeamId] = useState('');
  const [teams, setTeams] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (tid) => {
    setLoading(true);
    setError(null);
    try {
      const res = await insightsApi.bottlenecks(tid || undefined);
      setData(res.data);
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      teamsApi
        .list()
        .then((r) => {
          setTeams(r.data.teams);
          const first = r.data.teams[0]?.teamId || '';
          setTeamId(first);
          load(first);
        })
        .catch((err) => {
          setError(err);
          setLoading(false);
        });
    } else {
      load();
    }
  }, []);

  const maxAvg = Math.max(1, ...(data?.stages || []).map((s) => s.avgHoursInStatus));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Workflow Bottlenecks</h1>
          <p className="muted">Where work gets stuck — time spent in each stage</p>
        </div>
        {isAdmin && teams.length > 0 && (
          <select
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              load(e.target.value);
            }}
          >
            {teams.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </header>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBanner error={error} onRetry={() => load(teamId)} />
      ) : !data ? (
        <Empty>No data.</Empty>
      ) : (
        <>
          <div
            className={`card insight-hero ${data.bottleneck?.status ? 'has-bottleneck' : ''}`}
          >
            <div className="insight-icon">◭</div>
            <div>
              <div className="muted small">DIAGNOSIS</div>
              <p className="insight-text">{data.bottleneck?.insight}</p>
              {data.bottleneck?.status && (
                <div className="insight-meta">
                  <StatusBadge status={data.bottleneck.status} />
                  <span className="pill pill-strong">
                    avg {data.bottleneck.avgHoursInStatus}h in stage
                  </span>
                  {data.bottleneck.severityVsOthers && (
                    <span className="pill pill-bad">
                      {data.bottleneck.severityVsOthers}× slower
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-head">
                <h3>Average time per stage</h3>
                <span className="muted small">hours</span>
              </div>
              <div className="breakdown">
                {data.stages.map((s) => (
                  <div key={s.status} className="breakdown-row">
                    <StatusBadge status={s.status} />
                    <div className="bar-track">
                      <div
                        className={`bar-fill status-bg-${s.status}`}
                        style={{ width: `${Math.round((s.avgHoursInStatus / maxAvg) * 100)}%` }}
                      />
                    </div>
                    <span className="breakdown-count">
                      {s.avgHoursInStatus}h
                      <span className="muted small"> ({s.samples})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <h3>Most stuck tasks</h3>
              </div>
              {data.stuckTasks.length === 0 ? (
                <Empty>Nothing notably stuck right now.</Empty>
              ) : (
                <ul className="list">
                  {data.stuckTasks.map((t) => (
                    <li key={t.taskId} className="list-row">
                      <div className="row-main">
                        <Link to={`/tasks/${t.taskId}`} className="cell-link">
                          {t.title}
                        </Link>
                        <StatusBadge status={t.status} />
                      </div>
                      <span className="pill pill-bad">{t.hoursInStatus}h</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
