# 🔐 Development Credentials & Codes

## Local Authentication

### Hardcoded Verification Code
```
12345
```
**When to use:** If the email verification page appears after signup, enter this code.

**Note:** Local auth auto-verifies accounts, so you typically won't need this. But if the verification screen shows up, use `12345`.

---

## Test Accounts

You can create any test account you want. Here are some examples:

### Test User 1
- **Email:** test@painscope.ai
- **Password:** password123
- **Name:** Test User

### Test User 2
- **Email:** demo@example.com
- **Password:** demo123
- **Name:** Demo User

### Your Account
- **Email:** kaytoba49@gmail.com
- **Password:** (your password)
- **Name:** (your name)

---

## Quick Start

1. **Sign Up:** Create account with any email/password
2. **Verification (if shown):** Enter `12345`
3. **Login:** Use the same email/password
4. **Build & Test:** All features are now accessible!

---

## Storage Location

All data is stored in browser localStorage:
- Users: `painscope_local_users`
- Session: `painscope_local_session`

To clear all data:
```javascript
localStorage.clear()
```

---

## When Deploying to Production

1. Configure Supabase environment variables
2. Deploy the app
3. Local auth automatically switches to Supabase
4. Real email verification will be used
5. Passwords will be properly hashed

**The hardcoded code `12345` only works on localhost!**
