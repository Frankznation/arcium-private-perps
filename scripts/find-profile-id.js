require('dotenv').config();

const apiKey = process.env.LIMITLESS_API_KEY;
const baseUrl = process.env.LIMITLESS_API_BASE_URL || 'https://api.limitless.exchange';
const wallet = '0x8a8C82300862E9639424C214BDaCa994Fe55e968';

const headers = apiKey
  ? {
      'X-API-Key': apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  : {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

async function findProfileId() {
  console.log('🔍 Looking for your numeric Limitless profile ID...\n');
  console.log(`Wallet: ${wallet}`);
  console.log(`API Base: ${baseUrl}\n`);

  // Support confirmed: GET /profile returns { id: <numeric profile ID> }
  const endpoints = [
    // Primary endpoint (as support confirmed)
    '/profile',
    // Fallback endpoints
    '/api-v1/profile',
    '/portfolio',
    '/api-v1/portfolio',
    '/balance',
    '/api-v1/balance',
    '/accounts/' + wallet.toLowerCase(),
    '/api-v1/accounts/' + wallet.toLowerCase(),
    '/trades',
    '/api-v1/trades',
    '/positions',
    '/api-v1/positions',
    '/orders',
    '/api-v1/orders',
    '/users/' + wallet.toLowerCase(),
    '/api-v1/users/' + wallet.toLowerCase(),
    '/users/me',
    '/api-v1/users/me',
    '/auth/verify-auth',
    '/api-v1/auth/verify-auth',
  ];

  for (const endpoint of endpoints) {
    const url = baseUrl + endpoint;
    try {
      console.log(`Trying: ${url}...`);
      const res = await fetch(url, { method: 'GET', headers });
      const text = await res.text();
      
      if (res.ok) {
        try {
          const data = JSON.parse(text);
          console.log(`✅ Success! Response:`, JSON.stringify(data, null, 2).slice(0, 800));
          
          // Recursively search for numeric ID fields (support says it's in user-related responses)
          const findNumericId = (obj, depth = 0) => {
            if (depth > 5) return null;
            if (obj === null || obj === undefined) return null;
            
            if (typeof obj === 'object') {
              const idFields = ['id', 'profileId', 'userId', 'ownerId', 'profile_id', 'user_id', 'owner_id', 'accountId', 'userAccountId'];
              for (const field of idFields) {
                const value = obj[field];
                if (value != null) {
                  const num = typeof value === 'number' ? value : parseInt(String(value), 10);
                  if (!Number.isNaN(num) && num > 0) {
                    return num;
                  }
                }
              }
              
              // Check nested objects and arrays
              for (const key in obj) {
                if (Array.isArray(obj[key])) {
                  for (const item of obj[key]) {
                    const found = findNumericId(item, depth + 1);
                    if (found != null) return found;
                  }
                } else if (typeof obj[key] === 'object') {
                  const found = findNumericId(obj[key], depth + 1);
                  if (found != null) return found;
                }
              }
            }
            return null;
          };
          
          const numericId = findNumericId(data);
          if (numericId != null) {
            console.log(`\n🎉 Found numeric ID: ${numericId}`);
            console.log(`\n📝 Add this to your .env file:`);
            console.log(`LIMITLESS_OWNER_ID=${numericId}`);
            return numericId;
          }
        } catch (e) {
          console.log(`   Response is not JSON: ${text.slice(0, 100)}`);
        }
      } else {
        console.log(`   Status: ${res.status}`);
      }
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log('\n❌ Could not find numeric profile ID automatically.');
  console.log('\n📋 Next steps:');
  console.log('1. Contact Limitless support and ask: "What is my numeric user/profile ID for the orders API?"');
  console.log('2. Your wallet: ' + wallet);
  console.log('3. Once you get the number, add LIMITLESS_OWNER_ID=<that number> to your .env file');
}

findProfileId().catch(console.error);
