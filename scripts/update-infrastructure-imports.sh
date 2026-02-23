#!/bin/bash

# Update imports from core to infrastructure
echo "Updating imports from @/core to @/infrastructure..."
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '@/core/|from '@/infrastructure/|g" {} +
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '@client/core/|from '@client/infrastructure/|g" {} +
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '../core/|from '../infrastructure/|g" {} +
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '../../core/|from '../../infrastructure/|g" {} +
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '../../../core/|from '../../../infrastructure/|g" {} +

# Update imports from lib/infrastructure to infrastructure
echo "Updating imports from @/lib/infrastructure to @/infrastructure..."
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '@/lib/infrastructure/|from '@/infrastructure/|g" {} +
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '@client/lib/infrastructure/|from '@client/infrastructure/|g" {} +
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '../lib/infrastructure/|from '../infrastructure/|g" {} +
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '../../lib/infrastructure/|from '../../infrastructure/|g" {} +

echo "Import updates complete!"
