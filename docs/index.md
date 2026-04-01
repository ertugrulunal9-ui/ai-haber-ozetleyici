# Privacy Policy — AI Haber Özetleyici (AI News Summarizer)

**Last updated:** 2026-03-23

## What Data We Collect

### Device Identifier
- A random UUID is generated locally on your device using `crypto.randomUUID()` and stored in Chrome's local storage.
- This identifier is **not linked** to your name, email, or any personal information.
- It is used solely for rate limiting (tracking daily usage quotas).

### Article Content
- When you click "Summarize," the article title and text (up to 4,000 characters) from the current page are sent to our server for AI processing.
- This content is **not stored permanently**. It is forwarded to OpenAI's API for processing and discarded after the response is generated.

### Usage Data
- We track daily request counts per device ID to enforce fair usage limits (10 summaries and 10 assistant requests per day).
- IP addresses are used temporarily for IP-level rate limiting and are not stored beyond the daily usage counter.

### Clickbait Votes
- If you vote on whether a headline is clickbait, the article URL, your device ID, and your vote are stored.
- This data is anonymous — it cannot be linked to your identity.

### Summary Feedback
- If you rate a summary (thumbs up/down), the article URL, your device ID, and your rating are stored.
- This data is anonymous and used to improve summarization quality.

### Authentication
- The extension creates an anonymous session via Supabase Auth to authenticate API requests.
- This session contains no personal information — it is tied to a random identifier, not to any account or email.

## What Data We Do NOT Collect

- No personal information (name, email, phone number)
- No browsing history beyond the article you actively summarize
- No cookies or tracking pixels
- No advertising identifiers
- No data is sold to third parties

## Third-Party Services

### OpenAI
Article text is sent to OpenAI's API (gpt-4o-mini model) for summarization, bias analysis, and Q&A. OpenAI's data usage policy applies to this processing. See: https://openai.com/policies/usage-policies

### Supabase
Our backend runs on Supabase (hosted in the EU). Usage counts and votes are stored in a PostgreSQL database with Row Level Security enabled.

### Google News RSS
When fetching related sources, the article title (first 60 characters) is sent to Google News RSS as a search query. This is a public API and no authentication is required.

## Data Retention

- **Usage counts** are stored by date and automatically become irrelevant after each day.
- **Clickbait votes** are retained indefinitely to maintain community vote totals.
- **Summary feedback** is retained indefinitely to help improve summarization quality.
- **Article content** is not stored — it is processed in-memory and discarded.

## Your Rights

- You can clear your device ID at any time by removing the extension or clearing Chrome's local storage for the extension.
- Since no personal data is collected, there is no personal data to request, modify, or delete.

## Changes to This Policy

We may update this policy from time to time. Changes will be reflected in the "Last updated" date above.

## Contact

For questions about this privacy policy, please open an issue at the project's GitHub repository.
