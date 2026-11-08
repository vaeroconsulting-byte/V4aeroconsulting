# Instruções do projeto — Plataforma de Aviação

## Como interpretar este documento

As afirmações sobre o projeto distinguem:

- **Confirmado no código:** observado nos arquivos ou configurações do repositório.
- **Registro histórico:** informação válida no momento em que foi registrada, mas que pode ter mudado.
- **Pendente ou não verificado:** precisa de confirmação atual; não presumir como concluído ou disponível.

Antes de cada tarefa, verifique novamente as condições relevantes do repositório e do ambiente. Não apresente conteúdo demonstrativo como informação oficial. Não presuma que uma migration foi aplicada, que um banco está configurado ou que um fluxo está integrado sem evidência adequada.

## Visão geral e arquitetura

**Confirmado no código:** aplicação web de página inicial única, construída com Next.js App Router, React e TypeScript. A interface tem apresentação institucional demonstrativa, serviços, destinos, frota, contato e um formulário de solicitação de cotação.

A página principal é composta em [src/app/page.tsx](./src/app/page.tsx) e [src/components/home-page.tsx](./src/components/home-page.tsx). O layout e metadados estão em [src/app/layout.tsx](./src/app/layout.tsx); estilos globais e tokens visuais estão em [src/app/globals.css](./src/app/globals.css). Os dados ilustrativos ficam em [src/data/homepage.ts](./src/data/homepage.ts).

**Confirmado no código:** existem dois caminhos distintos relacionados à cotação:
1. O formulário atual monta uma mensagem e abre o WhatsApp.
2. A rota de API implementa validação e persistência por Supabase.

**Confirmado no código:** o formulário atual não chama a API. Não descreva a solicitação pelo WhatsApp como gravação no banco.

## Stack e comandos

**Confirmado em `package.json`:** o projeto utiliza Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase JS, date-fns, Lenis e React Day Picker.

Comandos disponíveis:

- `npm install`: instala dependências.
- `npm run dev`: inicia o servidor de desenvolvimento.
- `npm run lint`: executa ESLint.
- `npm run build`: compila a aplicação para produção.
- `npm run start`: inicia a aplicação compilada.

**Confirmado em `package.json`:** não há script `test` definido. Não afirme que uma suíte de testes automatizados existe sem verificar se ela foi adicionada.

O alias `@/*` aponta para `src/*`, conforme [tsconfig.json](./tsconfig.json).

## Estrutura

- [src/app/](./src/app/): layout, estilos, página e rotas HTTP.
- [src/app/api/flight-quote/](./src/app/api/flight-quote/): endpoint de cotação.
- [src/components/](./src/components/): componentes da página e da interface.
- [src/data/](./src/data/): conteúdo demonstrativo.
- [src/lib/](./src/lib/): datas, contato e cliente Supabase server-side.
- [src/types/](./src/types/): tipos compartilhados.
- [public/images/](./public/images/): imagens e marca usados pela interface.
- [supabase/migrations/](./supabase/migrations/): migrations SQL versionadas.

Consulte os arquivos antes de assumir que essa estrutura ou os fluxos permanecem inalterados.

## Fluxo atual do formulário e WhatsApp

**Confirmado no código:** [src/components/flight-quote-form.tsx](./src/components/flight-quote-form.tsx) implementa um formulário em três etapas: itinerário, datas/horários e identificação do solicitante. Ele valida os campos no cliente, monta um texto com os dados e abre uma URL de WhatsApp, usando funções em [src/lib/contact.ts](./src/lib/contact.ts).

Se o navegador bloquear a nova janela, o formulário apresenta um link alternativo. Quando o WhatsApp abre, o usuário ainda precisa conferir e confirmar o envio. Isso não confirma reserva, disponibilidade ou emissão de passagem.

**Privacidade:** os dados informados são incluídos na mensagem/URL destinada ao WhatsApp. Trate nome, telefone, e-mail, itinerário e observações como dados pessoais; não os copie para logs, exemplos, screenshots, commits ou mensagens de diagnóstico. Não prometa que o fluxo atual grava esses dados na aplicação ou no Supabase.

**Pendente:** validar com a empresa o conteúdo, os canais de contato, a identidade, as imagens e o texto antes da publicação. O destino de WhatsApp configurado no código também deve ser confirmado pela empresa.

## API de cotação e integração Supabase

**Confirmado no código:** [src/app/api/flight-quote/route.ts](./src/app/api/flight-quote/route.ts) exporta um handler `POST` para a rota `/api/flight-quote`. Ele exige origem correspondente ao host, JSON, chave de idempotência UUID e corpo limitado a 8 KiB; rejeita campos não permitidos e valida os valores antes de chamar a RPC.

