import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from './enums/notification.enum';
import {
  NotificationTemplate,
  NotificationTemplateVariables,
  RenderedTemplate,
} from './interfaces/notification-template.interface';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templates: Map<NotificationType, NotificationTemplate>;

  constructor() {
    this.templates = new Map();
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // Approval Request Template
    this.templates.set(NotificationType.APPROVAL_REQUEST, {
      type: NotificationType.APPROVAL_REQUEST,
      subject: 'Approval Request: {{requestTitle}}',
      body: `Dear {{recipientName}},

You have received a new approval request that requires your attention.

Request Details:
- Title: {{requestTitle}}
- Requester: {{requesterName}}
- Department: {{department}}
- Priority: {{priority}}
- Submitted On: {{submittedDate}}

{{#if description}}
Description:
{{description}}
{{/if}}

Please review and take action on this request at your earliest convenience.

Best regards,
YPK Gloria Management System`,
      variables: [
        'recipientName',
        'requestTitle',
        'requesterName',
        'department',
        'priority',
        'submittedDate',
        'description',
      ],
    });

    // Approval Result Template
    this.templates.set(NotificationType.APPROVAL_RESULT, {
      type: NotificationType.APPROVAL_RESULT,
      subject: 'Approval Result: {{requestTitle}} - {{status}}',
      body: `Dear {{recipientName}},

Your request "{{requestTitle}}" has been {{status}}.

Details:
- Request Title: {{requestTitle}}
- Status: {{status}}
- {{#if approverName}}Reviewed By: {{approverName}}{{/if}}
- Decision Date: {{decisionDate}}

{{#if comments}}
Comments:
{{comments}}
{{/if}}

{{#if status === "APPROVED"}}
Your request has been approved and will proceed to the next step.
{{else if status === "REJECTED"}}
Your request has been rejected. Please review the comments above for more details.
{{else}}
Your request requires revisions. Please review the comments and resubmit.
{{/if}}

Best regards,
YPK Gloria Management System`,
      variables: [
        'recipientName',
        'requestTitle',
        'status',
        'approverName',
        'decisionDate',
        'comments',
      ],
    });

    // Work Order Update Template
    this.templates.set(NotificationType.WORK_ORDER_UPDATE, {
      type: NotificationType.WORK_ORDER_UPDATE,
      subject: 'Work Order Update: {{workOrderNumber}}',
      body: `Dear {{recipientName}},

There has been an update to Work Order #{{workOrderNumber}}.

Update Details:
- Work Order: #{{workOrderNumber}}
- New Status: {{newStatus}}
- Previous Status: {{previousStatus}}
- Updated By: {{updatedBy}}
- Update Time: {{updateTime}}

{{#if notes}}
Notes:
{{notes}}
{{/if}}

Please log in to the system to view full details.

Best regards,
YPK Gloria Management System`,
      variables: [
        'recipientName',
        'workOrderNumber',
        'newStatus',
        'previousStatus',
        'updatedBy',
        'updateTime',
        'notes',
      ],
    });

    // KPI Reminder Template
    this.templates.set(NotificationType.KPI_REMINDER, {
      type: NotificationType.KPI_REMINDER,
      subject: 'KPI Submission Reminder - {{period}}',
      body: `Dear {{recipientName}},

This is a reminder to submit your KPI report for {{period}}.

Reminder Details:
- Period: {{period}}
- Due Date: {{dueDate}}
- Days Remaining: {{daysRemaining}}
- Department: {{department}}

{{#if pendingKpis}}
Pending KPIs:
{{#each pendingKpis}}
- {{this}}
{{/each}}
{{/if}}

Please ensure your KPI submission is completed before the due date.

Best regards,
YPK Gloria Management System`,
      variables: [
        'recipientName',
        'period',
        'dueDate',
        'daysRemaining',
        'department',
        'pendingKpis',
      ],
    });

    // Training Invitation Template
    this.templates.set(NotificationType.TRAINING_INVITATION, {
      type: NotificationType.TRAINING_INVITATION,
      subject: 'Training Invitation: {{trainingTitle}}',
      body: `Dear {{recipientName}},

You are invited to attend the following training session:

Training Details:
- Title: {{trainingTitle}}
- Instructor: {{instructor}}
- Date: {{trainingDate}}
- Time: {{trainingTime}}
- Duration: {{duration}}
- Location: {{location}}
- Format: {{format}}

{{#if description}}
Description:
{{description}}
{{/if}}

{{#if prerequisites}}
Prerequisites:
{{prerequisites}}
{{/if}}

Please confirm your attendance by {{rsvpDate}}.

Best regards,
YPK Gloria Management System`,
      variables: [
        'recipientName',
        'trainingTitle',
        'instructor',
        'trainingDate',
        'trainingTime',
        'duration',
        'location',
        'format',
        'description',
        'prerequisites',
        'rsvpDate',
      ],
    });

    // System Alert Template
    this.templates.set(NotificationType.SYSTEM_ALERT, {
      type: NotificationType.SYSTEM_ALERT,
      subject: 'System Alert: {{alertType}}',
      body: `Dear {{recipientName}},

System Alert: {{alertType}}

Alert Details:
- Type: {{alertType}}
- Severity: {{severity}}
- Time: {{alertTime}}

{{message}}

{{#if actionRequired}}
Action Required:
{{actionRequired}}
{{/if}}

{{#if estimatedResolution}}
Estimated Resolution: {{estimatedResolution}}
{{/if}}

Best regards,
YPK Gloria IT Team`,
      variables: [
        'recipientName',
        'alertType',
        'severity',
        'alertTime',
        'message',
        'actionRequired',
        'estimatedResolution',
      ],
    });

    // General Template
    this.templates.set(NotificationType.GENERAL, {
      type: NotificationType.GENERAL,
      subject: '{{subject}}',
      body: `Dear {{recipientName}},

{{message}}

{{#if additionalInfo}}
Additional Information:
{{additionalInfo}}
{{/if}}

Best regards,
YPK Gloria Management System`,
      variables: ['recipientName', 'subject', 'message', 'additionalInfo'],
    });

    // Delegation Template
    this.templates.set(NotificationType.DELEGATION, {
      type: NotificationType.DELEGATION,
      subject: 'Task Delegated: {{taskTitle}}',
      body: `Dear {{recipientName}},

{{delegatorName}} has delegated the following task to you:

Task Details:
- Title: {{taskTitle}}
- Original Assignee: {{originalAssignee}}
- Delegated By: {{delegatorName}}
- Delegation Date: {{delegationDate}}
- Due Date: {{dueDate}}

{{#if reason}}
Reason for Delegation:
{{reason}}
{{/if}}

{{#if instructions}}
Instructions:
{{instructions}}
{{/if}}

Please take action on this delegated task before the due date.

Best regards,
YPK Gloria Management System`,
      variables: [
        'recipientName',
        'taskTitle',
        'originalAssignee',
        'delegatorName',
        'delegationDate',
        'dueDate',
        'reason',
        'instructions',
      ],
    });
  }

  getTemplate(type: NotificationType): NotificationTemplate | undefined {
    return this.templates.get(type);
  }

  renderTemplate(
    type: NotificationType,
    variables: NotificationTemplateVariables,
  ): RenderedTemplate {
    const template = this.getTemplate(type);

    if (!template) {
      this.logger.warn(`Template not found for type: ${type}`);
      return {
        subject: 'Notification',
        body: 'You have a new notification.',
      };
    }

    const renderedSubject = this.replaceVariables(template.subject, variables);
    const renderedBody = this.replaceVariables(template.body, variables);

    return {
      subject: renderedSubject,
      body: renderedBody,
      html: this.convertToHtml(renderedBody),
    };
  }

  private replaceVariables(
    template: string,
    variables: NotificationTemplateVariables,
  ): string {
    let result = template;

    // Replace simple variables {{variable}}
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key];
      return value !== undefined ? String(value) : match;
    });

    // Handle conditionals {{#if condition}}...{{/if}}
    result = result.replace(
      /\{\{#if\s+(.+?)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, condition, content) => {
        const conditionValue = this.evaluateCondition(condition, variables);
        return conditionValue ? content : '';
      },
    );

    // Handle else if {{else if condition}}
    result = result.replace(
      /\{\{else if\s+(.+?)\}\}([\s\S]*?)(?=\{\{else|$)/g,
      (match, condition, content) => {
        const conditionValue = this.evaluateCondition(condition, variables);
        return conditionValue ? content : '';
      },
    );

    // Handle else {{else}}
    result = result.replace(
      /\{\{else\}\}([\s\S]*?)(?=\{\{\/if\}\})/g,
      (match, content) => content,
    );

    // Handle loops {{#each array}}...{{/each}}
    result = result.replace(
      /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (match, arrayName, content) => {
        const array = variables[arrayName];
        if (Array.isArray(array)) {
          return array
            .map((item) => content.replace(/\{\{this\}\}/g, String(item)))
            .join('');
        }
        return '';
      },
    );

    return result;
  }

  private evaluateCondition(
    condition: string,
    variables: NotificationTemplateVariables,
  ): boolean {
    // Simple equality check
    if (condition.includes('===')) {
      const [left, right] = condition.split('===').map((s) => s.trim());
      const leftValue = variables[left] || left.replace(/["']/g, '');
      const rightValue = variables[right] || right.replace(/["']/g, '');
      return leftValue === rightValue;
    }

    // Check if variable exists and is truthy
    const variableValue = variables[condition.trim()];
    return Boolean(variableValue);
  }

  private convertToHtml(text: string): string {
    // Convert line breaks to <br> tags
    let html = text.replace(/\n/g, '<br>');

    // Convert sections to headers
    html = html.replace(/^([\w\s]+:)$/gm, '<strong>$1</strong>');

    // Wrap in basic HTML structure
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    strong {
      color: #2c3e50;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  }

  getAllTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  updateTemplate(
    type: NotificationType,
    template: Partial<NotificationTemplate>,
  ): void {
    const existingTemplate = this.templates.get(type);
    if (existingTemplate) {
      this.templates.set(type, {
        ...existingTemplate,
        ...template,
        type, // Ensure type is not changed
      });
      this.logger.log(`Template updated for type: ${type}`);
    }
  }
}
