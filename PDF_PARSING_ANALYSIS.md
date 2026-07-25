# PDF Parsing Issue Analysis - OrderPilot AI

**Date:** July 25, 2026  
**Status:** Issue Identified & Solution Planned

---

## Executive Summary

**Problem:** Application cannot parse PDF attachments with scanned images (handwritten orders, image-only PDFs).

**Root Cause:** Current PDF parser uses `pdf-parse` library which only extracts text from searchable PDFs. It **cannot**:
- Extract text from scanned/image-based PDFs
- Handle handwritten documents
- Process image-only order forms

**Solution:** Implement OCR (Optical Character Recognition) as a fallback when PDF text extraction yields insufficient content.

---

## Current Implementation Analysis

### 1. Email Ingestion (`emailIngestion.job.ts`)

**Status:** ✅ **WORKING**

```
Customer Email (with PDF)
    ↓
IMAP Poll (every ~60s)
    ↓
simpleParser extracts attachment
    ↓
Save to disk: /uploads/attachments/{uuid}.pdf
    ↓
Store metadata in Attachment table (storagePath, filename, mimeType)
    ↓
✅ Successfully saved to database
```

**Code:**
```typescript
fs.writeFileSync(absolutePath, att.content);  // ✅ File saved correctly
await prisma.attachment.create({
  data: {
    storagePath: absolutePath,
    filename: originalName,
    // ...
  },
});
```

### 2. PDF Text Extraction (`pdf.parser.ts`)

**Status:** ❌ **LIMITED - Only works for searchable PDFs**

```typescript
export const extractTextFromPDF = async (filePath: string): Promise<string> => {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text.trim();  // ❌ Returns empty for scanned PDFs
};
```

**Problem:**
- `pdf-parse` uses PDFjs which only extracts embedded text
- For scanned PDFs (images), `data.text` = "" (empty string)
- No detection of image-only PDFs
- No fallback mechanism

### 3. Extraction Pipeline (`extraction.service.ts`)

**Status:** ⚠️ **PARTIALLY WORKING**

**Flow:**
```
For each attachment:
    ↓
categoriseFile(filename)
    ↓
    if PDF:
        extractTextFromPDF(filePath)
        ↓
        text.trim().length > 20?
        ├─ YES: Send to Groq LLM
        └─ NO: ❌ Skip silently (log warning)
    
    if Image (JPG/PNG):
        encodeImageToBase64()
        ↓
        Send to Groq Vision Model ✅
```

**The Gap:**
- PDF with embedded images → skipped (no text)
- BUT same PDF could contain important data (order form, invoice)
- No mechanism to handle this scenario

---

## What Happens with a Scanned PDF?

### Example: Mock_Purchase_Order.pdf (from your test)

```
File: Mock_Purchase_Order.pdf (2 KB)
    ↓
emailIngestion.job:
  ✅ Saved to /uploads/attachments/{uuid}.pdf
  ✅ Stored in Attachment table
    ↓
extraction.service (runExtractionPipeline):
  1. Find attachment: "Mock_Purchase_Order.pdf"
  2. categoriseFile() → "pdf"
  3. extractTextFromPDF(filePath)
     - pdf-parse reads PDF
     - Detects no embedded text (it's an image)
     - Returns: data.text = ""  ← EMPTY!
  4. text.trim().length > 20?
     - 0 > 20? → FALSE
     - ❌ SKIP with warning: "text extraction yielded < 20 chars"
  5. Only email body is processed (if present)
    ↓
Result: Order data not extracted (0% confidence) ❌
```

---

## Required Solution: OCR Integration

### Option 1: Local OCR (Tesseract)
- **Pros:** Free, self-hosted, no API costs, works offline
- **Cons:** Slower, requires system library installation
- **Best for:** High-volume local deployments

### Option 2: Cloud OCR (Google Vision API)
- **Pros:** Very fast, high accuracy, handles complex images
- **Cons:** API costs (~$1-3 per 1000 pages), requires internet
- **Best for:** Production SaaS, best accuracy

### Option 3: Cloud OCR (Azure Computer Vision)
- **Pros:** Good accuracy, integrates with Azure ecosystem
- **Cons:** API costs, requires Azure account
- **Best for:** Azure-native deployments

### Recommended: Hybrid Approach

**Implement Google Vision API with fallback to Tesseract:**
1. Try Google Vision (fast, accurate) → store result
2. On error, fallback to local Tesseract
3. Cache results to avoid re-processing

---

## Implementation Plan

### Phase 1: Add OCR Detection & Fallback (Easy)
1. ✅ Detect if PDF has no extractable text
2. ✅ Extract images from PDF
3. ✅ Send images to Groq Vision API (already integrated)
4. ✅ Log detailed diagnostics

### Phase 2: Add Tesseract.js (Free/Local)
1. Install `tesseract.js` (no system dependencies)
2. On empty PDF text: extract images → OCR with Tesseract
3. Cache OCR results

### Phase 3: Add Google Vision (Optional/Premium)
1. Install `@google-cloud/vision`
2. Use for high-confidence production deployments
3. Cost: ~$0.25 per image

---

## Files That Need Changes

### 1. `backend/src/modules/ai-extraction/parsers/pdf.parser.ts`
- Add OCR detection
- Return metadata: { text, isScanned, hasImages }

### 2. `backend/src/modules/ai-extraction/extraction.service.ts`
- Handle scanned PDF case
- Extract images from PDF
- Send to Vision API or Tesseract

### 3. `backend/package.json`
- Add OCR libraries

### 4. `backend/.env.example`
- Add OCR config (optional Google Vision API key)

---

## Testing Strategy

### Test Cases:
1. ✅ Searchable PDF (current PDF with text)
2. ❌ Scanned PDF (image-only, like your Mock_Purchase_Order.pdf)
3. ❌ Handwritten PDF
4. ✅ PDF with images + text
5. ❌ Corrupted PDF

### Mock Test Files:
- Create scanned PDF from test image
- Create handwritten order image
- Create mixed PDF (text + images)

---

## Estimated Effort

| Phase | Task | Effort | Priority |
|---|---|---|---|
| 1 | Add OCR detection to PDF parser | 1-2 hrs | **IMMEDIATE** |
| 2 | Implement Tesseract.js fallback | 2-3 hrs | **HIGH** |
| 3 | Add Google Vision integration | 1-2 hrs | **MEDIUM** |
| 4 | Add error logging & diagnostics | 1 hr | **HIGH** |
| 5 | Write tests & documentation | 1-2 hrs | **MEDIUM** |

---

## Next Steps

1. **Immediate:** Implement Phase 1 (detect scanned PDFs)
2. **Short-term:** Add Tesseract.js for local OCR
3. **Medium-term:** Optional Google Vision API for production
4. **Ongoing:** Monitor extraction success rates

---

*Analysis prepared for OrderPilot AI PDF parsing enhancement*
