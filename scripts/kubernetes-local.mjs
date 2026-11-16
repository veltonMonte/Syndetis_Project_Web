import { spawn, spawnSync } from 'node:child_process';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const local = join(root, 'k8s', '.local');
const credentialsPath = join(local, 'credentials.json');
const imagesPath = join(local, 'images.json');
const context = 'docker-desktop';
const namespace = 'syndetis-local';
const baseUrl = 'http://127.0.0.1:8086';
const applications = ['auth-service', 'core-service', 'integration-hub', 'frontend', 'gateway'];
const folder = name => name === 'gateway' || name === 'frontend' ? name : `services/${name}`;

function run(program, args, { input, sensitive = false, timeout = 60000 } = {}) {
  const result = spawnSync(program, args, { cwd: root, encoding: 'utf8', input, timeout, maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) {
    const reason = sensitive ? 'Saída omitida para preservar credenciais.' : (result.stderr || result.stdout || result.error?.code || '').slice(-2500);
    throw new Error(`${program} falhou (${result.status ?? 'sem status'}). ${reason}`);
  }
  return result.stdout;
}

function kubectl(args, options) {
  return run('kubectl', ['--context', context, '--namespace', namespace, ...args], options);
}

function ensureLocalCluster() {
  const server = run('kubectl', ['--context', context, 'config', 'view', '--minify', '-o', 'jsonpath={.clusters[0].cluster.server}']).trim();
  const host = new URL(server).hostname;
  if (!['127.0.0.1', 'localhost', 'kubernetes.docker.internal'].includes(host)) {
    throw new Error('Operação permitida somente no cluster local do Docker Desktop.');
  }
  kubectl(['get', '--raw', '/readyz'], { timeout: 15000 });
}

function prepare() {
  mkdirSync(local, { recursive: true });
  if (!existsSync(credentialsPath)) {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    const credentials = {
      databaseUser: 'postgres', databasePassword: randomBytes(32).toString('base64url'), privateKey,
      sellerEmail: `k8s-${randomBytes(6).toString('hex')}@example.test`,
      sellerPassword: `K8s-${randomBytes(24).toString('base64url')}!`,
    };
    writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  }
  console.info('Credenciais locais preservadas em k8s/.local/credentials.json (ignorado pelo Git). Nenhum .env foi carregado.');
}

function secretResources() {
  const c = JSON.parse(readFileSync(credentialsPath, 'utf8'));
  return [
    ['syndetis-database', { POSTGRES_USER: c.databaseUser, POSTGRES_PASSWORD: c.databasePassword }],
    ['syndetis-auth-key', { 'private.pem': c.privateKey }],
    ['syndetis-test-seller', { HOMOLOGATION_SELLER_EMAIL: c.sellerEmail, HOMOLOGATION_SELLER_PASSWORD: c.sellerPassword }],
  ].map(([name, values]) => ({ apiVersion: 'v1', kind: 'Secret', type: 'Opaque',
    metadata: { name, namespace }, data: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Buffer.from(value).toString('base64')])) }));
}

function applySecrets() {
  for (const secret of secretResources()) {
    const previous = kubectl(['get', 'secret', secret.metadata.name, '--ignore-not-found', '-o', 'json'], { sensitive: true });
    if (previous.trim() && JSON.stringify(JSON.parse(previous).data) !== JSON.stringify(secret.data)) {
      // Compare key order independently before refusing a credential change.
      const data = JSON.parse(previous).data;
      if (Object.keys(secret.data).some(key => data[key] !== secret.data[key])) {
        throw new Error(`O Secret ${secret.metadata.name} difere das credenciais locais. Não será substituído automaticamente.`);
      }
    }
    kubectl(['apply', '--server-side', '--field-manager=syndetis-local', '-f', '-'], { input: JSON.stringify(secret), sensitive: true });
  }
}

async function build() {
  prepare();
  const tag = `local-${Date.now()}`;
  const images = applications.map(name => ({ name: `syndetis-local/${name}`, newTag: tag }));
  for (const name of applications) {
    console.info(`Construindo ${name}...`);
    const result = spawnSync('docker', ['build', '-t', `syndetis-local/${name}:${tag}`, folder(name)], {
      cwd: root, encoding: 'utf8', timeout: 900000, maxBuffer: 16 * 1024 * 1024,
    });
    writeFileSync(join(local, `build-${name}.log`), (result.stdout || '') + (result.stderr || ''));
    if (result.status !== 0) throw new Error(`Build de ${name} falhou. Consulte k8s/.local/build-${name}.log.`);
  }
  writeFileSync(imagesPath, JSON.stringify(images, null, 2) + '\n');
  writeOverlay(images);
  console.info('Cinco imagens construídas com tags únicas; nenhum container do Compose foi alterado.');
}

