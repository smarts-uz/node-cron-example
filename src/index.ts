import { format } from 'path';

import * as cron from 'node-cron';
import mysql from 'mysql2/promise';

import { getAllEnv, env } from './lib/env';
import { Env } from './lib/types';
import { formatDate } from './lib/utils';

// Log timezone configuration
if (env.timezone) {
  console.log(`Using timezone: ${env.timezone}`);
}

// Log request timeout configuration
if (env.requestTimeout > 0) {
  console.log(`Using request timeout: ${env.requestTimeout}ms`);
}

// Get all environment variables with validation
const jobs = getAllEnv();

// Log the jobs that will be scheduled
console.log(`Found ${jobs.length} jobs to schedule.\n`);
jobs.forEach((job) => {
  console.log(
    `Job ${job.id}:\n  Schedule "${job.schedule}"\n  ${job.method} "${job.url}"${
      job.props ? `\n  with props: ${JSON.stringify(job.props)}` : ''
    }`
  );
});

async function performMariaDBJob(job: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  query: string;
}) {
  try {
    const connection = await mysql.createConnection({
      host: job.host,
      port: job.port,
      user: job.user,
      password: job.password,
      database: job.database
    });

    console.log(`Executing query: ${job.query}`);
    const [results] = await connection.execute(job.query);
    console.log('Query results:', results);

    await connection.end();
  } catch (error) {
    console.error('Error executing MariaDB job:', error);
  }
}

async function main() {
  const jobs = getAllEnv();
  console.log(`Using timezone: ${env.timezone}`);
  console.log(`Using request timeout: ${env.requestTimeout}ms`);

  for (const job of jobs) {
    console.log(`Processing job: ${JSON.stringify(job)}`);

    if (job.method === 'MARIADB') {
      const url = new URL(job.url);
      const schedule = job.schedule;

      const username = url.searchParams.get('username');
      const password = url.searchParams.get('password');
      const query = url.searchParams.get('query');

      console.log(`Scheduling MariaDB Job with cron: ${schedule}`);

      if (env.runOnStart) {
        console.log('Running Job on startup...');
        await performMariaDBJob({
          host: url.hostname,
          port: parseInt(url.port || '3306'),
          database: url.pathname.replace(/^\//, ''),
          user: username || '',
          password: password || '',
          query: query || ''
        });
      }

      cron.schedule(schedule, async () => {
        await performMariaDBJob({
          host: url.hostname,
          port: parseInt(url.port || '3306'),
          database: url.pathname.replace(/^\//, ''),
          user: username || '',
          password: password || '',
          query: query || ''
        });
      }, {
        timezone: env.timezone
      });
    }
  }

  console.log('All jobs scheduled successfully. Waiting for cron schedules to trigger...');
}

main().catch(console.error);
