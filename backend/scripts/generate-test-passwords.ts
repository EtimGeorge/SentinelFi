import * as crypto from 'crypto';

/**
 * Quick script to generate secure random passwords for testing
 */

function generatePassword(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const randomBytes = crypto.randomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  
  return password;
}

console.log('\n=== Test Passwords Generated ===\n');
console.log('Tenant 1 (SOLUTION_ENERGY):');
console.log('  Email: saencrystal.global@gmail.com');
console.log('  Password:', generatePassword());
console.log('');
console.log('Tenant 2 (SAENCRYSTAL_GLOBAL_SERVICES):');
console.log('  Email: saencrystal@gmail.com');
console.log('  Password:', generatePassword());
console.log('\n================================\n');
