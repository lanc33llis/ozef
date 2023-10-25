import React, { useEffect, useId } from "react";
import { atom, useAtom } from "jotai";
import { z, type ZodError, type ZodObject, type ZodTypeAny } from "zod";

type ButtonProps = JSX.IntrinsicElements["button"];
type FormProps<FD, _> = Omit<JSX.IntrinsicElements["form"], "onSubmit"> & {
  onSubmit?: (data: FD) => Promise<void> | void;
};

type InputMetaProps = {
  hasError?: boolean;
  errorClassName?: string;
  radioValue?: string;
};
export type OzefInputProps = InputMetaProps;

type InputProps = JSX.IntrinsicElements["input"] & InputMetaProps;
type SelectProps = JSX.IntrinsicElements["select"] & InputMetaProps;
type OptionProps = JSX.IntrinsicElements["option"];
type SpanProps = JSX.IntrinsicElements["span"] & {
  error?: string;
};

type SubmitButtonProps = Omit<ButtonProps, "type"> & {
  type?: "submit";
  submitting: boolean;
};

type OzefInputSchema = {
  [k: string]:
  | z.ZodString
  | z.ZodNumber
  | z.ZodBoolean
  | z.ZodUnion<[z.ZodLiteral<string>, ...z.ZodLiteral<string>[]]>
  | z.ZodEnum<[string, ...string[]]>;
};

interface CreateFormArgs<T extends OzefInputSchema, IP, EP, SP> {
  schema: ZodObject<T>;
  Input?: React.FC<InputProps & IP>;
  InputMetaProps?: InputMetaProps;
  InputRadio?: React.FC<InputProps & IP>;
  Select?: React.FC<SelectProps>;
  Option?: React.FC<OptionProps>;
  Error?: React.FC<SpanProps & EP>;
  Submit?: React.FC<SubmitButtonProps & SP>;
}

