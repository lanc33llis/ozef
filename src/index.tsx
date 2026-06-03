import React, { JSX, useEffect, useId } from "react";
import { atom, useAtom } from "jotai";
import { z, type ZodError, type ZodObject, type ZodTypeAny } from "zod";

type OzefInputSchema = {
  [k: string]: z.ZodTypeAny;
};

type ParsedData<T extends OzefInputSchema> = {
  [key in keyof T]: z.infer<T[key]>;
};

type RawFormData = Record<string, unknown>;
type FormErrors<T extends OzefInputSchema> = Partial<
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

interface InputMetaProps {
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

interface FormUtils<FD> {
  reset: () => void;
  setError: (key: keyof FD | "submission", error: string) => void;
}

type FormProps<FD> = Omit<JSX.IntrinsicElements["form"], "onSubmit"> & {
  onSubmit?: (data: FD, utils: FormUtils<FD>) => Promise<void> | void;
};

type FormInputProps = JSX.IntrinsicElements["input"] & InputMetaProps;
type FormSelectProps = JSX.IntrinsicElements["select"] & InputMetaProps;
type FormOptionProps = JSX.IntrinsicElements["option"] & {
  name?: string;
};
type FormErrorComponentProps = JSX.IntrinsicElements["span"] & {
  error?: string;
};
type FormSubmitProps = Omit<JSX.IntrinsicElements["button"], "type"> & {
  type?: "submit";
  submitting?: boolean;
};

type GenericFieldProps<T extends OzefInputSchema> = {
  name: keyof T & string;
} & Record<string, unknown>;
type GenericChoiceProps<T extends OzefInputSchema> = {
  name: keyof T & string;
  value: string;
} & Omit<FormInputProps, "name" | "value">;
type GenericErrorProps<T extends OzefInputSchema> = {
  name: (keyof T & string) | "submission";
} & FormErrorComponentProps;
type GenericOptionProps<T extends OzefInputSchema> = {
  name: keyof T & string;
  value: string;
} & FormOptionProps;

type CapitalizeKeys<T> = {
  [key in keyof T as Capitalize<key & string>]: T[key];
};

interface CreateFormArgs<T extends OzefInputSchema, IP, EP, SP> {
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

type StringLiteralChoices<Value> =
  [Value] extends [string]
    ? string extends Value & string
      ? {}
      : CapitalizeKeys<{ [choice in Value & string]: React.FC<any> }>
    : {};

const capitalized = (value: string) => value[0]!.toUpperCase() + value.slice(1);

const getZodDef = (scheme: ZodTypeAny) =>
  ((scheme as any)._def ?? (scheme as any).def) as Record<string, any>;

const getZodKind = (scheme: ZodTypeAny) => {
  const def = getZodDef(scheme);
  const type = def.type ?? def.typeName;

  if (typeof type === "string" && type.startsWith("Zod")) {
    return type.slice(3).toLowerCase();
  }

  return type;
};

const unwrapZodType = (scheme: ZodTypeAny): ZodTypeAny => {
  let current = scheme;

  while (
    getZodKind(current) === "optional" ||
    getZodKind(current) === "nullable" ||
    getZodKind(current) === "default"
  ) {
    const def = getZodDef(current);
    current = def.innerType ?? def.schema;
  }

  return current;
};

const getZodTypeName = (scheme: ZodTypeAny) => getZodKind(unwrapZodType(scheme));

const isRequired = (scheme: ZodTypeAny) => !scheme.isOptional();

const parseFormValue = (scheme: ZodTypeAny, value: unknown) => {
  if (getZodTypeName(scheme) === "number") {
    if (value === "" || value === undefined || value === null) {
      return undefined;
    }

    return Number(value);
  }

  return value;
};

const getErrorMessage = (error: ZodError | string | undefined) => {
  if (!error) {
    return undefined;
  }

  if (typeof error === "string" || error instanceof String) {
    return error as string;
  }

  return ((error as any).issues ?? (error as any).errors)
    .flatMap((e: { message: string }) => e.message)
    .join(", ");
};

const getEnumOptions = (scheme: ZodTypeAny) => {
  const def = getZodDef(scheme);

  return ((scheme as any).options ?? Object.values(def.entries ?? {})) as string[];
};

const getUnionOptions = (scheme: ZodTypeAny) =>
  (getZodDef(scheme).options ?? (scheme as any).options ?? []) as ZodTypeAny[];

const getLiteralValue = (scheme: ZodTypeAny) => {
  const literal = scheme as any;
  const def = getZodDef(scheme);

  if ("value" in literal) {
    return literal.value;
  }

  if (literal.values instanceof Set) {
    return literal.values.values().next().value;
  }

  if (Array.isArray(def.values)) {
    return def.values[0];
  }

  return def.value;
};

const applyErrorClassName = (
  className: string | undefined,
  errorClassName: string | undefined,
  invalid: boolean,
) => {
  const nextClassName = `${className ?? ""} ${
    invalid ? (errorClassName ?? "") : ""
  }`.trim();

  return nextClassName || undefined;
};

const stripInputMetaProps = <P extends InputMetaProps>(props: P) => {
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

function ozef<
  T extends OzefInputSchema,
  IP = object,
  EP = object,
  SP = object,
>({
  schema,
  Container = "form",
  Input = ({
    errorful,
    invalid,
    hasError,
    error,
    errorClassName,
    radioValue,
    field,
    inputProps,
    ...props
  }) => <input {...props} />,
  Error: ErrorComponent = ({ error, ...props }) => (
    <span {...props}>{error}</span>
  ),
  InputRadio = ({
    errorful,
    invalid,
    hasError,
    error,
    errorClassName,
    radioValue,
    field,
    inputProps,
    ...props
  }) => <input {...props} type="radio" />,
  Select = ({
    errorful,
    invalid,
    hasError,
    error,
    errorClassName,
    radioValue,
    field,
    inputProps,
    ...props
  }) => <select {...props} />,
  Option = ({ name, ...props }) => <option {...props} />,
  Submit = ({ submitting, ...props }) => <button {...props} type="submit" />,
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
  }: GenericChoiceProps<T>) => {
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
  Form.Radio = GenericRadio;
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
