import { Injectable, Logger } from '@nestjs/common';
import { TemplateService } from '../template.service';
import { EnhancedTemplateService } from './enhanced-template.service';
import { NotificationType } from '../enums/notification.enum';
import { EnhancedNotificationTemplate } from '../interfaces/enhanced-template.interface';

@Injectable()
export class TemplateMigrationService {
  private readonly logger = new Logger(TemplateMigrationService.name);

  constructor(
    private readonly templateService: TemplateService,
    private readonly enhancedTemplateService: EnhancedTemplateService,
  ) {}

  /**
   * Migrate all existing templates to the enhanced template system
   */
  async migrateAllTemplates(): Promise<void> {
    this.logger.log('Starting template migration...');

    const notificationTypes = Object.values(NotificationType);
    let migratedCount = 0;
    let failedCount = 0;

    for (const type of notificationTypes) {
      try {
        await this.migrateTemplate(type);
        migratedCount++;
        this.logger.log(`Successfully migrated template: ${type}`);
      } catch (error) {
        failedCount++;
        this.logger.error(`Failed to migrate template: ${type}`, error);
      }
    }

    this.logger.log(
      `Template migration completed. Migrated: ${migratedCount}, Failed: ${failedCount}`,
    );
  }

  /**
   * Migrate a single template type to the enhanced system
   */
  async migrateTemplate(type: NotificationType): Promise<void> {
    const existingTemplate = this.templateService.getTemplate(type);
    if (!existingTemplate) {
      this.logger.warn(`Template not found for type: ${type}`);
      return;
    }

    // Render a sample template to get the structure
    const sampleVars = this.generateSampleVariables(type);
    const rendered = this.templateService.renderTemplate(type, sampleVars);

    // Create enhanced template structure
    const enhancedTemplate: EnhancedNotificationTemplate = {
      id: `${type.toLowerCase()}-v2`,
      type: type,
      name: this.generateTemplateName(type),
      description: `Enhanced ${type} notification template with multi-language support`,
      subject: {
        en: existingTemplate.subject,
        id: this.translateSubject(existingTemplate.subject, type),
      },
      body: {
        en: existingTemplate.body,
        id: this.translateBody(existingTemplate.body, type),
      },
      mjmlTemplate: {
        en: this.generateMjmlTemplate(type, existingTemplate, 'en'),
        id: this.generateMjmlTemplate(type, existingTemplate, 'id'),
      },
      variables: this.extractVariables(existingTemplate),
      metadata: {
        version: 2,
        author: 'migration-service',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['migrated', type.toLowerCase()],
      },
      abTesting: this.generateDefaultABTesting(type),
      active: true,
    };

    // Save the enhanced template
    await this.enhancedTemplateService.createTemplate(enhancedTemplate);
  }

  private generateTemplateName(type: NotificationType): string {
    const names: Record<NotificationType, string> = {
      [NotificationType.APPROVAL_REQUEST]: 'Approval Request Enhanced',
      [NotificationType.APPROVAL_RESULT]: 'Approval Result Enhanced',
      [NotificationType.WORK_ORDER_UPDATE]: 'Work Order Update Enhanced',
      [NotificationType.KPI_REMINDER]: 'KPI Reminder Enhanced',
      [NotificationType.TRAINING_INVITATION]: 'Training Invitation Enhanced',
      [NotificationType.SYSTEM_ALERT]: 'System Alert Enhanced',
      [NotificationType.GENERAL]: 'General Notification Enhanced',
      [NotificationType.DELEGATION]: 'Task Delegation Enhanced',
      [NotificationType.ANNOUNCEMENT]: 'Announcement Enhanced',
      [NotificationType.SYSTEM_UPDATE]: 'System Update Enhanced',
      [NotificationType.REMINDER]: 'Reminder Enhanced',
      [NotificationType.ALERT]: 'Alert Enhanced',
      [NotificationType.USER_ACTION]: 'User Action Enhanced',
      [NotificationType.DATA_CHANGE]: 'Data Change Enhanced',
    };
    return names[type] || `${type} Enhanced`;
  }

  private translateSubject(subject: string, type: NotificationType): string {
    // Basic translation mappings
    const translations: Record<string, Record<string, string>> = {
      'Approval Request': { id: 'Permintaan Persetujuan' },
      'Approval Result': { id: 'Hasil Persetujuan' },
      'Work Order Update': { id: 'Pembaruan Work Order' },
      'KPI Submission Reminder': { id: 'Pengingat Pengiriman KPI' },
      'Training Invitation': { id: 'Undangan Pelatihan' },
      'System Alert': { id: 'Peringatan Sistem' },
      'Task Delegated': { id: 'Tugas Didelegasikan' },
    };

    let translatedSubject = subject;
    for (const [en, translationMap] of Object.entries(translations)) {
      if (subject.includes(en) && translationMap.id) {
        translatedSubject = translatedSubject.replace(en, translationMap.id);
      }
    }

    return translatedSubject;
  }

