import type { InputMetaProps } from "./types";

export const applyErrorClassName = (
  className: string | undefined,
  errorClassName: string | undefined,
  invalid: boolean,
) => {
  const nextClassName = `${className ?? ""} ${
    invalid ? (errorClassName ?? "") : ""
  }`.trim();

  return nextClassName || undefined;
};

export const stripInputMetaProps = <P extends InputMetaProps>(props: P) => {
  const inputProps = { ...props } as P & Record<string, unknown>;

  delete inputProps.errorful;
  delete inputProps.invalid;
  delete inputProps.hasError;
  delete inputProps.error;
  delete inputProps.errorClassName;
  delete inputProps.radioValue;
  delete inputProps.field;
  delete inputProps.inputProps;

  return inputProps;
};
