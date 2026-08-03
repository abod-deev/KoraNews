import cron from 'node-cron';
import { fetchLiveMatches, fetchUpcomingMatches } from './footballApi.ts';

export function startCronJobs() {
  console.log("Starting Football API Cron Jobs...");

  // Update live matches every minute
  cron.schedule('* * * * *', async () => {
    try {
      await fetchLiveMatches();
      console.log('Live matches updated successfully.');
    } catch (error) {
      console.error('Error updating live matches:', error);
    }
  });

  // Update upcoming and past matches every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await fetchUpcomingMatches();
      console.log('Upcoming matches updated successfully.');
    } catch (error) {
      console.error('Error updating upcoming matches:', error);
    }
  });
  
  // Also run them once on startup
  fetchLiveMatches().catch(console.error);
  fetchUpcomingMatches().catch(console.error);
}
