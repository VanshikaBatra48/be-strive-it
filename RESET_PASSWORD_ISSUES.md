# Password Reset Backend Code Analysis & Issues Report

This document details all bugs, architectural mismatches, and runtime issues found in the password reset backend implementation across routes, controllers, services, and models.

---

## 1. Summary of Issues

| # | Severity | File | Issue Description | Status |
|---|---|---|---|---|
| **1** | **CRITICAL (Fatal Crash)** | `routes/passwordResetRoutes.js` | `router` is not defined (`ReferenceError: router is not defined`). The server crashes immediately upon startup or restart. | **RESOLVED** |
| **2** | **CRITICAL (Runtime 404)** | Active Node Process / `server.js` | The currently running backend process (`node server.js`) was running stale code. Server was restarted and all routes mounted. | **RESOLVED** |
| **3** | **HIGH (Validation Bug)** | `controller/passwordResetController.js` | Strict `typeof otp !== "string"` rejected numeric OTP inputs with HTTP 400. Added string coercion & trimming. | **RESOLVED** |
| **4** | **HIGH (Business Logic)** | `service/passwordResetService.js` | Password reset did not update `firstLogin: false`. Added `user.firstLogin = false`. | **RESOLVED** |
| **5** | **MEDIUM (UX Dead-end)** | `service/passwordResetService.js` | `OTP_ALREADY_VERIFIED` threw an error without returning `resetToken`. Added safe token re-issue when valid. | **RESOLVED** |
| **6** | **MEDIUM (Security)** | `service/passwordResetService.js` | OTP hash comparison used `!==`. Updated to `crypto.timingSafeEqual`. | **RESOLVED** |
| **7** | **LOW (Code Smell)** | `service/passwordResetService.js` | Redundant inline `require("sequelize").Op.ne` replaced with `[Op.ne]`. | **RESOLVED** |
| **8** | **LOW (Consistency)** | `server.js` | Added explicit `require('./models/resetPassword')` under model imports. | **RESOLVED** |

---

## 2. Detailed Findings & Root Causes

