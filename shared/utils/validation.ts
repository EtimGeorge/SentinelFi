/**
 * Validates if an email is a corporate email.
 * Blocks common personal email domains.
 */
export const isCorporateEmail = (email: string): boolean => {
  const blockedDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'aol.com',
    'zoho.com',
    'yandex.com',
    'mail.com',
    'protonmail.com',
    'gmx.com'
  ];
  
  if (!email || !email.includes('@')) return false;
  
  const domain = email.split('@')[1].toLowerCase();
  return !blockedDomains.includes(domain);
};
