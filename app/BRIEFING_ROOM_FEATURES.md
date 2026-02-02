# Briefing Room - New Features

## ✅ Implemented Features

### 1. **Industry Dropdown** 
- First question now uses a dropdown instead of free text
- 20 predefined industry options (Fintech, HealthTech, SaaS, etc.)
- Auto-submits when user selects an option
- Maintains consistent UX with the rest of the app

### 2. **Up Arrow Button**
- Appears after all 4 questions are answered
- Located below the input area
- Smooth scrolls to the Briefing Summary panel
- Labeled "View Summary" with up arrow icon

### 3. **Edit & Submit Buttons**
- **Edit Button:** 
  - Allows users to modify their responses
  - Converts summary items to editable inputs
  - Industry remains a dropdown in edit mode
  - Save/Cancel buttons appear during editing
  
- **Submit Button:**
  - Labeled "Submit & Start Research"
  - Triggers n8n webhook with all briefing data
  - Shows loading state during submission
  - Navigates to dashboard after successful submission

### 4. **n8n Webhook Integration**
- Fires when user clicks "Submit & Start Research"
- Sends complete briefing data to n8n
- n8n workflow uses FireCrawl for web scraping
- Returns research data to update dashboard
- Graceful fallback if webhook URL not configured

## User Flow

1. **Question 1 (Industry):** User selects from dropdown → Auto-submits
2. **Questions 2-4:** User types answers → Presses Enter or clicks Send
3. **All Questions Complete:** 
   - Summary panel shows all responses
   - "View Summary" button appears below input
   - Edit and Submit buttons appear in summary panel
4. **Edit (Optional):**
   - Click "Edit Responses"
   - Modify any field
   - Click "Save" or "Cancel"
5. **Submit:**
   - Click "Submit & Start Research"
   - Webhook fires to n8n → FireCrawl scrapes data
   - User redirected to dashboard with research results

## Technical Details

### Components Modified
- `src/sections/BriefingRoom.tsx`
  - Added industry dropdown with 20 options
  - Added scroll-to-summary functionality
  - Added edit mode state management
  - Added submit webhook handler
  - Created `EditableSummaryItem` component

### New State Variables
```typescript
const [isEditing, setIsEditing] = useState(false);
const [editedData, setEditedData] = useState<BriefingData | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);
const summaryRef = useRef<HTMLDivElement>(null);
```

### Webhook Payload
```json
{
  "userId": "user_id",
  "briefingId": "briefing_id",
  "briefingData": {
    "industry": "Healthcare",
    "productFocus": "EMR solution",
    "competitors": ["PCS", "Epic"],
    "targetAudience": "Hospital owners"
  },
  "timestamp": "2026-02-01T12:00:00.000Z",
  "action": "start_research"
}
```

### Environment Variable
```env
VITE_N8N_RESEARCH_WEBHOOK_URL=https://northsnow.app.n8n.cloud/webhook-test/painScope
```

**✅ Already configured in `.env` file!**

## Design Consistency

All new UI elements follow the existing design:
- ✅ Dark theme (bg-background, text-foreground)
- ✅ Lime/green accent color for primary actions
- ✅ Consistent button styles and hover states
- ✅ Same font family (Rajdhani, Orbitron)
- ✅ Smooth animations with framer-motion
- ✅ Proper spacing and padding

## Next Steps

1. **Set up n8n workflow** (see `N8N_WEBHOOK_INTEGRATION.md`)
2. **Configure FireCrawl** in n8n for web scraping
3. **Update Dashboard** to display research results
4. **Test end-to-end flow** with real data
5. **Add error handling** for failed webhooks
6. **Implement retry logic** for failed submissions

## Testing

### Test the Dropdown
1. Go to Briefing Room
2. First question should show dropdown
3. Select "Healthcare" or any industry
4. Should auto-submit and move to next question

### Test Edit & Submit
1. Complete all 4 questions
2. Click "View Summary" button (up arrow)
3. Click "Edit Responses"
4. Modify any field
5. Click "Save"
6. Click "Submit & Start Research"
7. Should show loading state
8. Should navigate to dashboard

### Test Without n8n
- If `VITE_N8N_RESEARCH_WEBHOOK_URL` is not set
- Submit still works
- User redirected to dashboard
- No webhook call made
