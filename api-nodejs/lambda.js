/**
 * AWS Lambda handler using serverless-express
 * Install: npm install @vendia/serverless-express
 */

import serverlessExpress from '@vendia/serverless-express';
import app from './src/server.js';

export const handler = serverlessExpress({ app });
