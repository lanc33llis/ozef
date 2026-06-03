import React, { useEffect, useId } from "react";
import { atom, useAtom } from "jotai";
import type { ZodError } from "zod";

import {
  DefaultError,
  DefaultInput,
  DefaultInputRadio,
  DefaultOption,
  DefaultSelect,
  DefaultSubmit,
} from "./default-components";
import { applyErrorClassName, stripInputMetaProps } from "./input-props";
import {
  getEnumOptions,
  getErrorMessage,
  getLiteralValue,
  getUnionOptions,
  getZodTypeName,
  isRequired,
  parseFormValue,
  unwrapZodType,
} from "./schema";
import type {
  CapitalizeKeys,
  CreateFormArgs,
  FormErrorComponentProps,
  FormErrors,
  FormInputProps,
  FormOptionProps,
  FormProps,
  FormSelectProps,
  FormSubmitProps,
  FormUtils,
  GenericChoiceProps,
  GenericErrorProps,
  GenericFieldProps,
  GenericOptionProps,
  OzefFieldController,
  OzefInputSchema,
  ParsedData,
  RawFormData,
  StringLiteralChoices,
} from "./types";

const capitalized = (value: string) => value[0]!.toUpperCase() + value.slice(1);

function ozef<
  T extends OzefInputSchema,
  IP = object,
  EP = object,
  SP = object,
