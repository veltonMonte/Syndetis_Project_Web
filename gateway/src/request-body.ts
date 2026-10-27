import type { RequestHandler } from 'express';

const MAX_BODY_BYTES = 2 * 1024 * 1024;

/** Recebe bytes sem interpretar/reformatar JSON, inclusive corpos assinados. */
export function receiveBody(maxBytes = MAX_BODY_BYTES, timeoutMs = 15000): RequestHandler {
  return (request, response, next) => {
    const reject = (status: number, message: string) => {
      request.pause();
      response.setHeader('Connection', 'close');
      response.once('finish', () => request.destroy());
      response.status(status).json({ message });
    };
    if (request.headers['content-encoding'] && request.headers['content-encoding'] !== 'identity') {
      reject(415, 'Corpos comprimidos não são aceitos.'); return;
    }
    const length = request.headers['content-length'];
    if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
      reject(413, 'Corpo da requisição excede o limite permitido.'); return;
    }
    if (request.readableEnded) { request.body = Buffer.alloc(0); next(); return; }
    const chunks: Buffer[] = [];
    let size = 0;
    const cleanup = () => {
      clearTimeout(timer);
      request.off('data', onData); request.off('end', onEnd);
      request.off('error', onError); request.off('aborted', onAborted);
    };
    const fail = (status: number, message: string) => { cleanup(); reject(status, message); };
    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) { fail(413, 'Corpo da requisição excede o limite permitido.'); return; }
      chunks.push(chunk);
    };
    const onEnd = () => { cleanup(); request.body = Buffer.concat(chunks, size); next(); };
    const onError = () => { cleanup(); if (!response.destroyed) reject(400, 'Corpo da requisição inválido.'); };
    const onAborted = () => { cleanup(); };
    const timer = setTimeout(() => fail(408, 'Tempo limite para receber a requisição.'), timeoutMs);
    timer.unref();
    request.on('data', onData); request.once('end', onEnd);
    request.once('error', onError); request.once('aborted', onAborted);
  };
}
