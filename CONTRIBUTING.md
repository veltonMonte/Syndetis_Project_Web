# 🚀 Guia de Contribuição e Padrões de Desenvolvimento

Este documento descreve os padrões de branches, commits e fluxo de trabalho (Git Flow) recomendados para manter o repositório organizado e profissional.

---

## 🌳 Estrutura de Branches

- **`main`**: Branch de produção e código estável. **Protegida** contra pushes diretos.
- **`develop`** *(opcional)*: Branch de integração para novas versões.
- **Feature branches**: Criadas a partir de `main` (ou `develop`) para novas funcionalidades.
  - Padrão: `feat/<nome-da-feature>` (ex.: `feat/login-google`, `feat/cardapio-maker`)
- **Bugfix branches**: Criadas para resolver bugs.
  - Padrão: `fix/<nome-do-bug>` (ex.: `fix/jwt-expiration-handler`)
- **Chore / Infra / Docs**:
  - `chore/<descricao>` (ex.: `chore/update-dependencies`)
  - `docs/<descricao>` (ex.: `docs/architecture-diagrams`)
  - `refactor/<descricao>` (ex.: `refactor/auth-service-dto`)

---

## 📝 Padrão de Commits (Conventional Commits)

Utilize mensagens de commit claras no formato:
`<tipo>(<escopo opcional>): <descrição curta no imperativo>`

### Tipos comuns:
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `refactor`: Refatoração sem alteração de comportamento
- `perf`: Melhoria de performance
- `docs`: Alterações na documentação
- `style`: Ajustes de formatação/estilo que não afetam o código
- `test`: Adição ou ajuste de testes
- `chore`: Atualizações de dependências, builds, configs
- `ci`: Alterações no pipeline de CI/CD

### Exemplos:
- `feat(auth): add google oauth2 provider`
- `fix(front): fix navbar responsive collapse on mobile`
- `ci: add github actions workflow for tests`

---

## 🔄 Fluxo de Trabalho (Pull Requests)

1. **Atualize sua branch local**:
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Crie sua branch de trabalho**:
   ```bash
   git checkout -b feat/minha-nova-funcionalidade
   ```
3. **Desenvolva e valide localmente**:
   - Backend: `./mvnw test-compile` (ou `./gradlew test`)
   - Frontend: `npm run lint` e `npm run build`
4. **Envie a branch para o GitHub**:
   ```bash
   git push -u origin feat/minha-nova-funcionalidade
   ```
5. **Abra um Pull Request (PR)**:
   - Preencha o template do PR.
   - Aguarde o pipeline de CI rodar e passar.
   - Solicite code review de pelo menos 1 membro da equipe.
6. **Merge**:
   - Utilize a estratégia **Squash and merge** ou **Rebase and merge** para manter o histórico da `main` linear e limpo.
