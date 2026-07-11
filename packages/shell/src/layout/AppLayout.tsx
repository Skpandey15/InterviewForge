import { NavLink, Outlet, useNavigate } from 'react-router';
import { Icon, Logo, api, toast, type IconName } from '@aip/shared';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'home' },
  { to: '/interview/setup', label: 'Start Interview', icon: 'play' },
  { to: '/interviews', label: 'My Interviews', icon: 'list' },
  { to: '/results', label: 'Results', icon: 'bar-chart' },
  { to: '/profile', label: 'Profile', icon: 'user' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
  { to: '/help', label: 'Help & Support', icon: 'help-circle' },
];

/** Authenticated app frame: fixed sidebar + routed content. */
export function AppLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.logout();
    toast('You have been logged out.', 'info');
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <Logo size="sm" />
        </div>
        <nav className="sidebar__nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <button type="button" className="sidebar__item sidebar__item--logout" onClick={handleLogout}>
            <Icon name="log-out" size={17} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="app-frame__content">
        <Outlet />
      </main>
    </div>
  );
}
