import { 
  users, clients, services, stylists, appointments, messageTemplates,
  type User, type InsertUser, type Client, type InsertClient,
  type Service, type InsertService, type Stylist, type InsertStylist,
  type Appointment, type InsertAppointment, type AppointmentWithDetails,
  type MessageTemplate, type InsertMessageTemplate
} from "../../shared/schema";
import { db } from "./db";
import { eq, like, and, gte, lte, desc, sql } from "drizzle-orm";

export class ServerlessStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db().select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db().select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db()
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db()
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db().select().from(users).orderBy(users.firstName);
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db().delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  // Client management
  async createClient(clientData: InsertClient): Promise<Client> {
    const [client] = await db()
      .insert(clients)
      .values(clientData)
      .returning();
    return client;
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db().select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getAllClients(): Promise<Client[]> {
    return await db().select().from(clients).orderBy(clients.firstName);
  }

  async searchClients(query: string): Promise<Client[]> {
    return await db()
      .select()
      .from(clients)
      .where(
        sql`LOWER(${clients.firstName}) LIKE LOWER(${`%${query}%`}) OR LOWER(${clients.lastName}) LIKE LOWER(${`%${query}%`})`
      )
      .orderBy(clients.firstName);
  }

  async updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db()
      .update(clients)
      .set(clientData)
      .where(eq(clients.id, id))
      .returning();
    return client || undefined;
  }

  async deleteClient(id: number): Promise<boolean> {
    const result = await db().delete(clients).where(eq(clients.id, id));
    return result.rowCount > 0;
  }

  // Service management
  async createService(serviceData: InsertService): Promise<Service> {
    const [service] = await db()
      .insert(services)
      .values(serviceData)
      .returning();
    return service;
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db().select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async getAllServices(): Promise<Service[]> {
    return await db().select().from(services).orderBy(services.name);
  }

  async updateService(id: number, serviceData: Partial<InsertService>): Promise<Service | undefined> {
    const [service] = await db()
      .update(services)
      .set(serviceData)
      .where(eq(services.id, id))
      .returning();
    return service || undefined;
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await db().delete(services).where(eq(services.id, id));
    return result.rowCount > 0;
  }

  // Stylist management
  async createStylist(stylistData: InsertStylist): Promise<Stylist> {
    const [stylist] = await db()
      .insert(stylists)
      .values(stylistData)
      .returning();
    return stylist;
  }

  async getStylist(id: number): Promise<Stylist | undefined> {
    const [stylist] = await db().select().from(stylists).where(eq(stylists.id, id));
    return stylist || undefined;
  }

  async getAllStylists(): Promise<Stylist[]> {
    return await db().select().from(stylists).orderBy(stylists.name);
  }

  async updateStylist(id: number, stylistData: Partial<InsertStylist>): Promise<Stylist | undefined> {
    const [stylist] = await db()
      .update(stylists)
      .set(stylistData)
      .where(eq(stylists.id, id))
      .returning();
    return stylist || undefined;
  }

  async deleteStylist(id: number): Promise<boolean> {
    const result = await db().delete(stylists).where(eq(stylists.id, id));
    return result.rowCount > 0;
  }

  // Appointment management
  async createAppointment(appointmentData: InsertAppointment): Promise<Appointment> {
    const [appointment] = await db()
      .insert(appointments)
      .values(appointmentData)
      .returning();
    return appointment;
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db().select().from(appointments).where(eq(appointments.id, id));
    return appointment || undefined;
  }

  async getAppointmentWithDetails(id: number): Promise<AppointmentWithDetails | undefined> {
    const [appointment] = await db()
      .select({
        id: appointments.id,
        clientId: appointments.clientId,
        stylistId: appointments.stylistId,
        serviceId: appointments.serviceId,
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        notes: appointments.notes,
        reminderSent: appointments.reminderSent,
        createdAt: appointments.createdAt,
        client: clients,
        stylist: stylists,
        service: services,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(stylists, eq(appointments.stylistId, stylists.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.id, id));
    
    return appointment || undefined;
  }

  async getAllAppointments(): Promise<AppointmentWithDetails[]> {
    return await db()
      .select({
        id: appointments.id,
        clientId: appointments.clientId,
        stylistId: appointments.stylistId,
        serviceId: appointments.serviceId,
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        notes: appointments.notes,
        reminderSent: appointments.reminderSent,
        createdAt: appointments.createdAt,
        client: clients,
        stylist: stylists,
        service: services,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(stylists, eq(appointments.stylistId, stylists.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .orderBy(desc(appointments.date), appointments.startTime);
  }

  async getAppointmentsByDate(date: string): Promise<AppointmentWithDetails[]> {
    return await db()
      .select({
        id: appointments.id,
        clientId: appointments.clientId,
        stylistId: appointments.stylistId,
        serviceId: appointments.serviceId,
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        notes: appointments.notes,
        reminderSent: appointments.reminderSent,
        createdAt: appointments.createdAt,
        client: clients,
        stylist: stylists,
        service: services,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(stylists, eq(appointments.stylistId, stylists.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.date, date))
      .orderBy(appointments.startTime);
  }

  async getAppointmentsByDateRange(startDate: string, endDate: string): Promise<AppointmentWithDetails[]> {
    return await db()
      .select({
        id: appointments.id,
        clientId: appointments.clientId,
        stylistId: appointments.stylistId,
        serviceId: appointments.serviceId,
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        notes: appointments.notes,
        reminderSent: appointments.reminderSent,
        createdAt: appointments.createdAt,
        client: clients,
        stylist: stylists,
        service: services,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(stylists, eq(appointments.stylistId, stylists.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(and(gte(appointments.date, startDate), lte(appointments.date, endDate)))
      .orderBy(appointments.date, appointments.startTime);
  }

  async updateAppointment(id: number, appointmentData: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [appointment] = await db()
      .update(appointments)
      .set(appointmentData)
      .where(eq(appointments.id, id))
      .returning();
    return appointment || undefined;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    const result = await db().delete(appointments).where(eq(appointments.id, id));
    return result.rowCount > 0;
  }

  async getUpcomingAppointments(): Promise<AppointmentWithDetails[]> {
    const today = new Date().toISOString().split('T')[0];
    return await db()
      .select({
        id: appointments.id,
        clientId: appointments.clientId,
        stylistId: appointments.stylistId,
        serviceId: appointments.serviceId,
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        notes: appointments.notes,
        reminderSent: appointments.reminderSent,
        createdAt: appointments.createdAt,
        client: clients,
        stylist: stylists,
        service: services,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(stylists, eq(appointments.stylistId, stylists.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(gte(appointments.date, today))
      .orderBy(appointments.date, appointments.startTime);
  }

  async markReminderSent(id: number): Promise<boolean> {
    const result = await db()
      .update(appointments)
      .set({ reminderSent: true })
      .where(eq(appointments.id, id));
    return result.rowCount > 0;
  }
}

export const storage = new ServerlessStorage();