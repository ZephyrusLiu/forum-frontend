# Forum Frontend (Day3-YL-2)

## Key Rules (AC)
App default landing behavior is correct: unauthenticated users land on /users/login
Home shows Published list (only shows username / date / title; does not show full content)
Create post can publish or save as draft
PostDetail shows: Post Title, Post Description/Content, User Name + User Profile Image, Post Date, Update Date (if edited), Attachments/Images (if any)
PostDetail shows replies list with replier name + profile image
Normal user can delete their own reply (button visible only for own replies)
Opening PostDetail calls History create

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