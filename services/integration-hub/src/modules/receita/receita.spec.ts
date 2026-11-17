import { BadRequestException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.validation.js';
import { BrasilApiCnpjProvider } from './brasilapi-cnpj.provider.js';
import { ReceitaController } from './receita.controller.js';
import { ReceitaService } from './receita.service.js';
import { SerproCpfProvider } from './serpro-cpf.provider.js';
import { isValidBirthDate, isValidCnpj, isValidCpf } from './tax-id.js';

// SERPRO's published test CPFs and real public CNPJs (Petrobras, a MEI shape built from BrasilAPI's fields).
const CPF = '40442820135';
const CNPJ = '33000167000101';
const INTERNAL = 'x'.repeat(32);
const fakeFetch = vi.fn();
const env = (values: Partial<Env> = {}) => new ConfigService<Env, true>(Object.assign(new Env(), { SERPRO_ACCESS_TOKEN: 'trial', TAX_ID_INTERNAL_TOKEN: INTERNAL }, values));
const service = (config = env()) => new ReceitaService(new BrasilApiCnpjProvider(config), new SerproCpfProvider(config));
const cnpjBody = (values: Record<string, unknown> = {}) => ({ cnpj: CNPJ, razao_social: 'PETROLEO BRASILEIRO S A PETROBRAS', nome_fantasia: 'PETROBRAS',
  situacao_cadastral: 2, descricao_situacao_cadastral: 'ATIVA', opcao_pelo_mei: null, codigo_natureza_juridica: 2038, natureza_juridica: 'Sociedade de Economia Mista', ...values });

beforeEach(() => { vi.stubGlobal('fetch', fakeFetch); fakeFetch.mockReset(); });
afterEach(() => vi.unstubAllGlobals());

describe('números da Receita Federal', () => {
  it('valida os dígitos verificadores de CPF e CNPJ', () => {
    expect(isValidCpf('404.428.201-35')).toBe(true);
    expect(isValidCpf('404.428.201-36')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCnpj('33.000.167/0001-01')).toBe(true);
    expect(isValidCnpj('33.000.167/0001-02')).toBe(false);
    expect(isValidCnpj('00000000000000')).toBe(false);
  });
  it('aceita só datas de nascimento reais e passadas', () => {
    expect(isValidBirthDate('1970-11-14')).toBe(true);
    expect(isValidBirthDate('1970-02-30')).toBe(false);
    expect(isValidBirthDate('2999-01-01')).toBe(false);
    expect(isValidBirthDate('14/11/1970')).toBe(false);
  });
});

describe('CNPJ pela BrasilAPI', () => {
  it('traz razão social, situação e marca MEI só para empresário individual optante', async () => {
    fakeFetch.mockResolvedValueOnce(Response.json(cnpjBody()));
    expect(await service().verify('33.000.167/0001-01')).toMatchObject({ type: 'CNPJ', status: 'ACTIVE', name: 'PETROLEO BRASILEIRO S A PETROBRAS', mei: false });
    expect(fakeFetch.mock.calls[0][0]).toBe('https://brasilapi.com.br/api/cnpj/v1/33000167000101');
    expect((fakeFetch.mock.calls[0][1] as RequestInit).headers).toMatchObject({ 'User-Agent': 'Syndetis-integration-hub' });

    fakeFetch.mockResolvedValueOnce(Response.json(cnpjBody({ cnpj: '11222333000181', opcao_pelo_mei: true, codigo_natureza_juridica: 2135 })));
    expect(await service().verify('11.222.333/0001-81')).toMatchObject({ status: 'ACTIVE', mei: true });
  });
  it('distingue empresa baixada de número inexistente', async () => {
    fakeFetch.mockResolvedValueOnce(Response.json(cnpjBody({ situacao_cadastral: 8, descricao_situacao_cadastral: 'BAIXADA' })));
    expect(await service().verify(CNPJ)).toMatchObject({ status: 'INACTIVE', registrationStatus: 'BAIXADA' });
    fakeFetch.mockResolvedValueOnce(new Response('{}', { status: 404 }));
    expect((await service().verify(CNPJ)).status).toBe('NOT_FOUND');
  });
  it('recusa dígitos errados sem consultar e falha fechado quando a API cai', async () => {
    await expect(service().verify('33000167000102')).rejects.toBeInstanceOf(BadRequestException);
    expect(fakeFetch).not.toHaveBeenCalled();
    fakeFetch.mockResolvedValueOnce(new Response('busy', { status: 429 }));
    await expect(service().verify(CNPJ)).rejects.toBeInstanceOf(ServiceUnavailableException);
    fakeFetch.mockRejectedValueOnce(new TypeError('network'));
    await expect(service().verify(CNPJ)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('CPF pela SERPRO', () => {
  it('consulta CPF e nascimento no formato da SERPRO e lê a situação', async () => {
    fakeFetch.mockResolvedValueOnce(Response.json({ ni: CPF, nome: 'RONE PEREIRA', situacao: { codigo: '0', descricao: 'REGULAR' }, nascimento: '14111970' }));
    expect(await service().verify('404.428.201-35', '1970-11-14')).toEqual({ type: 'CPF', document: CPF, status: 'ACTIVE', registrationStatus: 'REGULAR', name: 'RONE PEREIRA' });
    const [url, options] = fakeFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df-trial/v3/cpf/40442820135/14111970');
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer trial');
  });
  it('trata suspenso, inexistente, nascimento divergente e menor de idade', async () => {
    fakeFetch.mockResolvedValueOnce(Response.json({ ni: CPF, nome: 'X', situacao: { codigo: '2', descricao: 'SUSPENSA' } }));
    expect((await service().verify(CPF, '1970-11-14')).status).toBe('INACTIVE');
    fakeFetch.mockResolvedValueOnce(Response.json({ erro: 'CPF_INEXISTENTE' }, { status: 404 }));
    expect((await service().verify(CPF, '1970-11-15')).status).toBe('NOT_FOUND');
    fakeFetch.mockResolvedValueOnce(Response.json({ erro: 'DATA_NASCIMENTO_DIVERGENTE' }, { status: 404 }));
    expect((await service().verify(CPF, '1970-11-16')).status).toBe('BIRTH_DATE_MISMATCH');
    fakeFetch.mockResolvedValueOnce(new Response('{}', { status: 422 }));
    expect((await service().verify(CPF, '2009-02-03')).status).toBe('UNDERAGE');
  });
  it('exige data de nascimento e uma credencial configurada', async () => {
    await expect(service().verify(CPF)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service(env({ SERPRO_ACCESS_TOKEN: '' })).verify(CPF, '1970-11-14')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fakeFetch).not.toHaveBeenCalled();
  });
  it('com chaves do contrato, obtém um token e o reaproveita', async () => {
    const receita = service(env({ SERPRO_ACCESS_TOKEN: '', SERPRO_CONSUMER_KEY: 'key', SERPRO_CONSUMER_SECRET: 'secret' }));
    fakeFetch.mockImplementation(async (url: string) => url.endsWith('/token')
      ? Response.json({ access_token: 'issued', expires_in: 3600 })
      : Response.json({ ni: CPF, nome: 'X', situacao: { codigo: '0', descricao: 'REGULAR' } }));
    await receita.verify(CPF, '1970-11-14');
    await receita.verify(CPF, '1970-11-13');
    const tokenCalls = fakeFetch.mock.calls.filter(([url]) => String(url).endsWith('/token'));
    expect(tokenCalls).toHaveLength(1);
    expect((tokenCalls[0][1] as RequestInit).headers).toMatchObject({ Authorization: `Basic ${Buffer.from('key:secret').toString('base64')}` });
  });
  it('guarda a resposta por alguns minutos: o formulário e o cadastro custam uma consulta', async () => {
    const receita = service();
    fakeFetch.mockResolvedValue(Response.json({ ni: CPF, nome: 'X', situacao: { codigo: '0', descricao: 'REGULAR' } }));
    await receita.verify(CPF, '1970-11-14');
    await receita.verify('404.428.201-35', '1970-11-14');
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });
});

describe('ReceitaController', () => {
  const controller = (config = env()) => new ReceitaController(service(config), config);
  it('a consulta pública aceita só CNPJ', async () => {
    await expect(controller().lookup({ document: CPF, birthDate: '1970-11-14' })).rejects.toBeInstanceOf(BadRequestException);
    fakeFetch.mockResolvedValueOnce(Response.json(cnpjBody()));
    expect((await controller().lookup({ document: CNPJ })).status).toBe('ACTIVE');
  });
  it('a verificação interna exige o segredo do auth-service', async () => {
    await expect(controller().verify('wrong', { document: CNPJ })).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller(env({ TAX_ID_INTERNAL_TOKEN: '' })).verify('', { document: CNPJ })).rejects.toBeInstanceOf(ServiceUnavailableException);
    fakeFetch.mockResolvedValueOnce(Response.json({ ni: CPF, nome: 'RONE PEREIRA', situacao: { codigo: '0', descricao: 'REGULAR' } }));
    expect((await controller().verify(INTERNAL, { document: CPF, birthDate: '1970-11-14' })).name).toBe('RONE PEREIRA');
  });
});
