import type React from "react";
import type { JSX } from "react";
import type { z, ZodError, ZodObject } from "zod";

export type OzefInputSchema = {
  [k: string]: z.ZodTypeAny;
};

export type ParsedData<T extends OzefInputSchema> = {
  [key in keyof T]: z.infer<T[key]>;
};

export type RawFormData = Record<string, unknown>;

export type FormErrors<T extends OzefInputSchema> = Partial<
  {
    [key in keyof T]: ZodError | string;
  } & { submission: string }
>;

export interface OzefFieldController<Value = unknown> {
  name: string;
  value: Value | undefined;
  error?: string;
  invalid: boolean;
  hasError: boolean;
  touched: boolean;
  required: boolean;
  setValue: (value: Value) => void;
  touch: () => void;
}

export interface InputMetaProps {
  errorful?: boolean;
  invalid?: boolean;
  hasError?: boolean;
  error?: string;
  errorClassName?: string;
  radioValue?: string;
  field?: OzefFieldController;
  inputProps?: any;
}

export type OzefInputProps = InputMetaProps;

export interface FormUtils<FD> {
  reset: () => void;
  setError: (key: keyof FD | "submission", error: string) => void;
}

export type FormProps<FD> = Omit<JSX.IntrinsicElements["form"], "onSubmit"> & {
  onSubmit?: (data: FD, utils: FormUtils<FD>) => Promise<void> | void;
};

export type FormInputProps = JSX.IntrinsicElements["input"] & InputMetaProps;

export type FormSelectProps = JSX.IntrinsicElements["select"] &
  InputMetaProps;

export type FormOptionProps = JSX.IntrinsicElements["option"] & {
  name?: string;
};

export type FormErrorComponentProps = JSX.IntrinsicElements["span"] & {
  error?: string;
};

export type FormSubmitProps = Omit<
  JSX.IntrinsicElements["button"],
  "type"
> & {
  type?: "submit";
  submitting?: boolean;
};

export type GenericFieldProps<T extends OzefInputSchema> = {
  name: keyof T & string;
} & Record<string, unknown>;

export type GenericChoiceProps<
  T extends OzefInputSchema,
  ExtraProps = {},
> = {
  name: keyof T & string;
  value: string;
} & Omit<FormInputProps & ExtraProps, "name" | "value">;

export type GenericErrorProps<T extends OzefInputSchema> = {
  name: (keyof T & string) | "submission";
} & FormErrorComponentProps;

export type GenericOptionProps<T extends OzefInputSchema> = {
  name: keyof T & string;
  value: string;
} & FormOptionProps;

export type CapitalizeKeys<T> = {
  [key in keyof T as Capitalize<key & string>]: T[key];
};

export interface CreateFormArgs<T extends OzefInputSchema, IP, EP, SP> {
  schema: ZodObject<T>;
  Container?: React.ElementType;
  Input?: React.FC<FormInputProps & IP>;
  InputMetaProps?: InputMetaProps;
  InputRadio?: React.FC<FormInputProps & IP>;
  Select?: React.FC<FormSelectProps>;
  Option?: React.FC<FormOptionProps>;
  Error?: React.FC<FormErrorComponentProps & EP>;
  Submit?: React.FC<FormSubmitProps & SP>;
  defaults?: Partial<ParsedData<T>>;
  ariaLabel?: string;
}

export type StringLiteralChoices<Value> =
  [Value] extends [string]
    ? string extends Value & string
      ? {}
      : CapitalizeKeys<{ [choice in Value & string]: React.FC<any> }>
    : {};
