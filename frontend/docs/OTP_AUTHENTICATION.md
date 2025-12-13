# OTP Authentication Implementation

**Implementation Date**: 2024
**Feature**: Email OTP (One-Time Password) Authentication replacing Password-based login

---

## ✅ Implementation Summary

Successfully replaced password-based authentication with **Email OTP (One-Time Password)** authentication while maintaining OAuth providers (Google, Microsoft).

---

## Features Implemented

### 1. **Email OTP Authentication**
- User enters email address
- Click "Send Code" to receive OTP via email
- Enter 6-digit verification code
- Automatic sign-in upon successful verification

### 2. **OAuth Sign-In (Google & Microsoft)**
- OAuth buttons remain available below OTP form
- Clerk handles OAuth flow
- Email captured from OAuth provider after authentication

### 3. **Enhanced UX**
- Dynamic form descriptions based on state
- "Use a different email" option after code is sent
- Loading states with appropriate messages
- Error handling with clear messages

---

## Authentication Methods Available

| Method | User Action | Email Capture Point |
|--------|-------------|---------------------|
| **Email OTP** | Enter email → Receive code → Enter code | Form input (before OTP sent) |
| **Google OAuth** | Click Google button → OAuth flow | SSO callback (after OAuth) |
| **Microsoft OAuth** | Click Microsoft button → OAuth flow | SSO callback (after OAuth) |

**Result**: All methods provide email hint to backend via `X-Login-Email` header

---

## File Changes

### **Modified Files**:

#### `src/components/auth/custom-sign-in-form.tsx`

**State Changes**:
```typescript
// BEFORE (Password-based)
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// AFTER (OTP-based)
const [email, setEmail] = useState('');
const [otpCode, setOtpCode] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [isCodeSent, setIsCodeSent] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Handler Changes**:
```typescript
// REMOVED: Password sign-in handler
const handleSubmit = async (e: React.FormEvent) => {
  await signIn.create({ identifier: email, password: password });
}

// ADDED: Send OTP code handler
const handleSendCode = async (e: React.FormEvent) => {
  // Save email to sessionStorage
  sessionStorage.setItem('clerk_login_email', email);

  // Create sign-in attempt
  await signIn.create({ identifier: email });

  // Request email code
  const emailCodeFactor = signIn.supportedFirstFactors?.find(
    (factor) => factor.strategy === 'email_code'
  );

  if (emailCodeFactor && 'emailAddressId' in emailCodeFactor) {
    await signIn.prepareFirstFactor({
      strategy: 'email_code',
      emailAddressId: emailCodeFactor.emailAddressId,
    });
  }

  setIsCodeSent(true);
}

// ADDED: Verify OTP code handler
const handleVerifyCode = async (e: React.FormEvent) => {
  const result = await signIn.attemptFirstFactor({
    strategy: 'email_code',
    code: otpCode,
  });

  if (result.status === 'complete') {
    await setActive({ session: result.createdSessionId });
    router.push('/');
  }
}
```

**UI Changes**:
```tsx
{/* BEFORE: Password field */}
<input
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="••••••••"
/>

{/* AFTER: Conditional OTP field */}
{isCodeSent && (
  <div className="space-y-2">
    <label htmlFor="otpCode">Verification Code</label>
    <input
      id="otpCode"
      type="text"
      value={otpCode}
      onChange={(e) => setOtpCode(e.target.value)}
      placeholder="Enter 6-digit code"
      maxLength={6}
      autoComplete="one-time-code"
    />
    <p className="text-sm text-muted-foreground">
      Code sent to {email}
    </p>
  </div>
)}

{/* Dynamic button text */}
{isCodeSent ? 'Verify Code' : 'Send Code'}

{/* "Use different email" option */}
{isCodeSent && (
  <button onClick={() => setIsCodeSent(false)}>
    Use a different email
  </button>
)}
```

---

## OTP Authentication Flow

### **Step-by-Step Flow**

```
1. User opens /sign-in
   ↓
2. User enters email address
   ↓
3. User clicks "Send Code"
   → sessionStorage.setItem('clerk_login_email', email)
   → Clerk API: signIn.create({ identifier: email })
   → Clerk API: signIn.prepareFirstFactor({ strategy: 'email_code' })
   ↓
4. Clerk sends OTP email to user
   ↓
5. UI shows OTP input field
   ↓
6. User enters 6-digit code from email
   ↓
7. User clicks "Verify Code"
   → Clerk API: signIn.attemptFirstFactor({ code: otpCode })
   ↓
8. OTP verified successfully
   → Session created and activated
   → Email stays in sessionStorage
   ↓
9. User redirected to home page
   ↓
10. Protected API calls include X-Login-Email header
    ↓
