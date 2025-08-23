# Enhanced Notification Template Engine Documentation

## Overview

The Enhanced Notification Template Engine provides a powerful, flexible system for creating and managing notification templates with multi-language support, rich HTML formatting using MJML, dynamic content injection, and A/B testing capabilities.

## Key Features

### 1. Multi-Language Support
- Built-in support for multiple languages (default: English and Indonesian)
- Easy to add new languages through locale configuration
- Automatic language selection based on user preferences
- Fallback to default language when translation not available

### 2. Rich HTML Templates with MJML
- MJML (Mailjet Markup Language) for responsive email templates
- Automatic conversion to optimized HTML
- Mobile-responsive by default
- Consistent rendering across email clients

### 3. Dynamic Content Injection
- Handlebars templating engine for variable substitution
- Advanced helpers for formatting (dates, numbers, currency)
- Conditional logic support
- Loop support for dynamic lists

### 4. A/B Testing Capability
- Multiple variants per template
- Weighted distribution of variants
- User-based or random distribution
- Metrics tracking for variant performance

### 5. Template Validation and Preview
- Real-time template validation
- Preview functionality with sample data
- Error reporting with specific field validation
- Type-safe variable definitions

## Architecture

### Components

1. **EnhancedTemplateService**: Core service for template management
2. **TemplateController**: REST API endpoints for template operations
3. **TemplateMigrationService**: Migration tool for existing templates
4. **Template Interfaces**: Type definitions for templates and variables

### Data Structure

```typescript
interface EnhancedNotificationTemplate {
  id: string;
  type: NotificationType;
  name: string;
  description?: string;
  subject: {
    [locale: string]: string;
  };
  body: {
    [locale: string]: string;
  };
  mjmlTemplate?: {
    [locale: string]: string;
  };
  variables: TemplateVariable[];
  metadata?: {
    version: number;
    author?: string;
    createdAt: Date;
    updatedAt: Date;
    tags?: string[];
  };
  abTesting?: ABTestingConfig;
  active: boolean;
}
```

## Usage Guide

### 1. Creating a New Template

```typescript
const newTemplate: EnhancedNotificationTemplate = {
  id: 'welcome-email-v1',
  type: NotificationType.GENERAL,
  name: 'Welcome Email',
  description: 'Sent to new users upon registration',
  subject: {
    en: 'Welcome to YPK Gloria, {{userName}}!',
    id: 'Selamat Datang di YPK Gloria, {{userName}}!',
  },
  body: {
    en: `Dear {{userName}},
    
Welcome to YPK Gloria Management System. We're excited to have you on board.

Your account has been successfully created with the following details:
- Email: {{userEmail}}
- Department: {{department}}
- Role: {{role}}

