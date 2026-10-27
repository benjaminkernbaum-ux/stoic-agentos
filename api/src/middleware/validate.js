/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Input Validation Schemas (Zod-style)
 * ═══════════════════════════════════════════════════════
 *  Zero-dependency validation for API request bodies.
 *  Validates shape, types, and constraints before
 *  reaching route handlers.
 *
 *  Usage:
 *    router.post('/traces', validate(traceCreateSchema), handler)
 */

// ── Validation Helpers ──────────────────────────────

function isString(v) { return typeof v === 'string'; }
function isNumber(v) { return typeof v === 'number' && !isNaN(v); }
function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function isArray(v)  { return Array.isArray(v); }
function isUUID(v)   { return isString(v) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v); }
function isOneOf(v, opts) { return opts.includes(v); }

function validateField(value, rules, fieldName) {
  const errors = [];

  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} is required`);
    return errors;
  }

  if (value === undefined || value === null) return errors;

  if (rules.type === 'string' && !isString(value))   errors.push(`${fieldName} must be a string`);
  if (rules.type === 'number' && !isNumber(value))    errors.push(`${fieldName} must be a number`);
  if (rules.type === 'object' && !isObject(value))    errors.push(`${fieldName} must be an object`);
  if (rules.type === 'array'  && !isArray(value))     errors.push(`${fieldName} must be an array`);
  if (rules.type === 'uuid'   && !isUUID(value))      errors.push(`${fieldName} must be a valid UUID`);

  if (rules.maxLength && isString(value) && value.length > rules.maxLength)
    errors.push(`${fieldName} must be at most ${rules.maxLength} characters`);
  if (rules.minLength && isString(value) && value.length < rules.minLength)
    errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
  if (rules.min !== undefined && isNumber(value) && value < rules.min)
    errors.push(`${fieldName} must be >= ${rules.min}`);
  if (rules.max !== undefined && isNumber(value) && value > rules.max)
    errors.push(`${fieldName} must be <= ${rules.max}`);
  if (rules.oneOf && !isOneOf(value, rules.oneOf))
    errors.push(`${fieldName} must be one of: ${rules.oneOf.join(', ')}`);
  if (rules.maxItems && isArray(value) && value.length > rules.maxItems)
    errors.push(`${fieldName} must have at most ${rules.maxItems} items`);

  return errors;
}

function validateSchema(data, schema) {
  const errors = [];
  for (const [field, rules] of Object.entries(schema)) {
    const fieldErrors = validateField(data?.[field], rules, field);
    errors.push(...fieldErrors);
  }
  return errors;
}

// ── Express Middleware Factory ───────────────────────

/**
 * Creates validation middleware for a given schema.
 * @param {Object} schema - Field rules object
 * @param {'body'|'query'|'params'} source - Where to validate (default: 'body')
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const errors = validateSchema(data, schema);

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    next();
  };
}

// ══════════════════════════════════════════════════════
//  SCHEMAS — One per endpoint
// ══════════════════════════════════════════════════════

/** POST /api/v1/traces */
export const traceCreateSchema = {
  name:     { type: 'string', required: true, minLength: 1, maxLength: 255 },
  agent:    { type: 'string', required: false, maxLength: 100 },
  trace_id: { type: 'string', required: false, maxLength: 100 },
  metadata: { type: 'object', required: false },
};

/** PATCH /api/v1/traces/:id */
export const traceUpdateSchema = {
  status:      { type: 'string', required: false, oneOf: ['running', 'success', 'error'] },
  duration_ms: { type: 'number', required: false, min: 0 },
  metadata:    { type: 'object', required: false },
};

/** POST /api/v1/traces/:id/spans */
export const spanCreateSchema = {
  provider:          { type: 'string', required: true, maxLength: 50 },
  model:             { type: 'string', required: true, maxLength: 100 },
  type:              { type: 'string', required: false, maxLength: 50 },
  prompt_tokens:     { type: 'number', required: false, min: 0, max: 10_000_000 },
  completion_tokens: { type: 'number', required: false, min: 0, max: 10_000_000 },
  latency_ms:        { type: 'number', required: false, min: 0 },
  status:            { type: 'string', required: false, oneOf: ['success', 'error'] },
  error_message:     { type: 'string', required: false, maxLength: 2000 },
  metadata:          { type: 'object', required: false },
};

/** POST /api/v1/traces/ingest (batch) */
export const traceIngestSchema = {
  trace: { type: 'object', required: true },
  spans: { type: 'array',  required: false, maxItems: 500 },
};

/** POST /api/v1/observations */
export const observationCreateSchema = {
  type:        { type: 'string', required: true, oneOf: ['file_edit', 'command', 'decision', 'error', 'discovery', 'architecture', 'dependency', 'config', 'deployment', 'note'] },
  content:     { type: 'string', required: true, minLength: 1, maxLength: 10000 },
  workspace:   { type: 'string', required: false, maxLength: 100 },
  agent:       { type: 'string', required: false, maxLength: 100 },
  session_id:  { type: 'string', required: false, maxLength: 100 },
  metadata:    { type: 'object', required: false },
  tags:        { type: 'array',  required: false, maxItems: 5 },
};

/** POST /api/v1/observations/batch */
export const observationBatchSchema = {
  observations: { type: 'array', required: true, maxItems: 100 },
};

/** POST /api/v1/agents */
export const agentCreateSchema = {
  name:        { type: 'string', required: true, minLength: 1, maxLength: 100 },
  type:        { type: 'string', required: false, maxLength: 50 },
  description: { type: 'string', required: false, maxLength: 500 },
  config:      { type: 'object', required: false },
};

/** POST /api/v1/alert-rules */
export const alertRuleSchema = {
  name:        { type: 'string', required: true, minLength: 1, maxLength: 100 },
  type:        { type: 'string', required: true, oneOf: ['error_rate', 'usage_limit', 'agent_down', 'cost_threshold'] },
  config:      { type: 'object', required: false },
  channel:     { type: 'string', required: false, oneOf: ['email', 'webhook'] },
  destination: { type: 'string', required: false, maxLength: 500 },
};

/** POST /api/v1/evaluations */
export const evaluationCreateSchema = {
  trace_id:      { type: 'string', required: false, maxLength: 100 },
  name:          { type: 'string', required: true, minLength: 1, maxLength: 100 },
  score:         { type: 'number', required: false, min: 0, max: 1 },
  value:         { type: 'string', required: false, maxLength: 255 },
  comment:       { type: 'string', required: false, maxLength: 5000 },
  source:        { type: 'string', required: false, oneOf: ['manual', 'llm', 'api', 'sdk'] },
  model:         { type: 'string', required: false, maxLength: 100 },
  observation_id:{ type: 'string', required: false, maxLength: 100 },
  metadata:      { type: 'object', required: false },
};

export default {
  validate,
  traceCreateSchema,
  traceUpdateSchema,
  spanCreateSchema,
  traceIngestSchema,
  observationCreateSchema,
  observationBatchSchema,
  agentCreateSchema,
  alertRuleSchema,
  evaluationCreateSchema,
};
