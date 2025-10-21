import * as dotenv from 'dotenv';
dotenv.config();

import seedSimple from './simple-seed';
import seedLegislative from './legislative-seed';

export async function runAllSeeds() {
  console.log('Running all seeds (placeholder)');
  await seedSimple();
  await seedLegislative();
}

if (require.main === module) {
  runAllSeeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
