/**
 * Type declarations for the validate.js module
 */
import type { Request, Response, NextFunction } from 'express';

export interface ValidationRules {
  type?: 'string' | 'number' | 'object' | 'array' | 'uuid';
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  oneOf?: string[];
  maxItems?: number;
}

export type ValidationSchema = Record<string, ValidationRules>;

export function validate(
  schema: ValidationSchema,
  source?: 'body' | 'query' | 'params'
): (req: Request, res: Response, next: NextFunction) => void;

export const traceCreateSchema: ValidationSchema;
export const traceUpdateSchema: ValidationSchema;
export const spanCreateSchema: ValidationSchema;
export const traceIngestSchema: ValidationSchema;
export const observationCreateSchema: ValidationSchema;
export const observationBatchSchema: ValidationSchema;
export const agentCreateSchema: ValidationSchema;
export const alertRuleSchema: ValidationSchema;
export const evaluationCreateSchema: ValidationSchema;

declare const _default: {
  validate: typeof validate;
  traceCreateSchema: ValidationSchema;
  traceUpdateSchema: ValidationSchema;
  spanCreateSchema: ValidationSchema;
  traceIngestSchema: ValidationSchema;
  observationCreateSchema: ValidationSchema;
  observationBatchSchema: ValidationSchema;
  agentCreateSchema: ValidationSchema;
  alertRuleSchema: ValidationSchema;
  evaluationCreateSchema: ValidationSchema;
};

export default _default;
