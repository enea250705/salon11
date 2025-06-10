import { requireAuth } from '../lib/auth';
import { storage } from '../lib/storage';

async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get all data in parallel
    const [clients, todayAppointments, upcomingAppointments] = await Promise.all([
      storage.getAllClients(),
      storage.getAppointmentsByDate(today),
      storage.getUpcomingAppointments()
    ]);

    const stats = {
      totalClients: clients.length,
      todayAppointments: todayAppointments.length,
      upcomingAppointments: upcomingAppointments.length,
      recentAppointments: upcomingAppointments.slice(0, 5) // Latest 5 appointments
    };

    return res.status(200).json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default requireAuth(handler);