function ozef<T extends OzefInputSchema, IP, EP, SP>({
  schema,
  Input = (props) => <input {...props} />,
  Error = (props) => <span {...props} />,
  InputRadio = (props) => <input {...props} type="radio" />,
  Select = (props) => <select {...props} />,
  Option = (props) => <option {...props} />,
  Submit = (props) => <button {...props} type="submit" />,
}: CreateFormArgs<T, IP, EP, SP>) {
  type ParsedFormData = {
    [key in keyof T]: T[key]["_type"];
  };
  type RawFormData = Partial<ParsedFormData>;
  type FormErrors = Partial<{
    [key in keyof T]: ZodError;
  }>;
  type FieldProps = InputProps & IP;
  type ErrorProps = SpanProps & EP;
  type SubmitProps = SubmitButtonProps & SP;

  const formAtom = atom<RawFormData>({});
  const errorsAtom = atom<FormErrors>({});
  const touchedAtom = atom<Partial<{ [key in keyof T]: boolean }>>({});
  const submittedAtom = atom<boolean>(false);
  const submittingAtom = atom<boolean>(false);

  const ALL_TOUCHED = Object.keys(schema.shape).reduce(
    (acc, key) => ({ ...acc, [key]: true }),
    {},
  ) as { [key in keyof T]: true };

  const Form = (props: FormProps<ParsedFormData, FieldProps>) => {
    const [formData] = useAtom(formAtom);
    const [, setErrors] = useAtom(errorsAtom);
    const [, setTouched] = useAtom(touchedAtom);
    const [, setSubmitting] = useAtom(submittingAtom);
    const keys = Object.keys(schema.shape) as (keyof T & string)[];

    return (
      <form
        {...props}
        onSubmit={(e) => {
          e.preventDefault();

          const _errors = {} as FormErrors;

          Object.entries(schema.shape).map(
            ([key, scheme]: [keyof T, ZodTypeAny]) => {
              const value = formData[key];
              const result = scheme.safeParse(value);
              if (result.success) {
                _errors[key] = undefined;
              } else {
                _errors[key] = result.error;
              }
            },
          );

          setTouched(keys.reduce((acc, key) => ({ ...acc, [key]: true }), {}));
          setErrors(_errors);

          if (Object.values(_errors).some((error) => error !== undefined)) {
            return;
          } else {
            setSubmitting(true);
            if (props.onSubmit instanceof Promise) {
              (async () => {
                if (props.onSubmit) {
                  await props.onSubmit(formData as ParsedFormData);
                }
                setSubmitting(false);
              })();
            } else if (props.onSubmit) {
              props.onSubmit(formData as ParsedFormData);
              setSubmitting(false);
            } else {
              setSubmitting(false);
            }
          }
        }}
      />
    );
  };

  type CapitalizedKey = Capitalize<keyof T & string>;
  type CapitalizeKeys<T> = {
    [key in keyof T as Capitalize<key & string>]: T[key];
  };
  Form.Field = {} as CapitalizeKeys<{
    [key in keyof T]: React.FC<FieldProps> &
    // Radio
    (T[key] extends z.ZodEnum<infer U>
      ? CapitalizeKeys<{ [subfield in U[number]]: React.FC<FieldProps> }>
      : {}) &
    // Select
    (T[key] extends z.ZodUnion<
      infer U extends [z.ZodLiteral<string>, ...z.ZodLiteral<string>[]]
    >
      ? CapitalizeKeys<{
        [subfield in U[number]["value"]]: React.FC<FieldProps>;
      }>
      : {});
  }>;
  type FormField = typeof Form.Field;

  type ErrorKeys = keyof T | "Submission";
  Form.Error = {} as CapitalizeKeys<{
    [key in ErrorKeys]: React.FC<ErrorProps>;
  }>
  type FormError = typeof Form.Error;
  type FormErrorComponent = FormError[keyof FormError];
  Form.Event = {
    Submit: (props) => {
      const [isSubmitting] = useAtom(submittingAtom);

      return (
        <Submit
          {...props}
          type="submit"
          disabled={isSubmitting}
          submitting={isSubmitting}
        />
      );
    },
  } as {
    Submit: React.FC<SubmitProps>;
  };
  Form.Event.Submit.displayName = "Form.Event.Submit";

  Object.entries(schema.shape).map(([key, scheme]) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const capitalizedKey = key[0]!.toUpperCase() + key.slice(1);
    let func: any = undefined;

    if (scheme instanceof z.ZodEnum) {
      func = ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
      );

      scheme.options.map((option) => {
        const capitalizedOption = option[0]!.toUpperCase() + option.slice(1);
        func[capitalizedOption] = (props: FieldProps) => {
          const [, setFormData] = useAtom(formAtom);
          const [, setErrors] = useAtom(errorsAtom);
          const [, setTouched] = useAtom(touchedAtom);

          return (
            <InputRadio
              {...props}
              radioValue={option}
              type="radio"
              name={key}
              value={option}
              onChange={(e) => {
                const val = e.target.value;
                const res = scheme.safeParse(val);

                setFormData((prev) => ({ ...prev, [key]: val }));
                if (res.success) {
                  setErrors((prev) => ({ ...prev, [key]: undefined }));
                } else {
                  setErrors((prev) => ({ ...prev, [key]: res.error }));
                }
              }}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, [key]: true }));
              }}
            />
          );
        };
      });
    } else if (scheme instanceof z.ZodUnion) {
      func = ({ children }: { children: React.ReactNode }) => {
        const [, setFormData] = useAtom(formAtom);
        const [, setErrors] = useAtom(errorsAtom);
        const id = useId();

        useEffect(() => {
          const elem = document.getElementById(id) as HTMLSelectElement;

          setFormData((prev) => ({ ...prev, [key]: elem.value }));
        }, [id, setFormData]);

        return (
          <Select
            id={id}
            name={key}
            onChange={(e) => {
              const val = e.target.value;
              const res = scheme.safeParse(val);

              setFormData((prev) => ({ ...prev, [key]: val }));
              if (res.success) {
                setErrors((prev) => ({ ...prev, [key]: undefined }));
              } else {
                setErrors((prev) => ({ ...prev, [key]: res.error }));
              }
            }}
          >
            {children}
          </Select>
        );
      };

      scheme.options.map((literal) => {
        const { value: option } = literal;
        const capitalizedOption = option[0]!.toUpperCase() + option.slice(1);

        func[capitalizedOption] = (_: FieldProps) => {
          return <Option value={option}>{option}</Option>;
        };
      });
    } else {
      func = ({ errorClassName, ...props }: FieldProps) => {
        const [formData, setFormData] = useAtom(formAtom);
        const [errors, setErrors] = useAtom(errorsAtom);
        const [touched, setTouched] = useAtom(touchedAtom);

        const hasError = errors[key] && touched[key];
        let className = `${props.className ?? ""} ${hasError ? errorClassName ?? "" : ""
          }`;
        className = className.trim();

        return (
          <Input
            {...(props as FieldProps)}
            {...(className && {
              className,
            })}
            name={key}
            value={formData[key] ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              const res = scheme.safeParse(val);

              setFormData((prev) => ({ ...prev, [key]: val }));
              if (res.success) {
                setErrors((prev) => ({ ...prev, [key]: undefined }));
              } else {
                setErrors((prev) => ({ ...prev, [key]: res.error }));
              }
            }}
            onBlur={() => {
              setTouched((prev) => ({ ...prev, [key]: true }));
            }}
            hasError={hasError}
          />
        );
      };
    }

    Form.Field[capitalizedKey as keyof FormField] = func;

    (
      Form.Field[capitalizedKey as CapitalizedKey] as React.FC
    ).displayName = `Form.Field.${capitalizedKey}`;

    Form.Error[capitalizedKey as keyof FormError] = ((props: ErrorProps) => {
      const [errors] = useAtom(errorsAtom);
      const [touched] = useAtom(touchedAtom);

      if (errors[key] && touched[key]) {
        return (
          <Error
            {...props}
            error={errors[key]?.errors.flatMap((e) => e.message).join(", ")}
          />
        );
      }

      return null;
    }) as FormErrorComponent;
    Form.Error[
      capitalizedKey as CapitalizedKey
    ]!.displayName = `Form.Error.${capitalizedKey}`;
  });

  // eslint-disable-next-line react/display-name
  Form.Error.Submission = (props) => {
    const [errors] = useAtom(errorsAtom);
    const [touched] = useAtom(touchedAtom);
    const submitted = useAtom(submittedAtom);

    if (
      submitted &&
      Object.values(errors).some((error) => error !== undefined) &&
      JSON.stringify(touched) === JSON.stringify(ALL_TOUCHED)
    ) {
      return <Error {...props} />;
    }
    return null;
  };
  Form.Error.Submission.displayName = "Form.Error.Submission";

  return Form;
}

export default ozef;
