import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import PageShell from '../components/PageShell.jsx';
import { apiRequest } from '../lib/apiClient.js';
import { endpoints } from '../lib/endpoints.js';
import { decodeJwt } from '../lib/jwt.js';

export default function ContactUs() {
  const { token, user } = useSelector((s) => s.auth);
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isLoggedIn = !!user;
  const emailReadOnly = isLoggedIn;

  useEffect(() => {
    if (isLoggedIn && token) {
      const payload = decodeJwt(token);
      const emailFromToken = payload?.email;
      
      if (emailFromToken) {
        setEmail(emailFromToken);
      } else if (user?.userId) {
        async function fetchEmail() {
          try {
            const profileRaw = await apiRequest('GET', endpoints.userProfile(user.userId), token);
            const profile = profileRaw?.email || profileRaw?.result?.email;
            if (profile) {
              setEmail(profile);
            }
          } catch (e) {
            console.error('Failed to fetch user email:', e);
          }
        }
        fetchEmail();
      }
    }
  }, [isLoggedIn, token, user?.userId]);

  const validateEmail = (emailValue) => {
    if (!emailValue || !emailValue.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue.trim())) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const validateForm = () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return false;
    }
    if (!subject || !subject.trim()) {
      setError('Subject is required');
      return false;
    }
    if (!message || !message.trim()) {
      setError('Message is required');
      return false;
    }
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setStatus('loading');

    try {
      const payload = {
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      };

      await apiRequest('POST', endpoints.createContactMessage(), token, payload);

      setStatus('succeeded');
      setSuccessMessage('Your message has been sent successfully. We will get back to you soon.');
      setSubject('');
      setMessage('');
    } catch (e) {
      setStatus('failed');
      setError(e?.message || 'Failed to send message. Please try again.');
    }
  };

  return (
    <PageShell title="/contactus">
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => !emailReadOnly && setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            readOnly={emailReadOnly}
            disabled={emailReadOnly}
          />
          {emailReadOnly && (
            <div className="hint">Email is auto-filled from your account</div>
          )}
        </label>

        <label className="field">
          <span>Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What is this regarding?"
            required
          />
        </label>

        <label className="field">
          <span>Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Please provide details about your inquiry..."
            rows={6}
            required
          />
        </label>

        {error ? <div className="error">Error: {error}</div> : null}
        {successMessage ? <div className="ok">{successMessage}</div> : null}

        <button className="btn" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Sending…' : 'Send Message'}
        </button>
      </form>
    </PageShell>
  );
}
