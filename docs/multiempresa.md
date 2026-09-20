# Evolução multiempresa

A implementação preserva os módulos de usuários, serviços e agendamentos, seus perfis e rotas. Empresa é uma entidade própria; não é funcionário e não existe perfil SUPER_ADMIN.

## Pontos de isolamento

| Área | Alteração |
| --- | --- |
| Conta e sessão | A conta inclui empresaId e resumo da empresa; a sessão continua referenciando a Conta. Guards exigem conta ativa e empresa correspondente. |
| Contas administrativas | Listagem, busca por ID, edição, status, contagem de administradores e revogação das sessões de uma conta são limitados à empresa do administrador. |
| Serviços | Cadastro usa empresa da sessão; busca, validação de nomes, listagem, edição e exclusão recebem empresaId obrigatório. Nomes iguais em empresas diferentes são permitidos. |
| Agenda | Empresa participa da seleção dos serviços, clientes e funcionários, consulta de conflitos, confirmação, remarcação, cancelamento e histórico. |
| Expediente | Leitura e gravação são limitadas à empresa; funcionário continua gerenciando apenas o próprio expediente. |
| Páginas | Consultas diretas ao Prisma usam empresaId; URLs de edição e detalhes não permitem obter registros de outra empresa. |
| Cadastro público | `/cadastro-empresa` cria empresa e administrador atomicamente; `/cadastro?empresa=SLUG` cria apenas cliente na empresa indicada. |
| Recuperação de senha | O token continua identificando uma única Conta; atualização e revogação usam a empresa daquela conta. |
| Interface | Mantidos os componentes e estilos. Nome da empresa no cabeçalho; link de cadastro dos clientes no painel administrativo. |

As actions administrativas obtêm o ator nos guards, e os services derivam empresaId desse ator. Campos adulterados de empresa ou perfil não mudam a empresa de gravação. A autorização existe no servidor, além dos filtros das páginas.

Login e recuperação por e-mail permanecem globais porque o e-mail continua único. Essas consultas autenticam/recuperam uma identidade específica; não são listagens administrativas. A consulta pública de empresa pelo slug expõe somente id, nome e slug para permitir o cadastro do cliente.

## Banco e migração

Migration: `prisma/migrations/20260920000000_multiempresa/migration.sql`.

1. Cria Empresa com id, nome, slug único e datas de criação/atualização.
2. Cria a empresa inicial, id `empresa_padrao`, slug legado `barbearia-principal`. O seed adota o nome de exibição **Empresa Principal** e atualiza somente o nome inicial legado, preservando nomes personalizados.
3. Adiciona empresaId inicialmente opcional em Conta, Servico, Agendamento e ExpedienteFuncionario.
4. Preenche todos os registros anteriores com a empresa padrão.
5. Torna os campos obrigatórios e acrescenta índices e chaves estrangeiras.
6. Usa relações compostas entre Agendamento/ExpedienteFuncionario e Conta para impedir participantes de outra empresa também no banco.

Todo o processo ocorre dentro de uma transação. Nenhuma tabela ou registro existente é removido. A substituição de constraints não apaga dados. Não há valor padrão permanente para empresaId: novas gravações precisam informar a empresa correta.

A migration histórica e seu teste mantêm o conteúdo original. A troca de nomenclatura para **Empresa Principal** altera apenas o nome inicial, sem modificar o id, o slug, as relações ou os links de cadastro.

AgendamentoServico e EventoAgendamento herdam o contexto pelo Agendamento, sem empresaId duplicado. SessaoConta e TokenRecuperacaoSenha continuam associados à Conta. O seed permanece voltado à empresa padrão e recusa alterar uma conta cujo e-mail pertença a outra empresa.

Na execução local foram comparados contagens e resumos dos campos antes e depois da migration: **6 contas, 1 serviço, 13 sessões e 1 token de recuperação**, sem alterações nos campos anteriores. Não havia agendamentos ou expedientes salvos nesse banco. Um teste adicional recriou registros legados completos, incluindo agenda, serviços contratados, eventos e expediente, e validou sua preservação na migration.

## Validação executada

