#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

console.log('🤖 Starting AI Service (Eliza)...');

// Use the proper start command from package.json
const child = spawn('bun', ['run', 'start'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PORT: process.env.PORT || '3001',
  }
});

child.on('error', (error) => {
  console.error('❌ Error starting AI service:', error.message);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ AI service exited with code ${code}`);
    process.exit(code);
  } else {
    console.log('✅ AI service stopped gracefully');
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down AI service...');
  if (child && !child.killed) {
    child.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down AI service...');
  if (child && !child.killed) {
    child.kill('SIGTERM');
  }
  process.exit(0);
}); 