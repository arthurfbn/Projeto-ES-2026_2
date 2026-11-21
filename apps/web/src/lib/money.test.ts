import { describe, expect, it } from 'vitest'
import { centsToInput, formatCents, parseMoneyToCents } from './money'

describe('dinheiro em centavos', () => {
  it('formata centavos como real brasileiro', () => {
    expect(formatCents(4000)).toMatch(/^R\$\s40,00$/)
    expect(formatCents(123456)).toMatch(/^R\$\s1\.234,56$/)
  })

  it.each([
    ['40', 4000],
    ['40,00', 4000],
    ['40,5', 4050],
    ['R$ 1.234,56', 123456],
    [' 0,99 ', 99],
    ['40.50', 4050],
  ])('lê "%s" como %i centavos', (raw, cents) => {
    expect(parseMoneyToCents(raw)).toBe(cents)
  })

  it.each(['', 'abc', '40,555', '1,2,3'])('não lê "%s" (vira NaN, e o contrato aponta o erro)', (raw) => {
    expect(parseMoneyToCents(raw)).toBeNaN()
  })

  it('devolve o valor para o campo de edição', () => {
    expect(centsToInput(4000)).toBe('40,00')
    expect(centsToInput(123456)).toBe('1234,56')
  })
})
