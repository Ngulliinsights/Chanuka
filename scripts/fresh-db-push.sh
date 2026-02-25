#!/bin/bash
# Auto-answer all drizzle-kit push prompts with "create"
# This script feeds "create table" and "create enum" responses automatically

yes "" | npx drizzle-kit push --config=drizzle.config.ts