{{#if temporaryPassword}}
Your temporary password is: {{temporaryPassword}}
Please change it upon first login.
{{/if}}

Best regards,
YPK Gloria Team`,
    id: `Yth. {{userName}},
    
Selamat datang di Sistem Manajemen YPK Gloria. Kami senang Anda bergabung.

Akun Anda telah berhasil dibuat dengan detail berikut:
- Email: {{userEmail}}
- Departemen: {{department}}
- Peran: {{role}}

{{#if temporaryPassword}}
Password sementara Anda: {{temporaryPassword}}
Harap ubah saat login pertama kali.
{{/if}}

Hormat kami,
Tim YPK Gloria`,
  },
  mjmlTemplate: {
    en: `<mjml>
  <mj-head>
    <mj-title>Welcome to YPK Gloria</mj-title>
    <mj-preview>Welcome {{userName}}! Your account is ready.</mj-preview>
  </mj-head>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-image src="{{logoUrl}}" width="200px" align="center" />
        <mj-text font-size="24px" align="center">
          Welcome to YPK Gloria!
        </mj-text>
        <mj-text>
          <p>Dear {{userName}},</p>
          <p>Your account has been successfully created.</p>
        </mj-text>
        <mj-button href="{{loginUrl}}" background-color="#3498db">
          Login Now
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
    // Indonesian version...
  },
  variables: [
    {
      name: 'userName',
      type: 'string',
      required: true,
      description: 'Name of the user',
    },
    {
      name: 'userEmail',
      type: 'string',
      required: true,
      description: 'User email address',
      validation: {
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
      },
    },
    {
      name: 'department',
      type: 'string',
      required: true,
    },
    {
      name: 'role',
      type: 'string',
      required: true,
    },
    {
      name: 'temporaryPassword',
      type: 'string',
      required: false,
    },
    {
      name: 'loginUrl',
      type: 'string',
      required: true,
      defaultValue: 'https://app.ypkgloria.org/login',
    },
    {
      name: 'logoUrl',
      type: 'string',
      required: false,
      defaultValue: 'https://app.ypkgloria.org/logo.png',
    },
  ],
  metadata: {
    version: 1,
    author: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['onboarding', 'welcome'],
  },
  active: true,
};

// Create template via API
POST /api/v1/notification/templates
```

### 2. Rendering a Template

```typescript
// Render template with variables
const rendered = await templateService.renderTemplate('welcome-email-v1', {
  locale: 'en',
  variables: {
    userName: 'John Doe',
    userEmail: 'john.doe@example.com',
    department: 'Finance',
    role: 'Manager',
    temporaryPassword: 'Temp123!',
    loginUrl: 'https://app.ypkgloria.org/login',
  },
  format: 'html', // 'text', 'html', or 'mjml'
});

// Result:
{
  subject: 'Welcome to YPK Gloria, John Doe!',
  body: '...',
  html: '<!DOCTYPE html>...',
  locale: 'en',
  metadata: {
    renderTime: 45,
    templateId: 'welcome-email-v1',
    templateVersion: 1
  }
}
```

### 3. Using A/B Testing

```typescript
// Configure A/B testing for a template
const abTestingConfig: ABTestingConfig = {
  enabled: true,
  distribution: 'weighted',
  variants: [
    {
      id: 'control',
      name: 'Standard Welcome',
      weight: 70, // 70% of users
    },
    {
      id: 'variant-a',
      name: 'Personalized Welcome',
      weight: 30, // 30% of users
      subject: {
        en: '🎉 {{userName}}, Welcome to Your New YPK Gloria Account!',
        id: '🎉 {{userName}}, Selamat Datang di Akun YPK Gloria Baru Anda!',
      },
    },
  ],
};

// Render with A/B testing (user-based)
const rendered = await templateService.renderTemplate('welcome-email-v1', {
  locale: 'en',
  variables: { /* ... */ },
  format: 'html',
  userId: 'user-123', // For consistent variant selection
});
```

### 4. Previewing Templates

```typescript
// Preview template with sample data
POST /api/v1/notification/templates/welcome-email-v1/preview
{
  "locale": "en",
  "format": "html",
  "sampleData": {
    "userName": "Sample User",
    "userEmail": "sample@example.com",
    "department": "Sample Department",
    "role": "Sample Role"
  }
}

// Preview will auto-generate sample data if not provided
POST /api/v1/notification/templates/welcome-email-v1/preview
{
  "locale": "id",
  "format": "mjml"
}
```

### 5. Using Handlebars Helpers

The template engine includes several built-in helpers:

```handlebars
{{!-- Date formatting --}}
{{formatDate submittedDate "long" locale}}
{{!-- Output: January 15, 2024 --}}

{{!-- Number formatting --}}
{{formatNumber 1234567 locale}}
{{!-- Output: 1,234,567 --}}

{{!-- Currency formatting --}}
{{formatCurrency 1500000 "IDR" locale}}
{{!-- Output: Rp 1.500.000 --}}

{{!-- Pluralization --}}
You have {{itemCount}} {{plural itemCount "item" "items"}}
{{!-- Output: You have 5 items --}}

{{!-- Complex conditionals --}}
{{#when priority "===" "HIGH"}}
  <span style="color: red;">URGENT</span>
{{else}}
  {{#when priority "===" "MEDIUM"}}
    <span style="color: orange;">Normal</span>
  {{else}}
    <span style="color: green;">Low Priority</span>
  {{/when}}
{{/when}}

{{!-- Translation helper --}}
{{t "notification.approval.request.greeting" locale}}

{{!-- Safe HTML --}}
{{safeHtml richTextContent}}
```

## API Reference

### Endpoints

1. **GET /api/v1/notification/templates**
   - Get all notification templates
   - Requires: `notification:template:read` permission

2. **GET /api/v1/notification/templates/locales**
   - Get supported locales
   - Requires: `notification:template:read` permission

3. **GET /api/v1/notification/templates/:id**
   - Get specific template by ID
   - Requires: `notification:template:read` permission

4. **POST /api/v1/notification/templates**
   - Create new template
   - Requires: `notification:template:create` permission

5. **PUT /api/v1/notification/templates/:id**
   - Update existing template
   - Requires: `notification:template:update` permission

6. **POST /api/v1/notification/templates/:id/preview**
   - Preview template with sample data
   - Requires: `notification:template:read` permission

7. **POST /api/v1/notification/templates/:id/render**
   - Render template with actual data
   - Requires: `notification:send` permission

## Migration Guide

### Migrating from Old Template System

1. **Run the migration script**:
   ```bash
   npm run notification:migrate-templates
   ```

2. **Update notification service calls**:
   ```typescript
   // Old way
   const rendered = templateService.renderTemplate(
     NotificationType.APPROVAL_REQUEST,
     variables
   );

   // New way
   const rendered = await enhancedTemplateService.renderTemplate(
     'approval-request-v2',
     {
       locale: user.preferredLocale || 'en',
       variables,
       format: 'html',
       userId: user.id, // For A/B testing
     }
   );
   ```

3. **Update email service**:
   ```typescript
   // Use the enhanced HTML output
   await emailService.send({
     to: recipient.email,
     subject: rendered.subject,
     html: rendered.html, // Rich HTML from MJML
     text: rendered.body, // Plain text fallback
   });
   ```

## Best Practices

### 1. Template Design
- Keep templates focused and single-purpose
- Use meaningful variable names
- Provide clear descriptions for all variables
- Always include plain text versions for accessibility

### 2. Localization
- Use the i18n helper for static text
- Keep translations concise and culturally appropriate
- Test templates in all supported languages
- Provide fallbacks for missing translations

### 3. A/B Testing
- Start with small variant weights (10-20%)
- Test one variable at a time (subject OR content)
- Track relevant metrics (open rate, click rate)
- Run tests for statistically significant periods

### 4. Performance
- Cache rendered templates when possible
- Use batch rendering for bulk notifications
- Monitor template rendering times
- Optimize MJML templates for size

### 5. Security
- Always sanitize user input in templates
- Don't expose sensitive data in templates
- Use HTTPS URLs for all links and images
- Validate all template variables

## Configuration

### Environment Variables

```bash
# Notification localization
NOTIFICATION_DEFAULT_LOCALE=en
NOTIFICATION_SUPPORTED_LOCALES=en,id

# Template caching
TEMPLATE_CACHE_ENABLED=true
TEMPLATE_CACHE_TTL=3600

# A/B testing
TEMPLATE_AB_TESTING_ENABLED=true

# MJML settings
MJML_VALIDATION_LEVEL=soft
```

### Adding New Languages

1. Add locale to `NOTIFICATION_SUPPORTED_LOCALES`
2. Create locale file in `/locales/[locale].json`
3. Add translations to all templates
4. Update supported locales in configuration

## Troubleshooting

### Common Issues

1. **Template not found**
   - Verify template ID exists
   - Check if template is active
   - Ensure proper permissions

2. **Variable validation errors**
   - Check variable types match definitions
   - Ensure required variables are provided
   - Validate against regex patterns if defined

3. **MJML compilation errors**
   - Validate MJML syntax
   - Check for unclosed tags
   - Ensure valid MJML components used

4. **Localization issues**
   - Verify locale is supported
   - Check translation files exist
   - Ensure locale format is correct (e.g., 'en', 'id')

### Debug Mode

Enable debug logging for detailed information:

```typescript
// In development
process.env.NOTIFICATION_DEBUG = 'true';
```

## Future Enhancements

1. **Template Marketplace**: Share templates across organizations
2. **Visual Template Editor**: Drag-and-drop MJML builder
3. **Advanced Analytics**: Detailed A/B test reporting
4. **Webhook Templates**: Support for webhook notifications
5. **Template Versioning**: Full version history and rollback
6. **Dynamic Segments**: User segmentation for targeted notifications
7. **Schedule Templates**: Time-based template selection
8. **Template Inheritance**: Base templates with extensions