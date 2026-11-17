import { BadRequestException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.validation.js';
import { BrasilApiCnpjProvider } from './brasilapi-cnpj.provider.js';
import { ReceitaController } from './receita.controller.js';
import { ReceitaService } from './receita.service.js';
import { isValidCnpj } from './tax-id.js';

// Real public CNPJ (Petrobras); a MEI is built from BrasilAPI's own fields.
const CNPJ = '33000167000101';
const INTERNAL = 'x'.repeat(32);
const fakeFetch = vi.fn();
const env = (values: Partial<Env> = {}) => new ConfigService<Env, true>(Object.assign(new Env(), { TAX_ID_INTERNAL_TOKEN: INTERNAL }, values));
const service = (config = env()) => new ReceitaService(new BrasilApiCnpjProvider(config));
const cnpjBody = (values: Record<string, unknown> = {}) => ({ cnpj: CNPJ, razao_social: 'PETROLEO BRASILEIRO S A PETROBRAS', nome_fantasia: 'PETROBRAS',
  situacao_cadastral: 2, descricao_situacao_cadastral: 'ATIVA', opcao_pelo_mei: null, codigo_natureza_juridica: 2038, natureza_juridica: 'Sociedade de Economia Mista', ...values });

beforeEach(() => { vi.stubGlobal('fetch', fakeFetch); fakeFetch.mockReset(); });
afterEach(() => vi.unstubAllGlobals());

describe('CNPJ da loja', () => {
  it('valida os dígitos verificadores', () => {
    expect(isValidCnpj('33.000.167/0001-01')).toBe(true);
    expect(isValidCnpj('33.000.167/0001-02')).toBe(false);
    expect(isValidCnpj('00000000000000')).toBe(false);
  });
});

describe('CNPJ pela BrasilAPI', () => {
  it('traz razão social, situação e marca MEI só para empresário individual optante', async () => {
    fakeFetch.mockResolvedValueOnce(Response.json(cnpjBody()));
    expect(await service().verify('33.000.167/0001-01')).toMatchObject({ type: 'CNPJ', status: 'ACTIVE', name: 'PETROLEO BRASILEIRO S A PETROBRAS', mei: false });
    const [url, options] = fakeFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://brasilapi.com.br/api/cnpj/v1/33000167000101');
    expect(options.headers).toMatchObject({ 'User-Agent': 'Syndetis-integration-hub' });

    fakeFetch.mockResolvedValueOnce(Response.json(cnpjBody({ cnpj: '11222333000181', opcao_pelo_mei: true, codigo_natureza_juridica: 2135 })));
    expect(await service().verify('11.222.333/0001-81')).toMatchObject({ status: 'ACTIVE', mei: true });
  });
  it('distingue empresa baixada de número inexistente', async () => {
    fakeFetch.mockResolvedValueOnce(Response.json(cnpjBody({ situacao_cadastral: 8, descricao_situacao_cadastral: 'BAIXADA' })));
    expect(await service().verify(CNPJ)).toMatchObject({ status: 'INACTIVE', registrationStatus: 'BAIXADA' });
    fakeFetch.mockResolvedValueOnce(new Response('{}', { status: 404 }));
    expect((await service().verify(CNPJ)).status).toBe('NOT_FOUND');
  });
  it('recusa CPF e dígitos errados sem consultar, e falha fechado quando a API cai', async () => {
    await expect(service().verify('404.428.201-35')).rejects.toThrow('Contas de lojista usam o CNPJ da loja, não CPF.');
    await expect(service().verify('33000167000102')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service().verify('123')).rejects.toBeInstanceOf(BadRequestException);
    expect(fakeFetch).not.toHaveBeenCalled();
    fakeFetch.mockResolvedValueOnce(new Response('busy', { status: 429 }));
    await expect(service().verify(CNPJ)).rejects.toBeInstanceOf(ServiceUnavailableException);
    fakeFetch.mockRejectedValueOnce(new TypeError('network'));
    await expect(service().verify(CNPJ)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('guarda a resposta por alguns minutos: o formulário e o cadastro fazem uma consulta', async () => {
    const receita = service();
    fakeFetch.mockImplementation(async () => Response.json(cnpjBody()));
    await receita.verify(CNPJ);
    await receita.verify('33.000.167/0001-01');
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });
});

describe('ReceitaController', () => {
  const controller = (config = env()) => new ReceitaController(service(config), config);
  it('a consulta pública recusa CPF e responde CNPJ', async () => {
    await expect(controller().lookup({ document: '40442820135' })).rejects.toBeInstanceOf(BadRequestException);
    fakeFetch.mockResolvedValueOnce(Response.json(cnpjBody()));
    expect((await controller().lookup({ document: CNPJ })).status).toBe('ACTIVE');
  });
  it('a verificação interna exige o segredo do auth-service', async () => {
    await expect(controller().verify('wrong', { document: CNPJ })).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller(env({ TAX_ID_INTERNAL_TOKEN: '' })).verify('', { document: CNPJ })).rejects.toBeInstanceOf(ServiceUnavailableException);
    fakeFetch.mockResolvedValueOnce(Response.json(cnpjBody()));
    expect((await controller().verify(INTERNAL, { document: CNPJ })).name).toBe('PETROLEO BRASILEIRO S A PETROBRAS');
  });
});