11. Backend receives exact email user entered
    → Single database query
    ↓
12. User profile loaded successfully
```

### **Flow Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│ Initial State                                                │
│ - Email input field                                          │
│ - "Send Code" button (disabled)                              │
│ - OAuth buttons                                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ User Enters Email                                            │
│ - Email: test@example.com                                    │
│ - "Send Code" button (enabled)                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ User Clicks "Send Code"                                      │
│ → Save to sessionStorage                                     │
│ → Request OTP from Clerk                                     │
│ → Loading state: "Sending code..."                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ OTP Sent State                                               │
│ - Email input (disabled)                                     │
│ - OTP input field (6 digits)                                 │
│ - Text: "Code sent to test@example.com"                      │
│ - "Verify Code" button                                       │
│ - "Use a different email" link                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ User Enters OTP Code                                         │
│ - OTP: 123456                                                │
│ - "Verify Code" button (enabled)                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ User Clicks "Verify Code"                                    │
│ → Verify code with Clerk                                     │
│ → Loading state: "Verifying..."                              │
└─────────────────────────────────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
    ┌──────────────┐          ┌──────────────┐
    │ ✅ SUCCESS   │          │ ❌ FAILED    │
    └──────────────┘          └──────────────┘
            │                           │
            ▼                           ▼
┌─────────────────────┐    ┌─────────────────────────────┐
│ Session activated   │    │ Error message displayed     │
│ Redirect to /       │    │ User can retry              │
│ Email in session    │    │ Or use different email      │
└─────────────────────┘    └─────────────────────────────┘
```

---

## UI States

### **State 1: Initial (Email Input)**

**Description**: "Enter your email to receive a verification code"

**Elements**:
- Email input field (enabled)
- "Send Code" button (disabled until email entered)
- OAuth buttons (Google, Microsoft)

**User Actions**:
- Enter email address
- Click "Send Code" button
- OR click OAuth button

---

### **State 2: OTP Sent (Code Input)**

**Description**: "Enter the verification code sent to your email"

**Elements**:
- Email input field (disabled, shows entered email)
- OTP input field (enabled, 6-digit max)
- Text: "Code sent to [email]"
- "Verify Code" button
- "Use a different email" link
- OAuth buttons (still available)

**User Actions**:
- Enter 6-digit code from email
- Click "Verify Code" button
- Click "Use a different email" to reset
- OR click OAuth button

---

### **State 3: Loading States**

**Sending Code**:
- Button shows: "Sending code..." with spinner
- Form disabled

**Verifying Code**:
- Button shows: "Verifying..." with spinner
- Form disabled

---

### **State 4: Error State**

**Error Display**:
- Red alert box at top of form
- Error message (e.g., "Invalid code", "Failed to send code")
- Form remains interactive for retry

---

## Security Features

### **OTP Security**

✅ **Time-Limited Codes**: Codes expire after a set time (Clerk-managed)
✅ **Single-Use Codes**: Each code can only be used once
✅ **Email Delivery**: Code sent only to verified email address
✅ **Rate Limiting**: Clerk prevents code request spam
✅ **No Password Storage**: No passwords stored anywhere

### **sessionStorage Security**

✅ **Email Capture**: Email saved before OTP request
✅ **Tab-Scoped**: Only accessible in current tab
✅ **Auto-Clear**: Cleared when tab closes
✅ **Failed Auth Cleanup**: Cleared on authentication failure

---

## Clerk Configuration Required

### **Enable Email Code Authentication**

