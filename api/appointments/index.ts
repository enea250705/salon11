import { requireAuth } from '../lib/auth';
import { storage } from '../lib/storage';
import { insertAppointmentSchema } from '../../shared/schema';

async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const { date, startDate, endDate } = req.query;
      
      if (startDate && endDate) {
        // Monthly view - get appointments in date range
        const appointments = await storage.getAppointmentsByDateRange(startDate, endDate);
        return res.status(200).json(appointments);
      } else if (date) {
        // Daily view - get appointments for specific date
        const appointments = await storage.getAppointmentsByDate(date);
        return res.status(200).json(appointments);
      } else {
        // Default - get all appointments
        const appointments = await storage.getAllAppointments();
        return res.status(200).json(appointments);
      }
    }

    if (req.method === 'POST') {
      const validation = insertAppointmentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid data', 
          errors: validation.error.issues 
        });
      }

      const appointment = await storage.createAppointment(validation.data);
      return res.status(201).json(appointment);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Appointments API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default requireAuth(handler);