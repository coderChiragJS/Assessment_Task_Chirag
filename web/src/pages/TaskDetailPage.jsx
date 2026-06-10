import { useEffect, useMemo, useState } from 'react';
import { tasksApi, usersApi, commentsApi, activityApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Link, useRouter } from '../router/router.jsx';
import {
  Spinner,
  ErrorBanner,
  Empty,
  StatusBadge,
  PriorityBadge,
  Avatar,
  Modal,
  Field,
} from '../components/ui.jsx';
import {
  STATUS_TRANSITIONS,
  PRIORITY_ORDER,
  ROLES,
  can,
  PERMS,
} from '../lib/constants.js';
import { formatDate, formatDateTime, relativeTime, humanizeAction } from '../lib/format.js';

function describeActivity(a) {
  const m = a.metadata || {};
  switch (a.action) {
    case 'TASK_STATUS_CHANGED':
      return `moved status ${m.from} → ${m.to}`;
    case 'TASK_ASSIGNED':
      return 'reassigned the task';
    case 'TASK_UPDATED':
      return `updated ${m.fields ? m.fields.join(', ') : 'fields'}`;
    case 'COMMENT_ADDED':
      return `commented: “${m.preview || ''}”`;
    case 'TASK_CREATED':
      return 'created the task';
    default:
      return humanizeAction(a.action);
  }
}

function EditTaskModal({ task, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.slice(0, 16) : '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const patch = {
        title: form.title.trim(),
        description: form.description,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      };
      const res = await tasksApi.update(task.taskId, patch);
      toast.success('Task updated');
      onSaved(res.data.task);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Edit task"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" form="edit-task" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </>
      }
    >
      <form id="edit-task" onSubmit={submit} className="form-grid">
        <Field label="Title">
          <input value={form.title} onChange={set('title')} required />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={set('description')} rows={4} />
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
      </form>
    </Modal>
  );
}

