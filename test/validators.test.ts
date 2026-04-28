import { describe, it, expect } from 'vitest'
import { str, num, bool, url, port } from '../src/validators.js'

describe('StringValidator', () => {
  it('parses a plain string', () => {
    expect(str().parse('hello', 'X')).toBe('hello')
  })

  it('coerces non-string rawValue to string', () => {
    expect(str().parse(42, 'X')).toBe('42')
  })

  it('throws when value is missing and field is required', () => {
    expect(() => str().parse(undefined, 'X')).toThrow('Expected required string')
  })

  it('returns undefined for optional missing field', () => {
    expect(str().optional().parse(undefined, 'X')).toBeUndefined()
  })

  it('uses default when value is missing', () => {
    expect(str().default('fallback').parse(undefined, 'X')).toBe('fallback')
  })

  it('default takes precedence over supplied value if... actually supplied value wins', () => {
    expect(str().default('fallback').parse('actual', 'X')).toBe('actual')
  })

  describe('.url()', () => {
    it('passes valid URLs', () => {
      expect(str().url().parse('https://example.com', 'X')).toBe('https://example.com')
    })

    it('throws on invalid URLs', () => {
      expect(() => str().url().parse('not-a-url', 'X')).toThrow('valid URL')
    })
  })

  describe('.min()', () => {
    it('passes when length >= n', () => {
      expect(str().min(3).parse('abc', 'X')).toBe('abc')
    })

    it('throws when length < n', () => {
      expect(() => str().min(5).parse('hi', 'X')).toThrow('length >= 5')
    })
  })

  describe('.max()', () => {
    it('passes when length <= n', () => {
      expect(str().max(5).parse('abc', 'X')).toBe('abc')
    })

    it('throws when length > n', () => {
      expect(() => str().max(3).parse('toolong', 'X')).toThrow('length <= 3')
    })
  })

  describe('.regex()', () => {
    it('passes when value matches', () => {
      expect(str().regex(/^\d+$/).parse('123', 'X')).toBe('123')
    })

    it('throws when value does not match', () => {
      expect(() => str().regex(/^\d+$/).parse('abc', 'X')).toThrow('match')
    })
  })

  describe('.enum()', () => {
    const parser = str().enum(['a', 'b', 'c'])

    it('passes for a valid enum member', () => {
      expect(parser.parse('a', 'X')).toBe('a')
    })

    it('throws for a value not in the enum', () => {
      expect(() => parser.parse('d', 'X')).toThrow('one of [a, b, c]')
    })
  })

  it('chains multiple rules and applies all of them', () => {
    const parser = str().min(3).max(10).regex(/^[a-z]+$/)
    expect(parser.parse('hello', 'X')).toBe('hello')
    expect(() => parser.parse('hi', 'X')).toThrow('length >= 3')
    expect(() => parser.parse('HELLO', 'X')).toThrow('match')
  })

  it('url() shorthand works', () => {
    expect(url().parse('https://example.com', 'X')).toBe('https://example.com')
    expect(() => url().parse('bad', 'X')).toThrow()
  })
})

describe('NumberValidator', () => {
  it('coerces strings to numbers', () => {
    expect(num().parse('42', 'X')).toBe(42)
  })

  it('coerces float strings', () => {
    expect(num().parse('3.14', 'X')).toBeCloseTo(3.14)
  })

  it('throws on NaN input', () => {
    expect(() => num().parse('not-a-number', 'X')).toThrow('valid number')
  })

  it('throws when value is missing and field is required', () => {
    expect(() => num().parse(undefined, 'X')).toThrow('required number')
  })

  it('returns undefined for optional missing field', () => {
    expect(num().optional().parse(undefined, 'X')).toBeUndefined()
  })

  it('uses default when value is missing', () => {
    expect(num().default(3000).parse(undefined, 'X')).toBe(3000)
  })

  describe('.int()', () => {
    it('passes integers', () => {
      expect(num().int().parse('5', 'X')).toBe(5)
    })

    it('throws on floats', () => {
      expect(() => num().int().parse('3.14', 'X')).toThrow('integer')
    })
  })

  describe('.min() / .max()', () => {
    it('passes within range', () => {
      expect(num().min(1).max(10).parse('5', 'X')).toBe(5)
    })

    it('throws below min', () => {
      expect(() => num().min(5).parse('4', 'X')).toThrow('>= 5')
    })

    it('throws above max', () => {
      expect(() => num().max(5).parse('6', 'X')).toThrow('<= 5')
    })
  })

  describe('.port()', () => {
    it('passes valid port numbers', () => {
      expect(num().port().parse('3000', 'X')).toBe(3000)
      expect(num().port().parse('1', 'X')).toBe(1)
      expect(num().port().parse('65535', 'X')).toBe(65535)
    })

    it('throws for port 0', () => {
      expect(() => num().port().parse('0', 'X')).toThrow()
    })

    it('throws for port > 65535', () => {
      expect(() => num().port().parse('99999', 'X')).toThrow()
    })

    it('throws for non-integer', () => {
      expect(() => num().port().parse('80.5', 'X')).toThrow('integer')
    })
  })

  it('port() shorthand works', () => {
    expect(port().parse('8080', 'X')).toBe(8080)
    expect(() => port().parse('99999', 'X')).toThrow()
  })
})

describe('BooleanValidator', () => {
  it.each([
    ['true', true],
    ['1', true],
    ['yes', true],
    ['on', true],
    ['false', false],
    ['0', false],
    ['no', false],
    ['off', false],
  ])('coerces "%s" to %s', (input, expected) => {
    expect(bool().parse(input, 'X')).toBe(expected)
  })

  it('is case-insensitive', () => {
    expect(bool().parse('TRUE', 'X')).toBe(true)
    expect(bool().parse('False', 'X')).toBe(false)
  })

  it('trims surrounding whitespace', () => {
    expect(bool().parse('  true  ', 'X')).toBe(true)
  })

  it('throws on unrecognised boolean strings', () => {
    expect(() => bool().parse('maybe', 'X')).toThrow('true/false')
  })

  it('throws when missing and required', () => {
    expect(() => bool().parse(undefined, 'X')).toThrow('required boolean')
  })

  it('returns undefined for optional missing field', () => {
    expect(bool().optional().parse(undefined, 'X')).toBeUndefined()
  })

  it('uses default when value is missing', () => {
    expect(bool().default(false).parse(undefined, 'X')).toBe(false)
    expect(bool().default(true).parse(undefined, 'X')).toBe(true)
  })
})
