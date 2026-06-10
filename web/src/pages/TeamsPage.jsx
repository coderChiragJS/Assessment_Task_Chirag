import { useEffect, useState } from 'react';
import { teamsApi, usersApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  Spinner,
  ErrorBanner,
  Empty,
  Avatar,
  RoleBadge,
  Modal,
  Field,
} from '../components/ui.jsx';
import { ROLES, can, PERMS } from '../lib/constants.js';

function CreateTeamModal({ onClose, onCreated, users }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [managerId, setManagerId] = useState('');
  const [busy, setBusy] = useState(false);
  const managers = users.filter((u) => u.role === ROLES.MANAGER || u.role === ROLES.ADMIN);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { name: name.trim() };
      if (managerId) payload.managerId = managerId;
      const res = await teamsApi.create(payload);
      toast.success('Team created');
      onCreated(res.data.team);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="New team"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" form="create-team" disabled={busy || !name.trim()}>
            {busy ? 'Creating…' : 'Create team'}
          </button>
        </>
      }
    >
      <form id="create-team" onSubmit={submit} className="form-grid">
        <Field label="Team name">
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Manager" hint="Optional — must be a MANAGER or ADMIN">
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">No manager</option>
            {managers.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </Field>
      </form>
    </Modal>
  );
}

export default function TeamsPage() {
  const { user } = useAuth();
  const canManage = can(user.role, PERMS.TEAM_MANAGE);
  const canReadUsers = can(user.role, PERMS.USER_READ_ALL);

  const [teams, setTeams] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [users, setUsers] = useState([]);

  const loadTeams = async () => {
    setError(null);
    try {
      const res = await teamsApi.list();
      setTeams(res.data.teams);
      if (res.data.teams[0]) select(res.data.teams[0].teamId);
    } catch (err) {
      setError(err);
    }
  };

  const select = async (teamId) => {
    setSelected(teamId);
    setDetailLoading(true);
    try {
      const res = await teamsApi.get(teamId);
      setDetail(res.data.team);
    } catch (err) {
      setError(err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
    if (canReadUsers) usersApi.list().then((r) => setUsers(r.data.users)).catch(() => {});
  }, []);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Teams</h1>
          <p className="muted">{teams ? `${teams.length} team${teams.length === 1 ? '' : 's'}` : ' '}</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New team
          </button>
        )}
      </header>

      {error && <ErrorBanner error={error} onRetry={loadTeams} />}
      {teams == null ? (
        <Spinner />
      ) : teams.length === 0 ? (
        <Empty>No teams yet.</Empty>
      ) : (
        <div className="grid-master-detail">
          <div className="card">
            <ul className="list selectable">
              {teams.map((t) => (
                <li
                  key={t.teamId}
                  className={`list-row clickable ${selected === t.teamId ? 'selected' : ''}`}
                  onClick={() => select(t.teamId)}
                >
                  <div className="row-main">
                    <span className="team-mark">⬡</span>
                    <div className="row-title">{t.name}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            {detailLoading || !detail ? (
              <Spinner />
            ) : (
              <>
                <div className="card-head">
                  <h3>{detail.name}</h3>
                  <span className="muted small">
                    {detail.members.length} member{detail.members.length === 1 ? '' : 's'}
                  </span>
                </div>
                {detail.members.length === 0 ? (
                  <Empty>No members assigned to this team.</Empty>
                ) : (
                  <ul className="list">
                    {detail.members.map((m) => (
                      <li key={m.userId} className="list-row">
                        <div className="row-main">
                          <Avatar name={m.name} />
                          <div>
                            <div className="row-title">
                              {m.name}
                              {detail.managerId === m.userId && (
                                <span className="pill pill-strong tag-lead">Manager</span>
                              )}
                            </div>
                            <div className="muted small">{m.email}</div>
                          </div>
                        </div>
                        <RoleBadge role={m.role} />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showCreate && (
        <CreateTeamModal
          users={users}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            loadTeams();
          }}
        />
      )}
    </div>
  );
}
