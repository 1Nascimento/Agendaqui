# Agendaqui

Agendaqui: sistema multiempresa com gerenciamento de usuários (Módulo 1), serviços (Módulo 2), agendamentos (Módulo 3) e gerenciamento operacional (Módulo 4).

## Requisitos

- Node.js 20.9+ (ou versão LTS mais recente)
- PostgreSQL
- Variaveis de ambiente baseadas em `.env.example`

## Como executar

1. Crie o arquivo `.env` com `DATABASE_URL`, `APP_URL` e as credenciais do primeiro administrador.
2. Instale as dependencias:

```bash
npm ci
```

3. Gere o cliente Prisma, aplique a migration e rode o seed:

```bash
npm run setup
```

4. Inicie a aplicacao:

```bash
npm run dev
```

O desenvolvimento usa `.next-dev`; `npm run build` e `npm start` usam `.next`. As saídas são separadas para evitar conflitos de cache entre desenvolvimento e produção.

## Recuperacao de senha

O Modulo 1 usa uma camada isolada para envio do link de redefinicao. Se `EMAIL_WEBHOOK_URL` estiver vazio, o link sera exibido no log do servidor para desenvolvimento local.

Para integrar um provedor real, configure `EMAIL_WEBHOOK_URL` para receber um POST JSON com:

- `from`
- `to`
- `subject`
- `text`

## Empresas

- Cadastre uma nova empresa e seu administrador em `/cadastro-empresa`.
- O login continua por e-mail e senha. Cada e-mail é único no sistema; administradores e funcionários pertencem a uma empresa, enquanto clientes têm contas independentes.
- Clientes se cadastram em `/cadastro` sem pertencer a uma empresa. Em **Empresas**, pesquisam pelo nome e selecionam onde agendar. Uma mesma conta pode agendar em várias empresas.
- A lista de clientes de cada administrador reúne somente quem já confirmou um agendamento naquela empresa. O cliente permanece na lista se cancelar depois, preservando o histórico. Administradores consultam esses clientes; os dados e o acesso da conta global são gerenciados pelo próprio cliente.
- A **Empresa Principal** é uma empresa comum que agrupa funcionários, administradores e serviços legados. Clientes antigos passam a ter contas independentes, mantendo seus agendamentos, senhas e sessões.
- Administradores gerenciam apenas a própria empresa. Serviços, funcionários, expedientes e agendamentos mantêm o isolamento por empresa; clientes acessam apenas os próprios agendamentos, em todas as empresas.
- Sessões e recuperação de senha continuam vinculadas à conta. Nenhum perfil `SUPER_ADMIN` foi criado.

Veja [o relatório de implementação multiempresa](docs/multiempresa.md) para a lista de arquivos, detalhes da migration, comandos de validação e decisões de compatibilidade.

## Módulo 3 — Gerenciamento de agendamentos

Para atualizar uma instalação existente, execute `npm run prisma:generate` e `npx prisma migrate deploy`. A migration acrescenta as tabelas do módulo sem apagar contas ou serviços.

### Como usar

1. O administrador cadastra funcionários e serviços; clientes criam uma conta independente e escolhem a empresa pela busca.
2. Cada funcionário entra em **Meu expediente** (`/funcionario/expediente`), marca seus dias de trabalho e informa início e término do atendimento. O administrador também pode gerenciar esses expedientes. Sem expediente salvo, o funcionário não oferece horários.
3. Em **Agendamentos → Novo agendamento**, o cliente seleciona um ou mais serviços e o funcionário. Funcionários e administradores também podem agendar para clientes cadastrados.
4. A aplicação apresenta datas e horários livres considerando a duração total dos serviços, o expediente e os compromissos do funcionário e do cliente.
5. Após revisar os dados, o usuário confirma o atendimento. Os detalhes permitem remarcar ou cancelar antes do início.
6. A aba **Histórico** reúne cancelados e atendimentos cujo horário terminou. Os detalhes de cada atendimento registram confirmação, horários anteriores de remarcações, cancelamento e responsável por cada alteração.

### Regras

- Clientes consultam e alteram somente seus próprios agendamentos. Funcionários acessam somente atendimentos atribuídos a eles. Administradores acessam toda a agenda da própria empresa.
- O expediente se repete semanalmente, com um intervalo de trabalho por dia. Dias desmarcados ficam fechados. Não há horários de trabalho impostos pelo sistema.
- Horários são exibidos no fuso de Brasília (`America/Sao_Paulo`, UTC−3), com novos inícios a cada 15 minutos a partir da abertura de cada dia e até 60 dias de antecedência. Essas regras estão centralizadas em `src/server/agendamentos/calendario.ts`.
- Todo o atendimento precisa caber no expediente. Não são permitidos horários passados ou sobrepostos, inclusive para o mesmo cliente com funcionários diferentes.
- A confirmação consulta novamente a disponibilidade no servidor. Transações PostgreSQL com isolamento `Serializable` e novas tentativas em caso de concorrência protegem as reservas. Remarcação e cancelamento verificam também a versão do agendamento para não sobrescrever alterações feitas em outra tela.
- Reduzir ou fechar o expediente é bloqueado quando isso deixaria um atendimento confirmado fora do horário de trabalho. Primeiro é necessário remarcar ou cancelar o compromisso.
- A remarcação mantém o funcionário, os serviços, os preços e as durações contratadas. O cancelamento libera a vaga e mantém o histórico.
- A exclusão ou edição de um serviço no catálogo preserva seu nome, preço e duração nos agendamentos existentes.
- A situação **Aguardando baixa** indica que o horário terminou. O Módulo 4 exige confirmação explícita para registrar atendimento realizado ou falta.