1. **Clerk Dashboard** → Settings → Email, Phone, Username
2. **Enable "Email verification code"** as sign-in method
3. **Configure email settings**:
   - Email provider (Clerk's built-in or custom SMTP)
   - Email template customization (optional)
   - Code expiry time (default: 10 minutes)

### **Email Template Customization** (Optional)

Customize the OTP email template in Clerk Dashboard:
- Subject line
- Email body
- Branding (logo, colors)
- Code display format

---

## Testing

### **Test OTP Flow**

1. Navigate to `/sign-in`
2. Enter email address
3. Click "Send Code"
4. **Verify**:
   - Console log: `📧 [CustomSignIn] Saved login email: [email]`
   - Console log: `✅ [CustomSignIn] OTP code sent to: [email]`
   - UI shows OTP input field
   - Email input is disabled
   - Text shows "Code sent to [email]"

5. Check email for OTP code
6. Enter 6-digit code
7. Click "Verify Code"
8. **Verify**:
   - Console log: `✅ [CustomSignIn] OTP verification successful`
   - Redirected to home page
   - sessionStorage contains `clerk_login_email`
   - Backend log: `✅ [ClerkAuth] Using login email (verified): [email]`

### **Test "Use Different Email"**

1. After sending code, click "Use a different email"
2. **Verify**:
   - Email input is enabled
   - OTP input is hidden
   - Email field is cleared
   - Button shows "Send Code" again

### **Test Invalid Code**

1. Send code to email
2. Enter incorrect 6-digit code
3. Click "Verify Code"
4. **Verify**:
   - Error message displayed: "Invalid code"
   - OTP field remains
   - User can retry with correct code

---

## Advantages Over Password Authentication

### **Security Benefits**

| Feature | Password | OTP |
|---------|----------|-----|
| **Credential Storage** | Password stored (hashed) | No password storage |
| **Phishing Risk** | High (password reuse) | Low (time-limited codes) |
| **Brute Force** | Vulnerable | Protected (rate limiting) |
| **User Responsibility** | Remember password | Check email only |
| **Password Reuse** | Risk of reuse | Not applicable |

### **User Experience Benefits**

✅ **No Password Management**: Users don't need to create/remember passwords
✅ **No Forgot Password Flow**: No password reset needed
✅ **Faster Sign-In**: Just email + code (no password typing)
✅ **Email Verification**: Confirms email ownership automatically
✅ **Mobile-Friendly**: Easy to copy code from email app

### **Maintenance Benefits**

✅ **No Password Rules**: No complexity requirements to enforce
✅ **No Password Resets**: No "forgot password" support needed
✅ **Simpler Security**: One-time codes eliminate password-related attacks
✅ **Clerk-Managed**: Code generation, delivery, and validation handled by Clerk

---

## Backend Integration

**No changes required to backend!**

Backend continues to receive `X-Login-Email` header from frontend, regardless of authentication method used (OTP, Google, Microsoft).

```go
// Backend still receives:
loginEmail := c.GetHeader("X-Login-Email")

// Single database query:
employee, matchedEmail, err := r.employeeRepo.FindByEmails([]string{loginEmail})
```

---

## Troubleshooting

### **OTP Email Not Received**

**Symptoms**: User doesn't receive verification code email

**Causes**:
1. Email in spam folder
2. Clerk email provider issue
3. Invalid email address
4. Email service rate limit

**Solution**:
1. Check spam/junk folder
2. Verify email address is correct
3. Use "Use a different email" and try again
4. Configure custom SMTP in Clerk Dashboard

### **Code Already Used / Expired**

**Symptoms**: Error "Code is invalid or has expired"

**Causes**:
1. Code already used for sign-in
2. Code expired (default 10 minutes)
3. Wrong code entered

**Solution**:
1. Click "Use a different email"
2. Re-send code
3. Enter new code quickly

### **Email Not Captured**

**Symptoms**: Backend shows "No valid login hint"

**Causes**:
1. sessionStorage not set
2. Email cleared before API call

**Solution**:
1. Check console logs for `📧 [CustomSignIn] Saved login email`
2. Verify sessionStorage persistence
3. Check browser console for errors

---

## Future Enhancements

### **Potential Additions**

1. **SMS OTP**: Add phone number OTP as alternative
2. **Resend Code**: Button to resend code without re-entering email
3. **Code Expiry Timer**: Show countdown timer for code expiry
4. **Auto-Submit**: Automatically verify when 6 digits entered
5. **Remember Device**: Option to trust device for 30 days

### **Analytics Improvements**

1. **Track Auth Methods**: Monitor OTP vs OAuth usage
2. **Code Attempt Analytics**: Track verification success rates
3. **Email Delivery Metrics**: Monitor email delivery success
4. **Time to Sign-In**: Measure average sign-in duration

---

## Comparison: Password vs OTP vs OAuth

| Feature | Password | Email OTP | OAuth |
|---------|----------|-----------|-------|
| **Security** | Medium | High | Very High |
| **User Friction** | Medium | Low | Very Low |
| **Email Verification** | Separate step | Built-in | Built-in |
| **Password Management** | Required | Not needed | Not needed |
| **Backend Complexity** | Medium | Low | Low |
| **Mobile Experience** | Poor (typing) | Good (code copy) | Excellent |
| **Phishing Risk** | High | Low | Very Low |

---

## Conclusion

**Implementation Complete**: Successfully migrated from password-based to OTP-based authentication

**Benefits Achieved**:
- ✅ Enhanced security (no passwords to compromise)
- ✅ Better UX (no password to remember)
- ✅ Email verification built-in
- ✅ Simpler maintenance (no password reset flows)
- ✅ Consistent backend integration (same `X-Login-Email` header)

**Authentication Methods Available**:
- ✅ Email OTP (passwordless)
- ✅ Google OAuth
- ✅ Microsoft OAuth

**Performance**: Single database query for all authentication methods

**Security**: sessionStorage for temporary email storage, Clerk-managed OTP codes
