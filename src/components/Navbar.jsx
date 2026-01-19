import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/users/login', label: 'Login' },
  { to: '/users/register', label: 'Register' },
  { to: '/home', label: 'Home' },
  { to: '/users/1/profile', label: 'Profile' }, // placeholder id
  { to: '/posts/1', label: 'PostDetail' },      // placeholder id
  { to: '/contactus', label: 'Contact Us' },
  { to: '/users', label: 'Admin Users' },
  { to: '/messages', label: 'Admin Messages' },
];

export default function Navbar() {
  return (
    <header className="nav">
      <div className="nav__brand">
        <div className="badge">Forum</div>
        <div className="nav__title">Frontend Skeleton</div>
      </div>

      <nav className="nav__links">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? 'nav__link nav__link--active' : 'nav__link'
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
