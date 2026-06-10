import { useEffect, useState } from 'react';
import { usersApi, teamsApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Spinner, ErrorBanner, Empty, Avatar, Modal, Field } from '../components/ui.jsx';
import { ROLES, can, PERMS } from '../lib/constants.js';

function CreateUserModal({ onClose, onCreated, teams }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: ROLES.USER,
    teamId: '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      };
      if (form.teamId) payload.teamId = form.teamId;
      const res = await usersApi.create(payload);
      toast.success('User created');
      onCreated(res.data.user);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="New user"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" form="create-user" disabled={busy}>
            {busy ? 'Creating…' : 'Create user'}
          </button>
        </>
      }
    >
      <form id="create-user" onSubmit={submit} className="form-grid">
        <Field label="Name">
          <input value={form.name} onChange={set('name')} required />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} onChange={set('email')} required />
        </Field>
        <Field label="Password" hint="At least 6 characters">
          <input type="password" value={form.password} onChange={set('password')} required />
        </Field>
        <div className="row-2">
          <Field label="Role">
            <select value={form.role} onChange={set('role')}>
              {Object.values(ROLES).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Team">
            <select value={form.teamId} onChange={set('teamId')}>
              <option value="">No team</option>
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </form>
    </Modal>
  );
}

export default function UsersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canManage = can(user.role, PERMS.USER_MANAGE);

  const [users, setUsers] = useState(null);
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const teamName = (id) => teams.find((t) => t.teamId === id)?.name || '—';

  const load = async () => {
    setError(null);
    try {
      const [u, t] = await Promise.all([usersApi.list(), teamsApi.list()]);
      setUsers(u.data.users);
      setTeams(t.data.teams);
    } catch (err) {
      setError(err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (id, role) => {
    try {
      await usersApi.changeRole(id, role);
      setUsers((list) => list.map((u) => (u.userId === id ? { ...u, role } : u)));
      toast.success('Role updated');
    } catch (err) {
      toast.error(err);
    }
  };

  const assignTeam = async (id, teamId) => {
    try {
      await usersApi.assignTeam(id, teamId || null);
      setUsers((list) =>
        list.map((u) => (u.userId === id ? { ...u, teamId: teamId || null } : u))
      );
      toast.success('Team updated');
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Users</h1>
          <p className="muted">{users ? `${users.length} user${users.length === 1 ? '' : 's'}` : ' '}</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New user
          </button>
        )}
      </header>

      {error && <ErrorBanner error={error} onRetry={load} />}
      {users == null ? (
        <Spinner />
      ) : users.length === 0 ? (
        <Empty>No users found.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Team</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.userId}>
                  <td>
                    <div className="row-main">
                      <Avatar name={u.name} />
                      <div>
                        <div className="row-title">{u.name}</div>
                        <div className="muted small">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {canManage ? (
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u.userId, e.target.value)}
                        disabled={u.userId === user.id}
                      >
                        {Object.values(ROLES).map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      u.role
                    )}
                  </td>
                  <td>
                    {canManage ? (
                      <select
                        value={u.teamId || ''}
                        onChange={(e) => assignTeam(u.userId, e.target.value)}
                      >
                        <option value="">No team</option>
                        {teams.map((t) => (
                          <option key={t.teamId} value={t.teamId}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      teamName(u.teamId)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          teams={teams}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}
