import { requireAuth } from '../lib/auth';
import { storage } from '../lib/storage';
import { insertStylistSchema } from '../../shared/schema';

async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const stylists = await storage.getAllStylists();
      return res.status(200).json(stylists);
    }

    if (req.method === 'POST') {
      const validation = insertStylistSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid data', 
          errors: validation.error.issues 
        });
      }

      const stylist = await storage.createStylist(validation.data);
      return res.status(201).json(stylist);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Stylists API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default requireAuth(handler);