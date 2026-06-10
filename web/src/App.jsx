import { useEffect } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { useRouter, matchRoute } from './router/router.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import TaskDetailPage from './pages/TaskDetailPage.jsx';
import ActivityPage from './pages/ActivityPage.jsx';
import InsightsPage from './pages/InsightsPage.jsx';
import TeamsPage from './pages/TeamsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

const ROUTES = [
  { pattern: '/', render: () => <DashboardPage /> },
  { pattern: '/tasks', render: () => <TasksPage /> },
  { pattern: '/tasks/:id', render: (p) => <TaskDetailPage taskId={p.id} /> },
  { pattern: '/activity', render: () => <ActivityPage /> },
  { pattern: '/insights', render: () => <InsightsPage /> },
  { pattern: '/teams', render: () => <TeamsPage /> },
  { pattern: '/users', render: () => <UsersPage /> },
];

export default function App() {
  const { isAuthenticated } = useAuth();
  const { path, navigate } = useRouter();

  useEffect(() => {
    if (!isAuthenticated && path !== '/login') navigate('/login');
    if (isAuthenticated && path === '/login') navigate('/');
  }, [isAuthenticated, path, navigate]);

  if (!isAuthenticated) return <LoginPage />;

  for (const route of ROUTES) {
    const params = matchRoute(path, route.pattern);
    if (params) return <Layout>{route.render(params)}</Layout>;
  }

  return (
    <Layout>
      <div className="page">
        <div className="empty">Page not found.</div>
      </div>
    </Layout>
  );
}
