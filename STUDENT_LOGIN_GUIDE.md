# 🔐 Student Login & Password Setup Guide

## **Overview**
Students can now securely login to Faculty Quest using their **email** instead of the old vulnerable USN-based system.

---

## **🎯 Student Login Flow**

### **Step 1: First Time Login**
Student enters email on login page → Gets error message:
```
"Your account needs to be set up first. We will send you an OTP to create your password."
```
Shows: **"Go to Password Setup"** button

### **Step 2: Request OTP** ✉️
1. Student clicks "Setup Password"
2. Enters their **email address**
3. Clicks **"Send OTP"**
4. **Email is sent with 6-digit OTP** (valid for 10 minutes)

**Endpoint**: `POST /api/student/request-setup-otp`
```json
{
  "email": "student@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "OTP sent to your email. Valid for 10 minutes.",
  "email": "student@example.com"
}
```

### **Step 3: Verify OTP & Set Password** 🔑
1. Student receives OTP in email
2. On setup page, enters:
   - **Email**: student@example.com
   - **OTP**: 345821 (6 digits)
   - **New Password**: MySecure@Pass123
3. Clicks **"Create Password"**

**Endpoint**: `POST /api/student/verify-setup-otp`
```json
{
  "email": "student@example.com",
  "otp": "345821",
  "newPassword": "MySecure@Pass123"
}
```

**Password Requirements**:
- ✓ Minimum 8 characters
- ✓ At least 1 UPPERCASE letter
- ✓ At least 1 lowercase letter  
- ✓ At least 1 number
- ✗ Special characters optional but recommended

**Response on Success**:
```json
{
  "success": true,
  "message": "Password set successfully! You can now login."
}
```

### **Step 4: Login with Email & Password** ✅
1. Go to login page
2. Enter:
   - **Email**: student@example.com
   - **Password**: MySecure@Pass123
3. Click **"Login"**

**Endpoint**: `POST /api/student/login`
```json
{
  "email": "student@example.com",
  "password": "MySecure@Pass123"
}
```

**Response on Success**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "student": {
    "id": "507f1f77bcf86cd799439011",
    "email": "student@example.com",
    "name": "John Doe",
    "usn": "1PE20CS123",
    "branch": "CSE",
    "year": "3",
    "semester": "5"
  }
}
```

---

## **🔒 Security Features**

| Feature | Details |
|---------|---------|
| **No USN Password** | ✅ Removed vulnerable USN-based preauth |
| **OTP Verification** | ✅ Email-based verification (6 digits) |
| **OTP Expiry** | ✅ 10 minutes (auto-expires) |
| **Password Hashing** | ✅ bcryptjs with 12 salt rounds |
| **Account Lockout** | ✅ After 5 failed attempts |
| **Rate Limiting** | ✅ Max 100 attempts per 15 minutes |
| **Attempt Tracking** | ✅ Tracks failed login attempts |

---

## **📧 Email OTP Template**

When student requests OTP, they receive email:

```
Subject: Your Password Setup OTP - Faculty Quest

---

🔐 Password Setup

Hello John Doe!

You requested to set up your password for Faculty Quest.
Use the OTP below to verify your identity:

┌─────────────────┐
│   Your OTP      │
│   3 4 5 8 2 1   │
└─────────────────┘

⚠️  Important:
  • Valid for 10 minutes only
  • Never share this OTP with anyone
  • If you didn't request this, ignore this email

---

How to proceed:
1. Go to Faculty Quest password setup page
2. Enter your email: student@example.com
3. Enter the OTP: 345821
4. Create a strong password
5. Click "Set Password"

Once set, you can use your email and password to login.

---
```

---

## **❌ Error Handling**

### **Invalid OTP**
```json
{
  "success": false,
  "message": "Invalid OTP or email"
}
```

### **OTP Expired**
```json
{
  "success": false,
  "message": "OTP expired. Request a new one."
}
```

### **Too Many Attempts**
```json
{
  "success": false,
  "message": "Too many attempts. Request a new OTP."
}
```

### **Weak Password**
```json
{
  "success": false,
  "message": "Password must contain uppercase, lowercase, and number"
}
```

### **Email Not Found**
```json
{
  "success": false,
  "message": "Email not found in the system. Please contact your faculty."
}
```

---

## **🔄 Forgot Password** (Existing Students)

1. Click **"Forgot Password"** on login
2. Enter **email address**
3. Click **"Send Reset Link"**
4. Email sent with password reset token
5. Click link in email → Enter new password
6. Login with new password

**Endpoint**: `POST /api/student/forgot-password`
```json
{
  "email": "student@example.com"
}
```

---

## **✨ Features Implemented**

✅ **OTP-based password setup** (instead of USN)  
✅ **Email verification** for new account creation  
✅ **Password strength enforcement**  
✅ **Account lockout** after failed attempts  
✅ **Rate limiting** on auth endpoints  
✅ **Token-based authentication** (JWT)  
✅ **Session management** (7-day expiry)  
✅ **Secure password hashing** (bcryptjs)  

---

## **🔧 For Faculty**

### **Adding Students to System**
1. Upload student CSV with columns:
   - email
   - name
   - usn
   - branch
   - year
   - semester

2. Students can then:
   - Request OTP at login
   - Set their own password
   - Login without faculty intervention

### **Resetting Student Password** (Admin Only)
1. Faculty can force password reset
2. Student receives OTP
3. Sets new password

---

## **📱 Mobile App (Android/iOS)**

Same flow works on mobile:
1. Login tab → Enter email
2. Get directed to "Setup Password"
3. Request OTP
4. Enter OTP and create password
5. Redirected to quiz dashboard

---

## **🚀 Deployment Status**

✅ **Build**: 2,121.98 kB (gzip: 639.60 kB) - SUCCESS  
✅ **Sync to Android**: 0.784s - SUCCESS  
✅ **All endpoints active**  
✅ **Email service configured**  
✅ **Database models updated**  