### Verificação

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Os testes unitários cobrem os três módulos. Os testes de integração precisam do PostgreSQL configurado no `.env` e das migrations aplicadas:

```bash
npm run test:integration
```

A integração cria registros com identificadores exclusivos e remove apenas esses registros ao finalizar. Ela verifica concorrência real, remarcação, cancelamento, expediente e isolamento entre empresas. O teste da migration usa um schema temporário em uma transação revertida no final; a conexão de teste precisa poder criar schemas. Opcionalmente, defina `AGENDA_TEST_BASE_URL` apontando para uma instância local em execução, com o mesmo banco de dados, para verificar também a renderização HTTP das páginas autenticadas e os controles de acesso. Sem essa variável, somente os dois testes HTTP são ignorados.

## Módulo 4 — Gerenciamento operacional

Para atualizar outra instalação, execute `npm run prisma:generate` e `npx prisma migrate deploy`. A migration preserva os dados existentes e mantém agendamentos antigos como confirmados, sem presumir presença ou pagamento.

| Requisito | Implementação |
| --- | --- |
| Agenda dos funcionários | Reaproveitada em `/agendamentos`, com filtros de data, funcionário e situação e abas de próximos, histórico, baixa pendente e todos. |
| Atendimentos realizados | Nos detalhes do agendamento, administrador ou funcionário responsável registra **Realizado** ou **Não compareceu**, após o término previsto. Autor e data ficam no histórico. |
| Pagamentos | `/admin/pagamentos` mostra quanto entrou no mês, o total a receber e o histórico dos meses anteriores. Recebimentos e estornos são registrados nos detalhes de cada agendamento. |
| Clientes cadastrados | Reaproveitada em `/admin/clientes`, com busca por nome, e-mail ou telefone e filtro de contas ativas/inativas. |
| Dashboard administrativo | `/admin` mostra atendimentos de hoje, atendimentos para finalizar, quanto entrou no mês, total a receber, próximos atendimentos e acessos de gerenciamento. |

### Fluxo operacional

1. Consulte a agenda ou **Aguardando baixa** e abra o atendimento cujo horário terminou.
2. Selecione o resultado e confirme. Apenas **Realizado** gera saldo a receber; falta e cancelamento não geram cobrança.
3. Entre como administrador e abra os detalhes do atendimento na agenda. Registre o valor efetivamente recebido e a forma de pagamento; recebimentos parciais são permitidos.
4. Para corrigir um recebimento, registre seu estorno integral com motivo e lance o novo valor. O lançamento original e os responsáveis permanecem visíveis.
5. Acompanhe os indicadores do dashboard. As ações atualizam agenda, painel e pagamentos.

### Regras e limites

- Valores são calculados em centavos e gravados com duas casas decimais. Não se aceita valor zero, negativo, com precisão maior que dois decimais ou acima do saldo.
- Resultados, pagamentos e estornos usam transações e versão do agendamento para impedir baixa repetida, recebimento duplicado e sobrescrita por formulário antigo. Conflitos de serialização refazem as validações com um pequeno atraso entre tentativas.
- Funcionários dão baixa somente na própria agenda. Clientes acompanham somente seus agendamentos e respectivos recebimentos. Apenas administradores gerenciam pagamentos da própria empresa; as relações no banco também preservam o isolamento entre empresas.
- Indicadores de atendimentos usam a data agendada. Recebimentos e estornos usam a data em que cada movimento foi registrado: uma devolução neste mês de pagamento feito no mês anterior reduz o líquido deste mês.
- Saldo pendente total, baixa pendente, agenda atual e contagem de contas independem do período escolhido. O ticket médio corresponde ao valor dos serviços realizados dividido pelo número de atendimentos realizados.
- O gerenciamento é um registro manual, sem integração de cobrança, emissão fiscal ou devolução automática ao banco. A baixa é definitiva na interface e pede revisão antes da confirmação.
- As consultas atuais carregam os registros da empresa para montar os resumos; paginação e agregações no banco são melhorias futuras para empresas com grande volume.

### Correções adicionais e validação

Foram corrigidos o consumo concorrente de tokens de redefinição de senha (troca, invalidação de tokens e revogação de sessões agora são atômicos), erros de login com hashes corrompidos, mensagem genérica em duplicidade de e-mail concorrente, repetição imediata de conflitos de transação e ordenação instável de eventos/recebimentos com timestamps iguais. Filtros aceitam parâmetros repetidos na URL sem quebrar as páginas.

Além dos comandos de verificação acima, os testes de integração do Módulo 4 cobrem concorrência, isolamento, rollback de recebimentos, recuperação de senha e preservação dos registros legados na migration. Com o aplicativo em execução, habilite também as verificações HTTP, incluindo envio dos formulários reais:

```powershell
$env:AGENDA_TEST_BASE_URL = 'http://localhost:3000'
npm run test:integration
```

Veja [o relatório do Módulo 4](docs/modulo-4.md) para o resumo da entrega e validação.

## Próximos módulos

Notificações de agendamento, integração de cobrança e relatórios exportáveis permanecem fora deste escopo.
