# 🔐 SECURITY AUDIT REPORT - Student Quiz Application

**Date:** April 6, 2026  
**Auditor:** Code Analysis System  
**Status:** Critical Issues Identified

---

## 📊 EXECUTIVE SUMMARY

| Category | Critical | Major | Minor | Total |
|----------|----------|-------|-------|-------|
| Timer Calculations | 1 | 2 | 1 | 4 |
| Status Mapping | 2 | 1 | 1 | 4 |
| Violation Detection | 2 | 2 | 2 | 6 |
| Auto-Submit Logic | 1 | 1 | 0 | 2 |
| Attempt Enforcement | 1 | 1 | 1 | 3 |
| Blocking Mechanism | 0 | 1 | 1 | 2 |
| Result Calculations | 1 | 1 | 1 | 3 |
| Error Handling | 0 | 2 | 2 | 4 |
| Edge Cases | 3 | 2 | 1 | 6 |
| **TOTAL** | **11** | **13** | **10** | **34** |

---

## 🔴 CRITICAL ISSUES (11)

### 1. **Timer Calculation Race Condition on Quiz Resume**
**File:** [backend/routes/studentAuthQuiz.js](backend/routes/studentAuthQuiz.js#L97-L109)  
**Severity:** CRITICAL  
**Lines:** 97-109

**Problem:**
```javascript
const startTime = new Date(existingAttempt.startedAt).getTime();
const nowTime = Date.now();
const elapsedSeconds = Math.floor((nowTime - startTime) / 1000);
const totalSeconds = (quiz.duration || 30) * 60;
timeRemaining = Math.max(0, totalSeconds - elapsedSeconds);
```

**Issue:**
- Timer calculated on backend at GET request time, but when frontend receives it, additional milliseconds have passed
- By the time response reaches client (network latency + processing), timeRemaining is already inaccurate
- Student could get timer showing 10:00 but actually only has 9:55

**Impact:** Students get less time than they should, or timer jumps unexpectedly

**Fix:**
```javascript
// SEND the startedAt and current server time - let frontend calculate
// This way frontend can adjust for network latency
res.json({
  serverTime: Date.now(),  // Add this
  startedAt: existingAttempt.startedAt,
  duration: quiz.duration || 30,
  // Frontend calculates: elapsed = (clientTime - startedAt) and syncs with server periodic checks
});
```

---

### 2. **Timer Calculation Uses Quiz Duration Instead of Actual Time Spent**
**File:** [backend/routes/studentAuthQuiz.js](backend/routes/studentAuthQuiz.js#L219-L223)  
**Severity:** CRITICAL  
**Lines:** 219-223

**Problem:**
```javascript
const elapsedSeconds = Math.floor((new Date() - existingAttempt.startedAt) / 1000);
const totalSeconds = (existingAttempt.duration || 30) * 60;  // ← WRONG
const timeRemaining = Math.max(0, totalSeconds - elapsedSeconds);
```

**Issue:**
- Uses `existingAttempt.duration` (default timespan for quiz) instead of checking if attempt should already be expired
- If quiz duration is 30min and 45min have passed, this calculates `-900 seconds` then maxes to `0`
- But should have already marked attempt as expired

**Fix:**
```javascript
// Check this FIRST before calculating timeRemaining
if (existingAttempt.isExpired?.()) {
  existingAttempt.status = 'expired';
  existingAttempt.submittedAt = new Date();
  await existingAttempt.save();
  return res.status(400).json({
    success: false,
    message: 'Quiz attempt expired',
    isExpired: true
  });
}
```

---

### 3. **Empty/Blank Answers Accepted - No Validation**
**File:** [backend/routes/studentAuthQuiz.js](backend/routes/studentAuthQuiz.js#L420-L440)  
**Severity:** CRITICAL  
**Lines:** 420-440

**Problem:**
```javascript
for (const question of quiz.questions) {
  const qId = question._id.toString();
  const studentAnswerObj = formattedAnswers.find(a => a.questionId === qId);
  const studentAnswer = studentAnswerObj ? studentAnswerObj.studentAnswer : '';
  // ← If studentAnswer is empty string '', grading proceeds

  if (question.type === 'short-answer') {
    // Sends empty string to AI grading service
    const aiGrade = await gradingService.gradeShortAnswer(question.question, question.answer, '');
```

**Issue:**
- Empty answers are submitted without validation
- For MCQ, blank answer means field is missing entirely - gets graded as empty string match (incorrect)
- No check if required questions are answered
- Student can submit quiz with no answers and get 0% "legitimately"

**Fix:**
```javascript
// Validate before grading
const studentAnswer = (studentAnswerObj?.studentAnswer || '').trim();

if (!studentAnswer) {
  if (question.type === 'short-answer') {
    // For short answers, blank might be intentional but log
    console.log(`⚠️ Question ${idx} has empty answer (may be intentional)`);
  } else {
    // For MCQ/truefalse, no answer should be marked
    grade.isCorrect = false;
    grade.marks = 0;
    console.log(`❌ Question ${idx} has no MCQ answer selected`);
    continue;
  }
}
```

---

### 4. **Violation Count Not Persisted - Can Bypass 3-Strike Limit**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L152-L165)  
**Severity:** CRITICAL  
**Lines:** 152-165, 1032-1045

**Problem:**
```javascript
const [warningCount, setWarningCount] = useState(0);
const warningCountRef = useRef(0);  // ← Using useRef, not persisted anywhere

const triggerViolation = useCallback((reason: string) => {
  // ...
  const next = warningCountRef.current + 1;
  warningCountRef.current = next;
  setWarningCount(next);
  
  if (next >= 3) {
    setIsBlocked(true);
    handleSubmitQuiz(true, `Strikes Exceeded: ${reason}`);  
  }
}, [isBlocked]);
```

**Issue:**
- `warningCount` stored only in React state, not in database
- If page refreshes/connection drops, `warningCountRef` resets to 0
- Student can trigger violations → refresh → violations reset → repeat
- Only blocked on 3+ violations in SAME session

**Impact:** Security violation system is bypassable with browser refresh

**Fix:**
- Send violation to backend and increment there:
```javascript
const triggerViolation = async (reason: string) => {
  try {
    const res = await studentAuthAPI.recordViolation(attemptId, reason);
    const violationCount = res.data.violationCount; // From backend
    setWarningCount(violationCount);
    
    if (violationCount >= 3) {
      setIsBlocked(true);
      handleSubmitQuiz(true, `Strikes Exceeded: ${reason}`);
    }
  } catch (e) {
    console.error('Failed to record violation:', e);
  }
};
```

---

### 5. **isBlocked Initial State Allows Quiz Bypass**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L188)  
**Severity:** CRITICAL  
**Lines:** 188, 361-382

**Problem:**
```javascript
const [isBlocked, setIsBlocked] = useState(false);

// Later in init effect:
if (isExplicitlyBlocked) {
  console.warn('⚠️ BLOCKED QUIZ DETECTED - Setting isBlocked flag');
  const violationReason = existingAttempt.violationReason || 'Security violations';
  setIsBlocked(true);
  // Show toast but DON'T return - let them see blocked UI
  // BUT THEY CAN STILL SEE THE QUIZ INTERFACE!
```

**Issue:**
- `isBlocked = false` initially, so page renders normally
- State update to `isBlocked = true` is asynchronous
- During 100ms+ before re-render, student sees full quiz interface
- If they click "Start" quickly, they can get past the block

**Impact:** Race condition allows blocked students to start quiz

**Fix:**
```javascript
// Check BEFORE rendering:
if (!loading && existingAttempt?.status === 'blocked') {
  return <BlockedScreen reason={existingAttempt.violationReason} />;
}
```

---

### 6. **Security Violation Detection Throttled to 3 Seconds**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L613-625)  
**Severity:** CRITICAL  
**Lines:** 613-625

**Problem:**
```javascript
const triggerViolation = useCallback((reason: string) => {
  if (isTransitioning.current || isSecurityPaused.current || isBlocked) return;
  const now = Date.now();
  if (now - lastViolationTime.current < 3000) return;  // ← 3 second gap!
  lastViolationTime.current = now;
  
  // Only trigger if 3+ seconds since last violation
```

**Issue:**
- If student clicks away multiple times rapidly, only FIRST violation counts
- Consecutive rapid violations within 3 seconds are ignored
- Student can rapidly app-switch 5 times but only get 1 strike

**Impact:** Attack vector: rapid tab switches bypass violation system

**Fix:**
- Count ALL violations, not just one per 3 seconds:
```javascript
const triggerViolation = useCallback((reason: string) => {
  // Don't throttle - count every violation
  const next = warningCountRef.current + 1;
  warningCountRef.current = next;
  setWarningCount(next);
  
  // Log to backend immediately
  recordViolation(reason);
  
  if (next >= 3) {
    handleSubmitQuiz(true, `Strikes: ${reason}`);
  }
}, []);
```

---

### 7. **Network Latency Not Considered in 30-Second Escape Buffer**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L764-800)  
**Severity:** CRITICAL  
**Lines:** 764-800

**Problem:**
```javascript
useEffect(() => {
  if (!quizStarted || quizSubmitted || isBlocked) return;

  if (isOutsideApp) {
    setBlurIntensity(15);
    
    escapeTimerRef.current = setInterval(() => {
      setRemainingEscapeTime(prev => {
        if (prev <= 1) {
          setIsBlocked(true);
          setBlurIntensity(25);
          handleSubmitQuiz(true, 'Total Escape Time Exceeded (30s)');
          // ← Submitted WITHOUT network confirmation
```

**Issue:**
- Auto-submits on client-side timer alone
- If network is slow (3000ms latency), client thinks 30s passed but server hasn't processed
- `handleSubmitQuiz()` might fail due to network, but quiz is marked as submitted locally
- Student sees "submitted" but backend never receives it

**Impact:** Data loss, quiz never actually submitted to server

**Fix:**
```javascript
// Don't auto-submit on client timer - sync with backend
if (prev <= 5) {
  // WARN student
  toast.warning('Connection issue - auto-submitting in 5 seconds');
  
  if (prev <= 1) {
    // Send submit with network error handling
    handleSubmitQuiz(true, 'Connection timeout').catch(() => {
      // Retry submission
      setTimeout(() => handleSubmitQuiz(true, 'Connection timeout'), 2000);
    });
  }
}
```

---

### 8. **Timezone Handling Not Implemented - All Timestamps in Client Timezone**
**File:** All timestamp operations  
**Severity:** CRITICAL

**Problem:**
- `new Date()` uses browser's local timezone
- Student in UTC+8 starts quiz, moves to UTC+5 timezone → time calculations break
- Server stores UTC but frontend converts based on browser locale
- Quiz scheduler checks `quiz.isAccessible()` but doesn't account for timezone

**Issue:**
```javascript
const startTime = new Date(existingAttempt.startedAt).getTime();
// If student is in UTC+8 but stored as UTC, this is off by 8 hours!
const elapsedSeconds = Math.floor((nowTime - startTime) / 1000);
```

**Impact:** Students could start/complete quizzes outside allowed windows

**Fix:**
- Always use UTC internally:
```javascript
// Backend
const startTime = new Date().toISOString(); // Always UTC
const elapsedSeconds = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
```

---

### 9. **Preauth USN Login Security Issue - No Rate Limit Per Email**
**File:** [backend/routes/studentAuth.js](backend/routes/studentAuth.js#L166-195)  
**Severity:** CRITICAL  
**Lines:** 166-195

**Problem:**
```javascript
// ANY USN match auto-creates account
if (password.toUpperCase() === studentRecord.usn.toUpperCase()) {
  console.log('✨ [PRE-AUTH] USN match found');
  studentAuth = new StudentAuth({
    email: normalizedEmail,
    password: password,  // ← Stores USN as password!
```

**Issue:**
- USN is often printed on ID cards, in public syllabi, or available online
- Attacker can brute force common UMS formats and auto-create accounts
- No verification that person actually owns the email
- Student records reveal all USNs (stored in Student collection)

**Example Attack:**
```
POST /student/login
email: student001@college.edu
password: USN12345  ← Formatted guess
→ Auto-creates account!
```

**Impact:** Account takeover, impersonation of other students

**Fix:**
```javascript
// Require email verification before auto-creating account
const verificationCode = Math.random().toString(36).substring(2, 8);
await sendEmail({
  email: normalizedEmail,
  subject: 'Verify your Faculty Quest Student Account',
  text: `Your verification code: ${verificationCode}`
});

// Return: "Check your email for verification code"
return res.json({
  success: false,
  requiresVerification: true,
  verificationCodeSent: true
});
```

---

### 10. **Blocked Quiz Status Shows on Dashboard But Still Allows Navigation**
**File:** [src/pages/StudentDashboard.tsx](src/pages/StudentDashboard.tsx#L366-375)  
**Severity:** CRITICAL  
**Lines:** 366-375

**Problem:**
```javascript
const disqualifiedQuizzes = safeQuizzes.filter(q => 
  q && (q.status === 'disqualified' || q.status === 'blocked' || q.status === 'active' || q.status === 'in-progress')
);

// Then in QuizCard:
if (isDisqualified) {
  return <Button disabled>Blocked</Button>;
}

// But in handleStartQuiz:
const quiz = safeQuizzes.find(q => (q.id || q._id) === id);
if (quiz && (quiz.status === 'disqualified' || quiz.status === 'blocked')) {
  toast.error('🔒 This quiz has been blocked');
  return;  // ← Only shows toast, doesn't prevent navigation in some paths
}
```

**Issue:**
- Multiple code paths for handling blocked quizzes
- Some paths show toast, some navigate anyway
- If toast timing is slow, user might click during transition

**Impact:** Blocked students might access quiz briefly

**Fix:**
- Enforce block at route level, not component level
- Verify block status on server during quiz/start

---

### 11. **Passing Grade Hardcoded to 40% with No Configuration**
**File:** [backend/routes/studentAuth.js](backend/routes/studentAuth.js#L308)  
**Severity:** CRITICAL  
**Lines:** 308

**Problem:**
```javascript
isPassed: (attempt.percentage || 0) >= 40  // ← Hardcoded
```

**Issue:**
- Different courses need different passing grades (40/50/60/75%)
- Hardcoded in frontend and backend - can't be changed without code update
- No audit trail of passing criteria changes
- Students could dispute results if criteria different from syllabus

**Impact:** Grading disputes, inconsistent standards

**Fix:**
```javascript
// Add to QuizAttempt model or Quiz model
const attempt = {
  // ...
  passingPercentage: 40,  // Store per quiz
};

// Use stored value
isPassed: (attempt.percentage || 0) >= (attempt.passingPercentage || 40)
```

---

## 🟠 MAJOR ISSUES (13)

### 12. **Violation Logging Not Sent to Backend**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L613-650)  
**Severity:** MAJOR  
**Lines:** 613-650

**Problem:**
- Violations triggered but ONLY auto-submit on 3rd strike
- First 2 strikes shown locally only, not recorded in backend
- No violation record for audit trail
- Teacher can't see violation history

**Fix:**
- Send to backend:
```javascript
const recordViolation = async (reason: string, count: number) => {
  try {
    await studentAuthAPI.recordViolation(attemptId, {
      reason,
      count,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to record violation:', e);
  }
};
```

---

### 13. **Focus Loss Detection Threshold Too High - 30 Seconds**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L764)  
**Severity:** MAJOR  
**Lines:** 764

**Problem:**
```javascript
const [remainingEscapeTime, setRemainingEscapeTime] = useState(30);
```

**Issue:**
- Student can be working on another app for 30 whole seconds
- In an exam, 30 seconds is substantial time gap
- Detector shows warning but doesn't immediately block

**Industry Standard:** Most secure exam systems use 5-10 second buffer

**Fix:**
```javascript
const [remainingEscapeTime, setRemainingEscapeTime] = useState(10);
// And alert at 5 seconds, not after 30
```

---

### 14. **Network Secure Flag Never Actually Prevents Submit**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L667)  
**Severity:** MAJOR  
**Lines:** 667, 822-825

**Problem:**
```javascript
const [networkSecure, setNetworkSecure] = useState(true);

// Later in security check:
const conn = (navigator as any).connection;
if (conn && (conn.type === 'vpn' || conn.rtt > 5000)) {
  setNetworkSecure(false);
  triggerViolation('Secure network connection lost (VPN Detection)');
}

// But networkSecure flag is NEVER used to block submission!
// It's set but ignored
```

**Issue:**
- VPN detection works but flag doesn't prevent quiz submission
- Student on VPN can still complete quiz
- Flag is dead code

**Fix:**
```javascript
// In handleSubmitQuiz:
if (!networkSecure) {
  toast.error('Cannot submit on unsecure network');
  return;
}
```

---

### 15. **Status Mapping Inconsistency - 'in-progress' vs 'started'**
**File:** [backend/routes/studentAuth.js](backend/routes/studentAuth.js#L300)  
**Severity:** MAJOR  
**Lines:** 300-305

**Problem:**
```javascript
} else if (attempt.status === 'started' || attempt.status === 'in-progress') {
  // If quiz is started but not submitted yet - don't show in AVAILABLE
  // Instead, treat it as disqualified/blocked so it doesn't appear in available
  displayStatus = 'in-progress'; 
}
```

**Issue:**
- Model stores status as 'started', but code also checks 'in-progress'
- These are treated as same but inconsistent
- No 'in-progress' status ever actually set in code
- Dead code path

**Trace:**
- Line 187: `status: 'started'` is set in studentAuthQuiz.js
- Never changed to 'in-progress'
- Checking for 'in-progress' is redundant

**Fix:**
```javascript
// Choose ONE:
// Option 1: Only use 'started'
} else if (attempt.status === 'started') {
  displayStatus = 'in-progress';
}
// Option 2: Standardize naming
status: 'in-progress'  // Instead of 'started'
```

---

### 16. **Passing Grade Calculation Inconsistent (40% vs unknown)**
**File:** [src/pages/StudentDashboard.tsx](src/pages/StudentDashboard.tsx#L208-210) vs [backend/routes/studentAuth.js](backend/routes/studentAuth.js#L307-308)  
**Severity:** MAJOR  
**Lines:** 208-210 (frontend) vs 307-308 (backend)

**Problem:**
```javascript
// Frontend
isPassed: (attempt.percentage || 0) >= 40

// Backend  
isPassed: (attempt.percentage || 0) >= 40

// But also in results:
// No isPassed field returned from backend!
```

**Issue:**
- Backend `/quiz/:quizId/results` doesn't return `isPassed` field
- Frontend has to calculate it (hardcoded 40%)
- If different course needs different threshold, can't change without code update
- No database record of what threshold was used

**Fix:**
- Add to backend response:
```javascript
res.json({
  data: {
    // ...
    passingPercentage: quiz.passingPercentage || 40,
    isPassed: (attempt.percentage || 0) >= (quiz.passingPercentage || 40)
  }
});
```

---

### 17. **Quiz Start Request Doesn't Validate Scheduling Constraints**
**File:** [backend/routes/studentAuthQuiz.js](backend/routes/studentAuthQuiz.js#L159-180)  
**Severity:** MAJOR  
**Lines:** 159-180

**Problem:**
```javascript
router.post('/quiz/start', verifyStudentToken, async (req, res) => {
  // Finds quiz but doesn't check if it's accessible!
  const quiz = await Quiz.findOne({ ... });
  if (!quiz) return 404;
  
  // ← MISSING: quiz.isAccessible() check!
  
  // Just proceeds to check for existing attempt
  const submittedAttempt = await QuizAttempt.findOne({ ... });
```

**Issue:**
- `/quiz/start` doesn't validate scheduling (start time, end time)
- `/quiz/:quizId` DOES check `quiz.isAccessible()` on line 74
- Inconsistent - student can see quiz details are not accessible but can start it

**Scenario:**
1. Quiz scheduled to start at 2pm
2. Student calls `/quiz/details` at 1:50pm → "Not accessible yet"
3. Student calls `/quiz/start` at 1:50pm → ✅ ALLOWED!
4. Student sits waiting and gets full quiz time after 2pm

**Fix:**
```javascript
// Add to /quiz/start after finding quiz:
const accessibility = quiz.isAccessible();
if (!accessibility.accessible) {
  return res.status(403).json({
    success: false,
    message: accessibility.message,
    isScheduled: true
  });
}
```

---

### 18. **Result Percentage Calculation Uses Quiz Total, Not Attempt Marks**
**File:** [backend/routes/studentAuthQuiz.js](backend/routes/studentAuthQuiz.js#L478)  
**Severity:** MAJOR  
**Lines:** 478

**Problem:**
```javascript
const percentage = quiz.totalMarks > 0 ? (totalScore / quiz.totalMarks) * 100 : 0;
```

**Issue:**
- What if student only answers 8 of 10 questions?
- `totalScore` = 8/10 correct = 80% of what they answered
- But `quiz.totalMarks` = 100 (10 questions × 10 points each)
- Percentage = (80 / 100) * 100 = 80%

This is CORRECT actually if all questions are mandatory. But problematic if:
- Questions have different marks (some 5pts, some 10pts)
- Student can skip questions

**Actually let me re-examine:**
```javascript
for (const question of quiz.questions) {
  // ...
  grade.marks = isCorrect ? (question.marks || 1) : 0;
  totalScore += grade.marks;  // ← Sums actual marks earned
}

// Total possible should sum question marks, not quiz.totalMarks
const totalPossibleMarks = quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
const percentage = totalPossibleMarks > 0 ? (totalScore / totalPossibleMarks) * 100 : 0;
```

**Issue Found:** Using `quiz.totalMarks` instead of calculating from questions

**Fix:**
```javascript
// Calculate maximum marks from questions
const maxPossibleMarks = quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
const percentage = maxPossibleMarks > 0 ? (totalScore / maxPossibleMarks) * 100 : 0;
```

---

### 19. **Browser Refresh Loses Quiz State But Doesn't Verify Sync**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L302-310)  
**Severity:** MAJOR  
**Lines:** 302-310

**Problem:**
```javascript
// Persistence: Auto-Save to LocalStorage
useEffect(() => {
  if (quizId && Object.keys(answers).length > 0) {
    storage.setItem(`quiz_state_${quizId}`, JSON.stringify({
      answers,
      currentQuestion
    }));
  }
}, [answers, currentQuestion, quizId]);
```

**Issue:**
- Saves to localStorage, but what if localStorage is cleared?
- What if student has stale answers in localStorage from previous browser session?
- No verification that restored state matches backend state

**Scenario:**
1. Student starts quiz, answers Question 1: "France"
2. Browser restart (accidentally)
3. localStorage still has old state: Question 1: "France", Question 2: blank
4. Frontend loads old state, but backend has saved: Q1: "", Q2: ""
5. Mismatch - could cause data loss

**Fix:**
```javascript
// After resuming attempt, fetch backend answers:
if (res.data.existingAttempt?.answers) {
  setAnswers(res.data.existingAttempt.answers);  // Use server-side answers
} else {
  const savedState = storage.getItem(`quiz_state_${quizId}`);
  if (savedState) setAnswers(JSON.parse(savedState));
}
```

---

### 20. **Split-Screen Detection Uses Arbitrary 70% Threshold**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L844-855)  
**Severity:** MAJOR  
**Lines:** 844-855

**Problem:**
```javascript
const isSplitScreen = currentHeight < (originalHeight * 0.7) || currentWidth < (originalWidth * 0.7);
```

**Issue:**
- 70% threshold is arbitrary - no justification
- On 1920x1080 screen: 70% = 1344x756
- If student zooms out (for accessibility), height changes
- If student rotates device, dimensions change
- If browser toolbar auto-hides, dimensions change

**False Positives:**
- Zoomed-out browser
- Responsive design reflowing
- Device rotation
- Fullscreen video pause

**Fix:**
```javascript
// Track ACTUAL app switches, not dimension changes:
// Use Capacitor's appStateChange listener (already implemented line 916)
// Or use only visibility API and focus changes

// Remove split-screen detection from dimension changes
```

---

### 21. **Unblock Mechanism Not Implemented**
**File:** All files  
**Severity:** MAJOR

**Problem:**
- Student can be blocked due to violations
- No mechanism to unblock them
- No admin panel, no API endpoint to clear violations
- Teacher has no way to "override" or unblock student

**Current State:**
```javascript
if (attempt.status === 'blocked') {
  return res.status(400).json({ isBlocked: true }); // Can't start
}
```

**Impact:** Blocked student permanently barred from quiz

**Fix - Add Teachers Routes:**
```javascript
// backend/routes/teachers.js
router.post('/quiz/attempt/:attemptId/unblock', verifyTeacherToken, async (req, res) => {
  const attempt = await QuizAttempt.findById(req.params.attemptId);
  attempt.status = 'started';  // Reset to started
  attempt.violationReason = null;
  await attempt.save();
  res.json({ success: true, message: 'Attempt unblocked' });
});
```

---

### 22. **Error Messages Leak System Information**
**File:** All routes  
**Severity:** MAJOR

**Examples:**
```javascript
// studentAuth.js line 175
console.log('✨ [PRE-AUTH] USN match found. Auto-creating Auth record for:', normalizedEmail);
// Logs which emails are auto-created

// studentAuthQuiz.js line 74  
console.log('🔵 [GET QUIZ DETAILS] Student:', student.email);
// Logs student emails in production

// Line 501
error: error.message  // Returns full error details to client
```

**Issue:**
- Stack traces logged to console (visible in network tab)
- Student names, emails, USNs exposed in logs
- Database error details returned to frontend

**Fix:**
```javascript
// Don't log to client
if (error instanceof ValidationError) {
  return res.status(400).json({
    success: false,
    message: 'Invalid input',
    // Don't include error.message
  });
}

// Log to server-side only
console.error('[server-side only]', error.stack);
```

---

### 23. **Rate Limiting Missing on Quiz Submit**
**File:** [backend/routes/studentAuthQuiz.js](backend/routes/studentAuthQuiz.js#L393)  
**Severity:** MAJOR  
**Lines:** 393 (no rate limit)

**Problem:**
- `/quiz/submit` endpoint has no rate limit
- Student (or attacker) can call 1000x times in 1 second
- Each call grades entire quiz (AI service calls for short answers)
- Could cause:
  - Denial of service to grading service
  - Cost explosion if grading uses paid API
  - Database write explosion

**Fix:**
```javascript
const submitRateLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute window
  max: 2,  // Only 2 submissions per minute
  message: 'Quiz can only be submitted twice per minute',
  keyGenerator: (req) => `${req.student._id}-${req.body.attemptId}`
});

router.post('/quiz/submit', verifyStudentToken, submitRateLimiter, async (req, res) => {
```

---

### 24. **isExpired() Method Might Not Be Called or Not Exist**
**File:** [backend/routes/studentAuthQuiz.js](backend/routes/studentAuthQuiz.js#L210-214)  
**Severity:** MAJOR  
**Lines:** 210-214

**Problem:**
```javascript
if (existingAttempt.isExpired()) {
  existingAttempt.status = 'expired';
  existingAttempt.submittedAt = new Date();
  await existingAttempt.save();
}
```

**Issue:**
- Code calls `isExpired()` method on QuizAttempt model
- This method is NOT shown in the files provided
- If method doesn't exist or throws error silently, expired quizzes are not marked
- Student could continue working on expired quiz

**Need to verify:** Is this method defined in QuizAttempt.js model?

**Recommended Implementation:**
```javascript
// models/QuizAttempt.js
QuizAttemptSchema.methods.isExpired = function() {
  const now = Date.now();
  const started = new Date(this.startedAt).getTime();
  const durationMs = (this.duration || 30) * 60 * 1000;
  return (now - started) > durationMs;
};
```

---

## 🟡 MINOR ISSUES (10)

### 25. **Blur Effect Uses Invalid CSS Value**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L1069)  
**Severity:** MINOR  
**Lines:** 1069

**Problem:**
```javascript
className={cn(
  "h-screen w-full bg-white flex flex-col text-slate-900 overflow-hidden select-none relative",
  blurIntensity > 0 && `blur-[${blurIntensity}px]`
)}
```

**Issue:**
- Template literal inside `cn()` might not work with Tailwind
- `blur-[15px]` is not compiled by Tailwind (arbitrary values)
- Should use inline style instead

**Fix:**
```javascript
style={{
  filter: blurIntensity > 0 ? `blur(${blurIntensity}px)` : 'none'
}}
```

---

### 26. **No Duplicate Question Answer Check**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L1350-1380)  
**Severity:** MINOR

**Problem:**
- MCQ allows selecting one option at a time (correct)
- But allows going back and changing answers multiple times
- No confirmation on final answer change
- No feedback on which answers changed

**Fix:**
```javascript
// Track modified answers
const modifiedAnswers = useMemo(() => {
  return Object.keys(answers).filter(qId => answers[qId] !== initialAnswers[qId]);
}, [answers, initialAnswers]);

// Show indicator on modified questions
{modifiedAnswers.includes(currentQ._id) && (
  <Badge className="bg-orange-100 text-orange-600">Recently Modified</Badge>
)}
```

---

### 27. **Status Bar "Buffer" Display Confusing**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L1166-1175)  
**Severity:** MINOR  
**Lines:** 1166-1175

**Problem:**
```javascript
<div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
   <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
   <span className="text-[10px] font-black text-slate-500 tabular-nums uppercase">
     Buffer: <span className="text-red-700 font-black">{remainingEscapeTime}S</span>
   </span>
</div>
```

**Issue:**
- "Buffer" label is confusing - unclear what it means
- Could mean: network buffer, time buffer, escape buffer, etc.
- Average student won't understand

**Fix:**
```javascript
<span>FOCUS: <span className="text-red-700">{remainingEscapeTime}s</span></span>
// or
<span>RETURN TIMER: <span className="text-red-700">{remainingEscapeTime}s</span></span>
```

---

### 28. **No Loading State During Grade Calculation**
**File:** [backend/routes/studentAuthQuiz.js](backend/routes/studentAuthQuiz.js#L420-470)  
**Severity:** MINOR  
**Lines:** 420-470+

**Problem:**
- Grading loop can take 10+ seconds if using AI service
- No progress indication sent to client
- Student thinks submission hung if connection drops

**Fix:**
```javascript
// Send progress updates for long-running operation
const progressCallback = (current, total) => {
  // Send via WebSocket or long-poll
  console.log(`Grading question ${current}/${total}`);
};
```

---

### 29. **Attempt Status Transitions Not Validated**
**File:** [backend/routes/studentAuthQuiz.js](backend/routes/studentAuthQuiz.js#L476)  
**Severity:** MINOR  
**Lines:** 476

**Problem:**
```javascript
attempt.status = reason ? 'blocked' : 'submitted';
```

**Issue:**
- No validation of state transitions
- Could transition: blocked → submitted or vice versa
- No audit trail of status changes

**Fix:**
```javascript
// Define valid transitions
const VALID_TRANSITIONS = {
  'started': ['in-progress', 'submitted', 'blocked', 'expired'],
  'in-progress': ['submitted', 'blocked', 'expired'],
  'submitted': [],  // terminal state
  'graded': [],     // terminal state
  'blocked': [],    // terminal state
  'expired': []     // terminal state
};

if (!VALID_TRANSITIONS[attempt.status].includes(newStatus)) {
  throw new Error(`Invalid transition: ${attempt.status} → ${newStatus}`);
}
```

---

### 30. **Short Answer AI Grading Timeout Not Specified**
**File:** [backend/routes/studentAuthQuiz.js](backend/routes/studentAuthQuiz.js#L442)  
**Severity:** MINOR  
**Lines:** 442

**Problem:**
```javascript
const aiGrade = await gradingService.gradeShortAnswer(question.question, question.answer, studentAnswer);
```

**Issue:**
- No timeout specified for AI service call
- Could hang indefinitely
- No fallback if service is slow

**Fix:**
```javascript
const aiGrade = await Promise.race([
  gradingService.gradeShortAnswer(question.question, question.answer, studentAnswer),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Grading timeout')), 5000)
  )
]).catch(() => ({
  isCorrect: false,
  marks: 0,
  feedback: 'Could not grade - system timeout'
}));
```

---

### 31. **No Validation That Quiz Questions Exist**
**File:** [backend/routes/studentAuthQuiz.js](backend/routes/studentAuthQuiz.js#L420)  
**Severity:** MINOR  
**Lines:** 420

**Problem:**
```javascript
for (const question of quiz.questions) {
  // No check if questions array is empty
}
```

**Issue:**
- If quiz has 0 questions, submission succeeds with 0 score
- No warning shown
- Could be data integrity issue

**Fix:**
```javascript
if (!quiz.questions || quiz.questions.length === 0) {
  return res.status(400).json({
    success: false,
    message: 'Quiz has no questions - cannot submit'
  });
}
```

---

### 32. **Percentage Calculation Shows Floating Point Precision Issues**
**File:** [backend/routes/studentAuthQuiz.js](backend/routes/studentAuthQuiz.js#L478)  
**Severity:** MINOR  
**Lines:** 478

**Problem:**
```javascript
percentage: percentage.toFixed(1),  // Returns "79.9" not 79.9
```

**Issue:**
- `toFixed()` returns string, not number
- Frontend might do math on it expecting number
- Could cause NaN errors downstream

**Fix:**
```javascript
percentage: Math.round(percentage * 10) / 10,  // Returns actual number
```

---

### 33. **No Device Orientation Lock During Quiz**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L347-360)  
**Severity:** MINOR  
**Lines:** 347-360

**Problem:**
```javascript
useEffect(() => {
  const handleOrientationChange = () => {
    setIsDevicePortrait(window.innerHeight > window.innerWidth);
    enforceNavigationHidden();
  };
  
  window.addEventListener('orientationchange', handleOrientationChange);
```

**Issue:**
- App reflows when device rotates
- Student could use this to hide quiz interface temporarily
- No lock to portrait mode

**Fix:**
```javascript
// Add to initializeFullscreen:
if (Capacitor.isNativePlatform()) {
  await ScreenOrientation.lock({ orientation: 'portrait-primary' });
}
```

---

### 34. **No Audit Log of Quiz Attempts**
**File:** All  
**Severity:** MINOR

**Problem:**
- No record of who accessed quiz when
- No blockchain/immutable log of submissions
- Can't prove student submitted on time
- No forensic trail for disputes

**Missing Implementation:**
```javascript
// Add to every quiz action:
await AuditLog.create({
  action: 'QUIZ_START',
  studentId: student._id,
  quizId: quizId,
  timestamp: new Date(),
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

---

## 📋 EDGE CASES & NETWORK ISSUES

### 35. **Network Failure While Saving Progress Not Retried**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L302-310)  
**Severity:** MAJOR

**Problem:**
- If backend `/save-progress` fails, no retry
- Student's answers not persisted
- If quiz crashes, work is lost

**Fix - Add Retry Logic:**
```javascript
const saveProgressWithRetry = async (retries = 3) => {
  while (retries > 0) {
    try {
      await studentAuthAPI.saveProgress(attemptId, answers);
      console.log('✅ Progress saved');
      return;
    } catch (e) {
      retries--;
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1000 * (4 - retries)));
        console.log(`Retrying save... (${retries} left)`);
      }
    }
  }
  console.error('❌ Could not save progress after 3 attempts');
  toast.error('Warning: Your answers may not be saved due to network issues');
};
```

---

### 36. **Multiple Concurrent Submissions Not Prevented**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L976)  
**Severity:** CRITICAL

**Problem:**
```javascript
const handleSubmitQuiz = useCallback(async (auto = false, reason = '') => {
  if (submitting) return;  // ← Check exists but
  setSubmitting(true);
  try {
    // ...
    const res = await studentAuthAPI.submitQuizAttempt(attemptId, arr, auto, reason);
  } finally {
    setSubmitting(false);  // ← Could fail if network error
  }
}, [attemptId, answers, quizId, submitting, exitFullscreen]);
```

**Issue:**
- If first submit stalls (network timeout), `submitting` stays true forever
- User can't retry submission
- Quiz appears "hung"

**Fix:**
```javascript
const handleSubmitQuiz = useCallback(async (...) => {
  if (submitting) return;
  
  setSubmitting(true);
  const timeoutId = setTimeout(() => {
    console.error('Submit timeout');
    setSubmitting(false);
  }, 30000);  // 30 second timeout
  
  try {
    // ...
    const res = await studentAuthAPI.submitQuizAttempt(...);
    clearTimeout(timeoutId);
  } catch (e) {
    clearTimeout(timeoutId);
    setSubmitting(false);  // Always reset
  }
}, [...]);
```

---

### 37. **Token Expiration Not Handled During Long Quiz**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L976)  
**Severity:** CRITICAL

**Problem:**
- JWT token expires after 7 days (see studentAuth.js line 20)
- If quiz attempt spans midnight and token expires, submission fails
- No refresh token implementation

**Scenario:**
1. Student starts 3-hour exam at 9pm (token: 7-day expiry)
2. Exam ends at midnight (token still valid)
3. Next day, submits (token now expired)
4. Submission fails with 401 Unauthorized
5. Quiz data lost

**Fix:**
```javascript
// Add token refresh before submit
const refreshToken = async () => {
 const res = await studentAuthAPI.refreshToken();
 storage.setItem('token', res.data.token);
};

// In handleSubmitQuiz:
try {
  await refreshToken();
  const res = await studentAuthAPI.submitQuizAttempt(...);
} catch (e) {
  if (e.response?.status === 401) {
    toast.error('Session expired. Please log in again.');
    navigate('/student/login');
  }
}
```

---

### 38. **No Connection Required Before Attempting Offline**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L976)  
**Severity:** MAJOR

**Problem:**
- App doesn't verify internet connectivity before allowing quiz start
- Student could start quiz, go offline, and work
- Submission fails when no internet

**Fix:**
```javascript
const handleStartQuiz = async () => {
  // Check connection first
  if (!navigator.onLine) {
    toast.error('No internet connection. Please connect before starting quiz.');
    return;
  }
  
  try {
    const res = await studentAuthAPI.startQuizAttempt(quizId!);
    // ...
  }
};

// Monitor connection
useEffect(() => {
  window.addEventListener('offline', () => {
    if (quizStarted && !quizSubmitted) {
      toast.warning('Lost internet connection');
    }
  });
  
  window.addEventListener('online', () => {
    if (quizStarted && !quizSubmitted) {
      toast.success('Connection restored');
      // Retry any failed saves
    }
  });
}, [quizStarted, quizSubmitted]);
```

---

### 39. **No Handling for Browser Storage Full**
**File:** [src/pages/StudentSecureQuiz.tsx](src/pages/StudentSecureQuiz.tsx#L302-310)  
**Severity:** MINOR

**Problem:**
```javascript
storage.setItem(`quiz_state_${quizId}`, JSON.stringify({...}));
// Could throw if localStorage is full (quota exceeded)
```

**Issue:**
- If localStorage quota exceeded, quiz state not saved
- No error caught or shown to user
- Quiz progress lost without warning

**Fix:**
```javascript
useEffect(() => {
  if (quizId && Object.keys(answers).length > 0) {
    try {
      storage.setItem(`quiz_state_${quizId}`, JSON.stringify({answers, currentQuestion}));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        toast.error('Storage full - quiz progress may not be saved');
        console.warn('localStorage quota exceeded');
      }
    }
  }
}, [answers, currentQuestion, quizId]);
```

---

### 40. **No Cross-Device Session Conflict Detection**
**File:** All  
**Severity:** MAJOR

**Problem:**
- Student could have quiz open on laptop AND phone simultaneously
- Each device increments violation count separately
- Each device could submit different answers
- Confusing state

**Scenario:**
1. Start quiz on laptop
2. Open same quiz on phone
3. Both devices have `attemptId`
4. Laptop sees 1 violation, phone sees 0
5. Submit from both → duplicate submission

**Fix:**
```javascript
// Before starting quiz, invalidate other sessions:
router.post('/quiz/start', async (req, res) => {
  // ...
  // Cancel any other active attempts for this student/quiz
  const otherAttempts = await QuizAttempt.find({
    quizId,
    studentEmail,
    status: 'started'
  });
  
  for (const attempt of otherAttempts) {
    attempt.status = 'abandoned';
    await attempt.save();
  }
  
  // Now create new attempt
});
```

---

## 🎯 RECOMMENDATIONS

### Immediate Actions (Critical):
1. ✅ **Fix timer calculation** - Send server time + duration, calculate client-side
2. ✅ **Persist violation count** - Record violations in database, not just local state
3. ✅ **Block race condition** - Check blocked status BEFORE rendering UI
4. ✅ **Remove violation throttle** - Count every violation, not just one per 3s
5. ✅ **Implement timezone handling** - Use UTC everywhere
6. ✅ **Fix preauth security** - Require email verification before account creation

### High Priority (Major):
7. ⚠️ **Add scheduling validation to /quiz/start**
8. ⚠️ **Log violations to backend** - Create audit trail
9. ⚠️ **Reduce escape buffer to 10 seconds** - Not 30 seconds
10. ⚠️ **Add rate limiting to /quiz/submit**
11. ⚠️ **Implement unblock mechanism** - Teachers need override

### Medium Priority (Minor):
12. 🟡 **Fix CSS blur syntax** - Use inline styles
13. 🟡 **Add loading state for grading**
14. 🟡 **Lock device orientation**
15. 🟡 **Add audit logging** - All quiz actions
16. 🟡 **Refresh token before submit**

---

## 📞 CONTACT & NEXT STEPS

This audit identified **34 distinct issues** across security, data integrity, and user experience domains.

**Recommended Timeline:**
- **Week 1:** Fix all CRITICAL issues (1-11)
- **Week 2:** Fix all MAJOR issues (12-24)
- **Week 3:** Fix all MINOR issues (25-34)
- **Week 4:** Comprehensive testing and deployment

---

**Report Generated:** April 6, 2026  
**Auditor:** GitHub Copilot  
**Classification:** INTERNAL - Security Sensitive
