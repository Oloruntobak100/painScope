# n8n Webhook Integration for PainScope AI

## Overview
The Briefing Room triggers an n8n workflow when users submit their briefing. The workflow uses **FireCrawl** to scrape and research market data based on user inputs.

## Environment Variables

Add these to your `.env` file:

```env
# n8n Webhook URLs
VITE_N8N_WEBHOOK_URL=https://northsnow.app.n8n.cloud/webhook-test/painScope
VITE_N8N_RESEARCH_WEBHOOK_URL=https://northsnow.app.n8n.cloud/webhook-test/painScope
VITE_N8N_AGENT_WEBHOOK_URL=https://northsnow.app.n8n.cloud/webhook-test/painScope
```

**✅ Already configured in `.env` file!**

## Webhook Flow

### 1. Submit Briefing (Main Trigger)

**Endpoint:** `VITE_N8N_RESEARCH_WEBHOOK_URL`

**When:** User clicks "Submit & Start Research" button after completing all 4 questions

**Payload:**
```json
{
  "userId": "user_123",
  "briefingId": "briefing_456",
  "briefingData": {
    "industry": "Healthcare",
    "productFocus": "EMR solution",
    "competitors": ["PCS", "Epic", "Cerner"],
    "targetAudience": "Hospital owners"
  },
  "timestamp": "2026-02-01T12:00:00.000Z",
  "action": "start_research"
}
```

**Expected Response:**
```json
{
  "success": true,
  "researchData": {
    "marketSize": "$50B",
    "painPoints": [...],
    "opportunities": [...],
    "competitorAnalysis": {...}
  }
}
```

## n8n Workflow Structure

### Workflow 1: Research & Scraping

```
1. Webhook Trigger (Respond to Webhook)
   ↓
2. Extract Briefing Data
   ↓
3. FireCrawl Node - Scrape Competitor Websites
   - Input: competitor URLs from briefingData.competitors
   - Output: competitor features, pricing, pain points
   ↓
4. FireCrawl Node - Scrape Industry News/Forums
   - Input: industry keywords from briefingData.industry
   - Output: market trends, customer complaints, opportunities
   ↓
5. FireCrawl Node - Scrape Target Audience Communities
   - Input: target audience keywords
   - Output: user pain points, feature requests, unmet needs
   ↓
6. AI Analysis (OpenAI/Claude)
   - Analyze all scraped data
   - Identify pain points
   - Calculate pain scores
   - Generate opportunity insights
   ↓
7. Format Response
   - Structure data for dashboard
   ↓
8. Respond to Webhook
   - Return research results to app
```

### FireCrawl Configuration

For each FireCrawl node:

**Settings:**
- **API Key:** Your FireCrawl API key
- **Mode:** `scrape` or `crawl`
- **Extract Schema:** Define what to extract (text, links, specific elements)
- **Wait for:** Page load completion
- **Timeout:** 30 seconds

**Example FireCrawl Scrape:**
```json
{
  "url": "{{ $json.competitorUrl }}",
  "formats": ["markdown", "html"],
  "onlyMainContent": true,
  "waitFor": 2000
}
```

## Testing Locally

### Without n8n (Development)
If `VITE_N8N_RESEARCH_WEBHOOK_URL` is not set:
- App will skip webhook call
- User is redirected to dashboard immediately
- No research data is fetched

### With n8n (Production-like)
1. Set up n8n instance (cloud or self-hosted)
2. Create the workflow described above
3. Get the webhook URL from n8n
4. Add to `.env` file
5. Test the flow:
   - Complete briefing
   - Click "Submit & Start Research"
   - Check n8n execution logs
   - Verify data appears in dashboard

## Dashboard Integration

After webhook responds, the app:
1. Stores research data in Supabase (if configured)
2. Updates `briefings` table with `research_data` field
3. Redirects user to dashboard
4. Dashboard displays:
   - Pain points discovered
   - Market opportunities
   - Competitor insights
   - Revenue potential

## Error Handling

If webhook fails:
- Error message shown to user
- User can retry submission
- Briefing data is preserved
- No data loss

## Security

- Webhook URLs should be HTTPS only
- Consider adding authentication headers
- Validate payload structure in n8n
- Rate limit webhook calls

## Next Steps

1. **Set up n8n instance**
2. **Create workflow** using the structure above
3. **Configure FireCrawl** with your API key
4. **Test webhook** with sample data
5. **Update dashboard** to display research results
6. **Add error handling** for failed scrapes
7. **Implement rate limiting** for API calls

## Example n8n Workflow JSON

See `n8n-workflow-example.json` (to be created) for a complete workflow template you can import into n8n.
