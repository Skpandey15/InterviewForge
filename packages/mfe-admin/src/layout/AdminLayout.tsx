import { NavLink, Outlet, useNavigate } from 'react-router';
import { Icon, Logo, api, toast, useAuth, type IconName } from '@aip/shared';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

/*
 * Paths are absolute on purpose: this Routes tree is mounted under the
 * shell's splat route (/admin/*), where relative links resolve against the
 * full splat-matched URL and accumulate segments on navigation.
 */
const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: 'home', end: true },
  { to: '/admin/candidates', label: 'Candidates', icon: 'users' },
  { to: '/admin/builder', label: 'Interview Builder', icon: 'edit' },
  { to: '/admin/questions', label: 'Question Bank', icon: 'file-text' },
  { to: '/admin/analytics', label: 'Analytics', icon: 'pie-chart' },
  { to: '/admin/reports', label: 'Reports', icon: 'download' },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    await api.logout();
    toast('You have been logged out.', 'info');
    navigate('/login', { replace: true });
  };

  return (
    <div className="adm-frame">
      <aside className="adm-sidebar">
        <div className="adm-sidebar__brand">
          <Logo size="sm" />
          <span className="adm-sidebar__role-badge">ADMIN</span>
        </div>
        <nav className="adm-sidebar__nav" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `adm-nav-item ${isActive ? 'adm-nav-item--active' : ''}`}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="adm-sidebar__footer">
          <div className="adm-sidebar__user">
            <span className="adm-sidebar__avatar">
              {(user?.name ?? 'A')
                .split(' ')
                .map((p) => p[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
            <div className="adm-sidebar__user-meta">
              <strong>{user?.name ?? 'Admin'}</strong>
              <small>Interview Manager</small>
            </div>
          </div>
          <button type="button" className="adm-nav-item adm-nav-item--logout" onClick={handleLogout}>
            <Icon name="log-out" size={17} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="adm-frame__content">
        <Outlet />
      </main>
    </div>
  );
}
