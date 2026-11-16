import assert from 'node:assert/strict';

export async function readApiResponse(response, method, path, expectedStatus) {
  const context = `${method} ${path}: HTTP ${response.status}`;
  assert.equal(response.status, expectedStatus, context);
  const text = await response.text();
  // Negativas de segurança são verificadas pelo status; Spring pode retornar corpo vazio.
  if (response.status === 204 || response.status >= 400) return undefined;
  assert.ok(text.trim(), `${context}: resposta JSON obrigatória está vazia`);
  try { return JSON.parse(text); }
  catch { throw new Error(`${context}: resposta não contém JSON válido`); }
}
