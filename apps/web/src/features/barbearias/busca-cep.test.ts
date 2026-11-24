import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse, delay } from 'msw'
import { setupServer } from 'msw/node'
import type { MeResponse } from '@shavey/contracts'
import { renderRoute, settle, waitUntil } from '@/test/render'

const ze: MeResponse = {
  user: { id: '6f1c2d3e-4a5b-4c6d-8e9f-0a1b2c3d4e5f', name: 'Zé Navalha', email: 'ze@exemplo.com', phone: '11987654321' },
  managedBarbershops: [],
  memberships: [],
}

const server = setupServer(http.get('*/api/me', () => HttpResponse.json(ze)))
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  document.body.innerHTML = ''
})
afterAll(() => server.close())

const viaCep = 'https://viacep.com.br/ws/:cep/json/'

const addresses: Record<string, object> = {
  '01310100': { logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' },
  '20040002': { logradouro: 'Rua da Assembleia', bairro: 'Centro', localidade: 'Rio de Janeiro', uf: 'RJ' },
  // CEP geral de cidade: sem logradouro e bairro.
  '13300000': { logradouro: '', bairro: '', localidade: 'Itu', uf: 'SP' },
}

/** ViaCEP falso: endereços acima, {"erro": "true"} para o resto; registra os CEPs pedidos. */
function viaCepApi() {
  const asked: string[] = []
  server.use(
    http.get(viaCep, ({ params }) => {
      const cep = String(params.cep)
      asked.push(cep)
      return HttpResponse.json(addresses[cep] ?? { erro: 'true' })
    }),
  )
  return asked
}

type Wrapper = Awaited<ReturnType<typeof renderRoute>>['wrapper']

function input(wrapper: Wrapper, label: string) {
  const field = wrapper.findAll('label').find((l) => l.text() === label)
  if (!field) throw new Error(`campo ${label} não encontrado`)
  return wrapper.get<HTMLInputElement>(`#${field.attributes('for')}`)
}

const value = (wrapper: Wrapper, label: string) => input(wrapper, label).element.value
const isReadonly = (wrapper: Wrapper, label: string) => input(wrapper, label).element.readOnly

async function typeCep(wrapper: Wrapper, cep: string) {
  await input(wrapper, 'CEP').setValue(cep)
  await settle()
}

const addressFields = ['Rua', 'Bairro', 'Cidade', 'UF']

describe('busca de endereço pelo CEP (ViaCEP)', () => {
  it('CA1 e CA2: CEP válido preenche e trava rua, bairro, cidade e UF; número e complemento seguem livres', async () => {
    viaCepApi()
    const { wrapper } = await renderRoute('/barbearias/nova')

    await typeCep(wrapper, '01310100')
    await waitUntil(() => value(wrapper, 'Rua') === 'Avenida Paulista')

    expect(value(wrapper, 'Bairro')).toBe('Bela Vista')
    expect(value(wrapper, 'Cidade')).toBe('São Paulo')
    expect(value(wrapper, 'UF')).toBe('SP')
    for (const label of addressFields) expect(isReadonly(wrapper, label)).toBe(true)
    expect(isReadonly(wrapper, 'Número')).toBe(false)
    expect(isReadonly(wrapper, 'Complemento')).toBe(false)
  })

  it('CA1: o endereço preenchido vai no pedido de criação', async () => {
    viaCepApi()
    let sent: unknown
    server.use(
      http.post('*/api/barbershops', async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ error: 'X', message: 'parar aqui' }, { status: 409 })
      }),
    )
    const { wrapper } = await renderRoute('/barbearias/nova')

    await input(wrapper, 'Nome da barbearia').setValue('Barbearia do Zé')
    await typeCep(wrapper, '01310100')
    await waitUntil(() => value(wrapper, 'Rua') === 'Avenida Paulista')
    await input(wrapper, 'Número').setValue('1578')
    await wrapper.get('form').trigger('submit')
    await waitUntil(() => sent !== undefined)

    expect(sent).toMatchObject({
      cep: '01310-100',
      street: 'Avenida Paulista',
      number: '1578',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    })
  })

  it('CA3: campo que o ViaCEP devolve vazio fica aberto e continua obrigatório', async () => {
    viaCepApi()
    const { wrapper } = await renderRoute('/barbearias/nova')

    await typeCep(wrapper, '13300000')
    await waitUntil(() => value(wrapper, 'Cidade') === 'Itu')

    expect(isReadonly(wrapper, 'Rua')).toBe(false)
    expect(isReadonly(wrapper, 'Bairro')).toBe(false)
    expect(isReadonly(wrapper, 'Cidade')).toBe(true)
    expect(isReadonly(wrapper, 'UF')).toBe(true)

    await wrapper.get('form').trigger('submit')
    await settle()
    expect(wrapper.text()).toContain('Informe a rua.')
    expect(wrapper.text()).toContain('Informe o bairro.')
  })

  it('CA4: CEP inexistente avisa no campo CEP e deixa o endereço aberto', async () => {
    viaCepApi()
    const { wrapper } = await renderRoute('/barbearias/nova')

    await typeCep(wrapper, '99999999')
    await waitUntil(() => wrapper.text().includes('CEP não encontrado. Preencha o endereço abaixo.'))

    for (const label of addressFields) expect(isReadonly(wrapper, label)).toBe(false)
  })

  it('CA4: falha do ViaCEP avisa e deixa o endereço aberto (o cadastro não trava)', async () => {
    server.use(http.get(viaCep, () => HttpResponse.error()))
    const { wrapper } = await renderRoute('/barbearias/nova')

    await typeCep(wrapper, '01310100')
    await waitUntil(() => wrapper.text().includes('Não foi possível buscar o CEP agora. Preencha o endereço abaixo.'))

    for (const label of addressFields) expect(isReadonly(wrapper, label)).toBe(false)
    await input(wrapper, 'Rua').setValue('Avenida Paulista')
    expect(value(wrapper, 'Rua')).toBe('Avenida Paulista')
  })

  it('CA5: trocar o CEP limpa e destrava o que veio do ViaCEP e busca de novo', async () => {
    const asked = viaCepApi()
    const { wrapper } = await renderRoute('/barbearias/nova')
    await typeCep(wrapper, '01310100')
    await waitUntil(() => value(wrapper, 'Rua') === 'Avenida Paulista')

    // Apagando um dígito: endereço automático sai, campos voltam a ser editáveis.
    await typeCep(wrapper, '0131010')
    for (const label of addressFields) {
      expect(value(wrapper, label)).toBe('')
      expect(isReadonly(wrapper, label)).toBe(false)
    }

    await typeCep(wrapper, '20040002')
    await waitUntil(() => value(wrapper, 'Rua') === 'Rua da Assembleia')
    expect(value(wrapper, 'UF')).toBe('RJ')
    expect(asked).toEqual(['01310100', '20040002'])
  })

  it('CA5: o que a pessoa digitou à mão não é apagado ao trocar o CEP', async () => {
    viaCepApi()
    const { wrapper } = await renderRoute('/barbearias/nova')
    await typeCep(wrapper, '13300000')
    await waitUntil(() => value(wrapper, 'Cidade') === 'Itu')
    await input(wrapper, 'Rua').setValue('Rua Paula Souza')
    await input(wrapper, 'Número').setValue('10')

    await typeCep(wrapper, '1330000')

    expect(value(wrapper, 'Rua')).toBe('Rua Paula Souza')
    expect(value(wrapper, 'Número')).toBe('10')
    expect(value(wrapper, 'Cidade')).toBe('')
  })

  it('CA6: só busca com 8 dígitos e mostra carregamento no CEP durante a busca', async () => {
    const asked: string[] = []
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    server.use(
      http.get(viaCep, async ({ params }) => {
        asked.push(String(params.cep))
        await gate
        return HttpResponse.json(addresses['01310100'])
      }),
    )
    const { wrapper } = await renderRoute('/barbearias/nova')

    for (const partial of ['0', '0131', '0131010']) await typeCep(wrapper, partial)
    expect(asked).toEqual([])

    await typeCep(wrapper, '01310100')
    await waitUntil(() => input(wrapper, 'CEP').attributes('aria-busy') === 'true')
    expect(wrapper.text()).toContain('Buscando endereço…')

    release()
    await waitUntil(() => value(wrapper, 'Rua') === 'Avenida Paulista')
    expect(input(wrapper, 'CEP').attributes('aria-busy')).toBeUndefined()
    expect(asked).toEqual(['01310100'])
    await delay(0)
  })
})
