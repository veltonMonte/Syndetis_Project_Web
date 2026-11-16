import assert from 'node:assert/strict';

const required = ['HOMOLOGATION_HOST', 'PUBLIC_ORIGIN', 'POSTGRES_PASSWORD', 'HOMOLOGATION_SELLER_EMAIL',
  'HOMOLOGATION_SELLER_PASSWORD', 'PAYMENTS_INTERNAL_TOKEN', 'MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET', 'JWT_ISSUER'];
for (const key of required) assert.ok(process.env[key]?.trim(), `Configure ${key}.`);
const origin = new URL(process.env.PUBLIC_ORIGIN);
assert.equal(origin.protocol, 'https:', 'PUBLIC_ORIGIN deve usar HTTPS.');
assert.equal(origin.origin, process.env.PUBLIC_ORIGIN, 'PUBLIC_ORIGIN não deve conter caminho ou barra final.');
assert.equal(origin.host, process.env.HOMOLOGATION_HOST, 'HOMOLOGATION_HOST deve corresponder a PUBLIC_ORIGIN.');
assert.equal(process.env.JWT_ISSUER, origin.origin, 'JWT_ISSUER deve corresponder à origem pública.');
assert.equal(process.env.MP_SANDBOX, 'true', 'A homologação exige MP_SANDBOX=true.');
assert.ok(process.env.PAYMENTS_INTERNAL_TOKEN.length >= 32, 'O segredo interno deve ter pelo menos 32 caracteres.');
assert.ok(process.env.POSTGRES_PASSWORD.length >= 16, 'A senha do banco deve ter pelo menos 16 caracteres.');
assert.ok(process.env.HOMOLOGATION_SELLER_PASSWORD.length >= 12, 'A senha do lojista deve ter pelo menos 12 caracteres.');
assert.ok(process.env.AUTH_SPRING_PROFILES_ACTIVE?.split(',').includes('homologation'), 'Ative o perfil homologation.');
console.info('Configuração de homologação validada. Nenhum segredo foi exibido.');
