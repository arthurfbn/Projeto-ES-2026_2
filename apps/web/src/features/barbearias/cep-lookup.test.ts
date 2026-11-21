import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse, delay } from 'msw'
import { setupServer } from 'msw/node'
import { lookupCep } from './cep-lookup'

const server = setupServer()
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const viaCep = 'https://viacep.com.br/ws/:cep/json/'

const paulista = {
  cep: '01310-100',
  logradouro: 'Avenida Paulista',
  complemento: 'de 1047 a 1865 - lado ímpar',
  bairro: 'Bela Vista',
  localidade: 'São Paulo',
  uf: 'SP',
}

describe('lookupCep (ViaCEP)', () => {
  it('devolve rua, bairro, cidade e UF do CEP', async () => {
    let asked: unknown
    server.use(http.get(viaCep, ({ params }) => ((asked = params.cep), HttpResponse.json(paulista))))

    expect(await lookupCep('01310100')).toEqual({
      kind: 'found',
      address: { street: 'Avenida Paulista', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP' },
    })
    expect(asked).toBe('01310100')
  })

  it('CEP geral de cidade: campos vazios voltam vazios', async () => {
    server.use(
      http.get(viaCep, () => HttpResponse.json({ ...paulista, logradouro: '', bairro: '', localidade: 'Itu' })),
    )
    expect(await lookupCep('13300000')).toEqual({
      kind: 'found',
      address: { street: '', neighborhood: '', city: 'Itu', state: 'SP' },
    })
  })

  it.each([true, 'true'])('CEP inexistente ({"erro": %s}) é "não encontrado"', async (erro) => {
    server.use(http.get(viaCep, () => HttpResponse.json({ erro })))
    expect(await lookupCep('99999999')).toEqual({ kind: 'not_found' })
  })

  it('resposta 400 (CEP malformado para o ViaCEP) é "não encontrado"', async () => {
    server.use(http.get(viaCep, () => new HttpResponse('Bad Request', { status: 400 })))
    expect(await lookupCep('00000000')).toEqual({ kind: 'not_found' })
  })

  it('falha de rede vira erro', async () => {
    server.use(http.get(viaCep, () => HttpResponse.error()))
    await expect(lookupCep('01310100')).rejects.toThrow()
  })

  it('resposta em formato inesperado vira erro', async () => {
    server.use(http.get(viaCep, () => HttpResponse.json({ foo: 'bar' })))
    await expect(lookupCep('01310100')).rejects.toThrow()
  })

  it('desiste depois do tempo limite', async () => {
    server.use(http.get(viaCep, async () => (await delay('infinite'), HttpResponse.json(paulista))))
    await expect(lookupCep('01310100', { timeoutMs: 20 })).rejects.toThrow()
  })

  it('não chama o ViaCEP com CEP que não tem 8 dígitos', async () => {
    let called = false
    server.use(http.get(viaCep, () => ((called = true), HttpResponse.json(paulista))))
    await expect(lookupCep('0131010')).rejects.toThrow()
    expect(called).toBe(false)
  })
})
