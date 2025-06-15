import { storage } from '../../../api/lib/storage';
import { insertAppointmentSchema } from '../../../shared/schema';
import jwt from 'jsonwebtoken';

async function requireAuth(request: Request, env: any) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  const JWT_SECRET = env.JWT_SECRET || 'your-secret-key-change-in-production';
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export async function onRequestGet(context: any) {
  const { request, env } = context;
  
  try {
    await requireAuth(request, env);
    
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let appointments;
    if (date) {
      appointments = await storage.getAppointmentsByDate(date);
    } else if (startDate && endDate) {
      appointments = await storage.getAppointmentsByDateRange(startDate, endDate);
    } else {
      appointments = await storage.getAllAppointments();
    }

    return new Response(JSON.stringify(appointments), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Appointments GET error:', error);
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  
  try {
    await requireAuth(request, env);
    
    const body = await request.json();
    const validation = insertAppointmentSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(JSON.stringify({ 
        message: 'Invalid data', 
        errors: validation.error.issues 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const appointment = await storage.createAppointment(validation.data);
    return new Response(JSON.stringify(appointment), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Appointments POST error:', error);
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 