#!/bin/bash
# Run Deno tests with required env vars stubbed for testing
# Usage: bash run_tests.sh

export ALLOWED_ORIGIN="chrome-extension://jompmeahomjbfpbkhfokobijnflljkik"
export OPENAI_API_KEY="test-key-not-real"
export SUPABASE_URL="http://localhost:54321"
export SUPABASE_SERVICE_ROLE_KEY="test-key-not-real"

deno test --allow-env "$(dirname "$0")"/*_test.ts
