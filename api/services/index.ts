import { requireAuth } from '../lib/auth';
import { storage } from '../lib/storage';
import { insertServiceSchema } from '../../shared/schema';

async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const services = await storage.getAllServices();
      return res.status(200).json(services);
    }

    if (req.method === 'POST') {
      const validation = insertServiceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid data', 
          errors: validation.error.issues 
        });
      }

      const service = await storage.createService(validation.data);
      return res.status(201).json(service);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Services API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default requireAuth(handler);