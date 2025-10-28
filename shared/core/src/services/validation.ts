export interface ValidationOptions {
  schema: any;
  strict?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface ValidationService {
  validate(data: any, options: ValidationOptions): ValidationResult;
  validateSchema(schema: any): boolean;
}













































