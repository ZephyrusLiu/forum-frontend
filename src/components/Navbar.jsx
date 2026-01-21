import { NavLink, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice.js';

function getGroup(user, token) {
  if (!token) return 'visitor';
  const type = user?.type; // 'user' | 'admin' | 'super_admin'
  const verified = !!user?.verified;

  if (type === 'super_admin') return 'super_admin';
  if (type === 'admin') return 'admin';
  if (!verified) return 'unverified';
  return 'normal';
}

export default function Navbar() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { token, user } = useSelector((s) => s.auth);

  const group = getGroup(user, token);

  const baseItems = [{ to: '/contactus', label: 'Contact Us', groups: ['visitor','unverified','normal','admin','super_admin'] }];

  const items = [
    { to: '/users/login', label: 'Login', groups: ['visitor'] },
    { to: '/users/register', label: 'Register', groups: ['visitor'] },
    { to: '/users/verify', label: 'Verify Email', groups: ['visitor','unverified','normal','admin','super_admin'] },

    { to: '/home', label: 'Home', groups: ['unverified','normal','admin','super_admin'] },
    // profile/postDetail
    { to: '/users/1/profile', label: 'Profile', groups: ['unverified','normal','admin','super_admin'] },
    { to: '/posts/1', label: 'PostDetail', groups: ['unverified','normal','admin','super_admin'] },

    { to: '/users', label: 'Admin Users', groups: ['admin','super_admin'] },
    { to: '/messages', label: 'Admin Messages', groups: ['admin','super_admin'] },
  ];

  const visible = [...items, ...baseItems].filter((x) => x.groups.includes(group));

  const onLogout = () => dispatch(logout());

  const badgeText =
    group === 'visitor'
      ? 'Visitor'
      : `${group}${user?.userId ? ` • ${user.userId}` : ''}${user?.verified === false ? ' • unverified' : ''}`;

  return (
    <header className="nav">
      <div className="nav__brand">
        <div className="badge">Forum</div>
        <div className="nav__title">Day2 Auth + Route Guard + Nav Logic</div>
        <div className="nav__spacer" />
        <div className="nav__pill">{badgeText}</div>
        {token ? (
          <button className="nav__btn" onClick={onLogout}>
            Logout
          </button>
        ) : null}
      </div>

      <nav className="nav__links">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? 'nav__link nav__link--active' : 'nav__link'
            }
            style={{
              display: location.pathname === item.to ? 'none' : 'inline-flex',
            }}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
