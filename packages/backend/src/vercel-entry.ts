/**
 * Vercel Serverless entry point
 * Exports the Express app without starting a server
 */
import { createApp } from './app';

const app = createApp();
export default app;