>({
  schema,
  Container = "form",
  Input = DefaultInput as React.FC<FormInputProps & IP>,
  Error: ErrorComponent = DefaultError as React.FC<
    FormErrorComponentProps & EP
  >,
  InputRadio = DefaultInputRadio as React.FC<FormInputProps & IP>,
  Select = DefaultSelect,
  Option = DefaultOption,
  Submit = DefaultSubmit as React.FC<FormSubmitProps & SP>,
  ariaLabel,
  defaults,
}: CreateFormArgs<T, IP, EP, SP>) {
  type ParsedFormData = ParsedData<T>;
  type FieldProps = FormInputProps & IP;
  type ErrorProps = FormErrorComponentProps & EP;
  type SubmitProps = FormSubmitProps & SP;
  type CapitalizedKey = Capitalize<keyof T & string>;

  const formAtom = atom<RawFormData>((defaults ?? {}) as RawFormData);
  const errorsAtom = atom<FormErrors<T>>({});
  const touchedAtom = atom<Partial<{ [key in keyof T]: boolean }>>({});
  const submittedAtom = atom(false);
  const submittingAtom = atom(false);

  const keys = Object.keys(schema.shape) as (keyof T & string)[];

  const getScheme = (name: keyof T & string) => schema.shape[name]!;

  const validateField = (name: keyof T & string, value: unknown) => {
    const scheme = getScheme(name);

    return scheme.safeParse(parseFormValue(scheme, value));
  };

  const setFieldError = (
    setErrors: React.Dispatch<React.SetStateAction<FormErrors<T>>>,
    name: keyof T & string,
    value: unknown,
  ) => {
    const result = validateField(name, value);

    setErrors((prev) => ({
      ...prev,
      [name]: result.success ? undefined : result.error,
    }));

    return result;
  };

  const createUtils = (
    setFormData: React.Dispatch<React.SetStateAction<RawFormData>>,
    setErrors: React.Dispatch<React.SetStateAction<FormErrors<T>>>,
    setTouched: React.Dispatch<
      React.SetStateAction<Partial<{ [key in keyof T]: boolean }>>
    >,
    setSubmitting: React.Dispatch<React.SetStateAction<boolean>>,
  ) =>
    ({
      reset: () => {
        setFormData({});
        setErrors({});
        setTouched({});
        setSubmitting(false);
      },
      setError: (key, error) => {
        setErrors((prev) => ({ ...prev, [key]: error }));
        if (key !== "submission") {
          setTouched((prev) => ({ ...prev, [key]: true }));
        }
      },
    }) as FormUtils<ParsedFormData>;

  const Form = (props: FormProps<ParsedFormData>) => {
    const [formData, setFormData] = useAtom(formAtom);
    const [, setErrors] = useAtom(errorsAtom);
    const [, setTouched] = useAtom(touchedAtom);
    const [, setSubmitted] = useAtom(submittedAtom);
    const [submitting, setSubmitting] = useAtom(submittingAtom);

    return (
      <Container
        {...props}
        aria-busy={submitting}
        aria-label={ariaLabel}
        {...(Container === "form" && {
          onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            setSubmitted(true);

            const nextErrors = {} as FormErrors<T>;
            const parsedFormData = {} as ParsedFormData;

            keys.forEach((key) => {
              const value = formData[key];
              const result = validateField(key, value);

              if (result.success) {
                nextErrors[key] = undefined;
                parsedFormData[key] = result.data as ParsedFormData[typeof key];
              } else {
                nextErrors[key] = result.error as any;
              }
            });

            setTouched(
              keys.reduce((acc, key) => ({ ...acc, [key]: true }), {}),
            );
            setErrors(nextErrors);

            if (
              Object.values(nextErrors).some((error) => error !== undefined)
            ) {
              return;
            }

            if (props.onSubmit) {
              setSubmitting(true);

              Promise.resolve(
                props.onSubmit(
                  parsedFormData,
                  createUtils(setFormData, setErrors, setTouched, setSubmitting),
                ),
              ).finally(() => setSubmitting(false));
            }
          },
        })}
      />
    );
  };

  Form.atom = formAtom;

  const useFieldState = <K extends keyof T & string>(
    name: K,
  ): OzefFieldController<ParsedFormData[K]> => {
    const [formData, setFormData] = useAtom(formAtom);
    const [errors, setErrors] = useAtom(errorsAtom);
    const [touched, setTouched] = useAtom(touchedAtom);
    const error = getErrorMessage(errors[name]);
    const invalid = Boolean(error && touched[name]);

    const touch = () => {
      setTouched((prev) => ({ ...prev, [name]: true }));
    };

    const setValue = (value: ParsedFormData[K]) => {
      setFormData((prev) => ({ ...prev, [name]: value }));
      setFieldError(setErrors, name, value);
    };

    return {
      name,
      value: formData[name] as ParsedFormData[K] | undefined,
      error: invalid ? error : undefined,
      invalid,
      hasError: invalid,
      touched: Boolean(touched[name]),
      required: isRequired(getScheme(name)),
      setValue,
      touch,
    };
  };

  const getInputMetadata = <K extends keyof T & string>(
    field: OzefFieldController<ParsedFormData[K]>,
    inputProps: any,
  ) => ({
    errorful: field.invalid,
    invalid: field.invalid,
    hasError: field.invalid,
    error: field.error,
    field: field as OzefFieldController,
    inputProps,
  });

  const createTextLikeInputProps = <K extends keyof T & string>(
    name: K,
    field: OzefFieldController<ParsedFormData[K]>,
    props: FieldProps,
  ) => {
    const scheme = getScheme(name);
    const type = getZodTypeName(scheme) === "number" ? "number" : "text";
    const errorClassName = props.errorClassName;
    const inputProps = stripInputMetaProps(props);

    return {
      ...inputProps,
      type,
      name,
      value: field.value ?? "",
      className: applyErrorClassName(
        inputProps.className,
        errorClassName,
        field.invalid,
      ),
      "aria-disabled": inputProps.disabled ?? false,
      "aria-invalid": field.invalid,
      "aria-required": field.required,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        field.setValue(e.target.value as ParsedFormData[K]);
        props.onChange?.(e);
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        field.touch();
        props.onBlur?.(e);
      },
    };
  };

  const createCheckboxInputProps = <K extends keyof T & string>(
    name: K,
    field: OzefFieldController<ParsedFormData[K]>,
    props: FieldProps,
  ) => {
    const errorClassName = props.errorClassName;
    const inputProps = stripInputMetaProps(props);

    return {
      ...inputProps,
      type: "checkbox",
      role: "checkbox",
      name,
      value: field.value ?? "",
      checked: Boolean(field.value),
      className: applyErrorClassName(
        inputProps.className,
        errorClassName,
        field.invalid,
      ),
      "aria-checked": Boolean(field.value),
      "aria-disabled": inputProps.disabled ?? false,
      "aria-invalid": field.invalid,
      "aria-required": field.required,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        field.setValue(!field.value as ParsedFormData[K]);
        props.onChange?.(e);
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        field.touch();
        props.onBlur?.(e);
      },
    };
  };

  const fieldComponents: Record<string, React.FC<any>> = {};
  const errorComponents: Record<string, React.FC<any>> = {};

  const GenericField = ({ name, ...props }: GenericFieldProps<T>) => {
    const Component = fieldComponents[name];

    if (!Component) {
      throw new Error(`Unknown Ozef field: ${name}`);
    }

    return <Component {...props} />;
  };

  const GenericRadio = ({
    name,
    value,
    errorClassName,
    ...props
  }: GenericChoiceProps<T, IP>) => {
    const field = useFieldState(name);
    const checked = field.value === value;
    const radioProps = stripInputMetaProps(props as FormInputProps);
    const inputProps = {
      ...radioProps,
      type: "radio",
      role: "radio",
      name,
      value,
      checked,
      className: applyErrorClassName(
        radioProps.className,
        errorClassName,
        field.invalid,
      ),
      "aria-checked": checked,
      "aria-disabled": radioProps.disabled ?? false,
      "aria-invalid": field.invalid,
      "aria-required": field.required,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        field.setValue(value as ParsedFormData[typeof name]);
        props.onChange?.(e);
      },
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
        field.touch();
        props.onBlur?.(e);
      },
    };

    return (
      <InputRadio
        {...(inputProps as FieldProps)}
        {...getInputMetadata(field, inputProps)}
        radioValue={value}
      />
    );
  };

  const GenericOption = ({ name, value, ...props }: GenericOptionProps<T>) => {
    const field = useFieldState(name);

    return (
      <Option
        {...props}
        name={name}
        value={value}
        role="option"
        aria-selected={field.value === value}
      >
        {props.children ?? value}
      </Option>
    );
  };

  const renderError = (name: (keyof T & string) | "submission", props: any) => {
    const [errors] = useAtom(errorsAtom);
    const [touched] = useAtom(touchedAtom);
    const error = getErrorMessage(errors[name as keyof FormErrors<T>]);
    const shouldShow =
      name === "submission"
        ? Boolean(error)
        : Boolean(error && touched[name as keyof T]);

    if (!shouldShow) {
      return null;
    }

    const { name: _name, ...errorProps } = props;

    return <ErrorComponent {...(errorProps as ErrorProps)} error={error} />;
  };

  const GenericError = ({ name, ...props }: GenericErrorProps<T>) =>
    renderError(name, props);

  const AllErrors = (props: ErrorProps) => {
    const [errors] = useAtom(errorsAtom);
    const [touched] = useAtom(touchedAtom);

    return (
      <>
        {Object.entries(errors).map(([name, error]) => {
          const message = getErrorMessage(error as ZodError | string);
          const shouldShow =
            name === "submission"
              ? Boolean(message)
              : Boolean(message && touched[name as keyof T]);

          if (!shouldShow) {
            return null;
          }

          return <ErrorComponent key={name} {...props} error={message} />;
        })}
      </>
    );
  };

  const Field = GenericField as React.FC<GenericFieldProps<T>> &
    CapitalizeKeys<{
      [key in keyof T]: React.FC<FieldProps> &
        StringLiteralChoices<ParsedFormData[key]> & {
        setValue: (value: ParsedFormData[key]) => void;
        getValue: () => ParsedFormData[key];
        useValue: () => ParsedFormData[key];
      };
    }>;
  const ErrorNamespace = GenericError as React.FC<GenericErrorProps<T>> &
    CapitalizeKeys<{
      [key in keyof T | "submission"]: React.FC<ErrorProps>;
    }>;

  Form.Field = Field;
  Form.Error = ErrorNamespace;
  Form.Radio = GenericRadio as React.FC<GenericChoiceProps<T, IP>>;
  Form.Option = GenericOption;
  Form.Errors = AllErrors;

  keys.forEach((key) => {
    const scheme = getScheme(key);
    const unwrappedScheme = unwrapZodType(scheme);
    const capitalizedKey = capitalized(key);
    let FieldComponent: React.FC<any>;

    if (getZodTypeName(scheme) === "enum") {
      FieldComponent = (props: React.ComponentProps<"div">) => (
        <div {...props} role="radiogroup" />
      );

      getEnumOptions(unwrappedScheme).forEach((option: string) => {
        const capitalizedOption = capitalized(option);
        (FieldComponent as any)[capitalizedOption] = (props: FieldProps) => (
          <GenericRadio name={key} value={option} {...props} />
        );
      });
    } else if (getZodTypeName(scheme) === "union") {
      FieldComponent = (props: FormSelectProps) => {
        const field = useFieldState(key);
        const id = useId();
        const selectProps = stripInputMetaProps(props);

        useEffect(() => {
          const elem = document.getElementById(id) as HTMLSelectElement | null;

          if (field.value === undefined && elem?.value) {
            field.setValue(elem.value as ParsedFormData[typeof key]);
          }
        }, [field.value, id]);

        const inputProps = {
          ...selectProps,
          id,
          name: key,
          value: field.value ?? "",
          role: "listbox",
          "aria-disabled": selectProps.disabled ?? false,
          "aria-invalid": field.invalid,
          "aria-required": field.required,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
            field.setValue(e.target.value as ParsedFormData[typeof key]);
            props.onChange?.(e);
          },
          onBlur: (e: React.FocusEvent<HTMLSelectElement>) => {
            field.touch();
            props.onBlur?.(e);
          },
        };

        return (
          <Select
            {...(inputProps as FormSelectProps)}
            {...getInputMetadata(field, inputProps)}
          />
        );
      };

      getUnionOptions(unwrappedScheme).forEach((literal) => {
        const option = String(getLiteralValue(literal));
        const capitalizedOption = capitalized(option);

        (FieldComponent as any)[capitalizedOption] = (props: FormOptionProps) => (
          <GenericOption {...props} name={key} value={option} />
        );
      });
    } else if (getZodTypeName(scheme) === "boolean") {
      FieldComponent = (props: FieldProps) => {
        const field = useFieldState(key);
        const inputProps = createCheckboxInputProps(
          key,
          field,
          props as FieldProps,
        );

        return (
          <Input
            {...(inputProps as FieldProps)}
            {...getInputMetadata(field, inputProps)}
          />
        );
      };
    } else {
      FieldComponent = (props: FieldProps) => {
        const field = useFieldState(key);
        const inputProps = createTextLikeInputProps(
          key,
          field,
          props as FieldProps,
        );

        return (
          <Input
            {...(inputProps as FieldProps)}
            {...getInputMetadata(field, inputProps)}
          />
        );
      };
    }

    fieldComponents[key] = FieldComponent;
    Field[capitalizedKey as CapitalizedKey] = FieldComponent as any;
    (Field[capitalizedKey as CapitalizedKey] as any).displayName =
      `Form.Field.${capitalizedKey}`;
    (Field[capitalizedKey as CapitalizedKey] as any).useValue = () => {
      const [formData] = useAtom(formAtom);
      return formData[key];
    };

    errorComponents[key] = (props: ErrorProps) => renderError(key, props);
    ErrorNamespace[capitalizedKey as CapitalizedKey] = errorComponents[
      key
    ] as any;
  });

  const SubmitComponent: React.FC<SubmitProps> = ({ submitting, ...props }) => {
      const [isSubmitting] = useAtom(submittingAtom);

      return (
        <Submit
          {...(props as SubmitProps)}
          type="submit"
          disabled={isSubmitting || props.disabled}
          submitting={isSubmitting}
          aria-disabled={props.disabled ?? false}
          aria-busy={isSubmitting}
        />
      );
  };

  Form.Event = {
    Submit: SubmitComponent,
  };
  Form.Event.Submit.displayName = "Form.Event.Submit";
  Form.Submit = Form.Event.Submit;

  Form.useField = useFieldState;
  Form.useReset = () => {
    const [, setFormData] = useAtom(formAtom);
    const [, setErrors] = useAtom(errorsAtom);
    const [, setTouched] = useAtom(touchedAtom);
    const [, setSubmitting] = useAtom(submittingAtom);

    return createUtils(setFormData, setErrors, setTouched, setSubmitting).reset;
  };
  Form.useForm = () => {
    const [formData, setFormData] = useAtom(formAtom);
    const [errors, setErrors] = useAtom(errorsAtom);
    const [, setTouched] = useAtom(touchedAtom);
    const [submitted] = useAtom(submittedAtom);
    const [submitting, setSubmitting] = useAtom(submittingAtom);
    const utils = createUtils(setFormData, setErrors, setTouched, setSubmitting);
    const errorMessages = Object.fromEntries(
      Object.entries(errors).flatMap(([key, error]) => {
        const message = getErrorMessage(error as ZodError | string);
        return message ? [[key, message]] : [];
      }),
    );

    return {
      values: formData as Partial<ParsedFormData>,
      errors: errorMessages as Partial<Record<keyof ParsedFormData | "submission", string>>,
      submitted,
      submitting,
      reset: utils.reset,
      setError: utils.setError,
      setValue: <K extends keyof T & string>(name: K, value: ParsedFormData[K]) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        setFieldError(setErrors, name, value);
      },
    };
  };

  formAtom.onMount = (set) => {
    keys.forEach((key) => {
      const capitalizedKey = capitalized(key);
      (Field[capitalizedKey as CapitalizedKey] as any).setValue = (
        value: ParsedFormData[typeof key],
      ) => {
        set((prev) => ({ ...prev, [key]: value }));
      };

      (Field[capitalizedKey as CapitalizedKey] as any).getValue = () => {
        let val = undefined;
        set((prev) => {
          val = prev[key];
          return prev;
        });
        return val;
      };
    });
  };

  ErrorNamespace.Submission = (props: ErrorProps) =>
    renderError("submission", props);
  ErrorNamespace.Submission.displayName = "Form.Error.Submission";

  return Form;
}

export default ozef;
