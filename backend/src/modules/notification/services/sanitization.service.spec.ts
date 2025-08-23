import { Test, TestingModule } from '@nestjs/testing';
import { SanitizationService } from './sanitization.service';

describe('SanitizationService', () => {
  let service: SanitizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SanitizationService],
    }).compile();

    service = module.get<SanitizationService>(SanitizationService);
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script><p>World</p>';
      const result = service.sanitizeHtml(input);
      
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="malicious.com"></iframe><p>Content</p>';
      const result = service.sanitizeHtml(input);
      
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('malicious.com');
      expect(result).toContain('Content');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(\'XSS\')">Click me</div>';
      const result = service.sanitizeHtml(input);
      
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('alert');
      expect(result).toContain('Click me');
    });

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Link</a>';
      const result = service.sanitizeHtml(input);
      
      expect(result).not.toContain('javascript:');
      expect(result).toContain('href="#"');
    });

    it('should allow safe tags', () => {
      const input = '<p><b>Bold</b> and <i>italic</i> text</p>';
      const result = service.sanitizeHtml(input);
      
      expect(result).toContain('<p>');
      expect(result).toContain('<b>');
      expect(result).toContain('<i>');
    });
  });

  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const input = '<p>Hello <b>World</b></p>';
      const result = service.sanitizeText(input);
      
      expect(result).toBe('Hello World');
    });

    it('should escape special characters', () => {
      const input = 'Hello & <script>';
      const result = service.sanitizeText(input);
      
      expect(result).toContain('&amp;');
      expect(result).not.toContain('<script>');
    });

    it('should normalize whitespace', () => {
      const input = 'Hello   \n\n  World  ';
      const result = service.sanitizeText(input);
      
      expect(result).toBe('Hello World');
    });

    it('should remove zero-width characters', () => {
      const input = 'Hello\u200BWorld';
      const result = service.sanitizeText(input);
      
      expect(result).toBe('HelloWorld');
    });
  });

  describe('sanitizeEmail', () => {
    it('should validate and normalize valid emails', () => {
      const input = 'USER@EXAMPLE.COM';
      const result = service.sanitizeEmail(input);
      
      expect(result).toBe('user@example.com');
    });

    it('should reject invalid emails', () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user@.com',
        'user@example',
      ];

      invalidEmails.forEach((email) => {
        const result = service.sanitizeEmail(email);
        expect(result).toBe('');
      });
    });

    it('should trim whitespace', () => {
      const input = '  user@example.com  ';
      const result = service.sanitizeEmail(input);
      
      expect(result).toBe('user@example.com');
    });
  });

  describe('sanitizeJson', () => {
    it('should sanitize string values', () => {
      const input = {
        message: '<script>alert("XSS")</script>',
      };
      const result = service.sanitizeJson(input);
      
      expect(result.message).not.toContain('<script>');
    });

    it('should sanitize nested objects', () => {
      const input = {
        user: {
          name: '<b>John</b>',
          bio: '<script>alert("XSS")</script>',
        },
      };
      const result = service.sanitizeJson(input);
      
      expect(result.user.name).not.toContain('<b>');
      expect(result.user.bio).not.toContain('<script>');
    });

    it('should sanitize arrays', () => {
      const input = {
        tags: ['<script>tag1</script>', 'tag2'],
      };
      const result = service.sanitizeJson(input);
      
      expect(result.tags[0]).not.toContain('<script>');
      expect(result.tags[1]).toBe('tag2');
    });

    it('should preserve non-string values', () => {
      const input = {
        count: 42,
        active: true,
        data: null,
      };
      const result = service.sanitizeJson(input);
      
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
      expect(result.data).toBe(null);
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow valid HTTP/HTTPS URLs', () => {
      const validUrls = [
        'http://example.com',
        'https://example.com/path',
        'https://sub.example.com:8080/path?query=value',
      ];

      validUrls.forEach((url) => {
        const result = service.sanitizeUrl(url);
        expect(result).toBe(url);
      });
    });

    it('should reject dangerous protocols', () => {
      const dangerousUrls = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'vbscript:msgbox("XSS")',
      ];

      dangerousUrls.forEach((url) => {
        const result = service.sanitizeUrl(url);
        expect(result).toBe('');
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        '//example.com',
        'example.com',
      ];

      invalidUrls.forEach((url) => {
        const result = service.sanitizeUrl(url);
        expect(result).toBe('');
      });
    });
  });

  describe('validateLength', () => {
    it('should accept valid lengths', () => {
      const result = service.validateLength('Hello', 10);
      expect(result).toBe(true);
    });

    it('should reject overly long input', () => {
      const result = service.validateLength('Hello World', 5);
      expect(result).toBe(false);
    });

    it('should handle empty input', () => {
      const result = service.validateLength('', 10);
      expect(result).toBe(true);
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const input = 'This is a very long text that needs truncation';
      const result = service.truncateText(input, 20);
      
      expect(result).toBe('This is a very lo...');
      expect(result.length).toBeLessThanOrEqual(20);
    });

    it('should not truncate short text', () => {
      const input = 'Short text';
      const result = service.truncateText(input, 20);
      
      expect(result).toBe('Short text');
    });

    it('should handle HTML entities correctly', () => {
      const input = 'Text with &amp; entity that is long';
      const result = service.truncateText(input, 15);
      
      expect(result).not.toContain('&amp...');
    });
  });
});