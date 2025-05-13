import { pgTable, text, serial, integer, boolean, date, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("employee"),
  position: text("position"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
});

// Schedules schema
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  isPublished: boolean("isPublished").notNull().default(false),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
  createdAt: true,
});

// Shifts schema
export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  scheduleId: integer("scheduleId").notNull(),
  day: text("day").notNull(), // Monday, Tuesday, etc.
  startTime: text("startTime").notNull(),
  endTime: text("endTime").notNull(),
  type: text("type").notNull().default("work"), // work, vacation, leave, sick
  area: text("area"),
  notes: text("notes"),
});

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
});

// TimeOff Requests schema
export const timeOffRequests = pgTable("time_off_requests", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: text("type").notNull(), // vacation, personal, sick
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: integer("approvedBy"),
  createdAt: timestamp("createdAt").notNull(),
});

export const insertTimeOffRequestSchema = createInsertSchema(timeOffRequests).omit({
  id: true,
  approvedBy: true,
  createdAt: true,
});

// Documents schema
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // payslip, tax_document
  path: text("path").notNull(), // Path to the file
  userId: integer("userId").notNull(),
  isGlobal: boolean("isGlobal").default(false),
  uploadedBy: integer("uploadedBy").notNull(),
  uploadedAt: timestamp("uploadedAt").notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

// Notifications schema
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  type: text("type").notNull(), // schedule_update, request_response, document_upload, new_message
  message: text("message").notNull(),
  isRead: boolean("isRead").notNull().default(false),
  data: json("data"),
  createdAt: timestamp("createdAt").notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Messages schema
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull(),
  toUserId: integer("to_user_id").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  relatedToShiftId: integer("related_to_shift_id"),
  createdAt: timestamp("created_at").notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;

export type TimeOffRequest = typeof timeOffRequests.$inferSelect;
export type InsertTimeOffRequest = z.infer<typeof insertTimeOffRequestSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