O rate limit implementado é de até 5 solicitações por janela de 15 minutos, mantido em memória no processo. **Limitação do desenho atual:** isso não é um limitador distribuído; em ambientes com vários processos ou instâncias, o estado pode não ser compartilhado. Não o descreva como proteção global ou persistente.

A rota chama `create_flight_quote_request` pelo cliente server-side definido em [src/lib/supabase/server.ts](./src/lib/supabase/server.ts). O cliente exige configuração de servidor e valida a URL do Supabase. A chave de service role deve permanecer exclusivamente no servidor; nunca a exponha em código cliente, logs, documentação ou valores de exemplo.

O código lê os nomes `SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_URL` como URL e `SUPABASE_SERVICE_ROLE_KEY` como chave server-side. Esta documentação não deve conter valores dessas variáveis. A presença de nomes no código não comprova que estejam configuradas no ambiente.

Respostas de sucesso incluem `requestId`; a rota também pode retornar erros HTTP de validação, origem, tipo de conteúdo, idempotência, limite de requisições ou indisponibilidade. Consulte a implementação antes de alterar ou documentar o contrato detalhado.

## Contrato de tipos e RPC

**Confirmado no código:** o tipo cliente está em [src/types/flight-quote.ts](./src/types/flight-quote.ts):

- `TripType`: `"one-way" | "round-trip"`.
- `FlightQuoteRequest`: origem, destino, passageiros, tipo de viagem, data e horário de partida, nome, organização, telefone, e-mail e observações; data e horário de retorno são opcionais.

O payload HTTP da API usa nomes `snake_case` e valores de viagem `"one_way" | "round_trip"`, distintos do tipo cliente.

**Confirmado no código e na migration:** o tipo `CreateFlightQuoteRequestArgs` e a tipagem local da RPC estão em [src/lib/supabase/server.ts](./src/lib/supabase/server.ts). A migration [001_flight_request_idempotency.sql](./supabase/migrations/001_flight_request_idempotency.sql) declara `public.create_flight_quote_request` com estes argumentos, nesta ordem:

1. `p_idempotency_key`: UUID.
2. `p_full_name`: texto.
3. `p_company`: texto anulável.
4. `p_phone`: texto.
5. `p_email`: texto anulável.
6. `p_origin`: texto.
7. `p_destination`: texto.
8. `p_trip_type`: texto (`one_way` ou `round_trip`).
9. `p_passengers`: inteiro.
10. `p_departure_date`: data.
11. `p_departure_time`: horário sem fuso.
12. `p_return_date`: data anulável.
13. `p_return_time`: horário sem fuso.
14. `p_notes`: texto anulável.

A função retorna UUID. O tipo TypeScript representa esse retorno como `string`.

**Confirmado na migration:** ela define idempotência por 24 horas e espera tabelas preexistentes `public.clients` e `public.flight_requests`, com colunas usadas pela função. O preflight exige PostgreSQL 17 ou superior, encoding UTF8 e `service_role` com `rolbypassrls`; a migration também instala/verifica `pgcrypto` no schema `extensions`. Ela habilita RLS na tabela de idempotência e não cria policies para as tabelas-base.

**Registro histórico informado:** há confirmação de execução bem-sucedida dessa migration no Supabase, incluindo existência da tabela de idempotência, da RPC e das permissões necessárias. Essa evidência é anterior à revisão que originou este documento. O estado atual do Supabase não foi consultado novamente; verifique-o por processo autorizado antes de depender dessa informação.

## Segurança e privacidade

- Valide dados no servidor mesmo quando houver validação equivalente no cliente.
- Preserve limites de tamanho, allowlist de campos, validação de data/horário, verificação de origem, idempotência e respostas sem cache da API, salvo mudança intencional e revisada.
- Mantenha acesso privilegiado ao Supabase isolado em código server-only. Nunca use service role no navegador.
- Não registre payloads, credenciais, tokens ou dados pessoais em logs. Mensagens de erro devem evitar revelar detalhes internos.
- Reavalie o tratamento de `Host`, `Origin`, `x-forwarded-for` e `x-real-ip` considerando o proxy/plataforma efetivamente usados. **Não verificado:** se os cabeçalhos de IP são sanitizados por um proxy confiável no ambiente atual.
- Considere que o rate limit em memória não é distribuído e que o endpoint não é chamado pelo formulário atual.
- Não introduza dependências, serviços externos, coleta de dados ou persistência adicional sem necessidade e autorização.
- Não declare conformidade legal, política de retenção ou estado operacional sem confirmação.

