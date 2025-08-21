/**
 * Test script to debug email validation
 * Run with: npx tsx test-email-validation.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEmailValidation() {
  const testEmail = 'christian_handoko@gloriaschool.org';
  
  console.log('=== Email Validation Test ===');
  console.log(`Testing email: "${testEmail}"`);
  console.log(`Email length: ${testEmail.length} characters`);
  console.log('');

  try {
    // Test 1: Count all emails in the database
    const totalEmails = await prisma.dataKaryawan.count({
      where: {
        email: {
          not: null,
        },
      },
    });
    console.log(`Total employees with emails: ${totalEmails}`);
    console.log('');

    // Test 2: Try exact match with case-insensitive
    console.log('Test 1: Exact match with case-insensitive mode');
    const exactMatch = await prisma.dataKaryawan.findFirst({
      where: {
        email: {
          equals: testEmail,
          mode: 'insensitive',
        },
      },
      select: {
        nip: true,
        nama: true,
        email: true,
      },
    });
    console.log('Result:', exactMatch || 'NOT FOUND');
    console.log('');

    // Test 3: Try with lowercase
    console.log('Test 2: Lowercase exact match');
    const lowercaseMatch = await prisma.dataKaryawan.findFirst({
      where: {
        email: {
          equals: testEmail.toLowerCase(),
          mode: 'insensitive',
        },
      },
      select: {
        nip: true,
        nama: true,
        email: true,
      },
    });
    console.log('Result:', lowercaseMatch || 'NOT FOUND');
    console.log('');

    // Test 4: Try contains
    console.log('Test 3: Contains match');
    const containsMatch = await prisma.dataKaryawan.findFirst({
      where: {
        email: {
          contains: testEmail,
          mode: 'insensitive',
        },
      },
      select: {
        nip: true,
        nama: true,
        email: true,
      },
    });
    console.log('Result:', containsMatch || 'NOT FOUND');
    console.log('');

    // Test 5: Raw SQL query
    console.log('Test 4: Raw SQL query');
    const rawResult: any[] = await prisma.$queryRaw`
      SELECT nip, nama, email 
      FROM gloria_master.data_karyawan 
      WHERE LOWER(TRIM(email)) = ${testEmail.toLowerCase()}
      LIMIT 1
    `;
    console.log('Result:', rawResult.length > 0 ? rawResult[0] : 'NOT FOUND');
    console.log('');

    // Test 6: Find similar emails (same domain)
    console.log('Test 5: Find emails with same domain');
    const domain = '@gloriaschool.org';
    const similarEmails = await prisma.dataKaryawan.findMany({
      where: {
        email: {
          contains: domain,
          mode: 'insensitive',
        },
      },
      select: {
        nama: true,
        email: true,
      },
      take: 5,
    });
    console.log(`Found ${similarEmails.length} emails with domain ${domain}:`);
    similarEmails.forEach(emp => {
      console.log(`  - ${emp.nama}: "${emp.email}"`);
    });
    console.log('');

    // Test 7: Search by partial name
    console.log('Test 6: Search by name "Christian Handoko"');
    const byName = await prisma.dataKaryawan.findMany({
      where: {
        OR: [
          {
            nama: {
              contains: 'Christian',
              mode: 'insensitive',
            },
          },
          {
            nama: {
              contains: 'Handoko',
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        nip: true,
        nama: true,
        email: true,
      },
      take: 5,
    });
    console.log(`Found ${byName.length} employees with name containing "Christian" or "Handoko":`);
    byName.forEach(emp => {
      console.log(`  - ${emp.nama} (${emp.nip}): "${emp.email || 'NO EMAIL'}"`);
    });
    console.log('');

    // Test 8: Check for whitespace issues
    console.log('Test 7: Check for whitespace in emails');
    const emailsWithSpaces: any[] = await prisma.$queryRaw`
      SELECT nip, nama, email, LENGTH(email) as email_length
      FROM gloria_master.data_karyawan 
      WHERE email LIKE '%christian%handoko%'
         OR email LIKE '% %'
         OR email != TRIM(email)
      LIMIT 10
    `;
    if (emailsWithSpaces.length > 0) {
      console.log('Found emails with potential whitespace issues:');
      emailsWithSpaces.forEach(emp => {
        console.log(`  - ${emp.nama}: "${emp.email}" (length: ${emp.email_length})`);
      });
    } else {
      console.log('No emails with whitespace issues found');
    }

  } catch (error) {
    console.error('Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testEmailValidation().catch(console.error);