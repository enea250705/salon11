import { requireAuth } from '../lib/auth';
import { storage } from '../lib/storage';
import { insertClientSchema } from '../../shared/schema';

async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const { search } = req.query;
      
      if (search) {
        const clients = await storage.searchClients(search);
        return res.status(200).json(clients);
      } else {
        const clients = await storage.getAllClients();
        return res.status(200).json(clients);
      }
    }

    if (req.method === 'POST') {
      const validation = insertClientSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid data', 
          errors: validation.error.issues 
        });
      }

      const client = await storage.createClient(validation.data);
      return res.status(201).json(client);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Clients API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default requireAuth(handler);