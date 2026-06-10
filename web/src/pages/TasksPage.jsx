import { useEffect, useMemo, useState } from 'react';
import { tasksApi, usersApi, teamsApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Link } from '../router/router.jsx';
import {
  Spinner,
  ErrorBanner,
  Empty,
  StatusBadge,
  PriorityBadge,
  Modal,
  Field,
} from '../components/ui.jsx';
import {
  STATUS_ORDER,
  PRIORITY_ORDER,
  TASK_PRIORITY,
  ROLES,
  can,
  PERMS,
} from '../lib/constants.js';
import { formatDate } from '../lib/format.js';

function CreateTaskModal({ onClose, onCreated, users, teams }) {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user.role === ROLES.ADMIN;
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: TASK_PRIORITY.MEDIUM,
    teamId: user.teamId || '',
    assigneeId: '',
    dueDate: '',
  });
  const [busy, setBusy] = useState(false);

  const effectiveTeam = isAdmin ? form.teamId : user.teamId;
  const assignableUsers = useMemo(
    () => (users || []).filter((u) => !effectiveTeam || u.teamId === effectiveTeam),
    [users, effectiveTeam]
  );

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
      };
      if (isAdmin && form.teamId) payload.teamId = form.teamId;
      if (form.assigneeId) payload.assigneeId = form.assigneeId;
      if (form.dueDate) payload.dueDate = new Date(form.dueDate).toISOString();
      const res = await tasksApi.create(payload);
      toast.success('Task created');
      onCreated(res.data.task);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="New task"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" form="create-task" disabled={busy || !form.title.trim()}>
            {busy ? 'Creating…' : 'Create task'}
          </button>
        </>
      }
    >
      <form id="create-task" onSubmit={submit} className="form-grid">
        <Field label="Title">
          <input value={form.title} onChange={set('title')} placeholder="What needs doing?" required />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={set('description')} rows={3} />
        </Field>
        <div className="row-2">
          <Field label="Priority">
            <select value={form.priority} onChange={set('priority')}>
              {PRIORITY_ORDER.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due date">
            <input type="datetime-local" value={form.dueDate} onChange={set('dueDate')} />
          </Field>
        </div>
        {isAdmin && (
          <Field label="Team" hint={!form.teamId ? 'Required — admins must pick a team' : undefined}>
            <select value={form.teamId} onChange={set('teamId')}>
              <option value="">Select a team…</option>
              {(teams || []).map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Assignee" hint="Must belong to the task’s team">
          <select value={form.assigneeId} onChange={set('assigneeId')}>
            <option value="">Unassigned</option>
            {assignableUsers.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </Field>
      </form>
    </Modal>
  );
}

const emptyFilters = { status: '', priority: '', assigneeId: '', q: '' };

export default function TasksPage() {
  const { user } = useAuth();
  const toast = useToast();
  const canCreate = can(user.role, PERMS.TASK_CREATE);
  const canReadUsers = can(user.role, PERMS.USER_READ_ALL);

  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);

  const limit = 20;

  const load = async (opts = {}) => {
    setLoading(true);
    setError(null);
    const p = opts.page ?? page;
    try {
      const res = await tasksApi.list({ ...cleanFilters(filters), page: p, limit });
      setData(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canReadUsers) {
      usersApi.list().then((r) => setUsers(r.data.users)).catch(() => {});
      teamsApi.list().then((r) => setTeams(r.data.teams)).catch(() => {});
    }
  }, [canReadUsers]);

  useEffect(() => {
    load({ page: 1 });
    setPage(1);
  }, [filters]);

  const setFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const meta = data?.meta || {};
  const tasks = data?.data?.tasks || [];

  const userName = (id) => users.find((u) => u.userId === id)?.name;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Tasks</h1>
          <p className="muted">
            {meta.total != null ? `${meta.total} task${meta.total === 1 ? '' : 's'} in scope` : ' '}
          </p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New task
          </button>
        )}
      </header>

      <div className="filters">
        <input
          className="filter-search"
          placeholder="Search title or description…"
          value={filters.q}
          onChange={setFilter('q')}
        />
        <select value={filters.status} onChange={setFilter('status')}>
          <option value="">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select value={filters.priority} onChange={setFilter('priority')}>
          <option value="">All priorities</option>
          {PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {canReadUsers && (
          <select value={filters.assigneeId} onChange={setFilter('assigneeId')}>
            <option value="">Any assignee</option>
            {users.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.name}
              </option>
            ))}
          </select>
        )}
        {JSON.stringify(filters) !== JSON.stringify(emptyFilters) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters(emptyFilters)}>
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBanner error={error} onRetry={load} />
      ) : tasks.length === 0 ? (
        <Empty>No tasks match these filters.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                {canReadUsers && <th>Assignee</th>}
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.taskId} className="clickable">
                  <td>
                    <Link to={`/tasks/${task.taskId}`} className="cell-link">
                      {task.title}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={task.status} />
                  </td>
                  <td>
                    <PriorityBadge priority={task.priority} />
                  </td>
                  {canReadUsers && (
                    <td className="muted">
                      {task.assigneeId ? userName(task.assigneeId) || '—' : 'Unassigned'}
                    </td>
                  )}
                  <td className="muted">{task.dueDate ? formatDate(task.dueDate) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (meta.page > 1 || meta.hasMore) && (
        <div className="pager">
          <button
            className="btn btn-ghost btn-sm"
            disabled={meta.page <= 1}
            onClick={() => {
              const p = page - 1;
              setPage(p);
              load({ page: p });
            }}
          >
            ← Prev
          </button>
          <span className="muted small">Page {meta.page}</span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={!meta.hasMore}
            onClick={() => {
              const p = page + 1;
              setPage(p);
              load({ page: p });
            }}
          >
            Next →
          </button>
        </div>
      )}

      {showCreate && (
        <CreateTaskModal
          users={users}
          teams={teams}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load({ page: 1 });
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

function cleanFilters(f) {
  const out = {};
  Object.entries(f).forEach(([k, v]) => {
    if (v) out[k] = v;
  });
  return out;
}
