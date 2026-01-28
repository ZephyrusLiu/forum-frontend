import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice.js';

function getGroup(user, token) {
  if (!token) return 'visitor';

  const type = user?.type;     // 'user' | 'admin' | 'super'
  const status = user?.status; // 'unverified' | 'active' | 'banned'

  if (status === 'banned') return 'banned';
  if (type === 'super') return 'super_admin';
  if (type === 'admin') return 'admin';
  if (status === 'unverified') return 'unverified';
  return 'normal';
}

export default function Navbar() {
  const dispatch = useDispatch();
  const { token, user } = useSelector((s) => s.auth);

  const group = getGroup(user, token);
  const myUserId = user?.userId;

  const items = [
    // Public
    { to: '/users/login', label: 'Login', groups: ['visitor'] },
    { to: '/users/register', label: 'Register', groups: ['visitor'] },
    { to: '/contactus', label: 'Contact Us', groups: ['visitor', 'banned', 'unverified', 'normal', 'admin', 'super_admin'] },

    // Verify (some flows allow visitor)
    { to: '/users/verify', label: 'Verify Email', groups: ['visitor', 'unverified', 'normal', 'admin', 'super_admin'] },

    // Authenticated
    { to: '/home', label: 'Home', groups: ['unverified', 'normal', 'admin', 'super_admin'] },
    { to: '/posts/create', label: 'Create Post', groups: ['normal', 'admin', 'super_admin'] },

    ...(myUserId
      ? [
          { to: `/users/${myUserId}/profile`, label: 'Profile', groups: ['unverified', 'normal', 'admin', 'super_admin'] },
        ]
      : []),

    // Admin
    { to: '/users', label: 'Admin Users', groups: ['admin', 'super_admin'] },
    { to: '/messages', label: 'Admin Messages', groups: ['admin', 'super_admin'] },
  ];

  const visible = items.filter((x) => x.groups.includes(group));

  const badgeText =
    group === 'visitor'
      ? 'Visitor'
      : group === 'banned'
        ? `Banned${myUserId ? ` • ${myUserId}` : ''}`
        : `${group}${myUserId ? ` • ${myUserId}` : ''}${user?.status === 'unverified' ? ' • unverified' : ''}`;

  return (
    <header className="nav">
      <div className="nav__brand">
        <div className="badge">Forum</div>
        <div className="nav__title">Day3 — MVP Pages (Home / PostDetail / Profile / History)</div>
        <div className="nav__spacer" />
        <div className="nav__pill">{badgeText}</div>
        {token ? (
          <button className="nav__btn" onClick={() => dispatch(logout())}>
            Logout
          </button>
        ) : null}
      </div>

      <nav className="nav__links">
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/users'}
            className={({ isActive }) => (isActive ? 'nav__link nav__link--active' : 'nav__link')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
