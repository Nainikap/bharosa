

const API_BASE = 'https://bharosa-api.onrender.com/api';
const DEVICE_ID = 'dev-script-123';
const PIN = '1234';

async function testBackend() {
  console.log('--- Testing Backend API ---');
  
  // 0. Register
  console.log('\n0. Registering...');
  await fetch(`${API_BASE}/auth/device/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: DEVICE_ID, pin: PIN, role: 'supervisor', workerId: 'script' })
  });

  // 1. Login
  console.log('\n1. Logging in...');
  const loginRes = await fetch(`${API_BASE}/auth/device/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: DEVICE_ID, pin: PIN })
  });
  
  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text());
    return;
  }
  
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log('Login successful! Token acquired.');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Create Promise
  console.log('\n2. Creating a Promise...');
  const createRes = await fetch(`${API_BASE}/promises`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'referral',
      committedTo: { role: 'facility', facilityId: 'fac-1', workerId: 'worker-sup-1' },
      description: { name: 'Test API Patient', priority: 'routine', code: 'TEST12' },
      independence: 'direct'
    })
  });
  
  let newPromiseId = null;
  if (!createRes.ok) {
    console.error('Create promise failed:', await createRes.text());
  } else {
    const created = await createRes.json();
    console.log('Promise created successfully! ID:', created.id);
    newPromiseId = created.id;
  }

  // 3. Get Promises
  console.log('\n3. Fetching Promises...');
  const getRes = await fetch(`${API_BASE}/promises`, { headers });
  if (!getRes.ok) {
    console.error('Get promises failed:', await getRes.text());
  } else {
    const getBody = await getRes.json();
    console.log(`Fetched ${getBody.total} promises.`);
    console.log(JSON.stringify(getBody.data, null, 2));
    const found = getBody.data.find(p => p.id === newPromiseId);
    if (found) {
      console.log('Verified: Created promise exists in GET response.');
      console.log('Promise Status:', found.status);
    } else {
      console.log('Error: Created promise NOT found in GET response.');
    }
  }

  // 4. Capture Arrival (Update)
  if (newPromiseId) {
    console.log('\n4. Capturing Arrival (Updating Database)...');
    const updateRes = await fetch(`${API_BASE}/promises/${newPromiseId}/evidence`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        kind: 'arrival',
        source: 'manual_code',
        confidence: 'verified',
        metadata: { facilityId: 'fac-1', referralCode: newPromiseId }
      })
    });
    
    if (!updateRes.ok) {
      console.error('Capture arrival failed:', await updateRes.text());
    } else {
      const updated = await updateRes.json();
      console.log('Capture successful! New Status:', updated.status);
    }

    // 5. Verify Update in GET
    console.log('\n5. Verifying Update in GET...');
    const getRes2 = await fetch(`${API_BASE}/promises`, { headers });
    const getBody2 = await getRes2.json();
    const updatedFound = getBody2.data.find(p => p.id === newPromiseId);
    if (updatedFound) {
      console.log('Verified update: Current status is:', updatedFound.status);
    }
  }
}

testBackend().catch(console.error);
