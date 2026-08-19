import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import fs from 'fs';

// 1. Load from User Home Directory (~/.env)
const homeEnvPath = path.join(os.homedir(), '.env');
if (fs.existsSync(homeEnvPath)) {
  dotenv.config({ path: homeEnvPath });
}

// 2. Load from Project Root (.env)
const rootEnvPath = path.resolve(process.cwd(), '../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

// 3. Load from Server directory (.env)
const serverEnvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
}

// Fallback to loading standard env (loads from current dir if any)
dotenv.config();

export const config = {
  PORT: process.env.PORT || 5000,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || null,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || null,
};

// Log loaded status (without printing key contents)
console.log('--- Environment Configuration ---');
console.log(`Port: ${config.PORT}`);
console.log(`GEMINI_API_KEY: ${config.GEMINI_API_KEY ? 'FOUND (Loaded)' : 'NOT FOUND'}`);
console.log(`OPENAI_API_KEY: ${config.OPENAI_API_KEY ? 'FOUND (Loaded, Server audio pipeline enabled)' : 'NOT FOUND (Using fallback/hybrid client STT + Gemini LLM)'}`);
console.log('---------------------------------');
