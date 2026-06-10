import { useAuth } from '../context/AuthContext.jsx';
import { Link, useRouter } from '../router/router.jsx';
import { RoleBadge, Avatar } from './ui.jsx';
import { can, canAny, PERMS } from '../lib/constants.js';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '▣', show: () => true },
  { to: '/tasks', label: 'Tasks', icon: '✓', show: () => true },
  {
    to: '/activity',
    label: 'My Activity',
    icon: '≡',
    show: (role) => can(role, PERMS.ACTIVITY_READ_OWN),
  },
  {
    to: '/insights',
    label: 'Bottlenecks',
    icon: '◭',
    show: (role) => canAny(role, PERMS.ACTIVITY_READ_TEAM, PERMS.ACTIVITY_READ_ALL),
  },
  { to: '/teams', label: 'Teams', icon: '⬡', show: (role) => can(role, PERMS.TEAM_READ) },
  { to: '/users', label: 'Users', icon: '☻', show: (role) => can(role, PERMS.USER_READ_ALL) },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { path, navigate } = useRouter();

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (to) => (to === '/' ? path === '/' : path.startsWith(to));

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">◆</span>
          <div>
            <div className="brand-name">SmartOps</div>
            <div className="brand-sub">Operations Console</div>
          </div>
        </div>
        <nav className="nav">
          {NAV.filter((item) => item.show(user.role)).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-item ${isActive(item.to) ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="me">
            <Avatar name={user.name} />
            <div className="me-info">
              <div className="me-name">{user.name || 'User'}</div>
              <RoleBadge role={user.role} />
            </div>
          </div>
          <button className="btn btn-ghost btn-block" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