export default function TaskDetailPage({ taskId }) {
  const { user } = useAuth();
  const toast = useToast();
  const { navigate } = useRouter();

  const [task, setTask] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState('comments');
  const [statusBusy, setStatusBusy] = useState(false);

  const canReadUsers = can(user.role, PERMS.USER_READ_ALL);
  const canManage =
    user.role === ROLES.ADMIN ||
    (user.role === ROLES.MANAGER && task && task.teamId === user.teamId);
  const isAssignee = task && task.assigneeId === user.id;
  const canChangeStatus = canManage || isAssignee;
  const canAssign = canManage && can(user.role, PERMS.TASK_ASSIGN);
  const canDelete = canManage && can(user.role, PERMS.TASK_DELETE);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tasksApi.get(taskId);
      setTask(res.data.task);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (canReadUsers) usersApi.list().then((r) => setUsers(r.data.users)).catch(() => {});
  }, [taskId]);

  const userName = (id) => {
    if (!id) return 'Unassigned';
    if (id === user.id) return `${user.name} (you)`;
    return users.find((u) => u.userId === id)?.name || id.slice(0, 8);
  };

  const assignableUsers = useMemo(
    () => users.filter((u) => !task || u.teamId === task.teamId),
    [users, task]
  );

  const changeStatus = async (next) => {
    setStatusBusy(true);
    try {
      const res = await tasksApi.changeStatus(taskId, next);
      setTask(res.data.task);
      toast.success(`Status → ${next.replace('_', ' ')}`);
    } catch (err) {
      toast.error(err);
    } finally {
      setStatusBusy(false);
    }
  };

  const assign = async (assigneeId) => {
    if (!assigneeId) return;
    try {
      const res = await tasksApi.assign(taskId, assigneeId);
      setTask((t) => ({ ...t, assigneeId: res.data.task.assigneeId }));
      toast.success('Task reassigned');
    } catch (err) {
      toast.error(err);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    try {
      await tasksApi.remove(taskId);
      toast.success('Task deleted');
      navigate('/tasks');
    } catch (err) {
      toast.error(err);
    }
  };

  if (loading) return <div className="page"><Spinner /></div>;
  if (error)
    return (
      <div className="page">
        <Link to="/tasks" className="link">← Back to tasks</Link>
        <ErrorBanner error={error} onRetry={load} />
      </div>
    );

  const nextStatuses = STATUS_TRANSITIONS[task.status] || [];

  return (
    <div className="page">
      <Link to="/tasks" className="link">← Back to tasks</Link>

      <header className="page-head detail-head">
        <div>
          <div className="detail-badges">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
          <h1>{task.title}</h1>
        </div>
        <div className="detail-actions">
          {canManage && (
            <button className="btn btn-ghost" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          {canDelete && (
            <button className="btn btn-danger" onClick={remove}>
              Delete
            </button>
          )}
        </div>
      </header>

      <div className="grid-detail">
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h3>Description</h3>
            </div>
            <p className="prose">{task.description || <span className="muted">No description.</span>}</p>
          </div>

          {canChangeStatus && (
            <div className="card">
              <div className="card-head">
                <h3>Move status</h3>
                <span className="muted small">from {task.status.replace('_', ' ')}</span>
              </div>
              {nextStatuses.length === 0 ? (
                <Empty>No transitions available.</Empty>
              ) : (
                <div className="status-actions">
                  {nextStatuses.map((s) => (
                    <button
                      key={s}
                      className={`btn status-btn status-bd-${s}`}
                      disabled={statusBusy}
                      onClick={() => changeStatus(s)}
                    >
                      → {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="card">
            <div className="tabs tabs-inline">
              <button
                className={`tab ${tab === 'comments' ? 'active' : ''}`}
                onClick={() => setTab('comments')}
              >
                Comments
              </button>
              <button
                className={`tab ${tab === 'activity' ? 'active' : ''}`}
                onClick={() => setTab('activity')}
              >
                Activity
              </button>
            </div>
            {tab === 'comments' ? (
              <Comments taskId={taskId} describe={describeActivity} />
            ) : (
              <ActivityFeed taskId={taskId} userName={userName} describe={describeActivity} />
            )}
          </div>
        </div>

        <aside className="stack">
          <div className="card">
            <div className="card-head">
              <h3>Details</h3>
            </div>
            <dl className="defs">
              <div>
                <dt>Assignee</dt>
                <dd>
                  <Avatar name={userName(task.assigneeId)} />
                  <span>{userName(task.assigneeId)}</span>
                </dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd>{task.dueDate ? formatDate(task.dueDate) : '—'}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDateTime(task.createdAt)}</dd>
              </div>
              <div>
                <dt>Last update</dt>
                <dd>{relativeTime(task.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {canAssign && (
            <div className="card">
              <div className="card-head">
                <h3>Reassign</h3>
              </div>
              <select
                value={task.assigneeId || ''}
                onChange={(e) => assign(e.target.value)}
              >
                <option value="">Select assignee…</option>
                {assignableUsers.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.name}
                  </option>
                ))}
              </select>
              {assignableUsers.length === 0 && (
                <p className="muted small">No users in this team yet.</p>
              )}
            </div>
          )}
        </aside>
      </div>

      {editing && (
        <EditTaskModal
          task={task}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setTask((t) => ({ ...t, ...updated }));
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

function Comments({ taskId }) {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const res = await commentsApi.list(taskId);
      setItems(res.data.comments);
    } catch (err) {
      setError(err);
    }
  };

  useEffect(() => {
    load();
  }, [taskId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await commentsApi.add(taskId, body.trim());
      setBody('');
      await load();
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="comments">
      <form onSubmit={submit} className="comment-form">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
        />
        <button className="btn btn-primary btn-sm" disabled={busy || !body.trim()}>
          {busy ? 'Posting…' : 'Post'}
        </button>
      </form>
      {error && <ErrorBanner error={error} onRetry={load} />}
      {items == null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty>No comments yet.</Empty>
      ) : (
        <ul className="comment-list">
          {items.map((c) => (
            <li key={c.commentId} className="comment">
              <Avatar name={c.authorName} />
              <div className="comment-body">
                <div className="comment-head">
                  <strong>{c.authorName || 'Unknown'}</strong>
                  <span className="muted small">{relativeTime(c.createdAt)}</span>
                </div>
                <p>{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActivityFeed({ taskId, userName, describe }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const res = await activityApi.forTask(taskId);
      setItems(res.data.activity);
    } catch (err) {
      setError(err);
    }
  };

  useEffect(() => {
    load();
  }, [taskId]);

  if (error) return <ErrorBanner error={error} onRetry={load} />;
  if (items == null) return <Spinner />;
  if (items.length === 0) return <Empty>No activity recorded.</Empty>;

  return (
    <ul className="timeline">
      {items.map((a) => (
        <li key={a.logId} className="timeline-row">
          <span className="dot" />
          <div>
            <div className="row-title">
              <strong>{a.actorName || userName(a.actorId)}</strong> {describe(a)}
            </div>
            <div className="muted small">{formatDateTime(a.createdAt)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
