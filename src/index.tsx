import React, { JSX, useEffect, useId } from "react";
import { atom, useAtom, useAtomValue } from "jotai";
import { z, type ZodError, type ZodObject, type ZodTypeAny } from "zod";

interface FormUtils<FD> {
  reset: () => void;
  setError: (key: keyof FD | "submission", error: string) => void;
}
type FormProps<FD> = Omit<JSX.IntrinsicElements["form"], "onSubmit"> & {
  onSubmit?: (data: FD, utils: FormUtils<FD>) => Promise<void> | void;
};

type InputMetaProps = {
  errorful?: boolean;
  errorClassName?: string;
  radioValue?: string;
};
export type OzefInputProps = InputMetaProps;

type FormInputProps = JSX.IntrinsicElements["input"] & InputMetaProps;
type FormSelectProps = JSX.IntrinsicElements["select"] & InputMetaProps;
type FormOptionProps = JSX.IntrinsicElements["option"];
type FormErrorComponentProps = {
  error?: string;
};
type FormSubmitProps = {
  type?: "submit";
  submitting?: boolean;
  disabled?: boolean;
};

// Actually supported types at the moment
// | z.ZodString
// | z.ZodNumber
// | z.ZodBoolean
// | z.ZodUnion<[z.ZodLiteral<string>, ...z.ZodLiteral<string>[]]>
// | z.ZodEnum<[string, ...string[]]>;

type OzefInputSchema = {
  [k: string]: z.ZodTypeAny;
};

interface CreateFormArgs<T extends OzefInputSchema, IP, SP> {
  schema: ZodObject<T>;
  Input?: React.FC<FormInputProps & IP>;
  InputMetaProps?: InputMetaProps;
  InputRadio?: React.FC<FormInputProps & IP>;
  Select?: React.FC<FormSelectProps>;
  Option?: React.FC<FormOptionProps>;
  Error?: React.FC<FormErrorComponentProps>;
  Submit?: React.FC<FormSubmitProps & SP>;
  defaults?: { [key in keyof T]: T[key]["_type"] };
  ariaLabel?: string;
}

