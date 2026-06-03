import React from "react";

import type {
  FormErrorComponentProps,
  FormInputProps,
  FormOptionProps,
  FormSelectProps,
  FormSubmitProps,
} from "./types";

export const DefaultInput: React.FC<FormInputProps> = ({
  errorful,
  invalid,
  hasError,
  error,
  errorClassName,
  radioValue,
  field,
  inputProps,
  ...props
}) => <input {...props} />;

export const DefaultInputRadio: React.FC<FormInputProps> = ({
  errorful,
  invalid,
  hasError,
  error,
  errorClassName,
  radioValue,
  field,
  inputProps,
  ...props
}) => <input {...props} type="radio" />;

export const DefaultSelect: React.FC<FormSelectProps> = ({
  errorful,
  invalid,
  hasError,
  error,
  errorClassName,
  radioValue,
  field,
  inputProps,
  ...props
}) => <select {...props} />;

export const DefaultOption: React.FC<FormOptionProps> = ({
  name,
  ...props
}) => <option {...props} />;

export const DefaultError: React.FC<FormErrorComponentProps> = ({
  error,
  ...props
}) => <span {...props}>{error}</span>;

export const DefaultSubmit: React.FC<FormSubmitProps> = ({
  submitting,
  ...props
}) => <button {...props} type="submit" />;
