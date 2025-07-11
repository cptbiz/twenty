# Bug Fixes Report

## Overview
This document details three critical bugs found in the Twenty CRM codebase, including logic errors, security vulnerabilities, and potential memory leaks. Each bug is explained with its root cause, potential impact, and the implemented fix.

## Bug #1: Cross-Site Scripting (XSS) Vulnerability in Releases Page

### **Severity:** HIGH - Security Vulnerability
### **Location:** `packages/twenty-front/src/pages/settings/Releases.tsx:124`

### **Bug Description:**
The application fetches release notes from an external API (`https://twenty.com/api/releases`) and renders HTML content using `dangerouslySetInnerHTML` without proper sanitization. While the content is processed through a markdown parser (remark/rehype), this still presents a potential XSS attack vector if the external API is compromised or serves malicious content.

```tsx
// Vulnerable code
<div dangerouslySetInnerHTML={{ __html: release.html }}></div>
```

### **Root Cause:**
- External content is rendered directly as HTML without sanitization
- Trust boundary violation: external API content treated as safe
- No Content Security Policy (CSP) protection for dynamically generated HTML

### **Potential Impact:**
- Script injection attacks if the external API is compromised
- Session hijacking through stolen cookies/tokens  
- Privilege escalation within the application
- Data exfiltration to malicious domains

### **Fix Applied:**
✅ **COMPLETED** - Implemented DOMPurify for HTML sanitization and added error handling for API failures.

**Changes made:**
- Added DOMPurify import and sanitization of HTML content
- Configured whitelist of allowed HTML tags and attributes
- Added proper error handling for API failures
- Prevents script injection while maintaining legitimate formatting

---

## Bug #2: Integer Parsing Without Radix Parameter

### **Severity:** MEDIUM - Logic Error
### **Location:** Multiple files including:
- `packages/twenty-front/vite.config.ts:30`
- `packages/twenty-front/src/modules/ui/input/components/internal/date/components/RelativeDatePickerHeader.tsx:79`

### **Bug Description:**
Multiple `parseInt()` calls are missing the radix parameter, which can lead to unexpected parsing behavior. When the radix is omitted, JavaScript interprets numbers with leading zeros as octal (base 8) in some contexts, causing incorrect results.

```javascript
// Problematic code
const port = parseInt(REACT_APP_PORT); // Missing radix
const amount = parseInt(amountString);  // Missing radix
```

### **Root Cause:**
- Missing second parameter (radix) in parseInt() calls
- Potential octal interpretation of strings with leading zeros
- Inconsistent parsing behavior across different JavaScript engines

### **Potential Impact:**
- Incorrect port numbers in development configuration
- Wrong date calculations in relative date picker
- Subtle bugs that are hard to reproduce and debug
- Inconsistent behavior across different environments

### **Fix Applied:**
✅ **COMPLETED** - Added explicit radix parameter (10) to all parseInt() calls for consistent decimal parsing.

**Changes made:**
- Fixed `vite.config.ts:30` - Port number parsing 
- Fixed `RelativeDatePickerHeader.tsx:79` - Date amount parsing
- Fixed `format-field-values.utils.ts:29` - Numeric field parsing
- Fixed `active-or-suspended-workspaces-migration.command-runner.ts:74` - Workspace limit parsing
- Fixed `parse-and-format-gmail-message.util.ts:69` - Gmail timestamp parsing
- All parseInt() calls now explicitly use base 10 for consistent behavior

---

## Bug #3: Potential Memory Leak in Database Connection Pool

### **Severity:** MEDIUM - Performance Issue  
### **Location:** `packages/twenty-server/src/engine/twenty-orm/pg-shared-pool/pg-shared-pool.service.ts:249`

### **Bug Description:**
The `startPoolStatsLogging()` method creates a setInterval timer that logs database pool statistics every 30 seconds. While there is cleanup logic in `onApplicationShutdown()`, if the service initialization fails after starting the logging interval, or if exceptions occur during shutdown, the interval may not be properly cleared, leading to memory leaks.

```typescript
// Potential leak scenario
this.logStatsInterval = setInterval(() => {
  this.logPoolStats();
}, 30000);
```

### **Root Cause:**
- setInterval created without guaranteed cleanup in all error scenarios
- Timer reference could be orphaned if service fails to initialize properly
- Missing defensive cleanup in exception handling paths

### **Potential Impact:**
- Memory leaks from uncleaned intervals accumulating over time
- Continued execution of logging code after service shutdown
- Resource exhaustion in long-running applications
- Zombie timers consuming CPU cycles

### **Fix Applied:**
✅ **COMPLETED** - Added defensive cleanup logic and improved error handling to ensure intervals are always cleared.

**Changes made:**
- Enhanced `initialize()` method with proper try-catch error handling
- Added defensive cleanup in error scenarios to prevent orphaned timers
- Improved `startPoolStatsLogging()` with duplicate interval prevention
- Added error handling inside interval callback to prevent infinite logging errors
- Ensures `logStatsInterval` is always properly cleaned up during failures

---

## Summary

These fixes address:
1. **Security**: XSS vulnerability protection through proper sanitization
2. **Reliability**: Consistent number parsing behavior
3. **Performance**: Prevention of memory leaks from uncleaned timers

All fixes maintain backward compatibility while improving the overall security and stability of the application.

## Implementation Status

| Bug | Severity | Status | Files Modified |
|-----|----------|--------|----------------|
| XSS Vulnerability | HIGH | ✅ Complete | 1 file |
| parseInt Without Radix | MEDIUM | ✅ Complete | 5 files |
| Memory Leak Potential | MEDIUM | ✅ Complete | 1 file |

**Total Issues Fixed:** 3  
**Files Modified:** 7  
**Lines Changed:** ~30  

All fixes have been implemented and verified. The codebase is now more secure, reliable, and performant.