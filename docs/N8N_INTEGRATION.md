# PainScope AI - n8n Integration Guide

This document describes how to integrate n8n workflows with PainScope AI.

## AI Briefing Chat Webhook (Phase 3)

### Endpoint

Configure `VITE_N8N_WEBHOOK_URL` in your environment to point to your n8n webhook URL.

### Request Format

The BriefingRoom sends a POST request with:

```json
{
  "messages": [
    { "role": "user", "content": "Fintech" },
    { "role": "assistant", "content": "Great! What is your product focus?" },
    { "role": "user", "content": "B2B payment platform" }
  ],
  "briefingData": {
    "industry": "Fintech",
    "productFocus": "B2B payment platform",
    "competitors": [],
    "targetAudience": "",
    "additionalNotes": ""
  },
  "currentQuestionIndex": 2,
  "totalQuestions": 4
}
```

### Expected Response Format

Your n8n workflow should return JSON:

```json
{
  "reply": "Who are your main competitors? (comma-separated)",
  "extractedData": {
    "industry": "Fintech",
    "productFocus": "B2B payment platform"
  }
}
```

- **reply** (required): The assistant's response text to display in the chat.
- **extractedData** (optional): Structured data to pre-fill the briefing form. Can include: `industry`, `productFocus`, `competitors` (array), `targetAudience`, `additionalNotes`.

### n8n Workflow Suggestion

1. **Webhook** node: Method POST, respond when last node finishes.
2. **AI** node (OpenAI/Claude): Use a system prompt like:

   > You are an AI Strategist helping users discover market opportunities. Ask one question at a time to gather: industry, product focus, competitors, target audience. Extract any clear answers into extractedData. Reply in markdown. When you have enough info, say you're ready to launch scouts.

3. **Respond to Webhook** node: Return `{ "reply": "<AI output>", "extractedData": { ... } }`.

## Agent Discovery Webhook (Phase 4)

When the user clicks "Launch Scouts," the app creates an `agent_jobs` row and calls your n8n webhook with:

```json
{
  "jobId": "uuid",
  "userId": "uuid",
  "briefingId": "uuid",
  "briefingData": {
    "industry": "Fintech",
    "productFocus": "B2B payments",
    "competitors": ["Stripe", "PayPal"],
    "targetAudience": "CFOs",
    "additionalNotes": ""
  },
  "appBaseUrl": "https://yourapp.vercel.app"
}
```

Your n8n workflow should: (1) crawl sources (e.g., via FireCrawl), (2) run NLP/pain extraction, (3) write to `pain_archetypes`, `pain_sources`, and `agent_logs` in Supabase, (4) update `agent_jobs` status to `completed`, (5) optionally trigger the email workflow below.

## Email Completion (Phase 5)

When your agent workflow completes, call your email n8n webhook (or use a Send Email node) with:

```json
{
  "jobId": "uuid",
  "userId": "uuid",
  "userEmail": "user@example.com",
  "appBaseUrl": "https://yourapp.vercel.app",
  "pains": [
    {
      "id": "uuid",
      "name": "Payment friction",
      "painScore": 87,
      "url": "https://yourapp.vercel.app/#library?painId=uuid"
    }
  ]
}
```

Build each pain's `url` as `${appBaseUrl}/#library?painId=${pain.id}`. The Pain Library reads `?painId=` and opens that archetype's detail panel.

## Data Sourcing with FireCrawl (Enhancement)

You can enhance the agent discovery pipeline using **FireCrawl** to source and scrape web data via n8n. FireCrawl provides structured extraction from URLs (articles, documentation, reviews, forums, etc.), which fits well with PainScope's need to crawl Reddit, Twitter, news sites, and review platforms.

### Suggested Flow

1. **Agent webhook** receives job context (industry, competitors, target audience).
2. **FireCrawl node** in n8n scrapes target URLs (e.g., Reddit threads, G2 reviews, industry forums).
3. **AI/NLP node** analyzes scraped content for pain signals and sentiment.
4. **Supabase node** writes to `pain_archetypes`, `pain_sources`, and `agent_logs`.

### Setup

- Add the [FireCrawl n8n node](https://www.firecrawl.dev/) or use FireCrawl's API within an HTTP Request node.
- Map FireCrawl output (markdown or structured content) into your pain-extraction prompts.
- Use FireCrawl for batch crawling of URLs derived from your briefing (competitor sites, review aggregators, community forums).
