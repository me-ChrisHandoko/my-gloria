import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SanitizationService {
  private readonly logger = new Logger(SanitizationService.name);

  /**
   * Sanitize HTML content to prevent injection attacks
   * Removes dangerous tags and attributes while preserving safe formatting
   */
  sanitizeHtml(html: string): string {
    if (!html) return '';

    // Remove script tags and their content
    let sanitized = html.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      '',
    );

    // Remove iframe tags
    sanitized = sanitized.replace(
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      '',
    );

    // Remove style tags and their content
    sanitized = sanitized.replace(
      /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
      '',
    );

    // Remove link tags
    sanitized = sanitized.replace(/<link\b[^>]*>/gi, '');

    // Remove meta tags
    sanitized = sanitized.replace(/<meta\b[^>]*>/gi, '');

    // Remove all on* event attributes (onclick, onload, etc.)
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, '');

    // Remove data: protocol (can be used for XSS)
    sanitized = sanitized.replace(/data:text\/html[^,]*,/gi, '');

    // Remove vbscript: protocol
    sanitized = sanitized.replace(/vbscript:/gi, '');

    // Remove form tags to prevent form injection
    sanitized = sanitized.replace(
      /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
      '',
    );

    // Remove input, button, select, textarea tags
    sanitized = sanitized.replace(
      /<(input|button|select|textarea)\b[^>]*>/gi,
      '',
    );

    // Allow only safe tags with limited attributes
    const allowedTags = [
      'p',
      'br',
      'b',
      'i',
      'u',
      'strong',
      'em',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'a',
      'div',
      'span',
    ];
    const allowedAttributes = ['href', 'class', 'id', 'style'];

    // Build regex to match allowed tags
    const tagRegex = new RegExp(
      `<(?!\\/?(${allowedTags.join('|')})\\b)[^>]+>`,
      'gi',
    );
    sanitized = sanitized.replace(tagRegex, '');

    // Sanitize href attributes to prevent javascript: and data: URLs
    sanitized = sanitized.replace(
      /href\s*=\s*["'](?:javascript:|data:|vbscript:)[^"']*["']/gi,
      'href="#"',
    );

    // Also handle href without protocol prefix that might be javascript
    sanitized = sanitized.replace(
      /href\s*=\s*["'](?!(?:https?:|mailto:|#|\/))([^"']*)["']/gi,
      'href="#"',
    );

    // Encode special characters that could be used for XSS
    sanitized = this.escapeSpecialChars(sanitized);

    return sanitized;
  }

  /**
   * Sanitize plain text content
   */
  sanitizeText(text: string): string {
    if (!text) return '';

    // Remove any HTML tags
    let sanitized = text.replace(/<[^>]*>/g, '');

    // Escape special characters
    sanitized = this.escapeSpecialChars(sanitized);

    // Remove zero-width characters that could be used maliciously
    sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }

  /**
   * Sanitize email addresses
   */
  sanitizeEmail(email: string): string {
    if (!email) return '';

    // Basic email validation and sanitization
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    const trimmed = email.trim().toLowerCase();

    if (!emailRegex.test(trimmed)) {
      this.logger.warn(
        `Invalid email format detected: ${email.substring(0, 20)}...`,
      );
      return '';
    }

    return trimmed;
  }

  /**
   * Sanitize JSON data to prevent injection
   */
  sanitizeJson(data: any): any {
    if (data === null) return null;
    if (data === undefined) return undefined;

    if (typeof data === 'string') {
      return this.sanitizeText(data);
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeJson(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Sanitize the key
        const sanitizedKey = this.sanitizeText(key);
        // Recursively sanitize the value
        sanitized[sanitizedKey] = this.sanitizeJson(value);
      }
      return sanitized;
    }

    // For numbers, booleans, etc., return as is
    return data;
  }

  /**
   * Sanitize notification content
   */
  sanitizeNotificationContent(content: {
    title: string;
    message: string;
    data?: Record<string, any>;
  }): {
    title: string;
    message: string;
    data?: Record<string, any>;
  } {
    return {
      title: this.sanitizeText(content.title),
      message: this.sanitizeText(content.message),
      data: content.data ? this.sanitizeJson(content.data) : undefined,
    };
  }

  /**
   * Sanitize HTML for email templates
   */
  sanitizeEmailHtml(html: string): string {
    if (!html) return '';

    // First apply general HTML sanitization
    let sanitized = this.sanitizeHtml(html);

    // Additional email-specific sanitization
    // Remove external stylesheets (email clients often block them)
    sanitized = sanitized.replace(/<link[^>]*>/gi, '');

    // Remove base tags
    sanitized = sanitized.replace(/<base\b[^>]*>/gi, '');

    // Ensure all URLs are absolute and safe
    sanitized = sanitized.replace(
      /(?:href|src)\s*=\s*["'](?!(?:https?:)?\/\/)[^"']*["']/gi,
      (match) => {
        // Convert relative URLs to # to prevent issues
        return match.replace(/=\s*["'][^"']*["']/, '="#"');
      },
    );

    return sanitized;
  }

  /**
   * Validate and sanitize URL
   */
  sanitizeUrl(url: string): string {
    if (!url) return '';

    // Only allow http(s) protocols
    const urlRegex = /^https?:\/\/.+/i;

    const trimmed = url.trim();

    if (!urlRegex.test(trimmed)) {
      this.logger.warn(
        `Invalid URL format detected: ${url.substring(0, 50)}...`,
      );
      return '';
    }

    // Prevent javascript: and data: protocols
    if (trimmed.match(/^(javascript|data|vbscript):/i)) {
      this.logger.warn(
        `Dangerous protocol detected in URL: ${url.substring(0, 50)}...`,
      );
      return '';
    }

    return trimmed;
  }

  /**
   * Escape special HTML characters
   */
  private escapeSpecialChars(text: string): string {
    // First check if this is meant to be HTML with safe tags
    // If it contains allowed tags, don't escape them
    const allowedTags = [
      'p',
      'br',
      'b',
      'i',
      'u',
      'strong',
      'em',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'a',
      'div',
      'span',
    ];
    const hasAllowedTags = allowedTags.some(
      (tag) =>
        text.includes(`<${tag}>`) ||
        text.includes(`<${tag} `) ||
        text.includes(`</${tag}>`),
    );

    if (!hasAllowedTags) {
      // No allowed tags, escape everything
      const escapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
      };

      return text.replace(/[&<>"'\/]/g, (char) => escapeMap[char]);
    }

    // Has allowed tags, don't escape them
    return text;
  }

  /**
   * Validate input length to prevent overflow attacks
   */
  validateLength(input: string, maxLength: number): boolean {
    if (!input) return true;

    if (input.length > maxLength) {
      this.logger.warn(
        `Input length ${input.length} exceeds maximum ${maxLength}`,
      );
      return false;
    }

    return true;
  }

  /**
   * Truncate text safely
   */
  truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;

    // Truncate and add ellipsis
    const truncated = text.substring(0, maxLength - 3) + '...';

    // Ensure we don't break HTML entities
    return truncated.replace(/&[^;]{0,6}\.\.\.$/, '...');
  }
}
