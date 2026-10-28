# Password Reset Architecture: Why 3 URLs and Why `resetToken`?

This document provides a comprehensive architectural and security explanation of the password reset mechanism implemented in this codebase. It addresses two core questions:

1. **Why do we have 3 separate URLs instead of just 1?**
2. **Why do we need a `resetToken` at all?**

---

## 1. Quick Summary

| Feature | 3-Endpoint Approach (Current Implementation) | 1-Endpoint Approach (Alternative) |
|---|---|---|
| **Endpoints** | `POST /forgot-password`<br>`POST /verify-reset-otp`<br>`POST /reset-password` | `POST /forgot-password`<br>`POST /reset-password` (with email, OTP & password combined) |
| **User Experience (UX)** | Multi-step wizard: Verify email -> Verify OTP immediately with feedback -> Set new password | User must type new password before knowing if OTP is valid or expired |
| **Security Model** | Low-entropy secret (6-digit OTP) is immediately burned; high-entropy token (`resetToken`) authorizes password change | Low-entropy secret (OTP) must remain alive until final submission |
| **Abuse / DoS Protection** | Expensive operations (`bcrypt.hash`) are only reachable after presenting a valid `resetToken` | Attacker guessing OTP can trigger CPU-heavy `bcrypt.hash` if not strictly guarded |
| **Granular Rate Limiting** | Independent limits for: email requests, OTP attempts, and password changes | Combined endpoint mixes OTP guessing limits with password reset limits |

---

## 2. Deep Dive: Why 3 Separate URLs?

### Reason 1: Natural Alignment with Multi-Step UI / UX
In modern web and mobile applications, password reset is presented as a **3-step progressive wizard**:

```
[ Step 1: Request ]       [ Step 2: Verification ]      [ Step 3: New Password ]
  "Enter your email"   ->   "Enter 6-digit OTP"     ->    "Enter new password"
  [ Send OTP ]               [ Verify Code ]               [ Save Password ]
```

- **If you use 3 URLs:**
  - After entering the OTP in Step 2, the frontend calls `POST /api/verify-reset-otp`.
  - The user immediately knows if the code was correct, if it expired, or how many attempts remain.
  - The UI only unlocks the "New Password" fields once the user has successfully proved identity.
- **If you used only 1 URL for verification and password reset:**
  - The user would have to enter their email, their OTP, their new password, AND confirm their new password all at once—or the frontend would have to collect the OTP, hold it in client-side state without verifying it, and submit everything together at the very end.
  - If the OTP is invalid or expired, the user has already gone through the trouble of creating and confirming a new password, only to be told the OTP failed.

---

### Reason 2: Protecting Server Performance and CPU (Bcrypt DoS Protection)
Hashing passwords using `bcrypt.hash(password, 12)` is **intentionally slow and CPU-heavy** (taking ~100ms–300ms per hash on modern CPUs) to prevent offline dictionary attacks.

In contrast, verifying an OTP using HMAC-SHA256 takes **fractions of a millisecond**.

- **With 3 Endpoints:**
  - `POST /api/verify-reset-otp` executes ultra-fast cryptographic HMAC and database lookups.
  - The heavy `bcrypt.hash` is **only ever executed** on `POST /api/reset-password` when a cryptographically verified `resetToken` is presented.
  - An attacker cannot abuse the OTP verification endpoint to exhaust the server's CPU.

- **With a Single Endpoint:**
  - If an endpoint accepts `{ email, otp, newPassword }`, any bug or ordering mistake where `bcrypt.hash()` runs before or concurrently with OTP checks allows attackers to launch a Denial-of-Service (DoS) attack by flooding invalid requests.

---

### Reason 3: Independent Rate Limiting & Brute-Force Throttling
Each stage of password reset has completely different attack vectors and requires distinct security policies:

| Stage | Attack Vector | Security Policy Needed |
|---|---|---|
| **`POST /forgot-password`** | Email flooding / inbox bombing | Limit to **1 request per 1–2 minutes per email/IP** |
| **`POST /verify-reset-otp`** | Brute-forcing 6-digit OTP (1,000,000 combinations) | Strictly limit to **max 5 attempts**, then destroy OTP |
| **`POST /reset-password`** | Automated credential stuffing / replay | Require a **single-use cryptographic token** |

When these are 3 distinct routes, Express middleware (such as `express-rate-limit`) and database logic can protect each stage independently without interfering with legitimate users.

---

### Reason 4: Separation of Concerns (RESTful Principles)
Each endpoint follows the Single Responsibility Principle:
1. `POST /forgot-password`: **Initiates** the process and dispatches notifications.
2. `POST /verify-reset-otp`: **Authenticates** the temporary factor (OTP).
3. `POST /reset-password`: **Mutates** the user credential state.

---

## 3. Deep Dive: Why Do We Need `resetToken`?

If the user already verified their email and OTP, why can't the client just send `{ email, newPassword }` to `/reset-password`?

### Security Flaw Without `resetToken`:
If `POST /reset-password` only accepted `{ email, newPassword }`:
- Anyone who knows a user's email could wait until the user verifies their OTP, then intercept or front-run the request and set their own password.
- Or if the server stores `isOtpVerified = true` on the user, ANY request with that email would change the password without proving it was sent by the same browser session that verified the OTP!

### The Role of `resetToken`:

```
                       [ User verifies OTP ]
                                │
                                ▼
               Server generates high-entropy `resetToken`
               (32 random bytes = 256 bits of entropy)
                                │
               ┌────────────────┴────────────────┐
               ▼                                 ▼
         Server stores                      Client receives
      SHA-256(resetToken)                     `resetToken`
               │                                 │
               │         [ User submits ]        │
               │       New Password + Token      │
               │                                 │
               └────────► Server verifies ◄──────┘
                          SHA-256 match?
                                │
                                ▼
                      [ Password Updated ]
                      [ Token Destroyed ]
```

