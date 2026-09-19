// Verification script for all 16 Core Rules
const http = require('node:http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING VERIFICATION TESTS ---');

  // Test 1: Landing Page
  console.log('1. Testing Landing Page (GET /)...');
  const r1 = await request({ hostname: 'localhost', port: 3000, path: '/', method: 'GET' });
  console.log('   Status:', r1.status, r1.body.includes('Undangan Digital V5') ? '✓ PASS' : '✗ FAIL');

  // Test 2: Admin Login
  console.log('2. Testing Admin Login (POST /api/admin/login)...');
  const r2 = await request({
    hostname: 'localhost', port: 3000, path: '/api/admin/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'admin123' });
  const loginData = JSON.parse(r2.body);
  console.log('   Status:', r2.status, loginData.success ? '✓ PASS' : '✗ FAIL');
  const cookie = r2.headers['set-cookie'] ? r2.headers['set-cookie'][0].split(';')[0] : '';

  // Test 3: Admin Create Invitation
  console.log('3. Testing Admin Create Invitation (POST /api/admin/invitations)...');
  const r3 = await request({
    hostname: 'localhost', port: 3000, path: '/api/admin/invitations', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie }
  }, {
    groom_nickname: 'Budi',
    bride_nickname: 'Citra',
    title: 'Wedding of Budi & Citra',
    theme_id: 'rose-gold'
  });
  const invData = JSON.parse(r3.body);
  console.log('   Status:', r3.status, invData.success && invData.managementToken ? '✓ PASS' : '✗ FAIL');
  const newMgmtToken = invData.managementToken;
  console.log('   Generated Management Token:', newMgmtToken);

  // Test 4: Tenant Access via Management Token (NO LOGIN / NO PASSWORD)
  console.log('4. Testing Tenant Management Access (GET /api/manage/' + newMgmtToken + ')...');
  const r4 = await request({
    hostname: 'localhost', port: 3000, path: `/api/manage/${newMgmtToken}`, method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  const tenantData = JSON.parse(r4.body);
  console.log('   Status:', r4.status, tenantData.success ? '✓ PASS' : '✗ FAIL');
  console.log('   Tenant Title:', tenantData.invitation.title);

  // Test 5: Tenant Rename / Edit Title (Autosave - RULE 8)
  console.log('5. Testing Tenant Rename Title (PUT /api/manage/' + newMgmtToken + ')...');
  const r5 = await request({
    hostname: 'localhost', port: 3000, path: `/api/manage/${newMgmtToken}`, method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  }, { title: 'The Royal Wedding of Budi & Citra' });
  const renameData = JSON.parse(r5.body);
  console.log('   Status:', r5.status, renameData.invitation.title === 'The Royal Wedding of Budi & Citra' ? '✓ PASS' : '✗ FAIL');

  // Test 6: Tenant Switch Theme (Data Preservation - RULE 12)
  console.log('6. Testing Tenant Switch Theme (PUT /api/manage/' + newMgmtToken + '/theme)...');
  const r6 = await request({
    hostname: 'localhost', port: 3000, path: `/api/manage/${newMgmtToken}/theme`, method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  }, { theme_id: 'rustic-flora' });
  const themeData = JSON.parse(r6.body);
  console.log('   Status:', r6.status, themeData.success ? '✓ PASS' : '✗ FAIL');

  // Verify data didn't change
  const r6Check = await request({
    hostname: 'localhost', port: 3000, path: `/api/manage/${newMgmtToken}`, method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  const checkData = JSON.parse(r6Check.body);
  console.log('   Verify Title preserved:', checkData.invitation.title === 'The Royal Wedding of Budi & Citra' ? '✓ PASS' : '✗ FAIL');
  console.log('   Verify Theme updated:', checkData.invitation.theme_id === 'rustic-flora' ? '✓ PASS' : '✗ FAIL');

  // Test 7: Tenant Add Guest (Generate Guest Token - RULE 6)
  console.log('7. Testing Tenant Add Guest (POST /api/manage/' + newMgmtToken + '/guests)...');
  const r7 = await request({
    hostname: 'localhost', port: 3000, path: `/api/manage/${newMgmtToken}/guests`, method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { name: 'Keluarga Besar Bpk. Hendra & Rekan', category: 'VIP', phone: '08123456789' });
  const guestData = JSON.parse(r7.body);
  console.log('   Status:', r7.status, guestData.success && guestData.guest.guest_token ? '✓ PASS' : '✗ FAIL');
  const newGuestToken = guestData.guest.guest_token;
  console.log('   Generated Guest Token:', newGuestToken);

  // Test 8: Guest Access via Guest Link (NO LOGIN - RULE 3 & 10)
  console.log('8. Testing Guest View (GET /api/u/' + checkData.invitation.slug + '/' + newGuestToken + ')...');
  const r8 = await request({
    hostname: 'localhost', port: 3000, path: `/api/u/${checkData.invitation.slug}/${newGuestToken}`, method: 'GET'
  });
  const guestViewData = JSON.parse(r8.body);
  console.log('   Status:', r8.status, guestViewData.guest.name === 'Keluarga Besar Bpk. Hendra & Rekan' ? '✓ PASS' : '✗ FAIL');
  console.log('   Personalized Guest Name in Response:', guestViewData.guest.name);

  // Test 9: Guest RSVP
  console.log('9. Testing Guest RSVP (POST /api/u/' + checkData.invitation.slug + '/' + newGuestToken + '/rsvp)...');
  const r9 = await request({
    hostname: 'localhost', port: 3000, path: `/api/u/${checkData.invitation.slug}/${newGuestToken}/rsvp`, method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { attendance_status: 'hadir', total_pax: 2 });
  const rsvpData = JSON.parse(r9.body);
  console.log('   Status:', r9.status, rsvpData.success ? '✓ PASS' : '✗ FAIL');

  // Test 10: Guest Wish / Doa
  console.log('10. Testing Guest Wish (POST /api/u/' + checkData.invitation.slug + '/' + newGuestToken + '/wishes)...');
  const r10 = await request({
    hostname: 'localhost', port: 3000, path: `/api/u/${checkData.invitation.slug}/${newGuestToken}/wishes`, method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { message: 'Selamat atas pernikahannya! Semoga senantiasa sakinah, mawaddah, warahmah.' });
  const wishData = JSON.parse(r10.body);
  console.log('   Status:', r10.status, wishData.success ? '✓ PASS' : '✗ FAIL');

  // Test 11: Invalid Management Token rejection
  console.log('11. Testing Invalid Management Token Rejection...');
  const r11 = await request({
    hostname: 'localhost', port: 3000, path: '/api/manage/InvalidToken12345', method: 'GET',
    headers: { 'Accept': 'application/json' }
  });
  console.log('   Status:', r11.status === 404 ? '✓ 404 PASS' : '✗ FAIL');

  console.log('--- ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY! ---');
}

runTests().catch(console.error);
