import type { FieldValidator } from './types.js'
import { FieldError } from './errors.js'

// ---------------------------------------------------------------------------
// StringValidator
// ---------------------------------------------------------------------------

export class StringValidator<T extends string | undefined = string>
  implements FieldValidator<T>
{
  // Phantom property — satisfies the interface; never assigned at runtime.
  declare _type: T

  protected _optional = false
  protected _default: string | undefined = undefined
  protected _rules: Array<(val: string, name: string) => void> = []

  get isOptional(): boolean {
    return this._optional
  }

  get defaultValue(): T | undefined {
    return this._default as T | undefined
  }

  url(): this {
    this._rules.push((val, name) => {
      try {
        new URL(val)
      } catch {
        throw new FieldError(name, 'valid URL', val)
      }
    })
    return this
  }

  min(n: number): this {
    this._rules.push((val, name) => {
      if (val.length < n) {
        throw new FieldError(name, `length >= ${n}`, `length ${val.length}`)
      }
    })
    return this
  }

  max(n: number): this {
    this._rules.push((val, name) => {
      if (val.length > n) {
        throw new FieldError(name, `length <= ${n}`, `length ${val.length}`)
      }
    })
    return this
  }

  regex(r: RegExp): this {
    this._rules.push((val, name) => {
      if (!r.test(val)) {
        throw new FieldError(name, `match /${r.source}/`, val)
      }
    })
    return this
  }

  /**
   * Narrows the output type to the literal union of the allowed values.
   * Exclude<T, string> propagates undefined when the validator is already optional.
   */
  enum<E extends string>(values: E[]): StringValidator<E | Exclude<T, string>> {
    this._rules.push((val, name) => {
      if (!(values as string[]).includes(val)) {
        throw new FieldError(name, `one of [${values.join(', ')}]`, val)
      }
    })
    return this as unknown as StringValidator<E | Exclude<T, string>>
  }

  optional(): StringValidator<string | undefined> {
    this._optional = true
    return this as unknown as StringValidator<string | undefined>
  }

  /** A default value makes the field always resolve to string (never undefined). */
  default(v: string): StringValidator<string> {
    this._default = v
    return this as unknown as StringValidator<string>
  }

  parse(rawValue: unknown, fieldName: string): T {
    const val = rawValue === undefined ? this._default : String(rawValue)

    if (val === undefined) {
      if (this._optional) return undefined as T
      throw new FieldError(fieldName, 'required string', 'undefined')
    }

    for (const rule of this._rules) {
      rule(val, fieldName)
    }

    return val as T
  }
}

// ---------------------------------------------------------------------------
// NumberValidator
// ---------------------------------------------------------------------------

export class NumberValidator<T extends number | undefined = number>
  implements FieldValidator<T>
{
  declare _type: T

  protected _optional = false
  protected _default: number | undefined = undefined
  protected _rules: Array<(val: number, name: string) => void> = []

  get isOptional(): boolean {
    return this._optional
  }

  get defaultValue(): T | undefined {
    return this._default as T | undefined
  }

  /** Shorthand: integer in the valid TCP port range 1–65535. */
  port(): this {
    return this.int().min(1).max(65535)
  }

  int(): this {
    this._rules.push((val, name) => {
      if (!Number.isInteger(val)) {
        throw new FieldError(name, 'integer', String(val))
      }
    })
    return this
  }

  min(n: number): this {
    this._rules.push((val, name) => {
      if (val < n) {
        throw new FieldError(name, `>= ${n}`, String(val))
      }
    })
    return this
  }

  max(n: number): this {
    this._rules.push((val, name) => {
      if (val > n) {
        throw new FieldError(name, `<= ${n}`, String(val))
      }
    })
    return this
  }

  optional(): NumberValidator<number | undefined> {
    this._optional = true
    return this as unknown as NumberValidator<number | undefined>
  }

  default(v: number): NumberValidator<number> {
    this._default = v
    return this as unknown as NumberValidator<number>
  }

  parse(rawValue: unknown, fieldName: string): T {
    if (rawValue === undefined) {
      if (this._default !== undefined) return this._default as T
      if (this._optional) return undefined as T
      throw new FieldError(fieldName, 'required number', 'undefined')
    }

    const coerced = Number(rawValue)
    if (isNaN(coerced)) {
      throw new FieldError(fieldName, 'valid number', String(rawValue))
    }

    for (const rule of this._rules) {
      rule(coerced, fieldName)
    }

    return coerced as T
  }
}

// ---------------------------------------------------------------------------
// BooleanValidator
// ---------------------------------------------------------------------------

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on'])
const FALSE_VALUES = new Set(['false', '0', 'no', 'off'])

export class BooleanValidator<T extends boolean | undefined = boolean>
  implements FieldValidator<T>
{
  declare _type: T

  protected _optional = false
  protected _default: boolean | undefined = undefined

  get isOptional(): boolean {
    return this._optional
  }

  get defaultValue(): T | undefined {
    return this._default as T | undefined
  }

  optional(): BooleanValidator<boolean | undefined> {
    this._optional = true
    return this as unknown as BooleanValidator<boolean | undefined>
  }

  default(v: boolean): BooleanValidator<boolean> {
    this._default = v
    return this as unknown as BooleanValidator<boolean>
  }

  parse(rawValue: unknown, fieldName: string): T {
    if (rawValue === undefined) {
      if (this._default !== undefined) return this._default as T
      if (this._optional) return undefined as T
      throw new FieldError(fieldName, 'required boolean', 'undefined')
    }

    const val = String(rawValue).toLowerCase().trim()

    if (TRUE_VALUES.has(val)) return true as T
    if (FALSE_VALUES.has(val)) return false as T

    throw new FieldError(fieldName, 'true/false/1/0/yes/no/on/off', String(rawValue))
  }
}

// ---------------------------------------------------------------------------
// Shorthand factory functions
// ---------------------------------------------------------------------------

export const str = (): StringValidator<string> => new StringValidator()
export const num = (): NumberValidator<number> => new NumberValidator()
export const bool = (): BooleanValidator<boolean> => new BooleanValidator()

/** Shorthand for str().url() */
export const url = (): StringValidator<string> => new StringValidator().url()

/** Shorthand for num().port() — integer in 1–65535 */
export const port = (): NumberValidator<number> => new NumberValidator().port()
