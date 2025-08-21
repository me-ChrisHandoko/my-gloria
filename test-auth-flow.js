#!/usr/bin/env node

const emailsToTest = [
  'christian_handoko@gloriaschool.org',  // Database format
  'christian.handoko@gloriaschool.org',  // Microsoft OAuth format
  'Christian.Handoko@gloriaschool.org',  // Capitalized
  'christian.handoko@gloria.sch.id',     // Alternative domain
];

const API_URL = 'http://localhost:3001/api';

async function testEmail(email) {
  console.log(`\n=== Testing: ${email} ===`);
  
  try {
    const response = await fetch(`${API_URL}/auth/validate-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    const data = await response.json();
    
    if (data.success && data.data) {
      const result = data.data;
      console.log(`✅ Valid: ${result.valid}`);
      if (result.employee) {
        console.log(`   Employee: ${result.employee.nama} (NIP: ${result.employee.nip})`);
      }
      if (result.debug) {
        console.log(`   Debug: Normalized to: ${result.debug.normalizedEmail}`);
      }
    } else {
      console.log('❌ Error:', data);
    }
  } catch (error) {
    console.log('❌ Failed:', error.message);
  }
}

async function main() {
  console.log('Starting email validation tests...');
  console.log('Backend URL:', API_URL);
  
  for (const email of emailsToTest) {
    await testEmail(email);
  }
  
  console.log('\n=== Test Complete ===');
}

main();