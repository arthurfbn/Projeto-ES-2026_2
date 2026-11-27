import { describe, expect, it } from 'vitest'
import { formatCep, formatPhone, positionAfterDigits, removeDigitAt } from './masks'

describe('máscara de telefone', () => {
  it.each([
    ['', ''],
    ['1', '(1'],
    ['11', '(11'],
    ['119', '(11) 9'],
    ['119876', '(11) 9876'],
    ['1198765', '(11) 9876-5'],
    ['1134567890', '(11) 3456-7890'],
    ['11987654321', '(11) 98765-4321'],
  ])('formata %s como %s enquanto digita', (raw, formatted) => {
    expect(formatPhone(raw)).toBe(formatted)
  })

  it('descarta o que não é número', () => {
    expect(formatPhone('11a9b8c7-6!5 4321')).toBe('(11) 98765-4321')
  })

  it('não passa de 11 dígitos', () => {
    expect(formatPhone('119876543219999')).toBe('(11) 98765-4321')
  })

  it('ignora o zero digitado antes do DDD', () => {
    expect(formatPhone('011987654321')).toBe('(11) 98765-4321')
  })

  it('reformata texto colado já com máscara', () => {
    expect(formatPhone('(11) 98765-4321')).toBe('(11) 98765-4321')
  })
})

describe('apoio ao cursor', () => {
  it('acha a posição depois do n-ésimo dígito', () => {
    expect(positionAfterDigits('(11) 98765-4321', 2)).toBe(3)
    expect(positionAfterDigits('(11) 98765-4321', 7)).toBe(10)
  })

  it('remove o n-ésimo dígito', () => {
    expect(removeDigitAt('(11) 98765-4321', 2)).toBe('(1) 98765-4321')
  })
})

describe('máscara de CEP', () => {
  it.each([
    ['', ''],
    ['0131', '0131'],
    ['01310', '01310'],
    ['013101', '01310-1'],
    ['01310100', '01310-100'],
    ['01310-1009', '01310-100'],
    ['ab01.310-100', '01310-100'],
  ])('formata "%s" como "%s"', (raw, expected) => {
    expect(formatCep(raw)).toBe(expected)
  })
})
