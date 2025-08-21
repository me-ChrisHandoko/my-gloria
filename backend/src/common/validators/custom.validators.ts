import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// UUID Validator
export function IsUUID(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUUID',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          return typeof value === 'string' && uuidRegex.test(value);
        },
        defaultMessage() {
          return '$property must be a valid UUID';
        },
      },
    });
  };
}

// Date Range Validator
@ValidatorConstraint({ name: 'dateRange', async: false })
export class DateRangeValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const [startDateProperty] = args.constraints;
    const startDate = (args.object as any)[startDateProperty];

    if (!startDate || !value) return true;

    return new Date(value) > new Date(startDate);
  }

  defaultMessage(args: ValidationArguments) {
    const [startDateProperty] = args.constraints;
    return `$property must be after ${startDateProperty}`;
  }
}

export function IsAfter(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: DateRangeValidator,
    });
  };
}

// Email Domain Validator
export function IsEmailFromDomain(
  domain: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isEmailFromDomain',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [domain],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [expectedDomain] = args.constraints;
          if (typeof value !== 'string') return false;

          const emailParts = value.split('@');
          if (emailParts.length !== 2) return false;

          return emailParts[1] === expectedDomain;
        },
        defaultMessage(args: ValidationArguments) {
          const [expectedDomain] = args.constraints;
          return `$property must be from domain ${expectedDomain}`;
        },
      },
    });
  };
}

// Phone Number Validator (Indonesian format)
export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;

          // Indonesian phone number format
          const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
          return phoneRegex.test(value.replace(/[\s-]/g, ''));
        },
        defaultMessage() {
          return '$property must be a valid phone number';
        },
      },
    });
  };
}

// Code Format Validator (alphanumeric with optional dash/underscore)
export function IsCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCode',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;

          const codeRegex = /^[A-Z0-9][A-Z0-9_-]*$/;
          return codeRegex.test(value);
        },
        defaultMessage() {
          return '$property must be uppercase alphanumeric with optional dash or underscore';
        },
      },
    });
  };
}
