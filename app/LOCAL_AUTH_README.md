# Local Authentication for Development

## Overview
Local authentication is now enabled for localhost development. User data is stored in browser localStorage instead of Supabase.

## How It Works

### Storage
- **Users:** Stored in `localStorage` under key `painscope_local_users`
- **Session:** Stored in `localStorage` under key `painscope_local_session`
- **Session Duration:** 7 days

### Features
✅ Sign up with email, password, and name
✅ Login with email and password
✅ Auto-login after signup (no verification needed)
✅ Session persistence (survives page refresh)
✅ Logout
✅ Update user profile (name, company, industry, avatar)
✅ Hardcoded verification code for testing: **12345**

### When Local Auth is Used
Local auth is automatically enabled when:
- `window.location.hostname === 'localhost'` OR
- `window.location.hostname === '127.0.0.1'`

On production domains, the app will use Supabase instead.

## Testing

### 1. Sign Up
1. Click "GET STARTED" or "Sign In" → "Create Account"
2. Enter name, email, password
3. Click "CREATE ACCOUNT"
4. **If verification page appears:** Enter code `12345` and click "VERIFY EMAIL"
5. You'll be automatically logged in and redirected to the briefing/dashboard

**Note:** Local auth auto-verifies accounts, so you shouldn't see the verification page. If you do, use the hardcoded code: **12345**

### 2. Login
1. Click "Sign In"
2. Enter email and password from signup
3. Click "SIGN IN"
4. You'll be logged in and redirected

### 3. Logout
1. Click your profile/avatar in the app
2. Click "Logout"
3. You'll be returned to the landing page

### 4. Session Persistence
- Close the browser tab
- Open `localhost:5173` again
- You'll still be logged in (session lasts 7 days)

## Viewing Stored Data

Open browser DevTools → Console and run:
```javascript
// View all users
JSON.parse(localStorage.getItem('painscope_local_users'))

// View current session
JSON.parse(localStorage.getItem('painscope_local_session'))

// Clear all local auth data
localStorage.removeItem('painscope_local_users')
localStorage.removeItem('painscope_local_session')
```

## Security Notes
⚠️ **For Development Only**
- Passwords are stored in plain text (not hashed)
- Data is visible in browser localStorage
- Anyone with access to the browser can view/modify data
- Do NOT use this for production

When you deploy to production with Supabase:
- Local auth is automatically disabled
- Supabase handles authentication securely
- Passwords are properly hashed
- Data is stored server-side

## Next Steps
Now that local auth is working, you can:
1. ✅ Sign up and log in
2. ✅ Access protected routes (dashboard, briefing, scout lab, etc.)
3. 🔄 Build and test features according to the PRD
4. 🔄 When ready, configure Supabase for production deployment