## Regras de Git e preservação do trabalho

- Antes de editar, examine `git status --short` e os diffs staged e unstaged dos arquivos relevantes.
- O worktree pode conter alterações do usuário. Preserve-as; não sobrescreva, descarte, formate em massa ou reverta mudanças que não foram feitas para a tarefa.
- Nunca use `git add .`, `git add -A` ou equivalentes para incluir arquivos indiscriminadamente. Faça stage apenas dos arquivos explicitamente relacionados e revise o staged diff.
- Nunca reverta arquivos indiscriminadamente. Não use comandos destrutivos para “limpar” o repositório.
- Não faça commit, push, deploy ou alterações de banco sem solicitação e autorização explícitas.
- Não inclua arquivos `.env*`, credenciais, artefatos gerados, dependências ou arquivos fora do escopo em uma entrega.

## Protocolo de trabalho com IA

- Investigue o projeto antes de modificar qualquer arquivo.
- Identifique os arquivos, componentes, integrações e dependências envolvidos na tarefa.
- Apresente o diagnóstico e o plano de execução antes de mudanças relevantes.
- Não execute operações destrutivas, SQL, commit, push ou deploy sem autorização explícita.
- Trabalhe em etapas pequenas e verificáveis; preserve alterações preexistentes.
- Evite refatorações e alterações fora do escopo solicitado.
- Execute os testes e a auditoria de segurança aplicáveis antes da entrega.
- Informe claramente o que foi alterado, o que foi testado e o que continua pendente ou não verificado.

## Testes, validação e auditoria de entrega

Antes de alterar código, leia as instruções relevantes do projeto e a documentação da versão instalada do Next.js em `node_modules/next/dist/docs/`. Não assuma que convenções de outras versões se aplicam.

Após mudanças de código, use os comandos existentes mais relevantes:

- `npm run lint` para lint.
- `npm run build` para validar a compilação e os tipos no fluxo de produção.
- Não invente que testes unitários ou de integração foram executados; não há script `test` confirmado atualmente.

Valide o comportamento alterado e suas superfícies relacionadas. Para formulário/API, confira coerência entre validação no cliente, contrato HTTP, tipos, argumentos da RPC e migration; não use chamadas reais que enviem dados pessoais ou gravem no banco sem autorização.

**Obrigatório antes de cada entrega:** faça uma auditoria de segurança das alterações efetivamente propostas, incluindo diff, fluxos de dados, validação, autenticação/autorização, exposição de segredos, logs, dependências e impactos sobre privacidade. Registre limitações e itens não verificados; não declare “seguro” apenas porque lint/build passaram. Corrija problemas introduzidos pela tarefa antes de entregar ou explique claramente o bloqueio.

## Estado, limitações e próximas etapas

### Registros históricos da revisão

Os itens abaixo registram o que foi observado ou informado durante uma revisão anterior; não descrevem necessariamente o estado presente. Verifique novamente as condições relevantes antes de cada tarefa.

- **Data da revisão:** 2026-11-08.
- **Repositório:** naquela revisão, havia alterações staged e unstaged preexistentes. O estado atual do Git não foi consultado novamente; execute `git status --short` e examine os diffs pertinentes antes de trabalhar.
- **Supabase:** foi informada confirmação histórica de execução bem-sucedida da migration, incluindo a tabela, a RPC e as permissões. Essa evidência antecede a revisão; o estado atual do banco não foi consultado novamente.
- **Ambiente:** nomes de variáveis encontrados no código não comprovam que estejam configuradas. A configuração presente do ambiente não foi verificada novamente.

### Confirmado no código na revisão anterior

- A página e o conteúdo são demonstrativos; a documentação existente pede confirmação da identidade e das informações pela empresa.
- O formulário abre uma mensagem no WhatsApp e não chama a API.
- A rota de API e a integração com Supabase existem no código, mas isso não comprova seu uso pelo formulário nem sua disponibilidade no ambiente atual.
- O `package.json` fornece `dev`, `build`, `start` e `lint`, sem script `test` confirmado naquela revisão.

### Pendências / não verificado atualmente

- Confirmar conteúdo, marca, serviços, frota, imagens e canais oficiais com a empresa.
- Decidir se o fluxo pretendido continuará sendo WhatsApp ou se o formulário deverá chamar a API e persistir solicitações.
- Confirmar, por processo autorizado, o estado atual do Supabase, schema-base, permissões e migration.
- Avaliar se o rate limit precisa de armazenamento compartilhado no ambiente de produção.
- Definir e verificar testes automatizados caso sejam necessários.

Não trate registros históricos ou pendências como estado atual sem evidência recente.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
