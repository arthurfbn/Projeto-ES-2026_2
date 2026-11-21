/** Dinheiro trafega e é guardado em centavos (int); só a tela fala em reais. */

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatCents(cents: number): string {
  return brl.format(cents / 100)
}

/**
 * Lê o que a pessoa digitou ("40", "40,00", "R$ 1.234,56", "40.50") como centavos.
 * Texto que não é valor com até 2 casas vira NaN, e o contrato aponta o erro no campo.
 */
export function parseMoneyToCents(raw: string): number {
  let text = raw.replace(/R\$/i, '').replace(/\s/g, '')
  // Vírgula é o separador decimal; sem vírgula, um ponto seguido de 1–2 dígitos também é.
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.')
  else if (!/^\d+\.\d{1,2}$/.test(text)) text = text.replace(/\./g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return Number.NaN
  const [reais = '0', centavos = ''] = text.split('.')
  return Number(reais) * 100 + Number(centavos.padEnd(2, '0'))
}

/** Valor em centavos no formato do campo de edição ("40,00"). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}
