import { requireAuth } from '../lib/auth';
import { reminderScheduler } from '../../server/services/reminderScheduler';

async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Trigger manual reminder check
    await reminderScheduler.triggerManualReminder();

    return res.status(200).json({ 
      message: 'Reminder check triggered successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error triggering reminders:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default requireAuth(handler);