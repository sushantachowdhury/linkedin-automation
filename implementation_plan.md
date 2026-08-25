# Implementation Plan - Multiple Draft Alternatives with Selection & Cancelation

This plan describes the implementation of a 3-post draft selection interface. Instead of generating a single LinkedIn post, the pipeline will generate 3 distinct alternative drafts. The user can select one, customize it, approve it, or reject/cancel the drafts to start over.

## Proposed Changes

We will modify both frontend and backend files.

---

### Backend Logic

#### [MODIFY] [gemini.js](file:///c:/Users/Graphics/Desktop/linkedin-automation/src/gemini.js)
- Update `generateDraftPost(settings, title, analyticsStatus)` to ask the Gemini API for 3 alternative post drafts.
- Use Gemini's structured JSON output (`responseMimeType: 'application/json'`) with a schema ensuring an array of exactly 3 strings is returned.
- Update the mock fallback `generateMockPost` to return an array of 3 distinct mock posts (focused on performance, UI-UX, and accessibility respectively) instead of a single string.

#### [MODIFY] [scheduler.js](file:///c:/Users/Graphics/Desktop/linkedin-automation/src/scheduler.js)
- Update `triggerContentGen(date)` to:
  - Save the array of 3 drafts to `post.draftOptions`.
  - Leave `post.messagePayload` empty initially.
  - Set `post.status` to `'Awaiting'`.
  - Sync with Google Sheet by writing `'Awaiting Selection'` to `Analytics_Status` and leaving `Message_Payload` blank.
- Update `triggerAlert(date)` to support notifying when drafts are ready for selection.

#### [MODIFY] [index.js](file:///c:/Users/Graphics/Desktop/linkedin-automation/src/index.js)
- Add `/api/posts/select-option` (POST) to select a draft index, store it in `messagePayload`, change status to `'Drafted'`, and sync to Google Sheets.
- Add `/api/posts/reject` (POST) to discard options, clear payload, set status to `'Pending'`, and sync to Google Sheets.

---

### Frontend Dashboard UI

#### [MODIFY] [Editor.jsx](file:///c:/Users/Graphics/Desktop/linkedin-automation/frontend/src/components/Editor.jsx)
- Check if the current post has `draftOptions` populated but `messagePayload` is empty (indicating it is in `'Awaiting'` state).
- If so, render a beautiful selection UI showing 3 alternative draft options side-by-side or stacked.
- Provide a **"Choose Option"** button for each draft option.
- Provide a **"Cancel & Discard Drafts"** button at the bottom of the section to trigger the `/api/posts/reject` API, resetting the post to `'Pending'`.
- Once an option is chosen, restore the standard text editor layout allowing final edits, manual overrides, and schedule approvals.

---

## Verification Plan

### Automated/Manual Verification Steps
1. Restart the dev environment: `npm run dev`.
2. Navigate to [http://localhost:5173/](http://localhost:5173/).
3. Open the **Editor** tab, select a pending date.
4. Click **Generate** manually.
5. Verify that:
   - 3 distinct draft cards appear in the UI.
   - Click "Cancel / Discard Drafts" resets the state to Pending.
   - Re-generating and clicking "Choose Option X" loads Option X into the main editor window and updates the Google Sheet row.
   - The preview updates live for the selected draft.
