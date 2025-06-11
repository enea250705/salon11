import { storage } from '../storage';
import { whatsAppService } from './whatsapp';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';

export class ReminderScheduler {
  private isRunning: boolean = false;

  /**
   * Checks for appointments 24 hours from now and sends reminders
   */
  async sendDailyReminders(): Promise<void> {
    if (this.isRunning) {
      console.log('⏳ Reminder scheduler already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🔔 Starting daily reminder check...');

    try {
      // Get tomorrow's date
      const tomorrow = addDays(new Date(), 1);
      const tomorrowDate = format(tomorrow, 'yyyy-MM-dd');

      // Get all appointments for tomorrow
      const appointments = await storage.getAppointmentsByDate(tomorrowDate);

      if (!appointments || appointments.length === 0) {
        console.log(`📅 No appointments found for ${tomorrowDate}`);
        return;
      }

      console.log(`📋 Found ${appointments.length} appointments for tomorrow`);

      let successCount = 0;
      let failureCount = 0;

      // Process each appointment
      for (const appointment of appointments) {
        try {
          // Skip if reminder already sent
          if (appointment.reminderSent) {
            console.log(`✅ Reminder already sent for appointment ID ${appointment.id}`);
            continue;
          }

          // Validate phone number
          if (!appointment.client.phone || !whatsAppService.validatePhoneNumber(appointment.client.phone)) {
            console.log(`⚠️ Invalid phone number for ${appointment.client.firstName}: ${appointment.client.phone}`);
            failureCount++;
            continue;
          }

          // Send WhatsApp reminder
          const reminderSent = await whatsAppService.sendAppointmentReminder({
            clientName: appointment.client.firstName,
            clientPhone: appointment.client.phone,
            appointmentTime: appointment.startTime.slice(0, 5), // Format HH:MM
            serviceName: appointment.service.name
          });

          if (reminderSent) {
            // Mark reminder as sent in database
            await storage.markReminderSent(appointment.id);
            successCount++;
            console.log(`✅ Reminder sent to ${appointment.client.firstName} (${appointment.client.phone})`);
          } else {
            failureCount++;
            console.log(`❌ Failed to send reminder to ${appointment.client.firstName}`);
          }

          // Add small delay between messages to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          failureCount++;
          console.error(`❌ Error processing appointment ID ${appointment.id}:`, error);
        }
      }

      console.log(`📊 Reminder summary: ${successCount} sent, ${failureCount} failed`);

    } catch (error) {
      console.error('❌ Error in daily reminder check:', error);
    } finally {
      this.isRunning = false;
      console.log('🏁 Daily reminder check completed');
    }
  }

  /**
   * Starts the scheduler to run daily at 9 AM
   */
  startScheduler(): void {
    console.log('⏰ Starting WhatsApp reminder scheduler...');

    // Run immediately for testing
    this.sendDailyReminders();

    // Schedule daily execution at 9:00 AM
    const scheduleDaily = () => {
      const now = new Date();
      const next9AM = new Date();
      next9AM.setHours(9, 0, 0, 0);

      // If it's already past 9 AM today, schedule for tomorrow
      if (now.getTime() > next9AM.getTime()) {
        next9AM.setDate(next9AM.getDate() + 1);
      }

      const timeUntilNext9AM = next9AM.getTime() - now.getTime();

      setTimeout(() => {
        this.sendDailyReminders();
        // Schedule the next execution
        setInterval(() => {
          this.sendDailyReminders();
        }, 24 * 60 * 60 * 1000); // 24 hours
      }, timeUntilNext9AM);

      console.log(`⏰ Next reminder check scheduled for: ${format(next9AM, 'PPpp', { locale: it })}`);
    };

    scheduleDaily();
  }

  /**
   * Manual trigger for testing purposes
   */
  async triggerManualReminder(): Promise<void> {
    console.log('🧪 Manual reminder trigger activated');
    await this.sendDailyReminders();
  }
}

export const reminderScheduler = new ReminderScheduler();