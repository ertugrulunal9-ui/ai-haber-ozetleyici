# Privacy Policy — AI Haber Özetleyici (AI News Summarizer)

**Last updated:** 2026-05-30

## What Data We Collect

### Account Information
- To use the extension, you must create an account with a valid email address.
- You can sign up with an email and password, or via Google Sign-In.
- We store your email address and a unique user ID (provided by Supabase Auth) to authenticate your requests and enforce usage limits.
- If you sign in with Google, we receive only your email address and Google account ID. We do not receive your Google contacts, Drive, Gmail, or any other Google data.

### Device Identifier
- A random UUID is generated locally on your device and stored in Chrome's local storage.
- This is used to associate your reading statistics and votes with your device. It is linked to your account.

### Article Content
- When you click "Summarize," the article title and text (up to 5,000 characters) from the current page are sent to our server for AI processing.
- Raw article text is **not stored permanently**. It is forwarded to OpenAI's API for processing and discarded after the response is generated.

### Semantic Source Matching
- To find similar recent news events, we may store compact article metadata: title, URL, source host, language, and an embedding vector derived from the title and opening excerpt.
- The raw article text used to generate the embedding is not stored in this semantic index.
- These vectors are used only to match the article against similar events from the last 48 hours.

### Usage Data
- We track daily request counts per user account to enforce fair usage limits (10 summaries and 10 assistant requests per day).
- IP addresses are used temporarily for IP-level rate limiting and are not stored beyond the daily usage counter.

### Clickbait Votes
- If you vote on whether a headline is clickbait, the article URL, your user ID, and your vote are stored.

### Summary Feedback
- If you rate a summary (thumbs up/down), the article URL, your user ID, and your rating are stored.
- This data is used to improve summarization quality.

## What Data We Do NOT Collect

- No name, phone number, or payment information
- No browsing history beyond the article you actively summarize
- No cookies or tracking pixels
- No advertising identifiers
- No Google data beyond your email address (when using Google Sign-In)
- No data is sold to third parties

## Third-Party Services

### OpenAI
Article text is sent to OpenAI's API (gpt-4o-mini model) for summarization, bias analysis, and Q&A. OpenAI's data usage policy applies to this processing. See: https://openai.com/policies/usage-policies

Article titles and opening excerpts may also be sent to OpenAI's embedding API to power semantic source matching.

### Supabase
Authentication and backend storage run on Supabase (hosted in the EU). Your account data, usage counts, and votes are stored in a PostgreSQL database.

### Google Sign-In (optional)
If you choose to sign in with Google, authentication is handled via Google OAuth 2.0. We request only the minimum scopes necessary (email and profile) to identify your account. We do not access any other Google account data. Google's privacy policy applies to the authentication flow: https://policies.google.com/privacy

### Google News RSS
When fetching related sources, the article title (first 60 characters) is sent to Google News RSS as a search query. This is a public API and no authentication is required.

## Data Retention

- **Account data** (email, user ID) is retained for as long as your account is active.
- **Usage counts** are stored by date and automatically become irrelevant after each day.
- **Clickbait votes** are retained indefinitely to maintain community vote totals.
- **Summary feedback** is retained indefinitely to help improve summarization quality.
- **Semantic event metadata and embeddings** may be retained to support recent-event matching and source comparison.
- **Raw article content** is not stored — it is processed in-memory and discarded.

## Your Rights

- You can delete your account at any time by contacting us. This will remove your account data from our systems.
- You can clear your local reading history and statistics by removing the extension or clearing Chrome's local storage for the extension.

## Changes to This Policy

We may update this policy from time to time. Changes will be reflected in the "Last updated" date above. Continued use of the extension after changes constitutes acceptance of the updated policy.

## Contact

For questions about this privacy policy, please open an issue at the project's GitHub repository.
