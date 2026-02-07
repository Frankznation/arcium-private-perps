require('dotenv').config();

const apiKey = process.env.LIMITLESS_API_KEY;
const baseUrl = process.env.LIMITLESS_API_BASE_URL || 'https://api.limitless.exchange';

if (!apiKey) {
  console.error('❌ LIMITLESS_API_KEY not found in .env');
  process.exit(1);
}

console.log('🔍 Testing Limitless /profile endpoint...\n');
console.log(`API Key: ${apiKey.slice(0, 10)}...${apiKey.slice(-5)}`);
console.log(`Base URL: ${baseUrl}\n`);

const headers = {
  'X-API-Key': apiKey,
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

async function testProfile() {
  // Try different methods and paths
  const tests = [
    { url: `${baseUrl}/profile`, method: 'GET' },
    { url: `${baseUrl}/profile`, method: 'POST' },
    { url: `${baseUrl}/api-v1/profile`, method: 'GET' },
    { url: `${baseUrl}/api-v1/profile`, method: 'POST' },
    { url: `${baseUrl}/users/profile`, method: 'GET' },
    { url: `${baseUrl}/api-v1/users/profile`, method: 'GET' },
    { url: `${baseUrl}/user/profile`, method: 'GET' },
    { url: `${baseUrl}/api-v1/user/profile`, method: 'GET' },
  ];

  for (const test of tests) {
    console.log(`\n📡 Trying: ${test.method} ${test.url}`);
    try {
      const res = await fetch(test.url, { method: test.method, headers });
      const text = await res.text();
      
      console.log(`   Status: ${res.status} ${res.statusText}`);
      console.log(`   Headers:`, Object.fromEntries(res.headers.entries()));
      
      if (res.ok) {
        try {
          const data = JSON.parse(text);
          console.log(`\n✅ Success! Response:`);
          console.log(JSON.stringify(data, null, 2));
          
          // Look for id field
          if (data.id != null) {
            const num = typeof data.id === 'number' ? data.id : parseInt(String(data.id), 10);
            if (!Number.isNaN(num)) {
              console.log(`\n🎉 Found profile ID: ${num}`);
              console.log(`\n📝 Add this to your .env file:`);
              console.log(`LIMITLESS_OWNER_ID=${num}`);
              return num;
            }
          } else {
            console.log(`\n⚠️  Response doesn't have 'id' field. Available fields:`, Object.keys(data));
          }
        } catch (e) {
          console.log(`\n⚠️  Response is not JSON:`);
          console.log(text.slice(0, 500));
        }
      } else {
        console.log(`\n❌ Error response:`);
        console.log(text.slice(0, 500));
      }
    } catch (error) {
      console.log(`\n❌ Request failed:`, error.message);
    }
  }
  
  console.log(`\n\n💡 If /profile returned 404, the endpoint might be:`);
  console.log(`   - Under a different path (check Limitless API docs)`);
  console.log(`   - Requiring authentication first (try /auth/login)`);
  console.log(`   - Using a different API key format`);
}

testProfile().catch(console.error);
