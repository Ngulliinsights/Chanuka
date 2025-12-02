// Test file to check if imports work
import type { Result, Maybe } from '@shared/core';
import { Ok, Err, some, none } from '@shared/core';
import type { User, NewUser } from '@shared/schema';
import { users } from '@shared/schema';

console.log('Imports work!');