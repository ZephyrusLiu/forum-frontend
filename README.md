# Forum Frontend (D3-YL-3)

## Features
1. Navbar is always visible on every page.
2. Buttons adapt based on user group:
    - visitor / unverified / normal / admin / super_admin
3. Login/register/verify flows with token storage.
4. Home list, Post detail, Create post, and Profile pages (Top3, Drafts, History, Edit Profile).

## Run locally
```bash
npm install
npm run dev
```

## Mock API + demo data
Set `VITE_USE_MOCK=true` (or append `?mock=1` to the URL) to enable a built-in
mock API with demo users, posts, replies, and history records.

Demo accounts (password: `pass1234`):
- user@demo.com (normal user)
- unverified@demo.com (unverified user)
- admin@demo.com (admin)
- super@demo.com (super admin)

Example:
```bash
Mac:
VITE_USE_MOCK=true npm run dev
Win:
$env:VITE_USE_MOCK="true"; npm run dev
```