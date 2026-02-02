# Testing Guide - Briefing Room with n8n Webhook

## ✅ Setup Complete

- ✅ `.env` file configured with your n8n webhook URL
- ✅ Dev server restarted and loaded new environment variables
- ✅ All features implemented (dropdown, edit, submit, webhook)

## Your n8n Webhook URL
```
https://northsnow.app.n8n.cloud/webhook-test/painScope
```

## Test Flow

### Step 1: Navigate to Briefing Room
1. Open `http://localhost:5173` in your browser
2. If not logged in, sign up/login (use code `12345` if verification appears)
3. Navigate to Briefing Room (should auto-redirect after login)

### Step 2: Answer Questions

**Question 1: Industry (Dropdown)**
- Click the dropdown
- Select an industry (e.g., "Healthcare")
- It will auto-submit and move to next question

**Question 2: Product Focus**
- Type: "EMR solution"
- Press Enter or click Send

**Question 3: Competitors**
- Type: "PCS, Epic, Cerner"
- Press Enter or click Send

**Question 4: Target Audience**
- Type: "Hospital owners"
- Press Enter or click Send

### Step 3: Review Summary
After answering all questions:
- Summary panel appears on the right
- Click "View Summary" button (up arrow) to scroll to it
- Verify all your answers are displayed correctly

### Step 4: Edit (Optional)
- Click "Edit Responses" button
- Modify any field (industry dropdown, text inputs)
- Click "Save" to apply changes
- Or click "Cancel" to discard

### Step 5: Submit & Trigger Webhook
- Click "Submit & Start Research" button
- Watch for:
  - Loading spinner on button
  - Button text changes to show loading state
  - After webhook completes, redirects to dashboard

### Step 6: Check n8n Execution
1. Go to your n8n dashboard: https://northsnow.app.n8n.cloud
2. Click "Executions" in the left sidebar
3. Find the latest execution (should be just now)
4. Click on it to see:
   - Input payload received
   - Each node's execution
   - Output response sent back

## Expected Webhook Payload

Your n8n workflow will receive:

```json
{
  "userId": "user_1738419600000_abc123",
  "briefingId": null,
  "briefingData": {
    "industry": "Healthcare",
    "productFocus": "EMR solution",
    "competitors": ["PCS", "Epic", "Cerner"],
    "targetAudience": "Hospital owners",
    "additionalNotes": ""
  },
  "timestamp": "2026-02-01T12:00:00.000Z",
  "action": "start_research"
}
```

## Debugging

### Check Browser Console
Open DevTools (F12) → Console tab:
- Look for any error messages
- Check Network tab for webhook request/response
- Filter by "painScope" to find the webhook call

### Check n8n Logs
If webhook fails:
1. Check n8n execution logs
2. Look for error messages in each node
3. Verify webhook URL is correct
4. Check if workflow is activated

### Common Issues

**Issue:** "Failed to submit briefing"
- **Check:** Is n8n workflow activated?
- **Check:** Is webhook URL correct in `.env`?
- **Check:** Does n8n return valid JSON response?

**Issue:** Webhook times out
- **Solution:** n8n workflow might be taking too long
- **Solution:** Increase timeout or optimize workflow

**Issue:** CORS error
- **Solution:** Enable CORS in n8n webhook settings
- **Solution:** Set "Respond to Webhook" mode in n8n

## Next Steps

### 1. Create n8n Workflow
See `N8N_WEBHOOK_INTEGRATION.md` for detailed workflow structure

### 2. Add FireCrawl Integration
- Sign up for FireCrawl API
- Add FireCrawl nodes to n8n workflow
- Configure scraping targets

### 3. Test End-to-End
- Submit briefing from app
- Verify n8n receives payload
- Check FireCrawl scrapes data
- Verify response returns to app

### 4. Update Dashboard
- Display research results
- Show pain points discovered
- Show competitor analysis
- Show market opportunities

## Quick Test Command

Test your n8n webhook directly with curl:

```bash
curl -X POST https://northsnow.app.n8n.cloud/webhook-test/painScope \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "briefingId": null,
    "briefingData": {
      "industry": "Healthcare",
      "productFocus": "EMR solution",
      "competitors": ["PCS", "Epic"],
      "targetAudience": "Hospital owners"
    },
    "timestamp": "2026-02-01T12:00:00.000Z",
    "action": "start_research"
  }'
```

Expected response:
```json
{
  "success": true,
  "researchData": { ... }
}
```

## Ready to Test! 🚀

Everything is set up and ready. Go ahead and test the flow in your browser!
