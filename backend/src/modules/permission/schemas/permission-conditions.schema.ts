export const permissionConditionsSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  title: 'Permission Conditions Schema',
  description: 'Schema for permission conditions that define additional constraints',
  properties: {
    field: {
      type: 'string',
      description: 'The field to check',
      minLength: 1,
      maxLength: 100,
      pattern: '^[a-zA-Z][a-zA-Z0-9_]*$',
    },
    operator: {
      type: 'string',
      description: 'Comparison operator',
      enum: ['=', '!=', '>', '<', '>=', '<=', 'in', 'not_in', 'contains', 'starts_with', 'ends_with'],
    },
    value: {
      oneOf: [
        { type: 'string' },
        { type: 'number' },
        { type: 'boolean' },
        { type: 'array', items: { type: ['string', 'number'] } },
      ],
      description: 'The value to compare against',
    },
    logical_operator: {
      type: 'string',
      enum: ['AND', 'OR'],
      description: 'Logical operator for combining multiple conditions',
    },
    conditions: {
      type: 'array',
      description: 'Nested conditions for complex logic',
      items: { $ref: '#' },
    },
  },
  required: ['field', 'operator', 'value'],
  additionalProperties: false,
};

export const policyRulesSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  title: 'Permission Policy Rules Schema',
  description: 'Schema for complex permission policy rules',
  properties: {
    type: {
      type: 'string',
      description: 'Type of policy rule',
      enum: ['time_based', 'location_based', 'attribute_based', 'contextual', 'hierarchical'],
    },
    time_based: {
      type: 'object',
      properties: {
        days_of_week: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          },
          uniqueItems: true,
        },
        time_ranges: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start: {
                type: 'string',
                pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
                description: 'Start time in HH:MM format',
              },
              end: {
                type: 'string',
                pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
                description: 'End time in HH:MM format',
              },
            },
            required: ['start', 'end'],
            additionalProperties: false,
          },
        },
        timezone: {
          type: 'string',
          description: 'IANA timezone identifier',
          pattern: '^[A-Za-z]+/[A-Za-z_]+$',
        },
      },
      required: ['time_ranges'],
      additionalProperties: false,
    },
    location_based: {
      type: 'object',
      properties: {
        allowed_ips: {
          type: 'array',
          items: {
            type: 'string',
            oneOf: [
              { pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$' }, // IPv4
              { pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$' }, // IPv4 CIDR
              { pattern: '^(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}$' }, // IPv6
            ],
          },
        },
        denied_ips: {
          type: 'array',
          items: {
            type: 'string',
            oneOf: [
              { pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$' }, // IPv4
              { pattern: '^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$' }, // IPv4 CIDR
              { pattern: '^(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}$' }, // IPv6
            ],
          },
        },
        countries: {
          type: 'array',
          items: {
            type: 'string',
            pattern: '^[A-Z]{2}$', // ISO 3166-1 alpha-2
          },
        },
      },
      additionalProperties: false,
    },
    attribute_based: {
      type: 'object',
      properties: {
        user_attributes: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              operator: {
                type: 'string',
                enum: ['=', '!=', '>', '<', '>=', '<=', 'in', 'not_in', 'contains'],
              },
              value: {
                oneOf: [
                  { type: 'string' },
                  { type: 'number' },
                  { type: 'boolean' },
                  { type: 'array', items: { type: ['string', 'number'] } },
                ],
              },
            },
            required: ['operator', 'value'],
            additionalProperties: false,
          },
        },
        resource_attributes: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              operator: {
                type: 'string',
                enum: ['=', '!=', '>', '<', '>=', '<=', 'in', 'not_in', 'contains'],
              },
              value: {
                oneOf: [
                  { type: 'string' },
                  { type: 'number' },
                  { type: 'boolean' },
                  { type: 'array', items: { type: ['string', 'number'] } },
                ],
              },
            },
            required: ['operator', 'value'],
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
    contextual: {
      type: 'object',
      properties: {
        conditions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              context_key: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
              },
              operator: {
                type: 'string',
                enum: ['=', '!=', '>', '<', '>=', '<=', 'in', 'not_in', 'contains'],
              },
              value: {
                oneOf: [
                  { type: 'string' },
                  { type: 'number' },
                  { type: 'boolean' },
                  { type: 'array', items: { type: ['string', 'number'] } },
                ],
              },
            },
            required: ['context_key', 'operator', 'value'],
            additionalProperties: false,
          },
        },
      },
      required: ['conditions'],
      additionalProperties: false,
    },
    hierarchical: {
      type: 'object',
      properties: {
        min_level: {
          type: 'integer',
          minimum: 0,
        },
        max_level: {
          type: 'integer',
          minimum: 0,
        },
        require_same_department: {
          type: 'boolean',
        },
        require_same_school: {
          type: 'boolean',
        },
      },
      additionalProperties: false,
    },
    combination_logic: {
      type: 'string',
      enum: ['AND', 'OR'],
      description: 'Logic for combining multiple rule types',
    },
  },
  required: ['type'],
  additionalProperties: false,
};

export const approvalConditionsSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  title: 'Approval Matrix Conditions Schema',
  description: 'Schema for approval matrix conditions',
  properties: {
    days: {
      type: 'object',
      properties: {
        operator: {
          type: 'string',
          enum: ['=', '!=', '>', '<', '>=', '<='],
        },
        value: {
          type: 'integer',
          minimum: 0,
        },
      },
      required: ['operator', 'value'],
      additionalProperties: false,
    },
    amount: {
      type: 'object',
      properties: {
        operator: {
          type: 'string',
          enum: ['=', '!=', '>', '<', '>=', '<='],
        },
        value: {
          type: 'number',
          minimum: 0,
        },
        currency: {
          type: 'string',
          pattern: '^[A-Z]{3}$', // ISO 4217
        },
      },
      required: ['operator', 'value'],
      additionalProperties: false,
    },
    priority: {
      type: 'object',
      properties: {
        operator: {
          type: 'string',
          enum: ['=', '!=', 'in', 'not_in'],
        },
        value: {
          oneOf: [
            {
              type: 'string',
              enum: ['low', 'normal', 'high', 'urgent'],
            },
            {
              type: 'array',
              items: {
                type: 'string',
                enum: ['low', 'normal', 'high', 'urgent'],
              },
            },
          ],
        },
      },
      required: ['operator', 'value'],
      additionalProperties: false,
    },
    custom_fields: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          operator: {
            type: 'string',
            enum: ['=', '!=', '>', '<', '>=', '<=', 'in', 'not_in', 'contains'],
          },
          value: {
            oneOf: [
              { type: 'string' },
              { type: 'number' },
              { type: 'boolean' },
              { type: 'array', items: { type: ['string', 'number'] } },
            ],
          },
        },
        required: ['operator', 'value'],
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};