function ozef<T extends OzefInputSchema, IP, EP, SP>({
  schema,
  Input = (props) => <input {...props} />,
  Error = ({ error }) => <span>{error}</span>,
  InputRadio = (props) => <input {...props} type="radio" />,
  Select = (props) => <select {...props} />,
  Option = (props) => <option {...props} />,
  Submit = (props) => <button {...props} type="submit" />,
  ariaLabel,
  defaults,
}: CreateFormArgs<T, IP, SP>) {
  type ParsedFormData = {
    [key in keyof T]: T[key]["_type"];
  };
  type RawFormData = Partial<ParsedFormData>;
  type FormErrors = Partial<
    {
      [key in keyof T]: ZodError | string;
    } & { submission: string }
  >;
  type FieldProps = FormInputProps & IP;
  type ErrorProps = FormErrorComponentProps & EP;
  type SubmitProps = FormSubmitProps & SP;

  const formAtom = atom<RawFormData>(defaults ?? {});
  const errorsAtom = atom<FormErrors>({});
  const touchedAtom = atom<Partial<{ [key in keyof T]: boolean }>>({});
  const submittedAtom = atom<boolean>(false);
  const submittingAtom = atom<boolean>(false);

  const ALL_TOUCHED = Object.keys(schema.shape).reduce(
    (acc, key) => ({ ...acc, [key]: true }),
    {},
  ) as { [key in keyof T]: true };

  const Form = (props: FormProps<ParsedFormData>) => {
    const [formData, setFormData] = useAtom(formAtom);
    const [, setErrors] = useAtom(errorsAtom);
    const [, setTouched] = useAtom(touchedAtom);
    const [submitting, setSubmitting] = useAtom(submittingAtom);
    const keys = Object.keys(schema.shape) as (keyof T & string)[];

    return (
      <form
        {...props}
        aria-busy={submitting}
        aria-label={ariaLabel}
        onSubmit={(e) => {
          e.preventDefault();

          const _errors = {} as FormErrors;

          Object.entries(schema.shape).map(
            ([key, scheme]: [keyof FormErrors, ZodTypeAny]) => {
              const value = formData[key];
              const result = scheme.safeParse(value);
              if (result.success) {
                _errors[key] = undefined;
              } else {
                _errors[key] = result.error as any;
              }
            },
          );

          setTouched(keys.reduce((acc, key) => ({ ...acc, [key]: true }), {}));
          setErrors(_errors);

          if (Object.values(_errors).some((error) => error !== undefined)) {
            return;
          } else {
            setSubmitting(true);
            if (props.onSubmit) {
              const utils = {
                reset: () => {
                  setFormData({});
                  setErrors({});
                  setTouched({});
                  setSubmitting(false);
                },
                setError: (key, err) => {
                  setErrors((prev) => ({ ...prev, [key]: err }));
                },
              } as FormUtils<ParsedFormData>;

              Promise.resolve(
                props.onSubmit(formData as ParsedFormData, utils),
              ).finally(() => setSubmitting(false));
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
        : {}) & {
        // Misc
        /**
         * @description Sets the value of the field. Can only be used after the form has mounted.
         * @returns {void}
         */
        setValue: (value: T[key]["_type"]) => void;
        /**
         * @description Gets the value of the field. Can only be used after the form has mounted.
         * @returns {T[key]["_type"]}
         */
        getValue: () => T[key]["_type"];
        /**
         * @description React hook to get the value of the field.
         * @returns {T[key]["_type"]}
         */
        useValue: () => T[key]["_type"];
      };
  }>;
  type FormField = typeof Form.Field;

  const defaultAria = (props: any) => ({
    "aria-disabled": props.disabled ?? false,
  });

  type ErrorKeys = keyof T | "Submission";
  Form.Error = {} as CapitalizeKeys<{
    [key in ErrorKeys]: React.FC<ErrorProps>;
  }>;
  type FormError = typeof Form.Error;
  type FormErrorComponent = FormError[keyof FormError];
  Form.Event = {
    Submit: ({ submitting, ...props }) => {
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
      func = (props: React.ComponentProps<"div">) => (
        <div {...props} role="radiogroup" />
      );

      scheme.options.map((option: string) => {
        const capitalizedOption = option[0]!.toUpperCase() + option.slice(1);
        func[capitalizedOption] = (props: FieldProps) => {
          const [fd, setFormData] = useAtom(formAtom);
          const [, setErrors] = useAtom(errorsAtom);
          const [, setTouched] = useAtom(touchedAtom);

          return (
            <InputRadio
              {...props}
              {...defaultAria(props)}
              radioValue={option}
              type="radio"
              role="radio"
              checked={fd[key] === option}
              aria-checked={fd[key] === option}
              name={key}
              value={option}
              required={scheme.isOptional() ? false : true}
              aria-required={scheme.isOptional() ? false : true}
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
      func = (props: React.ComponentProps<"select">) => {
        const [, setFormData] = useAtom(formAtom);
        const [, setErrors] = useAtom(errorsAtom);
        const id = useId();

        useEffect(() => {
          const elem = document.getElementById(id) as HTMLSelectElement;

          setFormData((prev) => ({ ...prev, [key]: elem.value }));
        }, [id, setFormData]);

        return (
          <Select
            {...props}
            {...defaultAria(props)}
            id={id}
            name={key}
            aria-required={scheme.isOptional() ? false : true}
            role="listbox"
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
          />
        );
      };

      scheme.options.map((literal: z.ZodLiteral<string>) => {
        const { value: option } = literal;
        const capitalizedOption = option[0]!.toUpperCase() + option.slice(1);
        const fd = useAtomValue(formAtom);

        func[capitalizedOption] = (props: FieldProps) => {
          return (
            <Option
              {...defaultAria(props)}
              aria-selected={fd[key] ?? false}
              role="option"
              value={option}
            >
              {option}
            </Option>
          );
        };
      });
    } else if (scheme instanceof z.ZodBoolean) {
      func = ({ errorClassName, ...props }: FieldProps) => {
        const [formData, setFormData] = useAtom(formAtom);
        const [errors] = useAtom(errorsAtom);
        const [touched, setTouched] = useAtom(touchedAtom);

        const hasError = errors[key] && touched[key];
        let className = `${props.className ?? ""} ${
          hasError ? errorClassName ?? "" : ""
        }`;
        className = className.trim();

        return (
          <Input
            {...(props as FieldProps)}
            {...(className && {
              className,
            })}
            {...defaultAria(props)}
            aria-checked={formData[key] ?? false}
            checked={formData[key] ?? false}
            type="checkbox"
            role="checkbox"
            name={key}
            value={formData[key] ?? ""}
            onChange={() => {
              const val = !formData[key];

              setFormData((prev) => ({ ...prev, [key]: val }));
            }}
            onBlur={() => {
              setTouched((prev) => ({ ...prev, [key]: true }));
            }}
            errorful={hasError}
            aria-required={scheme.isOptional() ? false : true}
          />
        );
      };
    } else {
      func = ({ errorClassName, ...props }: FieldProps) => {
        const [formData, setFormData] = useAtom(formAtom);
        const [errors, setErrors] = useAtom(errorsAtom);
        const [touched, setTouched] = useAtom(touchedAtom);

        const hasError = errors[key] && touched[key];
        let className = `${props.className ?? ""} ${
          hasError ? errorClassName ?? "" : ""
        }`;
        className = className.trim();

        return (
          <Input
            {...(props as FieldProps)}
            {...(className && {
              className,
            })}
            {...defaultAria(props)}
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
            aria-required={scheme.isOptional() ? false : true}
            errorful={hasError}
          />
        );
      };
    }

    Form.Field[capitalizedKey as keyof FormField] = func;
    (Form.Field[capitalizedKey as keyof FormField] as any).useValue = () => {
      const [formData] = useAtom(formAtom);
      return formData[key];
    };

    (
      Form.Field[capitalizedKey as CapitalizedKey] as unknown as React.FC
    ).displayName = `Form.Field.${capitalizedKey}`;

    Form.Error[capitalizedKey as keyof FormError] = ((props: ErrorProps) => {
      const [errors] = useAtom(errorsAtom);
      const [touched] = useAtom(touchedAtom);

      if (errors[key] && touched[key]) {
        if (typeof errors[key] === "string" || errors[key] instanceof String) {
          return <Error {...props} error={errors[key] as string} />;
        } else {
          return (
            <Error
              {...props}
              error={(errors[key] as ZodError)?.errors
                .flatMap((e) => e.message)
                .join(", ")}
            />
          );
        }
      }

      return null;
    }) as FormErrorComponent;
    Form.Error[
      capitalizedKey as CapitalizedKey
    ]!.displayName = `Form.Error.${capitalizedKey}`;
  });

  Form.useReset = () => {
    const [, setFormData] = useAtom(formAtom);
    const [, setErrors] = useAtom(errorsAtom);
    const [, setTouched] = useAtom(touchedAtom);
    const [, setSubmitting] = useAtom(submittingAtom);

    return () => {
      setFormData({});
      setErrors({});
      setTouched({});
      setSubmitting(false);
    };
  };

  formAtom.onMount = (set) => {
    Object.entries(schema.shape).map(([key]) => {
      const capitalizedKey = key[0]!.toUpperCase() + key.slice(1);
      (Form.Field[capitalizedKey as keyof FormField] as any).setValue = (
        value: T[typeof key]["_type"],
      ) => {
        set((prev) => {
          return { ...prev, [key]: value };
        });
      };

      (Form.Field[capitalizedKey as keyof FormField] as any).getValue = () => {
        let val = undefined;
        set((prev) => {
          val = prev[key];
          return prev;
        });
        return val;
      };
    });
  };

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
      return <Error {...props} error={errors.submission} />;
    }
    return null;
  };
  Form.Error.Submission.displayName = "Form.Error.Submission";

  return Form;
}

export default ozef;
