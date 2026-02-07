#!/usr/bin/env ts-node
/**
 * Test script to fetch Limitless profile ID from /api-v1/profile endpoint
 * 
 * Usage:
 *   ts-node scripts/test-profile-api.ts
 * 
 * Make sure LIMITLESS_API_KEY is set in your .env file
 */

import dotenv from 'dotenv';
import { config } from '../src/config/env';

dotenv.config();

async function testEndpoint(url: string, method: 'GET' | 'POST', headers: Record<string, string>, body?: string): Promise<{ success: boolean; id?: number; data?: unknown; error?: string; status?: number; preview?: string; isJson?: boolean }> {
  try {
    const options: RequestInit = {
      method,
      headers,
    };
    if (body && method === 'POST') {
      options.body = body;
    }
    
    const res = await fetch(url, options);
    const text = await res.text();
    const preview = text.slice(0, 200);
    const isJson = text.trim().startsWith('{') || text.trim().startsWith('[');
    
    if (res.ok && isJson) {
      try {
        const data = JSON.parse(text);
        if (data && typeof data === 'object' && 'id' in data) {
          const id = data.id;
          const num = typeof id === 'number' ? id : parseInt(String(id), 10);
          if (!Number.isNaN(num) && num > 0) {
            return { success: true, id: num, data, status: res.status, preview, isJson: true };
          }
        }
        return { success: true, data, status: res.status, preview, isJson: true };
      } catch {
        return { success: false, error: 'Not JSON', status: res.status, preview, isJson: false };
      }
    }
    return { success: false, error: `${res.status} ${res.statusText}`, status: res.status, preview, isJson };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function testProfileEndpoint() {
  const baseUrl = config.limitlessApiBaseUrl.replace(/\/$/, '');
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  
  if (config.limitlessApiKey) {
    const headerName = config.limitlessApiKeyHeader || 'X-API-Key';
    const headerValue = config.limitlessApiKeyPrefix
      ? `${config.limitlessApiKeyPrefix} ${config.limitlessApiKey}`
      : config.limitlessApiKey;
    headers[headerName] = headerValue;
    console.log(`✅ API Key found: ${config.limitlessApiKey.slice(0, 10)}...`);
    console.log(`   Header: ${headerName}: ${headerValue.slice(0, 20)}...`);
  } else {
    console.log('❌ LIMITLESS_API_KEY not set in .env');
    console.log('   Set it to: LIMITLESS_API_KEY=lmts_...');
    process.exit(1);
  }
  
  console.log(`\n📝 Note: Using Node.js fetch (server-side), not browser fetch`);
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`\n`);
  
  // First, test /markets/active to verify API key works (this is what the code uses)
  console.log(`🔍 Step 1: Testing /markets/active endpoint to verify API key works...`);
  const marketsUrl = `${baseUrl}/markets/active`;
  const marketsResult = await testEndpoint(marketsUrl, 'GET', headers);
  console.log(`   Status: ${marketsResult.status || 'unknown'}`);
  console.log(`   Preview: ${marketsResult.preview || 'no response'}`);
  if (marketsResult.success) {
    console.log(`   ✅ API key works! Got JSON response from /markets/active`);
  } else {
    console.log(`   ⚠️  /markets/active returned: ${marketsResult.error}`);
    // Try /api-v1/markets/active
    const marketsUrl2 = `${baseUrl}/api-v1/markets/active`;
    const marketsResult2 = await testEndpoint(marketsUrl2, 'GET', headers);
    console.log(`   Trying /api-v1/markets/active: Status ${marketsResult2.status}`);
    if (marketsResult2.success) {
      console.log(`   ✅ API key works! Got JSON response from /api-v1/markets/active`);
    } else {
      console.log(`   ⚠️  /api-v1/markets/active returned HTML (API docs page)`);
    }
  }
  console.log(`\n`);
  
  // Then try /profile (without /api-v1) as support suggested
  console.log(`🔍 Step 2: Testing /profile endpoint (as support suggested)...`);
  const profileUrl = `${baseUrl}/profile`;
  console.log(`   URL: ${profileUrl}`);
  console.log(`   Method: GET`);
  console.log(`   Headers: X-API-Key: ${headers['X-API-Key']?.slice(0, 20)}..., Accept: application/json`);
  
  const profileResult = await testEndpoint(profileUrl, 'GET', headers);
  
  console.log(`   Status: ${profileResult.status || 'unknown'}`);
  console.log(`   First 200 chars: ${profileResult.preview || 'no response'}`);
  
  if (profileResult.success && profileResult.id) {
    console.log(`\n   ✅ SUCCESS! Profile ID found: ${profileResult.id}`);
    console.log(`\n🎯 Add this to your .env file:`);
    console.log(`LIMITLESS_OWNER_ID=${profileResult.id}`);
    console.log(`\n📋 Full response:`, JSON.stringify(profileResult.data, null, 2));
    return;
  } else if (profileResult.success) {
    console.log(`   ⚠️  Got JSON but no 'id' field`);
    console.log(`   Response keys: ${profileResult.data && typeof profileResult.data === 'object' ? Object.keys(profileResult.data).join(', ') : 'unknown'}`);
    console.log(`   Full response:`, JSON.stringify(profileResult.data, null, 2));
  } else {
    console.log(`   ❌ Failed: ${profileResult.error}`);
    if (profileResult.preview?.includes('<!DOCTYPE') || profileResult.preview?.includes('<html')) {
      console.log(`   ⚠️  Still getting HTML (API docs page) instead of JSON`);
    }
  }
  console.log(`\n`);
  
  // Try other variations if /profile didn't work
  console.log(`🔍 Step 3: Trying other endpoint variations...`);
  const endpoints = [
    { url: `${baseUrl}/api-v1/profile`, method: 'GET' as const },
    { url: `${baseUrl}/api-v1/users/me`, method: 'GET' as const },
    { url: `${baseUrl}/api-v1/user/me`, method: 'GET' as const },
    { url: `${baseUrl}/api-v1/auth/verify-auth`, method: 'GET' as const },
    { url: `${baseUrl}/api-v1/portfolio`, method: 'GET' as const },
    { url: `${baseUrl}/api-v1/portfolio/positions`, method: 'GET' as const },
    { url: `${baseUrl}/api-v1/portfolio/trades`, method: 'GET' as const },
    { url: `${baseUrl}/api-v1/portfolio/history?page=1&limit=1`, method: 'GET' as const },
    { url: `${baseUrl}/users/me`, method: 'GET' as const },
    { url: `${baseUrl}/auth/verify-auth`, method: 'GET' as const },
  ];
  
  for (const endpoint of endpoints) {
    const { url, method } = endpoint;
    console.log(`   Testing: ${method} ${url}`);
    const result = await testEndpoint(url, method, headers);
    
    if (result.success && result.id) {
      console.log(`      ✅ SUCCESS! Profile ID: ${result.id}`);
      console.log(`\n🎯 Add this to your .env file:`);
      console.log(`LIMITLESS_OWNER_ID=${result.id}`);
      console.log(`\n📋 Full response:`, JSON.stringify(result.data, null, 2));
      return;
    } else if (result.success) {
      console.log(`      ⚠️  Got JSON but no 'id' field`);
      if (result.data && typeof result.data === 'object') {
        const keys = Object.keys(result.data);
        console.log(`      Response keys: ${keys.join(', ')}`);
        // Check if any nested object has 'id'
        for (const key of keys) {
          const value = (result.data as Record<string, unknown>)[key];
          if (value && typeof value === 'object' && 'id' in value) {
            const nestedId = (value as { id?: unknown }).id;
            const num = typeof nestedId === 'number' ? nestedId : parseInt(String(nestedId), 10);
            if (!Number.isNaN(num) && num > 0) {
              console.log(`      ✅ Found nested 'id' in '${key}': ${num}`);
              console.log(`\n🎯 Add this to your .env file:`);
              console.log(`LIMITLESS_OWNER_ID=${num}`);
              return;
            }
          }
        }
      }
    } else {
      console.log(`      ❌ Status ${result.status}: ${result.error}`);
      if (result.preview) {
        console.log(`      Preview: ${result.preview.slice(0, 100)}`);
      }
    }
  }
  
  console.log(`\n❌ None of the endpoints returned a valid profile ID.`);
  console.log(`\n📋 Summary for support:`);
  console.log(`   - Using: Node.js fetch (server-side)`);
  console.log(`   - Base URL: ${baseUrl}`);
  console.log(`   - /markets status: ${marketsResult.status}, preview: ${marketsResult.preview?.slice(0, 100)}`);
  console.log(`   - /profile status: ${profileResult.status}, preview: ${profileResult.preview?.slice(0, 100)}`);
  console.log(`\n💡 Contact Limitless support with this information.`);
}

testProfileEndpoint().catch(console.error);
