# Email Re-Parsing Feature Guide

## Overview

Users can now **re-parse emails without resending them** using the refresh/reload buttons added to the Email Detail page.

## Where to Find the Refresh Buttons

### 1. **Attachments Section** (Top of page)
- Located above the attachments list
- Shows "Reparse" button with refresh icon
- **Only visible when extraction is already completed**
- Useful for re-extracting from the same attachments

### 2. **AI Summary Section** (Below extraction results)
- Located on the right side of the "AI Summary" heading
- Shows as a small circular button with refresh icon
- **Always available** when extraction results are shown
- Useful for quick re-extraction with fresh parsing

## How to Use

### Re-Parse an Email

1. **Open Email Detail page** → Click on any email in AI Email Inbox

2. **Once extraction is complete**, you'll see the AI Summary results

3. **Click the refresh button** (⟳) in either location:
   - Top-right of Attachments section
   - Top-right of AI Summary header

4. **Wait for re-parsing** → You'll see the loading animation again:
   ```
   ⟳ AI Processing
   └─ Reading email content...
   └─ Parsing attachments...
   └─ Extracting product details...
   └─ Validating order data...
   └─ Generating insights...
   └─ Complete!
   ```

5. **New extraction results** will replace the previous ones

## Use Cases

| Scenario | Action | Result |
|----------|--------|--------|
| PDF parsing improved (OCR update) | Click refresh | Re-parse PDF with updated OCR |
| Confidence was low | Click refresh | Re-try extraction with better parsing |
| Attachment content unclear | Click refresh | Re-parse and re-validate |
| AI model updated | Click refresh | Fresh extraction with new model |
| Manual attachment fix | Click refresh | Re-process with corrected attachment |

## Technical Details

### Backend
- **Endpoint:** `POST /api/v1/emails/:id/process`
- **Authentication:** Required (ADMIN/OPERATOR)
- **Effect:** Clears previous extraction job and creates new one
- **Queue:** Uses BullMQ job queue (async)

### Frontend
- **Button State:** Disabled while loading
- **Animation:** Spinning refresh icon during extraction
- **Feedback:** AI Processing animation overlay
- **Auto-refresh:** Query cache invalidated on completion

## Features

✅ **Instant Re-Parse**
- No need to resend email
- Preserves email body, subject, attachments
- Only re-triggers extraction job

✅ **Visual Feedback**
- Rotating icon shows loading state
- Processing animation explains steps
- Disabled state prevents double-clicks

✅ **Two Access Points**
- Attachments header: Emphasizes re-parsing files
- AI Summary header: For quick re-extraction after results

✅ **Smart Behavior**
- Only enabled when extraction completed
- Gracefully handles failures
- Logs re-parse attempts

## What Gets Re-Parsed

When you click refresh:
- ✅ Re-reads all attachments (PDF, Excel, Images, etc.)
- ✅ Re-scans email body text
- ✅ Re-runs OCR on scanned PDFs
- ✅ Re-validates products against inventory
- ✅ Re-scores confidence with fresh AI model

When you click refresh:
- ❌ Does NOT re-download email from IMAP
- ❌ Does NOT modify email metadata
- ❌ Does NOT change attachment files

## After Re-Parsing

Once new extraction completes:
1. AI Summary updates with new results
2. Confidence score may change
3. Extracted products may differ
4. You can approve and create order again
5. Previous extraction data is replaced

## Troubleshooting

### Button is disabled/greyed out
- **Reason:** Extraction is in progress
- **Fix:** Wait for animation to complete

### "Reparse" button not showing
- **Reason:** Extraction hasn't completed yet
- **Fix:** First complete initial extraction, then click refresh

### Same results after refresh
- **Reason:** Content is genuinely ambiguous or parsing is consistent
- **Fix:** Check if manual approval/correction is needed instead

### Extraction fails on refresh
- **Reason:** Network error, API timeout, or invalid attachment
- **Fix:** Check backend logs, verify attachment integrity, retry

## Best Practices

1. **Check Confidence First**
   - If confidence < 75%, refresh to re-parse with better settings

2. **Inspect Attachments**
   - Verify PDF/Excel files are readable before refresh

3. **Review Changes**
   - Compare old vs. new results after refresh
   - Note any improvements in product extraction

4. **Use for Scanned PDFs**
   - Especially useful with new OCR enhancements
   - Scanned PDFs may yield better results with improved OCR

5. **Don't Over-Refresh**
   - One refresh is usually sufficient
   - If still low confidence, may need manual review

---

*Feature added: Email Re-Parsing with Refresh Button*  
*Last Updated: July 25, 2026*
