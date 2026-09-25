import { useCallback, useState } from 'react'

/**
 * Tiny form helper used by every modal in the prototype.
 *
 * const form = useForm(initialValues, validate)
 * <Input {...form.field('email')} />
 * form.submit(values => save(values))
 *
 * `validate` receives the values and returns an object of
 * `{ fieldName: 'message' }` for anything invalid.
 */
export function useForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const setValue = useCallback((name, value) => {
    setValues((current) => ({ ...current, [name]: value }))
    // Clear the error as soon as the user starts fixing the field.
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current))
  }, [])

  const field = useCallback(
    (name) => ({
      id: name,
      name,
      value: values[name] ?? '',
      error: touched[name] ? errors[name] : undefined,
      onChange: (event) => setValue(name, event.target.value),
      onBlur: () => setTouched((current) => ({ ...current, [name]: true })),
    }),
    [values, errors, touched, setValue]
  )

  const submit = useCallback(
    (onValid) => (event) => {
      event?.preventDefault?.()
      const nextErrors = validate ? validate(values) : {}
      const hasErrors = Object.values(nextErrors).some(Boolean)
      setErrors(nextErrors)
      setTouched(
        Object.keys(values).reduce((all, key) => ({ ...all, [key]: true }), {})
      )
      if (hasErrors) return
      onValid(values)
    },
    [values, validate]
  )

  const reset = useCallback(
    (nextValues = initialValues) => {
      setValues(nextValues)
      setErrors({})
      setTouched({})
    },
    [initialValues]
  )

  const validateNow = useCallback(() => {
    const nextErrors = validate ? validate(values) : {}
    setErrors(nextErrors)
    setTouched(Object.keys(values).reduce((all, key) => ({ ...all, [key]: true }), {}))
    return Object.values(nextErrors).some(Boolean)
  }, [values, validate])

  return { values, errors, touched, field, setValue, setValues, submit, reset, validateNow }
}

/** Common validators so modals do not repeat the same checks. */
export const validators = {
  required: (value, label = 'This field') =>
    !String(value ?? '').trim() ? `${label} is required` : undefined,
  email: (value) =>
    value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Enter a valid email address' : undefined,
  positiveNumber: (value, label = 'Value') =>
    value !== '' && (Number.isNaN(Number(value)) || Number(value) < 0)
      ? `${label} must be a positive number`
      : undefined,
}
