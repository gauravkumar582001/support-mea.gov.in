# Support Hub

Sabke liye ek common User ID + Password (Forgot password bhi). Login ke baad sidebar:
1. Daily Activity - roz kisne kya add/edit/delete kiya
2. Application Logins
3. WinSCP Logins
4. Mail Entry - Google Form jaisa form + Responses sheet

## Run (Windows PowerShell)
```
npm install
$env:PORTAL_PASS="Apna@StrongPass1"
$env:SECRET_KEY="lamba-random-text"
$env:RECOVERY_KEY="forgot-password-ke-liye-secret-key"
npm start
```
Browser: http://localhost:3000   (team: http://server-ip:3000)

Defaults: User ID `support`, password `ChangeMe@123`, recovery key `RESET-ME-123` - teeno badlo.

## Forgot password
Login page > "Forgot password?" > RECOVERY_KEY daalo > naya password set karo.
Naya password data/auth.json mein hashed save hota hai. (Purane password par wapas jaana ho to auth.json delete karo.)

Data: data/data.json (passwords encrypted). SECRET_KEY kabhi mat badlo. Roz backup lo.