function writeOverlay(images) {
  const directory = join(local, 'render');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'kustomization.yaml'), JSON.stringify({
    apiVersion: 'kustomize.config.k8s.io/v1beta1', kind: 'Kustomization',
    resources: ['../../overlays/docker-desktop'], images,
  }, null, 2) + '\n');
}

async function importIntoKind(nodeName, imageNames) {
  const destination = spawn('docker', ['exec', '-i', nodeName, 'ctr', '--namespace', 'k8s.io', 'images', 'import', '--platform', 'linux/amd64', '-'],
    { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
  const source = spawn('docker', ['image', 'save', ...imageNames], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let detail = '';
  destination.stdout.resume();
  for (const child of [source, destination]) child.stderr.on('data', chunk => { detail = (detail + chunk).slice(-2000); });
  source.stdout.pipe(destination.stdin);
  destination.stdin.on('error', () => {});
  const exit = child => new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
  const statuses = await Promise.all([exit(source), exit(destination)]);
  if (statuses.some(status => status !== 0)) throw new Error(`Importação no nó local ${nodeName} falhou: ${detail}`);
}

async function loadImages() {
  const images = JSON.parse(readFileSync(imagesPath, 'utf8'));
  const names = images.map(image => `${image.name}:${image.newTag}`);
  const nodes = JSON.parse(kubectl(['get', 'nodes', '-o', 'json'])).items;
  for (const node of nodes) {
    const name = node.metadata.name;
    const inspected = spawnSync('docker', ['inspect', '--type', 'container', '--format', '{{.Config.Labels}}', name], { encoding: 'utf8' });
    if (inspected.status === 0 && /io.x-k8s.kind/.test(inspected.stdout)) {
      console.info(`Importando imagens no nó kind ${name}...`);
      await importIntoKind(name, names);
    } else if (nodes.length > 1 || name !== 'docker-desktop') {
      throw new Error(`Não foi possível identificar com segurança o container kind do nó ${name}.`);
    }
    // kubeadm's docker-desktop node uses Docker Desktop's shared image store.
  }
  writeOverlay(images);
}

async function deploy() {
  ensureLocalCluster();
  prepare();
  if (!existsSync(imagesPath)) throw new Error('Execute build antes de deploy.');
  await loadImages();
  kubectl(['apply', '-f', 'k8s/overlays/docker-desktop/namespace.yaml']);
  applySecrets();
  kubectl(['apply', '--dry-run=server', '-k', 'k8s/.local/render']);
  console.info(kubectl(['apply', '-k', 'k8s/.local/render']).trim());
  for (const name of ['postgres', 'redis']) {
    console.info(`Aguardando ${name}...`);
    kubectl(['rollout', 'status', `statefulset/${name}`, '--timeout=300s'], { timeout: 310000 });
  }
  for (const name of applications) {
    console.info(`Aguardando ${name}...`);
    kubectl(['rollout', 'status', `deployment/${name}`, '--timeout=300s'], { timeout: 310000 });
  }
  console.info('Implantação local pronta. Use serve para abrir http://127.0.0.1:8086.');
}

async function smoke() {
  ensureLocalCluster();
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
  const result = spawnSync(process.execPath, ['scripts/smoke-checkout.mjs'], { cwd: root, encoding: 'utf8', timeout: 120000,
    env: { ...process.env, SMOKE_BASE_URL: baseUrl, HOMOLOGATION_SELLER_EMAIL: credentials.sellerEmail, HOMOLOGATION_SELLER_PASSWORD: credentials.sellerPassword } });
  writeFileSync(join(local, 'smoke.log'), (result.stdout || '') + (result.stderr || ''));
  if (result.status !== 0) throw new Error('Smoke falhou. Consulte k8s/.local/smoke.log; credenciais não são exibidas.');
  console.info(result.stdout.trim());
}

async function recovery() {
  ensureLocalCluster();
  const before = JSON.parse(kubectl(['get', 'pods', '-l', 'app=core-service', '-o', 'json'])).items;
  const ready = before.filter(p => !p.metadata.deletionTimestamp && p.status.conditions?.some(c => c.type === 'Ready' && c.status === 'True'));
  if (ready.length < 2) throw new Error('O teste exige duas réplicas saudáveis do core.');
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
  const login = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: credentials.sellerEmail, password: credentials.sellerPassword }) });
  if (!login.ok) throw new Error('Execute serve e confirme que o ambiente está saudável antes do teste.');
  const session = await login.json();
  const storesResponse = await fetch(`${baseUrl}/api/core/stores/me`, { headers: { Authorization: `Bearer ${session.accessToken}` } });
  if (!storesResponse.ok) throw new Error('Não foi possível consultar as lojas de homologação.');
  const stores = await storesResponse.json();
  const store = stores.find(item => item.slug.startsWith('smoke-'));
  if (!store) throw new Error('Execute smoke antes do teste de recuperação para criar o catálogo de teste.');
  const target = `${baseUrl}/api/core/public/stores/${encodeURIComponent(store.slug)}/products`;
  const baseline = await fetch(target, { signal: AbortSignal.timeout(5000) });
  if (!baseline.ok) throw new Error('Catálogo de teste indisponível.');
  const catalog = await baseline.json();
  const productId = catalog.content?.[0]?.id;
  if (!productId) throw new Error('Catálogo de teste vazio. Execute smoke primeiro.');
  const report = { startedAt: new Date().toISOString(), deletedPod: ready[0].metadata.name,
    target: 'database-backed-product-catalog', requests: 0, failures: 0 };
  const traffic = (async () => {
    for (let index = 0; index < 100; index++) {
      report.requests++;
      try {
        const response = await fetch(target, { signal: AbortSignal.timeout(3000) });
        const body = await response.json();
        if (!response.ok || !body.content?.some(product => product.id === productId)) report.failures++;
      } catch { report.failures++; }
      await sleep(150);
    }
  })();
  // Delete exactly one freshly observed pod in the dedicated local namespace. No PVCs or data are deleted.
  kubectl(['delete', 'pod', ready[0].metadata.name, '--wait=false']);
  await traffic;
  for (let index = 0; index < 40; index++) {
    const pods = JSON.parse(kubectl(['get', 'pods', '-l', 'app=core-service', '-o', 'json'])).items;
    const active = pods.filter(p => !p.metadata.deletionTimestamp && p.status.conditions?.some(c => c.type === 'Ready' && c.status === 'True'));
    if (active.length >= 2 && active.some(p => !before.some(old => old.metadata.uid === p.metadata.uid))) {
      report.replacementReady = true;
      break;
    }
    await sleep(2000);
  }
  report.finishedAt = new Date().toISOString();
  writeFileSync(join(local, 'recovery-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.info(JSON.stringify(report));
  if (!report.replacementReady || report.failures) throw new Error('Recuperação incompleta ou falhas de tráfego observadas; confira o relatório.');
}

try {
  switch (process.argv[2]) {
    case 'prepare': prepare(); break;
    case 'build': await build(); break;
    case 'deploy': await deploy(); break;
    case 'validate':
      console.info(run('kubectl', ['kustomize', 'k8s/overlays/docker-desktop']).includes('startupProbe:') ? 'Kustomize renderizado com probes.' : 'Confira o manifesto renderizado.');
      break;
    case 'status':
      ensureLocalCluster();
      console.info(kubectl(['get', 'deployments,statefulsets,pods,services,pvc,pdb', '-o', 'wide']));
      break;
    case 'serve': {
      ensureLocalCluster();
      const child = spawn('kubectl', ['--context', context, '--namespace', namespace, 'port-forward', '--address=127.0.0.1', 'service/gateway', '8086:8080'], { cwd: root, stdio: 'inherit' });
      const stop = () => child.kill();
      process.once('SIGINT', stop); process.once('SIGTERM', stop);
      process.exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => resolve(code ?? 0)); });
      break;
    }
    case 'smoke': await smoke(); break;
    case 'test-recovery': await recovery(); break;
    default: console.info('Uso: node scripts/kubernetes-local.mjs prepare|build|validate|deploy|serve|status|smoke|test-recovery');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
