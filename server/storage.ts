import {
  users,
  clients,
  services,
  stylists,
  appointments,
  messageTemplates,
  type User,
  type InsertUser,
  type Client,
  type InsertClient,
  type Service,
  type InsertService,
  type Stylist,
  type InsertStylist,
  type Appointment,
  type InsertAppointment,
  type AppointmentWithDetails,
  type MessageTemplate,
  type InsertMessageTemplate,
} from "@shared/schema";
import { eq, and, gte, lte, desc, asc, like, or } from "drizzle-orm";
import { db } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Interface for storage operations
export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Client management
  createClient(client: InsertClient): Promise<Client>;
  getClient(id: number): Promise<Client | undefined>;
  getAllClients(): Promise<Client[]>;
  searchClients(query: string): Promise<Client[]>;
  updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  
  // Service management
  createService(service: InsertService): Promise<Service>;
  getService(id: number): Promise<Service | undefined>;
  getAllServices(): Promise<Service[]>;
  updateService(id: number, serviceData: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;
  
  // Stylist management
  createStylist(stylist: InsertStylist): Promise<Stylist>;
  getStylist(id: number): Promise<Stylist | undefined>;
  getAllStylists(): Promise<Stylist[]>;
  updateStylist(id: number, stylistData: Partial<InsertStylist>): Promise<Stylist | undefined>;
  deleteStylist(id: number): Promise<boolean>;
  
  // Appointment management
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAppointmentWithDetails(id: number): Promise<AppointmentWithDetails | undefined>;
  getAllAppointments(): Promise<AppointmentWithDetails[]>;
  getAppointmentsByDate(date: string): Promise<AppointmentWithDetails[]>;
  getAppointmentsByDateRange(startDate: string, endDate: string): Promise<AppointmentWithDetails[]>;
  getClientAppointments(clientId: number): Promise<AppointmentWithDetails[]>;
  getStylistAppointments(stylistId: number, date?: string): Promise<AppointmentWithDetails[]>;
  updateAppointment(id: number, appointmentData: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<boolean>;
  getUpcomingAppointments(): Promise<AppointmentWithDetails[]>;
  markReminderSent(id: number): Promise<boolean>;
  
  // Message templates
  createMessageTemplate(template: InsertMessageTemplate): Promise<MessageTemplate>;
  getMessageTemplate(id: number): Promise<MessageTemplate | undefined>;
  getAllMessageTemplates(): Promise<MessageTemplate[]>;
  updateMessageTemplate(id: number, templateData: Partial<InsertMessageTemplate>): Promise<MessageTemplate | undefined>;
  deleteMessageTemplate(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    const pgStore = connectPg(session);
    this.sessionStore = new pgStore({
      pool: pool,
      createTableIfMissing: false,
    });
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Create default admin user
    try {
      const existingAdmin = await this.getUserByUsername("admin");
      if (!existingAdmin) {
        await this.createUser({
          username: "admin",
          password: "$2b$10$rIzZfYYm5rVXgSYm8zLN0.L5JJ3xBhNl9r.QWcqw8YZpL8MhUZkGy", // password: admin123
          firstName: "Amministratore",
          lastName: "Sistema",
          email: "admin@parrucchiera.it",
          role: "admin",
        });
      }

      // Create default stylists
      const existingStylists = await this.getAllStylists();
      if (existingStylists.length === 0) {
        await this.createStylist({
          name: "Marco",
          phone: "+39 123 456 7890",
          email: "marco@parrucchiera.it",
        });
        
        await this.createStylist({
          name: "Giulia",
          phone: "+39 123 456 7891",
          email: "giulia@parrucchiera.it",
        });
      }

      // Create default services
      const existingServices = await this.getAllServices();
      if (existingServices.length === 0) {
        await this.createService({
          name: "Taglio",
          duration: 30,
          price: 2500, // €25.00
          description: "Taglio di capelli classico",
        });
        
        await this.createService({
          name: "Piega",
          duration: 45,
          price: 2000, // €20.00
          description: "Piega e styling",
        });
        
        await this.createService({
          name: "Colore",
          duration: 90,
          price: 5000, // €50.00
          description: "Colorazione capelli",
        });
        
        await this.createService({
          name: "Taglio + Piega",
          duration: 60,
          price: 4000, // €40.00
          description: "Taglio e piega completa",
        });
      }

      // Create default message template
      const existingTemplates = await this.getAllMessageTemplates();
      if (existingTemplates.length === 0) {
        await this.createMessageTemplate({
          name: "Promemoria Appuntamento",
          template: "Ciao [NOME], ti ricordiamo il tuo appuntamento di domani alle [ORA] per [SERVIZIO]. A presto! 💇‍♀️",
        });
      }
    } catch (error) {
      console.error("Error initializing default data:", error);
    }
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.firstName));
  }

  // Client management
  async createClient(clientData: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values({
      ...clientData,
      updatedAt: new Date(),
    }).returning();
    return client;
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients)
      .where(eq(clients.isActive, true))
      .orderBy(asc(clients.lastName), asc(clients.firstName));
  }

  async searchClients(query: string): Promise<Client[]> {
    const searchTerm = `%${query}%`;
    return await db.select().from(clients)
      .where(
        and(
          eq(clients.isActive, true),
          or(
            like(clients.firstName, searchTerm),
            like(clients.lastName, searchTerm),
            like(clients.phone, searchTerm),
            like(clients.email, searchTerm)
          )
        )
      )
      .orderBy(asc(clients.lastName), asc(clients.firstName));
  }

  async updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set({
        ...clientData,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: number): Promise<boolean> {
    const [client] = await db
      .update(clients)
      .set({ isActive: false })
      .where(eq(clients.id, id))
      .returning();
    return !!client;
  }

  // Service management
  async createService(serviceData: InsertService): Promise<Service> {
    const [service] = await db.insert(services).values(serviceData).returning();
    return service;
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services)
      .where(eq(services.isActive, true))
      .orderBy(asc(services.name));
  }

  async updateService(id: number, serviceData: Partial<InsertService>): Promise<Service | undefined> {
    const [service] = await db
      .update(services)
      .set(serviceData)
      .where(eq(services.id, id))
      .returning();
    return service;
  }

  async deleteService(id: number): Promise<boolean> {
    const [service] = await db
      .update(services)
      .set({ isActive: false })
      .where(eq(services.id, id))
      .returning();
    return !!service;
  }

  // Stylist management
  async createStylist(stylistData: InsertStylist): Promise<Stylist> {
    const [stylist] = await db.insert(stylists).values(stylistData).returning();
    return stylist;
  }

  async getStylist(id: number): Promise<Stylist | undefined> {
    const [stylist] = await db.select().from(stylists).where(eq(stylists.id, id));
    return stylist;
  }

  async getAllStylists(): Promise<Stylist[]> {
    return await db.select().from(stylists)
      .where(eq(stylists.isActive, true))
      .orderBy(asc(stylists.name));
  }

  async updateStylist(id: number, stylistData: Partial<InsertStylist>): Promise<Stylist | undefined> {
    const [stylist] = await db
      .update(stylists)
      .set(stylistData)
      .where(eq(stylists.id, id))
      .returning();
    return stylist;
  }

  async deleteStylist(id: number): Promise<boolean> {
    const [stylist] = await db
      .update(stylists)
      .set({ isActive: false })
      .where(eq(stylists.id, id))
      .returning();
    return !!stylist;
  }

  // Appointment management
  async createAppointment(appointmentData: InsertAppointment): Promise<Appointment> {
    const [appointment] = await db.insert(appointments).values({
      ...appointmentData,
      updatedAt: new Date(),
    }).returning();
    return appointment;
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async getAppointmentWithDetails(id: number): Promise<AppointmentWithDetails | undefined> {
    const [appointment] = await db
      .select({
        appointment: appointments,
        client: clients,
        stylist: stylists,
        service: services,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(stylists, eq(appointments.stylistId, stylists.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.id, id));

    if (!appointment) return undefined;

    return {
      ...appointment.appointment,
      client: appointment.client!,
      stylist: appointment.stylist!,
      service: appointment.service!,
    };
  }

  async getAllAppointments(): Promise<AppointmentWithDetails[]> {
    const results = await db
      .select({
        appointment: appointments,
        client: clients,
        stylist: stylists,
        service: services,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(stylists, eq(appointments.stylistId, stylists.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .orderBy(desc(appointments.date), asc(appointments.startTime));

    return results.map(result => ({
      ...result.appointment,
      client: result.client!,
      stylist: result.stylist!,
      service: result.service!,
    }));
  }

  async getAppointmentsByDate(date: string): Promise<AppointmentWithDetails[]> {
    const results = await db
      .select({
        appointment: appointments,
        client: clients,
        stylist: stylists,
        service: services,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(stylists, eq(appointments.stylistId, stylists.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.date, date))
      .orderBy(asc(appointments.startTime));

    return results.map(result => ({
      ...result.appointment,
      client: result.client!,
      stylist: result.stylist!,
      service: result.service!,
    }));
  }

  async getAppointmentsByDateRange(startDate: string, endDate: string): Promise<AppointmentWithDetails[]> {
    const results = await db
      .select({
        appointment: appointments,
        client: clients,
        stylist: stylists,
        service: services,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(stylists, eq(appointments.stylistId, stylists.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          gte(appointments.date, startDate),
          lte(appointments.date, endDate)
        )
      )
      .orderBy(asc(appointments.date), asc(appointments.startTime));

    return results.map(result => ({
      ...result.appointment,
      client: result.client!,
      stylist: result.stylist!,
      service: result.service!,
    }));
  }

  async getClientAppointments(clientId: number): Promise<AppointmentWithDetails[]> {
    const results = await db
      .select({
        appointment: appointments,
        client: clients,
        stylist: stylists,
        service: services,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(stylists, eq(appointments.stylistId, stylists.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.clientId, clientId))
      .orderBy(desc(appointments.date), desc(appointments.startTime));

    return results.map(result => ({
      ...result.appointment,
      client: result.client!,
      stylist: result.stylist!,
      service: result.service!,
    }));
  }

  async getStylistAppointments(stylistId: number, date?: string): Promise<AppointmentWithDetails[]> {
    const whereConditions = [eq(appointments.stylistId, stylistId)];
    if (date) {
      whereConditions.push(eq(appointments.date, date));
    }

    const results = await db
      .select({
        appointment: appointments,
        client: clients,
        stylist: stylists,
        service: services,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(stylists, eq(appointments.stylistId, stylists.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(and(...whereConditions))
      .orderBy(asc(appointments.date), asc(appointments.startTime));

    return results.map(result => ({
      ...result.appointment,
      client: result.client!,
      stylist: result.stylist!,
      service: result.service!,
    }));
  }

  async updateAppointment(id: number, appointmentData: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [appointment] = await db
      .update(appointments)
      .set({
        ...appointmentData,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();
    return appointment;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    const result = await db.delete(appointments).where(eq(appointments.id, id));
    return result.rowCount! > 0;
  }

  async getUpcomingAppointments(): Promise<AppointmentWithDetails[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const results = await db
      .select({
        appointment: appointments,
        client: clients,
        stylist: stylists,
        service: services,
      })
      .from(appointments)
      .leftJoin(clients, eq(appointments.clientId, clients.id))
      .leftJoin(stylists, eq(appointments.stylistId, stylists.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.date, tomorrowStr),
          eq(appointments.status, "scheduled"),
          eq(appointments.reminderSent, false)
        )
      )
      .orderBy(asc(appointments.startTime));

    return results.map(result => ({
      ...result.appointment,
      client: result.client!,
      stylist: result.stylist!,
      service: result.service!,
    }));
  }

  async markReminderSent(id: number): Promise<boolean> {
    const [appointment] = await db
      .update(appointments)
      .set({ reminderSent: true })
      .where(eq(appointments.id, id))
      .returning();
    return !!appointment;
  }

  // Message templates
  async createMessageTemplate(templateData: InsertMessageTemplate): Promise<MessageTemplate> {
    const [template] = await db.insert(messageTemplates).values(templateData).returning();
    return template;
  }

  async getMessageTemplate(id: number): Promise<MessageTemplate | undefined> {
    const [template] = await db.select().from(messageTemplates).where(eq(messageTemplates.id, id));
    return template;
  }

  async getAllMessageTemplates(): Promise<MessageTemplate[]> {
    return await db.select().from(messageTemplates)
      .where(eq(messageTemplates.isActive, true))
      .orderBy(asc(messageTemplates.name));
  }

  async updateMessageTemplate(id: number, templateData: Partial<InsertMessageTemplate>): Promise<MessageTemplate | undefined> {
    const [template] = await db
      .update(messageTemplates)
      .set(templateData)
      .where(eq(messageTemplates.id, id))
      .returning();
    return template;
  }

  async deleteMessageTemplate(id: number): Promise<boolean> {
    const [template] = await db
      .update(messageTemplates)
      .set({ isActive: false })
      .where(eq(messageTemplates.id, id))
      .returning();
    return !!template;
  }
}

export const storage = new DatabaseStorage();