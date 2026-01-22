import { Navigate, Route, Routes } from 'react-router-dom';

import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import AdminMessages from './pages/AdminMessages.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import ContactUs from './pages/ContactUs.jsx';
import CreatePost from './pages/CreatePost.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import PostDetail from './pages/PostDetail.jsx';
import Profile from './pages/Profile.jsx';
import Register from './pages/Register.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/users/login" replace />} />

          {/* Public */}
          <Route path="/users/login" element={<Login />} />
          <Route path="/users/register" element={<Register />} />
          <Route path="/users/verify" element={<VerifyEmail />} />
          <Route path="/contactus" element={<ContactUs />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<Home />} />
            <Route path="/posts/create" element={<CreatePost />} />
            <Route path="/posts/:postId" element={<PostDetail />} />
            <Route path="/users/:id/profile" element={<Profile />} />

            {/* Admin */}
            <Route path="/users" element={<AdminUsers />} />
            <Route path="/messages" element={<AdminMessages />} />
          </Route>

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
    </>
  );
}
