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

async function findUserId() {
  console.log('🔍 Looking for your Limitless user ID...\n');
  console.log(`Wallet: ${wallet}`);
  console.log(`API Base: ${baseUrl}\n`);

  const endpoints = [
    '/auth/verify-auth',
    '/api-v1/auth/verify-auth',
    '/users/me',
    '/api-v1/users/me',
    '/me',
    `/profile/${wallet.toLowerCase()}`,
    `/api-v1/profile/${wallet.toLowerCase()}`,
    `/users/${wallet.toLowerCase()}`,
    `/api-v1/users/${wallet.toLowerCase()}`,
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
          console.log(`✅ Success! Response:`, JSON.stringify(data, null, 2).slice(0, 500));
          
          // Look for id fields
          const id = data.id ?? data.userId ?? data.ownerId ?? data.user_id ?? data.owner_id ?? data.accountId;
          if (id != null) {
            const num = typeof id === 'number' ? id : parseInt(String(id), 10);
            if (!Number.isNaN(num)) {
              console.log(`\n🎉 Found your user ID: ${num}`);
              console.log(`\nAdd this to your .env file:`);
              console.log(`LIMITLESS_OWNER_ID=${num}`);
              return num;
            }
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

  console.log('\n❌ Could not find user ID automatically.');
  console.log('\n📋 Next steps:');
  console.log('1. Check your profile page: https://limitless.exchange/profile/' + wallet);
  console.log('2. Look for a "User ID", "Account ID", or "ID" number');
  console.log('3. Or contact Limitless support and ask: "What is my user ID for the orders API?"');
  console.log('4. Then add LIMITLESS_OWNER_ID=<that number> to your .env file');
}

findUserId().catch(console.error);
