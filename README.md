# Agendaqui

Agendaqui: sistema multiempresa com gerenciamento de usuários (Módulo 1), serviços (Módulo 2) e agendamentos (Módulo 3).

## Requisitos

- Node.js 20.9+ (ou versão LTS mais recente)
- PostgreSQL
- Variaveis de ambiente baseadas em `.env.example`

## Como executar

1. Crie o arquivo `.env` com `DATABASE_URL`, `APP_URL` e as credenciais do primeiro administrador.
2. Instale as dependencias:

```bash
npm install
```

3. Gere o cliente Prisma, aplique a migration e rode o seed:

```bash
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
```

4. Inicie a aplicacao:

```bash
npm run dev
```

## Recuperacao de senha

O Modulo 1 usa uma camada isolada para envio do link de redefinicao. Se `EMAIL_WEBHOOK_URL` estiver vazio, o link sera exibido no log do servidor para desenvolvimento local.

Para integrar um provedor real, configure `EMAIL_WEBHOOK_URL` para receber um POST JSON com:

- `from`
- `to`
- `subject`
- `text`

## Empresas

- Cadastre uma nova empresa e seu administrador em `/cadastro-empresa`.
- O login continua por e-mail e senha. Cada e-mail é único no sistema, e cada conta pertence a uma empresa.
- O painel administrativo exibe o nome da empresa e o endereço de cadastro de seus clientes: `/cadastro?empresa=SLUG`.
- `/cadastro` sem empresa continua atendendo a **Empresa Principal**, que recebe automaticamente todos os dados anteriores à migration multiempresa. O identificador de cadastro legado é preservado para manter os links existentes.
- Administradores gerenciam apenas a própria empresa. Contas, serviços, expedientes e agendamentos usam a empresa da sessão para autorização no servidor.
- Sessões e recuperação de senha continuam vinculadas à conta. Nenhum perfil `SUPER_ADMIN` foi criado.

Veja [o relatório de implementação multiempresa](docs/multiempresa.md) para a lista de arquivos, detalhes da migration, comandos de validação e decisões de compatibilidade.

## Módulo 3 — Gerenciamento de agendamentos

Para atualizar uma instalação existente, execute `npm run prisma:generate` e `npx prisma migrate deploy`. A migration acrescenta as tabelas do módulo sem apagar contas ou serviços.

### Como usar

1. O administrador cadastra funcionários e serviços; clientes usam o link de cadastro da empresa.
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
- A situação **Encerrado** indica que o horário terminou; não é uma confirmação de presença ou execução do serviço.

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

## Próximos módulos

Pagamentos, notificações de agendamento, métricas e relatórios permanecem fora deste escopo.
