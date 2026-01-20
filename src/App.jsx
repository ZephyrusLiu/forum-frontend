import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import Profile from './pages/Profile.jsx';
import PostDetail from './pages/PostDetail.jsx';
import ContactUs from './pages/ContactUs.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AdminMessages from './pages/AdminMessages.jsx';
import NotFound from './pages/NotFound.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';

export default function App() {
  return (
    <div className="app">
      <Navbar />

      <main className="container">
        <Routes>
          {/* Default landing -> /users/login */}
          <Route path="/" element={<Navigate to="/users/login" replace />} />

          {/* Public routes */}
          <Route path="/users/login" element={<Login />} />
          <Route path="/users/register" element={<Register />} />
          <Route path="/contactus" element={<ContactUs />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<Home />} />
            <Route path="/users/:id/profile" element={<Profile />} />
            <Route path="/posts/:id" element={<PostDetail />} />
            <Route path="/users" element={<AdminUsers />} />
            <Route path="/messages" element={<AdminMessages />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
