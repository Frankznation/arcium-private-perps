# Limitless Profile ID Lookup Issue

## Problem
Need to get numeric profile ID for `ownerId` parameter in `/orders` API endpoint.

## Wallet Address
`0x8a8C82300862E9639424C214BDaCa994Fe55e968`

## API Key
Present and configured (starts with `lmts_8S1RuiWrxCx6K6O...`)

## Test Results

### Endpoints Tested (all with `X-API-Key` header and `Accept: application/json`)

| Endpoint | Status | Response Type | Notes |
|----------|--------|---------------|-------|
| `GET /profile` | 404 | JSON error | `{"message":"Cannot GET /profile","error":"Not Found"}` |
| `GET /api-v1/profile` | 200 | HTML | Returns API documentation page (Scalar docs) |
| `GET /api-v1/users/me` | 200 | HTML | Returns API documentation page |
| `GET /api-v1/user/me` | 200 | HTML | Returns API documentation page |
| `GET /api-v1/auth/verify-auth` | 200 | HTML | Returns API documentation page |
| `GET /api-v1/portfolio` | 200 | HTML | Returns API documentation page |
| `GET /users/me` | 404 | JSON error | `{"message":"Cannot GET /users/me"}` |
| `GET /auth/verify-auth` | 401 | JSON error | `{"message":"The token cookie is required"}` |

### Observations
- All `/api-v1/*` endpoints return HTML (API documentation page) with 200 OK status
- Non-`/api-v1` endpoints return proper JSON error responses
- The `/auth/verify-auth` endpoint (without `/api-v1`) returns proper JSON but requires cookie auth

## Questions for Support
1. What is the correct endpoint to get my numeric profile ID?
2. Does the profile endpoint require cookie-based authentication instead of API key?
3. Is there a way to find my profile ID in the Limitless dashboard/UI?
4. Can you provide my numeric profile ID directly for wallet `0x8a8C82300862E9639424C214BDaCa994Fe55e968`?

## Current Workaround
Setting `LIMITLESS_OWNER_ID` manually in `.env` file once the numeric ID is obtained.

## Environment
- Using: Node.js fetch (server-side)
- Base URL: `https://api.limitless.exchange`
- API Key Header: `X-API-Key: lmts_...`
