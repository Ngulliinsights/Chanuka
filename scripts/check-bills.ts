import { readDatabase } from '../server/infrastructure/database';
import { bills } from '../server/infrastructure/schema';
import { sql } from 'drizzle-orm';

async function checkBills() {
  try {
    console.log('Checking bills table...');
    
    // Count total bills
    const countResult = await readDatabase
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(bills);
    
    const total = countResult[0]?.count || 0;
    console.log(`Total bills in database: ${total}`);
    
    if (total > 0) {
      // Get first 5 bills
      const sampleBills = await readDatabase
        .select({
          id: bills.id,
          title: bills.title,
          status: bills.status,
          category: bills.category,
        })
        .from(bills)
        .limit(5);
      
      console.log('\nSample bills:');
      sampleBills.forEach((bill, index) => {
        console.log(`${index + 1}. ${bill.title} (${bill.status})`);
      });
    } else {
      console.log('\n⚠️  No bills found in database. You may need to run the seed script.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking bills:', error);
    process.exit(1);
  }
}

checkBills();