  private translateBody(body: string, type: NotificationType): string {
    // Basic translation of common phrases
    return body
      .replace(/Dear/g, 'Yth.')
      .replace(/Best regards/g, 'Hormat kami')
      .replace(/YPK Gloria Management System/g, 'Sistem Manajemen YPK Gloria')
      .replace(/Request Details/g, 'Detail Permintaan')
      .replace(/Title/g, 'Judul')
      .replace(/Requester/g, 'Peminta')
      .replace(/Department/g, 'Departemen')
      .replace(/Priority/g, 'Prioritas')
      .replace(/Submitted On/g, 'Tanggal Pengajuan')
      .replace(/Description/g, 'Deskripsi')
      .replace(
        /Please review and take action/g,
        'Mohon segera tinjau dan ambil tindakan',
      )
      .replace(/at your earliest convenience/g, 'secepatnya');
  }

  private generateMjmlTemplate(
    type: NotificationType,
    template: any,
    locale: string,
  ): string {
    const isIndonesian = locale === 'id';

    return `<mjml>
  <mj-head>
    <mj-title>${this.generateTemplateName(type)}</mj-title>
    <mj-preview>${isIndonesian ? 'Notifikasi dari' : 'Notification from'} YPK Gloria</mj-preview>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-section background-color="#f4f4f4" />
      <mj-column background-color="#ffffff" />
      <mj-text color="#333333" font-size="14px" line-height="1.6" />
    </mj-attributes>
  </mj-head>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-image src="{{logoUrl}}" width="200px" align="center" />
      </mj-column>
    </mj-section>
    
    <mj-section>
      <mj-column>
        <mj-text font-size="24px" font-weight="bold" align="center" color="#2c3e50">
          ${this.generateTemplateName(type)}
        </mj-text>
        <mj-divider border-color="#3498db" border-width="2px" />
      </mj-column>
    </mj-section>
    
    <mj-section>
      <mj-column>
        <mj-text>
          <p>${isIndonesian ? 'Yth.' : 'Dear'} {{recipientName}},</p>
          <p>${this.getTemplateIntro(type, locale)}</p>
        </mj-text>
        
        ${this.generateMjmlContent(type, locale)}
        
        <mj-button background-color="#3498db" href="{{actionUrl}}" font-size="16px" padding="20px">
          ${this.getActionButtonText(type, locale)}
        </mj-button>
      </mj-column>
    </mj-section>
    
    <mj-section background-color="#34495e">
      <mj-column>
        <mj-text color="#ffffff" align="center" font-size="12px">
          © 2024 ${isIndonesian ? 'Sistem Manajemen YPK Gloria' : 'YPK Gloria Management System'}. ${isIndonesian ? 'Hak cipta dilindungi' : 'All rights reserved'}.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;
  }

  private getTemplateIntro(type: NotificationType, locale: string): string {
    const intros: Record<NotificationType, Record<string, string>> = {
      [NotificationType.APPROVAL_REQUEST]: {
        en: 'You have received a new approval request that requires your attention.',
        id: 'Anda menerima permintaan persetujuan baru yang memerlukan perhatian Anda.',
      },
      [NotificationType.APPROVAL_RESULT]: {
        en: 'Your request has been processed.',
        id: 'Permintaan Anda telah diproses.',
      },
      [NotificationType.WORK_ORDER_UPDATE]: {
        en: 'There has been an update to a work order.',
        id: 'Terdapat pembaruan pada work order.',
      },
      [NotificationType.KPI_REMINDER]: {
        en: 'This is a reminder to submit your KPI report.',
        id: 'Ini adalah pengingat untuk mengirimkan laporan KPI Anda.',
      },
      [NotificationType.TRAINING_INVITATION]: {
        en: 'You are invited to attend a training session.',
        id: 'Anda diundang untuk menghadiri sesi pelatihan.',
      },
      [NotificationType.SYSTEM_ALERT]: {
        en: 'System notification.',
        id: 'Notifikasi sistem.',
      },
      [NotificationType.GENERAL]: {
        en: 'You have a new notification.',
        id: 'Anda memiliki notifikasi baru.',
      },
      [NotificationType.DELEGATION]: {
        en: 'A task has been delegated to you.',
        id: 'Sebuah tugas telah didelegasikan kepada Anda.',
      },
      [NotificationType.ANNOUNCEMENT]: {
        en: 'New announcement.',
        id: 'Pengumuman baru.',
      },
      [NotificationType.SYSTEM_UPDATE]: {
        en: 'System update notification.',
        id: 'Notifikasi pembaruan sistem.',
      },
      [NotificationType.REMINDER]: {
        en: 'This is a reminder.',
        id: 'Ini adalah pengingat.',
      },
      [NotificationType.ALERT]: {
        en: 'Important alert.',
        id: 'Peringatan penting.',
      },
      [NotificationType.USER_ACTION]: {
        en: 'Action required.',
        id: 'Tindakan diperlukan.',
      },
      [NotificationType.DATA_CHANGE]: {
        en: 'Data has been updated.',
        id: 'Data telah diperbarui.',
      },
    };

    return intros[type]?.[locale] || intros[type]?.en || '';
  }

  private generateMjmlContent(type: NotificationType, locale: string): string {
    // Generate type-specific content
    switch (type) {
      case NotificationType.APPROVAL_REQUEST:
        return `
        <mj-table>
          <tr style="border-bottom: 1px solid #ecf0f1;">
            <td style="padding: 10px; font-weight: bold;">${locale === 'id' ? 'Judul' : 'Title'}</td>
            <td style="padding: 10px;">{{requestTitle}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ecf0f1;">
            <td style="padding: 10px; font-weight: bold;">${locale === 'id' ? 'Peminta' : 'Requester'}</td>
            <td style="padding: 10px;">{{requesterName}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ecf0f1;">
            <td style="padding: 10px; font-weight: bold;">${locale === 'id' ? 'Departemen' : 'Department'}</td>
            <td style="padding: 10px;">{{department}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ecf0f1;">
            <td style="padding: 10px; font-weight: bold;">${locale === 'id' ? 'Prioritas' : 'Priority'}</td>
            <td style="padding: 10px;">{{priority}}</td>
          </tr>
        </mj-table>`;

      default:
        return `
        <mj-text>
          <p>{{message}}</p>
        </mj-text>`;
    }
  }

  private getActionButtonText(type: NotificationType, locale: string): string {
    const buttons: Record<NotificationType, Record<string, string>> = {
      [NotificationType.APPROVAL_REQUEST]: {
        en: 'Review Request',
        id: 'Tinjau Permintaan',
      },
      [NotificationType.APPROVAL_RESULT]: {
        en: 'View Details',
        id: 'Lihat Detail',
      },
      [NotificationType.WORK_ORDER_UPDATE]: {
        en: 'View Work Order',
        id: 'Lihat Work Order',
      },
      [NotificationType.KPI_REMINDER]: {
        en: 'Submit KPI',
        id: 'Kirim KPI',
      },
      [NotificationType.TRAINING_INVITATION]: {
        en: 'Confirm Attendance',
        id: 'Konfirmasi Kehadiran',
      },
      [NotificationType.SYSTEM_ALERT]: {
        en: 'View Details',
        id: 'Lihat Detail',
      },
      [NotificationType.GENERAL]: {
        en: 'View Details',
        id: 'Lihat Detail',
      },
      [NotificationType.DELEGATION]: {
        en: 'View Task',
        id: 'Lihat Tugas',
      },
      [NotificationType.ANNOUNCEMENT]: {
        en: 'View Announcement',
        id: 'Lihat Pengumuman',
      },
      [NotificationType.SYSTEM_UPDATE]: {
        en: 'View Update',
        id: 'Lihat Pembaruan',
      },
      [NotificationType.REMINDER]: {
        en: 'View Details',
        id: 'Lihat Detail',
      },
      [NotificationType.ALERT]: {
        en: 'View Alert',
        id: 'Lihat Peringatan',
      },
      [NotificationType.USER_ACTION]: {
        en: 'Take Action',
        id: 'Ambil Tindakan',
      },
      [NotificationType.DATA_CHANGE]: {
        en: 'View Changes',
        id: 'Lihat Perubahan',
      },
    };

    return buttons[type]?.[locale] || buttons[type]?.en || 'View Details';
  }

  private extractVariables(template: any): any[] {
    const variables: any[] = [];
    const standardVars = template.variables || [];

    // Always include these common variables
    const commonVars = [
      {
        name: 'recipientName',
        type: 'string',
        required: true,
        description: 'Name of the notification recipient',
      },
      {
        name: 'actionUrl',
        type: 'string',
        required: true,
        description: 'URL for the action button',
      },
      {
        name: 'logoUrl',
        type: 'string',
        required: false,
        defaultValue: 'https://example.com/logo.png',
        description: 'URL for the organization logo',
      },
      {
        name: 'locale',
        type: 'string',
        required: false,
        defaultValue: 'en',
        description: 'Locale for the notification',
      },
    ];

    // Add template-specific variables
    standardVars.forEach((varName: string) => {
      if (!commonVars.find((v) => v.name === varName)) {
        variables.push({
          name: varName,
          type: 'string',
          required: false,
          description: `Variable: ${varName}`,
        });
      }
    });

    return [...commonVars, ...variables];
  }

  private generateDefaultABTesting(type: NotificationType): any {
    // Only enable A/B testing for certain types
    const abTestingTypes = [
      NotificationType.APPROVAL_REQUEST,
      NotificationType.KPI_REMINDER,
      NotificationType.TRAINING_INVITATION,
    ];

    if (!abTestingTypes.includes(type)) {
      return {
        enabled: false,
        distribution: 'random',
        variants: [],
      };
    }

    return {
      enabled: true,
      distribution: 'weighted',
      variants: [
        {
          id: 'variant-a',
          name: 'Standard',
          weight: 80,
        },
        {
          id: 'variant-b',
          name: 'Urgent',
          weight: 20,
          subject: {
            en: `🔴 URGENT: ${this.generateTemplateName(type)}`,
            id: `🔴 MENDESAK: ${this.generateTemplateName(type)}`,
          },
        },
      ],
    };
  }

  private generateSampleVariables(type: NotificationType): Record<string, any> {
    const baseVars = {
      recipientName: 'John Doe',
      actionUrl: 'https://example.com/action',
      logoUrl: 'https://example.com/logo.png',
      locale: 'en',
    };

    const typeSpecificVars: Record<NotificationType, Record<string, any>> = {
      [NotificationType.APPROVAL_REQUEST]: {
        requestTitle: 'Purchase Order #12345',
        requesterName: 'Jane Smith',
        department: 'Finance',
        priority: 'HIGH',
        submittedDate: new Date(),
        description: 'Urgent purchase order for office supplies',
      },
      [NotificationType.APPROVAL_RESULT]: {
        requestTitle: 'Purchase Order #12345',
        status: 'APPROVED',
        approverName: 'Manager Name',
        decisionDate: new Date(),
        comments: 'Approved for processing',
      },
      [NotificationType.WORK_ORDER_UPDATE]: {
        workOrderNumber: 'WO-2024-001',
        newStatus: 'In Progress',
        previousStatus: 'Pending',
        updatedBy: 'Technician Name',
        updateTime: new Date(),
        notes: 'Work has started',
      },
      [NotificationType.KPI_REMINDER]: {
        period: 'Q1 2024',
        dueDate: new Date(),
        daysRemaining: 5,
        department: 'Sales',
        pendingKpis: ['Sales Target', 'Customer Satisfaction'],
      },
      [NotificationType.TRAINING_INVITATION]: {
        trainingTitle: 'Leadership Development',
        instructor: 'Dr. Expert',
        trainingDate: new Date(),
        trainingTime: '09:00 AM',
        duration: '2 hours',
        location: 'Conference Room A',
        format: 'In-person',
        description: 'Leadership skills workshop',
        rsvpDate: new Date(),
      },
      [NotificationType.SYSTEM_ALERT]: {
        alertType: 'Maintenance',
        severity: 'Medium',
        alertTime: new Date(),
        message: 'System maintenance scheduled',
        estimatedResolution: '2 hours',
      },
      [NotificationType.GENERAL]: {
        subject: 'General Notification',
        message: 'This is a general notification message',
      },
      [NotificationType.DELEGATION]: {
        taskTitle: 'Review Document',
        originalAssignee: 'Original Person',
        delegatorName: 'Manager Name',
        delegationDate: new Date(),
        dueDate: new Date(),
        reason: 'Out of office',
        instructions: 'Please review and approve',
      },
      [NotificationType.ANNOUNCEMENT]: {
        title: 'Important Announcement',
        message: 'Company-wide announcement',
        date: new Date(),
        priority: 'High',
      },
      [NotificationType.SYSTEM_UPDATE]: {
        updateType: 'Feature Release',
        version: '2.0.0',
        releaseDate: new Date(),
        changes: 'New features and improvements',
      },
      [NotificationType.REMINDER]: {
        title: 'Task Reminder',
        message: 'This is a reminder about your pending task',
        dueDate: new Date(),
      },
      [NotificationType.ALERT]: {
        alertTitle: 'System Alert',
        severity: 'High',
        message: 'Immediate attention required',
        timestamp: new Date(),
      },
      [NotificationType.USER_ACTION]: {
        actionRequired: 'Profile Update',
        description: 'Please update your profile information',
        deadline: new Date(),
      },
      [NotificationType.DATA_CHANGE]: {
        entityType: 'Employee Record',
        changeType: 'Update',
        changedBy: 'System Admin',
        changeDate: new Date(),
        summary: 'Contact information updated',
      },
    };

    return {
      ...baseVars,
      ...(typeSpecificVars[type] || {}),
    };
  }
}
