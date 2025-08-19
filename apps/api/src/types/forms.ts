// Shared form schema types for dynamic package forms
// Keep in sync with packages/shared/src/forms.ts if modified

export type BaseField<T extends string, V = unknown> = {
  id: string;
  type: T;
  label: string;
  required?: boolean;
  helpText?: string;
  defaultValue?: V;
};

export type TextField = BaseField<'text', string> & {
  placeholder?: string;
  maxLength?: number;
  pattern?: string;
};

export type TextareaField = BaseField<'textarea', string> & {
  rows?: number;
  maxLength?: number;
};

export type NumberField = BaseField<'number', number> & {
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

export type SelectField = BaseField<'select', string> & {
  options: Array<{ value: string; label: string }>;
};

export type CheckboxField = BaseField<'checkbox', boolean>;

export type DateField = BaseField<'date', string> & {
  minDate?: string; // ISO date
  maxDate?: string; // ISO date
};

export type PhoneField = BaseField<'phone', string>;
export type EmailField = BaseField<'email', string>;

// Specialized controls used by requirements enforcement
export type PhotoCountField = BaseField<'photo-count', number> & {
  min?: number;
  max?: number;
};

export type SignatureToggleField = BaseField<'signature-toggle', boolean>;

export type Field =
  | TextField
  | TextareaField
  | NumberField
  | SelectField
  | CheckboxField
  | DateField
  | PhoneField
  | EmailField
  | PhotoCountField
  | SignatureToggleField;

export interface FormSchemaV1 {
  version: 1;
  fields: Field[];
}

export type FormSchema = FormSchemaV1;