### Issue 1: Fatal Runtime Crash in `routes/passwordResetRoutes.js`
* **File:** [`routes/passwordResetRoutes.js`](file:///home/innow8/Desktop/strive-it/backend/be-strive-it/routes/passwordResetRoutes.js#L1-L12)
* **Current Code:**
  ```javascript
  const {
      forgotPassword,
      verifyResetOTP,
      resetPassword,
  } = require("../controller/passwordResetController");

  router.post("/forgot-password", forgotPassword);
  router.post("/verify-reset-otp", verifyResetOTP);
  router.post("/reset-password", resetPassword);

  module.exports = router;
  ```
* **Problem:** Neither `express` nor `router` is initialized.
* **Error Triggered:**
  ```text
  ReferenceError: router is not defined
      at Object.<anonymous> (.../routes/passwordResetRoutes.js:7:1)
  ```
* **Solution:** Add the Express router instantiation:
  ```javascript
  const express = require("express");
  const router = express.Router();
  ```

---

### Issue 2: Running Server is Out of Sync (404 Not Found on OTP & Reset)
* **Location:** Active Node server process
* **Problem:** 
  - The server running on port `3000` was started **before** the new routes (`/verify-reset-otp` and `/reset-password`) were written.
  - When a client sends the OTP to verify, Express responds with:
    ```html
    Cannot POST /api/verify-reset-otp (404 Not Found)
    ```
  - This explains why generating the OTP worked (the old process had `/forgot-password`), but sending the OTP back fails.
  - **Note:** Restarting the server right now without fixing **Issue 1** will crash the server immediately.

---

### Issue 3: Strict `typeof otp !== "string"` Rejects Valid Requests
* **File:** [`controller/passwordResetController.js`](file:///home/innow8/Desktop/strive-it/backend/be-strive-it/controller/passwordResetController.js#L36-L45)
* **Current Code:**
  ```javascript
  const { email, otp } = req.body;

  if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof otp !== "string" ||
      !/^\d{6}$/.test(otp)
  ) {
      return res.status(400).json({
          message: "Please provide a valid email and 6-digit OTP.",
      });
  }
  ```
* **Problem:** 
  - Frontend inputs or API testing tools (Postman, curl, Axios) often send numbers for OTP (`{ "otp": 123456 }`).
  - Because `typeof 123456 === "number"`, `typeof otp !== "string"` evaluates to `true`, causing the controller to return HTTP 400 on line 43.
  - Also, any untrimmed string like `" 123456 "` will fail the regex `/^\d{6}$/`.
* **Solution:** Convert or sanitize OTP to string before testing:
  ```javascript
  const sanitizedOtp = typeof otp === "number" ? String(otp) : (typeof otp === "string" ? otp.trim() : "");

  if (typeof email !== "string" || !email.trim() || !/^\d{6}$/.test(sanitizedOtp)) {
      return res.status(400).json({
          message: "Please provide a valid email and 6-digit OTP.",
      });
  }
  ```

---

### Issue 4: User `firstLogin` Flag and `raw_password` Are Not Updated
* **File:** [`service/passwordResetService.js`](file:///home/innow8/Desktop/strive-it/backend/be-strive-it/service/passwordResetService.js#L166-L176)
* **Current Code:**
  ```javascript
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  user.password = hashedPassword;
  await user.save({ transaction });
  ```
* **Problem:**
  1. In `models/user.js`, `firstLogin` defaults to `true`.
  2. In `service/userService.js` (`changePassword`), changing a password sets `user.firstLogin = false`.
  3. In `service/userService.js` (`login`), the response determines redirection based on `firstLogin`:
     ```javascript
     redirectTo: user.firstLogin ? "/changePassword" : "/dashboard"
     ```
  4. In `passwordResetService.js`, `user.firstLogin` is **not** set to `false`. If a newly created user uses "Forgot Password" to gain access, they will still be forced to the `/changePassword` screen upon login.
  5. The `users` table also maintains a `raw_password` column. `resetPassword` does not update or clear it, resulting in stale data shown to admins.
* **Solution:**
  ```javascript
  user.password = hashedPassword;
  user.firstLogin = false;
  user.raw_password = newPassword.trim(); // or null if security prefers not storing raw passwords
  await user.save({ transaction });
  ```

---

### Issue 5: Dead-end Trap on `OTP_ALREADY_VERIFIED`
* **File:** [`service/passwordResetService.js`](file:///home/innow8/Desktop/strive-it/backend/be-strive-it/service/passwordResetService.js#L86-L88) and [`controller/passwordResetController.js`](file:///home/innow8/Desktop/strive-it/backend/be-strive-it/controller/passwordResetController.js#L68-L71)
* **Problem:**
  - When the OTP is verified the first time, a `resetToken` is generated and saved in `PasswordReset`, and `verifiedAt` is set to the current date.
  - If the user re-clicks "Verify", or if their browser refreshes / loses connection:
    - `verifyResetOTP` throws `OTP_ALREADY_VERIFIED`.
    - The controller returns HTTP 400: `"OTP already verified. Continue with password reset."`.
    - **However, no `resetToken` is returned!**
  - The client is completely blocked: they do not have the `resetToken` needed for `/reset-password`, and they cannot re-verify to obtain it.
* **Solution:** If the OTP is already verified and the `resetTokenExpiresAt` is still valid, return the existing valid token or issue a fresh token instead of throwing an unrecoverable 400 error.

---

### Issue 6: Timing Attack Vulnerability in OTP Hash Comparison
* **File:** [`service/passwordResetService.js`](file:///home/innow8/Desktop/strive-it/backend/be-strive-it/service/passwordResetService.js#L95-L97)
* **Current Code:**
  ```javascript
  const submittedHash = hashOTP(submittedOTP);
  if (submittedHash !== resetRequest.otpHash) { ... }
  ```
* **Problem:** Direct string comparison (`!==`) returns as soon as the first mismatched byte is encountered. This allows potential attackers to deduce valid hashes by measuring server response times.
* **Solution:** Use constant-time buffer comparison:
  ```javascript
  const isMatch = crypto.timingSafeEqual(
      Buffer.from(submittedHash, "hex"),
      Buffer.from(resetRequest.otpHash, "hex")
  );
  if (!isMatch) { ... }
  ```

---

### Issue 7: Redundant `require("sequelize")` Inside Method
* **File:** [`service/passwordResetService.js`](file:///home/innow8/Desktop/strive-it/backend/be-strive-it/service/passwordResetService.js#L137)
* **Current Code:**
  ```javascript
  verifiedAt: {
      [require("sequelize").Op.ne]: null,
  }
  ```
* **Problem:** `const { Op } = require("sequelize");` is already required at line 6 of the file. Requiring it inline is unnecessary and inconsistent with the rest of the codebase.
* **Solution:** Use `[Op.ne]: null`.

---

### Issue 8: Model Import Missing in `server.js`
* **File:** [`server.js`](file:///home/innow8/Desktop/strive-it/backend/be-strive-it/server.js#L6-L9)
* **Current Code:**
  ```javascript
  // Import models
  require('./models/user');
  require('./models/task');
  ```
* **Problem:** While `resetPassword` is loaded transitively when routes are imported, good practice and consistency with `user` and `task` require registering it explicitly before `sequelize.sync()`.
* **Solution:** Add `require('./models/resetPassword');` in `server.js`.

---

## 3. Recommended Fix Plan (When Ready to Apply)

1. **Fix `routes/passwordResetRoutes.js`:**
   Add `const express = require('express');` and `const router = express.Router();`.
2. **Fix `controller/passwordResetController.js`:**
   Loosen OTP check to allow numeric input and trim strings (`String(otp || '').trim()`).
3. **Fix `service/passwordResetService.js`:**
   - Add `firstLogin: false` when resetting password.
   - Use `crypto.timingSafeEqual` for OTP comparison.
   - Clean up redundant `require('sequelize')`.
4. **Restart Backend Server:**
   Restart `node server.js` so Express mounts the newly registered routes.
