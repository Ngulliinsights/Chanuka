// Simple test to check validation imports
const { ValidationService, userRegistrationSchema } = require('./dist/validation');

console.log('ValidationService:', typeof ValidationService);
console.log('userRegistrationSchema:', typeof userRegistrationSchema);

if (userRegistrationSchema && typeof userRegistrationSchema.extend === 'function') {
  console.log('✅ userRegistrationSchema.extend is available');
} else {
  console.log('❌ userRegistrationSchema.extend is not available');
  console.log('userRegistrationSchema methods:', Object.getOwnPropertyNames(userRegistrationSchema));
}

try {
  const service = new ValidationService();
  console.log('✅ ValidationService can be instantiated');
} catch (error) {
  console.log('❌ ValidationService instantiation failed:', error.message);
}