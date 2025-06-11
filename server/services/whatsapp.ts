import { format } from "date-fns";
import { it } from "date-fns/locale";

interface WhatsAppMessage {
  to: string;
  message: string;
}

interface AppointmentReminder {
  clientName: string;
  clientPhone: string;
  appointmentTime: string;
  serviceName: string;
}

export class WhatsAppService {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    // Mock WhatsApp API credentials - replace with real ones
    this.apiUrl = "https://api.whatsapp.com/send"; // Mock URL
    this.apiKey = "mock_api_key_replace_with_real_one";
  }

  /**
   * Formats the reminder message template
   */
  private formatReminderMessage(reminder: AppointmentReminder): string {
    return `Ciao ${reminder.clientName}, ti ricordiamo il tuo appuntamento di domani alle ${reminder.appointmentTime} per ${reminder.serviceName}. A presto! 💇‍♀️`;
  }

  /**
   * Sends a WhatsApp message (mock implementation)
   */
  private async sendMessage(message: WhatsAppMessage): Promise<boolean> {
    try {
      console.log(`📱 [WhatsApp Mock] Sending to ${message.to}:`);
      console.log(`📝 [Message] ${message.message}`);
      
      // Mock API call - replace with real WhatsApp API integration
      // const response = await fetch(this.apiUrl, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     to: message.to,
      //     type: 'text',
      //     text: { body: message.message }
      //   })
      // });
      
      // return response.ok;
      
      // Mock success response
      return true;
    } catch (error) {
      console.error('❌ WhatsApp sending failed:', error);
      return false;
    }
  }

  /**
   * Sends appointment reminder via WhatsApp
   */
  async sendAppointmentReminder(reminder: AppointmentReminder): Promise<boolean> {
    const message = this.formatReminderMessage(reminder);
    
    return await this.sendMessage({
      to: reminder.clientPhone,
      message: message
    });
  }

  /**
   * Validates phone number format
   */
  validatePhoneNumber(phone: string): boolean {
    // Basic phone number validation - adjust regex as needed
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  }
}

export const whatsAppService = new WhatsAppService();