1. **High Entropy vs. Low Entropy (256 bits vs. 6 digits):**
   - A 6-digit OTP has only **1,000,000 possibilities** (easy for a human to type, but weak against offline brute force).
   - A 32-byte hex `resetToken` has **$2^{256}$ possibilities** ($\approx 1.15 \times 10^{77}$). It is mathematically impossible to guess.
   - The OTP is **burned immediately** upon verification so it can never be used again. In its place, the client is granted the high-entropy `resetToken`.

2. **Session-Free Authorization (Temporary Capability Token):**
   - The user is **not logged in** (they forgot their password). There is no JWT or session cookie identifying them.
   - The `resetToken` acts as a temporary, single-purpose authorization credential that says:
     > *"The bearer of this token has proved ownership of the email within the last 15 minutes, and is authorized to reset the password exactly once."*

3. **Single-Use Enforcement (Replay Attack Defense):**
   - In `service/passwordResetService.js`:
     ```javascript
     // Consume the reset token so it cannot be reused.
     resetRequest.usedAt = new Date();
     resetRequest.resetTokenHash = null;
     resetRequest.resetTokenExpiresAt = null;
     await resetRequest.save({ transaction });
     ```
   - Even if someone captures the HTTP traffic or an attacker gets hold of the token after the reset, it cannot be used a second time.

4. **Database Security (Hashed in DB):**
   - Just like passwords are not stored in plain text, the `resetToken` is stored as `SHA-256(resetToken)` in the `password_resets` table (`resetTokenHash`).
   - If the database is ever compromised, an attacker cannot use the tokens from the database to reset users' passwords because they only have the hash, not the plain token.

---

## 4. Could We Make It Only 1 or 2 URLs?

Yes! It is architecturally possible to reduce the number of URLs. Here is how that would look and the trade-offs involved:

### Alternative 1: 2-Endpoint Approach (Combined Verify & Reset)
- **Endpoint 1:** `POST /api/forgot-password` (Sends OTP to email)
- **Endpoint 2:** `POST /api/reset-password` (Accepts `{ email, otp, newPassword, confirmPassword }`)

#### How it works:
1. User enters email -> OTP sent.
2. User receives OTP.
3. UI presents a single form with:
   - OTP input
   - New password input
   - Confirm password input
4. User clicks "Reset Password".
5. The backend verifies the OTP and updates the password in a **single database transaction**.

#### Trade-offs of 2-Endpoint Approach:
- **Pros:**
  - No `resetToken` needed.
  - Less code: 1 fewer route, 1 fewer controller function, no token generation or token hashing logic.
  - Fewer network requests (1 less HTTP round-trip).
- **Cons:**
  - **No intermediate validation:** The user doesn't know if their OTP is correct until they have already typed and submitted their new password.
  - **Less granular error handling:** If the request fails, the frontend must distinguish whether the OTP failed, password validation failed, or the user expired.

### Alternative 2: Why 1 Single Endpoint Is NOT Feasible
A true 1-endpoint flow (e.g. `POST /api/reset-password` doing everything) is impossible because:
- The user cannot receive an OTP and enter it in the very same request that triggers sending the OTP.
- You **always need at least 2 requests**:
  1. **Request A:** "Send me a code" (Client -> Server -> Email)
  2. **Request B:** "Here is the code and my new password" (Client -> Server)

---

## 5. Architectural Walkthrough of Current Implementation

The current implementation in `be-strive-it` uses the 3-step pattern. Here is how each component is structured:

```
┌─────────────────────────────────┐
│          1. Client              │
│    (fe-strive-it React App)     │
└───────────────┬─────────────────┘
                │
                │ 1. POST /api/forgot-password { email }
                ▼
┌─────────────────────────────────┐
│   passwordResetController.js    │──► Checks email format
│   passwordResetService.js       │──► Finds user, generates 6-digit OTP, saves HMAC(OTP)
│   emailService.js               │──► Dispatches email via Nodemailer
└───────────────┬─────────────────┘
                │
                │ 2. POST /api/verify-reset-otp { email, otp }
                ▼
┌─────────────────────────────────┐
│   passwordResetController.js    │──► Validates 6-digit regex
│   passwordResetService.js       │──► Timing-safe HMAC check, checks attempts < 5,
│                                 │    stamps verifiedAt, creates resetToken
└───────────────┬─────────────────┘
                │
                │ Returns { resetToken }
                ▼
                │ 3. POST /api/reset-password { resetToken, newPassword, confirmPassword }
                ▼
┌─────────────────────────────────┐
│   passwordResetController.js    │──► Validates password length (8-72 chars) & match
│   passwordResetService.js       │──► Database Transaction (LOCK.UPDATE):
│                                 │    - Validates SHA-256(resetToken)
│                                 │    - Hashes newPassword with bcrypt (12 rounds)
│                                 │    - user.password = hashedPassword
│                                 │    - user.firstLogin = false
│                                 │    - Destroys resetToken (usedAt = now)
└─────────────────────────────────┘
```

---

## 6. Conclusion & Recommendation

- **The 3-URL + `resetToken` approach is the industry gold standard** for web applications with stepped UI forms (used by Google, GitHub, Auth0, etc.). It provides:
  1. The best user feedback at each step.
  2. Maximum security by replacing weak 6-digit codes with 256-bit cryptographic tokens.
  3. Natural DoS protection for password hashing operations.
  4. Precise rate-limiting boundaries.

- **If you ever want a simpler, shorter flow**, the **2-endpoint approach** (`/forgot-password` + `/reset-password` combining OTP and new password) is the cleanest alternative, eliminating the need for `resetToken` while still remaining secure.
