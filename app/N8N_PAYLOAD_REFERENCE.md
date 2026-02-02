# n8n Webhook Payload Reference

## Your Webhook URL
```
https://northsnow.app.n8n.cloud/webhook-test/painScope
```

## When the Webhook is Triggered

The webhook is called when a user clicks **"Submit & Start Research"** in the Briefing Room after answering all 4 questions.

## Payload Structure

### Complete Payload Example
```json
{
  "userId": "user_1738419600000_abc123def",
  "briefingId": "briefing_xyz789",
  "briefingData": {
    "industry": "Healthcare",
    "productFocus": "EMR solution",
    "competitors": ["PCS", "Epic", "Cerner"],
    "targetAudience": "Hospital owners",
    "additionalNotes": ""
  },
  "timestamp": "2026-02-01T12:30:00.000Z",
  "action": "start_research"
}
```

### Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `userId` | string | Unique user ID from local auth | `"user_1738419600000_abc123def"` |
| `briefingId` | string \| null | Briefing ID (may be null for local dev) | `"briefing_xyz789"` |
| `briefingData.industry` | string | Selected industry from dropdown | `"Healthcare"` |
| `briefingData.productFocus` | string | User's product/business focus | `"EMR solution"` |
| `briefingData.competitors` | string[] | Array of competitor names | `["PCS", "Epic", "Cerner"]` |
| `briefingData.targetAudience` | string | Target customer segment | `"Hospital owners"` |
| `briefingData.additionalNotes` | string | Optional notes (usually empty) | `""` |
| `timestamp` | string | ISO 8601 timestamp | `"2026-02-01T12:30:00.000Z"` |
| `action` | string | Always "start_research" | `"start_research"` |

## Expected Response

Your n8n workflow should respond with JSON containing research results:

### Success Response
```json
{
  "success": true,
  "researchData": {
    "marketSize": "$50B",
    "growthRate": "15% CAGR",
    "painPoints": [
      {
        "title": "Inefficient patient data management",
        "description": "Hospitals struggle with fragmented EMR systems",
        "severity": "high",
        "frequency": "daily"
      },
      {
        "title": "Poor interoperability",
        "description": "Systems don't communicate with each other",
        "severity": "high",
        "frequency": "daily"
      }
    ],
    "opportunities": [
      {
        "title": "AI-powered data integration",
        "description": "Automate data sync across systems",
        "potential": "high",
        "effort": "medium"
      }
    ],
    "competitorAnalysis": {
      "PCS": {
        "strengths": ["Established brand", "Large customer base"],
        "weaknesses": ["Legacy UI", "Slow updates"],
        "pricing": "$5000/month"
      },
      "Epic": {
        "strengths": ["Comprehensive features", "Strong support"],
        "weaknesses": ["Expensive", "Complex setup"],
        "pricing": "$10000/month"
      }
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Failed to scrape competitor data",
  "details": "Rate limit exceeded"
}
```

## n8n Workflow Recommendations

### 1. Webhook Trigger Node
- **Method:** POST
- **Path:** `/webhook-test/painScope`
- **Response Mode:** "Respond to Webhook"

### 2. Extract Data Node (Set)
```javascript
// Extract key fields for easier access
return {
  industry: $json.briefingData.industry,
  product: $json.briefingData.productFocus,
  competitors: $json.briefingData.competitors,
  audience: $json.briefingData.targetAudience
};
```

### 3. FireCrawl Nodes (3 parallel branches)

**Branch A: Scrape Competitors**
```javascript
// For each competitor, scrape their website
competitors.forEach(competitor => {
  // Search Google for competitor website
  // Use FireCrawl to scrape homepage, pricing, features
});
```

**Branch B: Scrape Industry Forums/Reddit**
```javascript
// Search for industry-specific pain points
// Reddit: r/healthcare, r/healthIT
// Forums: HIMSS, Healthcare IT News
```

**Branch C: Scrape Target Audience Communities**
```javascript
// Find where target audience discusses problems
// LinkedIn groups, Facebook groups, forums
```

### 4. AI Analysis Node (OpenAI/Claude)
```javascript
// Analyze all scraped data
// Identify pain points
// Score by severity and frequency
// Generate opportunities
```

### 5. Format Response Node
```javascript
// Structure data according to expected response format
return {
  success: true,
  researchData: {
    marketSize: analyzedData.marketSize,
    painPoints: analyzedData.painPoints,
    opportunities: analyzedData.opportunities,
    competitorAnalysis: analyzedData.competitors
  }
};
```

### 6. Respond to Webhook Node
- Return the formatted response to the app

## Testing Your Workflow

### 1. Test with Sample Payload
Use this curl command to test your n8n workflow:

```bash
curl -X POST https://northsnow.app.n8n.cloud/webhook-test/painScope \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_123",
    "briefingId": "test_briefing_456",
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

### 2. Test from the App
1. Restart dev server: `npm run dev`
2. Go to Briefing Room
3. Answer all 4 questions
4. Click "Submit & Start Research"
5. Check n8n execution logs

## Debugging

### Check n8n Logs
1. Go to n8n dashboard
2. Click "Executions"
3. Find the latest execution
4. Check each node's input/output

### Check App Console
Open browser DevTools → Console:
- Look for "Submit error:" messages
- Check network tab for webhook request/response

### Common Issues

**Issue:** Webhook times out
- **Solution:** Increase timeout in BriefingRoom.tsx or make workflow faster

**Issue:** CORS error
- **Solution:** Enable CORS in n8n webhook settings

**Issue:** Invalid response format
- **Solution:** Ensure response matches expected structure

## Next Steps

1. ✅ Webhook URL configured in `.env`
2. 🔄 Create n8n workflow with FireCrawl
3. 🔄 Test with sample payload
4. 🔄 Test from app
5. 🔄 Update dashboard to display research results