| Comando/verificação | Resultado |
| --- | --- |
| `npm install --save-dev eslint@^9 @eslint/js@^9 typescript-eslint@^8 globals@^16` | Dependências de lint instaladas. |
| `npm install --save-dev @next/eslint-plugin-next@15.5.23` | Plugin compatível com o Next instalado. |
| `npm run prisma:generate` | Cliente Prisma gerado. |
| `npx prisma migrate deploy` | Migration multiempresa aplicada no banco configurado no .env. |
| Comparação dos dados antes/depois | Dados e relações anteriores preservados. |
| `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code` | Nenhuma diferença entre banco e schema. |
| `npm run typecheck` | Sem erros. |
| `npm run lint` | Sem erros. |
| `npm test` | 73 testes unitários aprovados. |
| `npm run test:integration` | 17 aprovados; 2 testes HTTP condicionais inicialmente ignorados. |
| `AGENDA_TEST_BASE_URL=http://127.0.0.1:3100 npm run test:integration` (variável definida no PowerShell) | 19 testes de integração aprovados, incluindo os dois testes HTTP. |
| `npm run build` | Build de produção concluído. |
| `git diff --check` | Sem erros de whitespace. |

Para os testes HTTP, o build foi iniciado temporariamente com `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100`. O processo foi encerrado após a verificação. A verificação visual em navegador não foi executada; os testes HTTP validam renderização do servidor e restrições de acesso.

Os testes criam apenas fixtures identificadas e limpam esses registros. O teste de migration usa um schema temporário cuja criação e dados são revertidos ao final. Não houve reset, exclusão dos dados existentes nem commit.

## Arquivos criados ou alterados nesta evolução

As alterações anteriores do Módulo 3 continuam no workspace. A lista abaixo identifica os arquivos tocados especificamente para a evolução multiempresa.

```text
README.md
docs/multiempresa.md
package.json
package-lock.json
eslint.config.mjs
prisma/schema.prisma
prisma/seed.mjs
prisma/migrations/20260920000000_multiempresa/migration.sql
src/server/domain/perfis.ts
src/server/auth/guards.ts
src/server/empresas/contexto.ts
src/server/empresas/repository.ts
src/server/empresas/prisma-repository.ts
src/server/empresas/service.ts
src/server/empresas/service.test.ts
src/server/empresas/prisma.integration.ts
src/server/empresas/migracao.integration.ts
src/server/contas/repository.ts
src/server/contas/prisma-repository.ts
src/server/contas/service.ts
src/server/contas/validation.ts
src/server/contas/service.test.ts
src/server/servicos/repository.ts
src/server/servicos/prisma-repository.ts
src/server/servicos/service.ts
src/server/servicos/service.test.ts
src/server/agendamentos/repository.ts
src/server/agendamentos/prisma-repository.ts
src/server/agendamentos/service.ts
src/server/agendamentos/expediente.ts
src/server/agendamentos/service.test.ts
src/server/agendamentos/prisma.integration.ts
src/app/actions/auth.ts
src/app/cadastro/page.tsx
src/app/cadastro-empresa/page.tsx
src/app/login/page.tsx
src/app/admin/page.tsx
src/app/admin/contas/[id]/editar/page.tsx
src/app/admin/servicos/[id]/editar/page.tsx
src/app/servicos/page.tsx
src/app/agendamentos/novo/page.tsx
src/app/funcionario/expediente/page.tsx
src/components/AppShell.tsx
src/components/CadastroContaForm.tsx
```

As actions de contas, serviços e agendamentos existentes continuam chamando os services, que agora exigem e aplicam o contexto da empresa. Não foi necessário mudar os formulários de agendamento nem suas rotas.

## Uso e ajustes manuais

- Não é necessário reassociar manualmente os registros antigos: a migration já os vinculou à empresa padrão.
- Reinicie uma instância antiga da aplicação para carregar o cliente Prisma e o código novos.
- Novas empresas usam `/cadastro-empresa`. Cada administrador encontra no painel o endereço para compartilhar com seus clientes.
- Confira `APP_URL` no ambiente de implantação para gerar links com o domínio correto; `.env` e credenciais existentes não foram alterados.
- Cada funcionário continua responsável por definir seu expediente antes de receber reservas.
- Mantida a regra de um e-mail por conta no sistema. Múltiplos vínculos de uma pessoa com o mesmo e-mail, transferência de registros entre empresas e administração global não fazem parte desta entrega.

Não há funcionalidade solicitada pendente de implementação ou correção manual.
