import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Handlebars from 'handlebars';
import * as mjml2html from 'mjml';
import * as i18n from 'i18n';
import * as crypto from 'crypto';
import * as path from 'path';
import { NotificationType } from '../enums/notification.enum';
import {
  EnhancedNotificationTemplate,
  TemplateRenderOptions,
  RenderedEnhancedTemplate,
  ABTestVariant,
  TemplateValidationResult,
  TemplatePreviewRequest,
} from '../interfaces/enhanced-template.interface';
import { CacheService } from '../../../cache/cache.service';

@Injectable()
export class EnhancedTemplateService {
  private readonly logger = new Logger(EnhancedTemplateService.name);
  private readonly templates: Map<string, EnhancedNotificationTemplate>;
  private readonly compiledTemplates: Map<string, HandlebarsTemplateDelegate>;
  private readonly defaultLocale: string;
  private readonly supportedLocales: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.templates = new Map();
    this.compiledTemplates = new Map();
    this.defaultLocale = this.configService.get(
      'notification.defaultLocale',
      'en',
    );
    this.supportedLocales = this.configService.get(
      'notification.supportedLocales',
      ['en', 'id'],
    );

    this.initializeI18n();
    this.registerHandlebarsHelpers();
    this.loadDefaultTemplates();
  }

  private initializeI18n(): void {
    i18n.configure({
      locales: this.supportedLocales,
      defaultLocale: this.defaultLocale,
      directory: path.join(__dirname, '../../../../locales'),
      objectNotation: true,
      updateFiles: false,
      syncFiles: false,
    });
  }

  private registerHandlebarsHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper(
      'formatDate',
      (date: Date, format: string, locale: string) => {
        return new Intl.DateTimeFormat(locale || this.defaultLocale, {
          dateStyle: format === 'short' ? 'short' : 'long',
        }).format(new Date(date));
      },
    );

    // Number formatting helper
    Handlebars.registerHelper('formatNumber', (num: number, locale: string) => {
      return new Intl.NumberFormat(locale || this.defaultLocale).format(num);
    });

    // Currency formatting helper
    Handlebars.registerHelper(
      'formatCurrency',
      (amount: number, currency: string, locale: string) => {
        return new Intl.NumberFormat(locale || this.defaultLocale, {
          style: 'currency',
          currency: currency || 'IDR',
        }).format(amount);
      },
    );

    // Pluralization helper
    Handlebars.registerHelper(
      'plural',
      (count: number, singular: string, plural: string) => {
        return count === 1 ? singular : plural;
      },
    );

    // Conditional helper for complex conditions
    Handlebars.registerHelper(
      'when',
      function (operand1: any, operator: string, operand2: any, options: any) {
        let result = false;
        switch (operator) {
          case '==':
            result = operand1 == operand2;
            break;
          case '===':
            result = operand1 === operand2;
            break;
          case '!=':
            result = operand1 != operand2;
            break;
          case '!==':
            result = operand1 !== operand2;
            break;
          case '<':
            result = operand1 < operand2;
            break;
          case '>':
            result = operand1 > operand2;
            break;
          case '<=':
            result = operand1 <= operand2;
            break;
          case '>=':
            result = operand1 >= operand2;
            break;
          case '&&':
            result = operand1 && operand2;
            break;
          case '||':
            result = operand1 || operand2;
            break;
        }
        return result ? options.fn(this) : options.inverse(this);
      },
    );

    // Translation helper
    Handlebars.registerHelper('t', (key: string, locale: string) => {
      i18n.setLocale(locale || this.defaultLocale);
      return i18n.__(key);
    });

    // Safe HTML helper
    Handlebars.registerHelper('safeHtml', (html: string) => {
      return new Handlebars.SafeString(html);
    });
  }

  private loadDefaultTemplates(): void {
    // Approval Request Template - Enhanced with multi-language support
    const approvalRequestTemplate: EnhancedNotificationTemplate = {
      id: 'approval-request-v2',
      type: NotificationType.APPROVAL_REQUEST,
      name: 'Approval Request Enhanced',
      description:
        'Enhanced approval request notification with rich HTML support',
      subject: {
        en: 'Approval Request: {{requestTitle}}',
        id: 'Permintaan Persetujuan: {{requestTitle}}',
      },
      body: {
        en: `Dear {{recipientName}},

You have received a new approval request that requires your attention.

Request Details:
- Title: {{requestTitle}}
- Requester: {{requesterName}}
- Department: {{department}}
- Priority: {{priority}}
- Submitted On: {{formatDate submittedDate "long" locale}}

{{#if description}}
Description:
{{description}}
{{/if}}

{{#when itemCount ">" 0}}
Items: {{formatNumber itemCount locale}} {{plural itemCount "item" "items"}}
{{/when}}

{{#if totalAmount}}
Total Amount: {{formatCurrency totalAmount currency locale}}
{{/if}}

Please review and take action on this request at your earliest convenience.

Best regards,
YPK Gloria Management System`,
        id: `Yth. {{recipientName}},

Anda menerima permintaan persetujuan baru yang memerlukan perhatian Anda.

Detail Permintaan:
- Judul: {{requestTitle}}
- Peminta: {{requesterName}}
- Departemen: {{department}}
- Prioritas: {{priority}}
- Tanggal Pengajuan: {{formatDate submittedDate "long" locale}}

{{#if description}}
Deskripsi:
{{description}}
{{/if}}

{{#when itemCount ">" 0}}
Jumlah Item: {{formatNumber itemCount locale}} item
{{/when}}

{{#if totalAmount}}
Total Nilai: {{formatCurrency totalAmount currency locale}}
{{/if}}

Mohon segera tinjau dan ambil tindakan atas permintaan ini.

Hormat kami,
Sistem Manajemen YPK Gloria`,
      },
      mjmlTemplate: {
        en: `<mjml>
  <mj-head>
    <mj-title>Approval Request</mj-title>
    <mj-preview>New approval request from {{requesterName}}</mj-preview>
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
          Approval Request
        </mj-text>
        <mj-divider border-color="#3498db" border-width="2px" />
      </mj-column>
    </mj-section>
    
    <mj-section>
      <mj-column>
        <mj-text>
          <p>Dear {{recipientName}},</p>
          <p>You have received a new approval request that requires your attention.</p>
        </mj-text>
        
        <mj-table>
          <tr style="border-bottom: 1px solid #ecf0f1;">
            <td style="padding: 10px; font-weight: bold;">Title</td>
            <td style="padding: 10px;">{{requestTitle}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ecf0f1;">
            <td style="padding: 10px; font-weight: bold;">Requester</td>
            <td style="padding: 10px;">{{requesterName}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ecf0f1;">
            <td style="padding: 10px; font-weight: bold;">Department</td>
            <td style="padding: 10px;">{{department}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ecf0f1;">
            <td style="padding: 10px; font-weight: bold;">Priority</td>
            <td style="padding: 10px;">
              {{#when priority "===" "HIGH"}}
                <span style="color: #e74c3c; font-weight: bold;">{{priority}}</span>
              {{else}}
                {{#when priority "===" "MEDIUM"}}
                  <span style="color: #f39c12; font-weight: bold;">{{priority}}</span>
                {{else}}
                  <span style="color: #27ae60;">{{priority}}</span>
                {{/when}}
              {{/when}}
            </td>
          </tr>
          <tr style="border-bottom: 1px solid #ecf0f1;">
            <td style="padding: 10px; font-weight: bold;">Submitted</td>
            <td style="padding: 10px;">{{formatDate submittedDate "long" locale}}</td>
          </tr>
          {{#if totalAmount}}
          <tr>
            <td style="padding: 10px; font-weight: bold;">Total Amount</td>
            <td style="padding: 10px; font-size: 18px; color: #2c3e50;">
              {{formatCurrency totalAmount currency locale}}
            </td>
          </tr>
          {{/if}}
        </mj-table>
        
        {{#if description}}
        <mj-text>
          <h3>Description</h3>
          <p>{{description}}</p>
        </mj-text>
        {{/if}}
        
        <mj-button background-color="#3498db" href="{{approvalUrl}}" font-size="16px" padding="20px">
          Review Request
        </mj-button>
      </mj-column>
    </mj-section>
    
    <mj-section background-color="#34495e">
      <mj-column>
        <mj-text color="#ffffff" align="center" font-size="12px">
          © 2024 YPK Gloria Management System. All rights reserved.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
        id: `<mjml>
  <mj-head>
    <mj-title>Permintaan Persetujuan</mj-title>
    <mj-preview>Permintaan persetujuan baru dari {{requesterName}}</mj-preview>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-section background-color="#f4f4f4" />
      <mj-column background-color="#ffffff" />
      <mj-text color="#333333" font-size="14px" line-height="1.6" />
    </mj-attributes>
  </mj-head>
  <mj-body>
    <!-- Similar structure with Indonesian content -->
  </mj-body>
</mjml>`,
      },
      variables: [
        {
          name: 'recipientName',
          type: 'string',
          required: true,
          description: 'Name of the approval recipient',
        },
        {
          name: 'requestTitle',
          type: 'string',
          required: true,
          description: 'Title of the approval request',
        },
        {
          name: 'requesterName',
          type: 'string',
          required: true,
          description: 'Name of the person requesting approval',
        },
        {
          name: 'department',
          type: 'string',
          required: true,
          description: 'Department of the requester',
        },
        {
          name: 'priority',
          type: 'string',
          required: true,
          validation: {
            enum: ['LOW', 'MEDIUM', 'HIGH'],
          },
        },
        {
          name: 'submittedDate',
          type: 'date',
          required: true,
          description: 'Date when the request was submitted',
        },
        {
          name: 'description',
          type: 'string',
          required: false,
          description: 'Optional description of the request',
        },
        {
          name: 'itemCount',
          type: 'number',
          required: false,
          defaultValue: 0,
        },
        {
          name: 'totalAmount',
          type: 'number',
          required: false,
          description: 'Total amount for financial approvals',
        },
        {
          name: 'currency',
          type: 'string',
          required: false,
          defaultValue: 'IDR',
        },
        {
          name: 'approvalUrl',
          type: 'string',
          required: true,
          description: 'URL to review the approval request',
        },
        {
          name: 'logoUrl',
          type: 'string',
          required: false,
          defaultValue: 'https://example.com/logo.png',
        },
        {
          name: 'locale',
          type: 'string',
          required: false,
          defaultValue: 'en',
        },
      ],
      metadata: {
        version: 2,
        author: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['approval', 'workflow', 'enhanced'],
      },
      abTesting: {
        enabled: true,
        distribution: 'weighted',
        variants: [
          {
            id: 'variant-a',
            name: 'Standard Subject',
            weight: 70,
          },
          {
            id: 'variant-b',
            name: 'Urgent Subject',
            weight: 30,
            subject: {
              en: '🔴 URGENT: Approval Needed - {{requestTitle}}',
              id: '🔴 MENDESAK: Persetujuan Diperlukan - {{requestTitle}}',
            },
          },
        ],
      },
      active: true,
    };

    this.templates.set(approvalRequestTemplate.id, approvalRequestTemplate);
    this.compileTemplate(approvalRequestTemplate);
  }

  private compileTemplate(template: EnhancedNotificationTemplate): void {
    const locales = Object.keys(template.subject);

    locales.forEach((locale) => {
      // Compile subject
      const subjectKey = `${template.id}-subject-${locale}`;
      this.compiledTemplates.set(
        subjectKey,
        Handlebars.compile(template.subject[locale]),
      );

      // Compile body
      const bodyKey = `${template.id}-body-${locale}`;
      this.compiledTemplates.set(
        bodyKey,
        Handlebars.compile(template.body[locale]),
      );

      // Compile MJML if exists
      if (template.mjmlTemplate?.[locale]) {
        const mjmlKey = `${template.id}-mjml-${locale}`;
        this.compiledTemplates.set(
          mjmlKey,
          Handlebars.compile(template.mjmlTemplate[locale]),
        );
      }

      // Compile variants
      if (template.abTesting?.enabled && template.abTesting.variants) {
        template.abTesting.variants.forEach((variant) => {
          if (variant.subject?.[locale]) {
            const variantSubjectKey = `${template.id}-${variant.id}-subject-${locale}`;
            this.compiledTemplates.set(
              variantSubjectKey,
              Handlebars.compile(variant.subject[locale]),
            );
          }
          if (variant.body?.[locale]) {
            const variantBodyKey = `${template.id}-${variant.id}-body-${locale}`;
            this.compiledTemplates.set(
              variantBodyKey,
              Handlebars.compile(variant.body[locale]),
            );
          }
          if (variant.mjmlTemplate?.[locale]) {
            const variantMjmlKey = `${template.id}-${variant.id}-mjml-${locale}`;
            this.compiledTemplates.set(
              variantMjmlKey,
              Handlebars.compile(variant.mjmlTemplate[locale]),
            );
          }
        });
      }
    });
  }

  async renderTemplate(
    templateId: string,
    options: TemplateRenderOptions,
  ): Promise<RenderedEnhancedTemplate> {
    const startTime = Date.now();

    // Try to get from cache first
    const cacheKey = `template:${templateId}:${options.locale}:${options.format}:${options.variant || 'default'}`;
    const cachedString = await this.cacheService.get(cacheKey);
    if (cachedString && !options.preview) {
      return JSON.parse(cachedString) as RenderedEnhancedTemplate;
    }

    const template = this.templates.get(templateId);
    if (!template) {
      throw new BadRequestException(`Template not found: ${templateId}`);
    }

    // Validate required variables
    const validationResult = this.validateTemplateVariables(
      template,
      options.variables,
    );
    if (!validationResult.valid) {
      throw new BadRequestException({
        message: 'Template validation failed',
        errors: validationResult.errors,
      });
    }

    // Select variant for A/B testing
    const variant = this.selectVariant(template, options);

    // Prepare variables with defaults
    const preparedVariables = this.prepareVariables(
      template,
      options.variables,
    );
    preparedVariables.locale = options.locale;

    // Get compiled templates
    const subjectTemplate = this.getCompiledTemplate(
      template.id,
      'subject',
      options.locale,
      variant,
    );
    const bodyTemplate = this.getCompiledTemplate(
      template.id,
      'body',
      options.locale,
      variant,
    );

    let subject: string;
    let body: string;
    let html: string | undefined;
    let mjml: string | undefined;

    try {
      // Render subject and body
      subject = subjectTemplate(preparedVariables);
      body = bodyTemplate(preparedVariables);

      // Render HTML if requested
      if (options.format === 'html' || options.format === 'mjml') {
        const mjmlTemplate = this.getCompiledTemplate(
          template.id,
          'mjml',
          options.locale,
          variant,
        );
        if (mjmlTemplate) {
          mjml = mjmlTemplate(preparedVariables);
          const mjmlResult = mjml2html(mjml, {
            minify: true,
            validationLevel: 'soft',
          });

          if (mjmlResult.errors.length > 0) {
            this.logger.warn('MJML compilation warnings:', mjmlResult.errors);
          }

          html = mjmlResult.html;
        } else {
          // Fallback to simple HTML conversion
          html = this.convertToHtml(body);
        }
      }
    } catch (error) {
      this.logger.error('Template rendering error:', error);
      throw new BadRequestException('Failed to render template');
    }

    const result: RenderedEnhancedTemplate = {
      subject,
      body,
      html,
      mjml: options.format === 'mjml' ? mjml : undefined,
      variant: variant?.id,
      locale: options.locale,
      metadata: {
        renderTime: Date.now() - startTime,
        templateId: template.id,
        templateVersion: template.metadata?.version || 1,
      },
    };

    // Cache the result (except for previews)
    if (!options.preview) {
      await this.cacheService.set(cacheKey, JSON.stringify(result), 3600); // Cache for 1 hour
    }

    return result;
  }

  private validateTemplateVariables(
    template: EnhancedNotificationTemplate,
    variables: Record<string, any>,
  ): TemplateValidationResult {
    const errors: any[] = [];
    const warnings: string[] = [];

    template.variables.forEach((variable) => {
      const value = variables[variable.name];

      // Check required fields
      if (variable.required && (value === undefined || value === null)) {
        errors.push({
          field: variable.name,
          message: `Required variable '${variable.name}' is missing`,
          severity: 'error',
        });
        return;
      }

      // Skip validation for optional empty fields
      if (!variable.required && (value === undefined || value === null)) {
        return;
      }

      // Type validation
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (
        actualType !== variable.type &&
        !(variable.type === 'date' && value instanceof Date)
      ) {
        errors.push({
          field: variable.name,
          message: `Variable '${variable.name}' should be of type '${variable.type}' but got '${actualType}'`,
          severity: 'error',
        });
      }

      // Additional validations
      if (variable.validation) {
        if (variable.validation.pattern && typeof value === 'string') {
          const regex = new RegExp(variable.validation.pattern);
          if (!regex.test(value)) {
            errors.push({
              field: variable.name,
              message: `Variable '${variable.name}' does not match pattern: ${variable.validation.pattern}`,
              severity: 'error',
            });
          }
        }

        if (
          variable.validation.min !== undefined &&
          typeof value === 'number'
        ) {
          if (value < variable.validation.min) {
            errors.push({
              field: variable.name,
              message: `Variable '${variable.name}' is below minimum value: ${variable.validation.min}`,
              severity: 'error',
            });
          }
        }

        if (
          variable.validation.max !== undefined &&
          typeof value === 'number'
        ) {
          if (value > variable.validation.max) {
            errors.push({
              field: variable.name,
              message: `Variable '${variable.name}' exceeds maximum value: ${variable.validation.max}`,
              severity: 'error',
            });
          }
        }

        if (
          variable.validation.enum &&
          !variable.validation.enum.includes(value)
        ) {
          errors.push({
            field: variable.name,
            message: `Variable '${variable.name}' must be one of: ${variable.validation.enum.join(', ')}`,
            severity: 'error',
          });
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private prepareVariables(
    template: EnhancedNotificationTemplate,
    variables: Record<string, any>,
  ): Record<string, any> {
    const prepared: Record<string, any> = { ...variables };

    template.variables.forEach((variable) => {
      if (
        prepared[variable.name] === undefined &&
        variable.defaultValue !== undefined
      ) {
        prepared[variable.name] = variable.defaultValue;
      }
    });

    return prepared;
  }

  private selectVariant(
    template: EnhancedNotificationTemplate,
    options: TemplateRenderOptions,
  ): ABTestVariant | undefined {
    if (!template.abTesting?.enabled || !template.abTesting.variants.length) {
      return undefined;
    }

    // If specific variant requested
    if (options.variant) {
      return template.abTesting.variants.find((v) => v.id === options.variant);
    }

    // User-based distribution
    if (template.abTesting.distribution === 'user-based' && options.userId) {
      const hash = crypto
        .createHash('md5')
        .update(`${template.id}-${options.userId}`)
        .digest('hex');
      const hashValue = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
      const percentage = hashValue * 100;

      let accumulatedWeight = 0;
      for (const variant of template.abTesting.variants) {
        accumulatedWeight += variant.weight;
        if (percentage <= accumulatedWeight) {
          return variant;
        }
      }
    }

    // Random/weighted distribution
    const random = Math.random() * 100;
    let accumulatedWeight = 0;

    for (const variant of template.abTesting.variants) {
      accumulatedWeight += variant.weight;
      if (random <= accumulatedWeight) {
        return variant;
      }
    }

    return undefined;
  }

  private getCompiledTemplate(
    templateId: string,
    type: 'subject' | 'body' | 'mjml',
    locale: string,
    variant?: ABTestVariant,
  ): HandlebarsTemplateDelegate {
    const key = variant
      ? `${templateId}-${variant.id}-${type}-${locale}`
      : `${templateId}-${type}-${locale}`;

    const compiled = this.compiledTemplates.get(key);
    if (!compiled) {
      // Fallback to default locale
      const defaultKey = variant
        ? `${templateId}-${variant.id}-${type}-${this.defaultLocale}`
        : `${templateId}-${type}-${this.defaultLocale}`;

      return this.compiledTemplates.get(defaultKey) || Handlebars.compile('');
    }

    return compiled;
  }

  private convertToHtml(text: string): string {
    // Enhanced HTML conversion with better styling
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const html = escaped
      .replace(/\n/g, '<br>')
      .replace(/^([\w\s]+:)$/gm, '<strong>$1</strong>')
      .replace(/^\s*-\s+(.+)$/gm, '<li>$1</li>');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    strong {
      color: #2c3e50;
      display: block;
      margin-top: 15px;
      margin-bottom: 5px;
    }
    li {
      margin-left: 20px;
      list-style-type: disc;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    ${html}
  </div>
  <div class="footer">
    © 2024 YPK Gloria Management System. All rights reserved.
  </div>
</body>
</html>`;
  }

  async previewTemplate(
    request: TemplatePreviewRequest,
  ): Promise<RenderedEnhancedTemplate> {
    const template = this.templates.get(request.templateId);
    if (!template) {
      throw new BadRequestException(
        `Template not found: ${request.templateId}`,
      );
    }

    // Generate sample data if not provided
    const sampleData = request.sampleData || this.generateSampleData(template);

    return this.renderTemplate(request.templateId, {
      locale: request.locale,
      variables: sampleData,
      format: request.format,
      variant: request.variant,
      preview: true,
    });
  }

  private generateSampleData(
    template: EnhancedNotificationTemplate,
  ): Record<string, any> {
    const sampleData: Record<string, any> = {};

    template.variables.forEach((variable) => {
      switch (variable.type) {
        case 'string':
          if (variable.validation?.enum) {
            sampleData[variable.name] = variable.validation.enum[0];
          } else {
            sampleData[variable.name] = `Sample ${variable.name}`;
          }
          break;
        case 'number':
          sampleData[variable.name] = variable.validation?.min || 100;
          break;
        case 'boolean':
          sampleData[variable.name] = true;
          break;
        case 'date':
          sampleData[variable.name] = new Date();
          break;
        case 'array':
          sampleData[variable.name] = ['Item 1', 'Item 2', 'Item 3'];
          break;
        case 'object':
          sampleData[variable.name] = { key: 'value' };
          break;
      }
    });

    return sampleData;
  }

  // Additional methods for template management
  async createTemplate(template: EnhancedNotificationTemplate): Promise<void> {
    this.templates.set(template.id, template);
    this.compileTemplate(template);

    // Clear cache for this template
    await this.cacheService.del(`template:${template.id}:*`);
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<EnhancedNotificationTemplate>,
  ): Promise<void> {
    const existing = this.templates.get(templateId);
    if (!existing) {
      throw new BadRequestException(`Template not found: ${templateId}`);
    }

    const updated: EnhancedNotificationTemplate = {
      ...existing,
      ...updates,
      id: templateId,
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
        updatedAt: new Date(),
        version: (existing.metadata?.version || 1) + 1,
        createdAt: existing.metadata?.createdAt || new Date(),
        author: updates.metadata?.author || existing.metadata?.author,
        tags: updates.metadata?.tags || existing.metadata?.tags,
      },
    };

    this.templates.set(templateId, updated);
    this.compileTemplate(updated);

    // Clear cache for this template
    await this.cacheService.del(`template:${templateId}:*`);
  }

  getTemplate(templateId: string): EnhancedNotificationTemplate | undefined {
    return this.templates.get(templateId);
  }

  getAllTemplates(): EnhancedNotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  getSupportedLocales(): string[] {
    return this.supportedLocales;
  }
}
