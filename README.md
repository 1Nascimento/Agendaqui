# Agendaqui

Implementacao inicial do Modulo 1: gerenciamento de usuarios, autenticacao, autorizacao e recuperacao de senha.

## Requisitos

- Node.js 20+
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
npm run prisma:migrate
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

## Escopo

Este projeto implementa somente contas e autenticacao. Servicos, agenda, calendario, pagamentos, notificacoes de agendamento, metricas e relatorios ficam reservados para modulos futuros.
