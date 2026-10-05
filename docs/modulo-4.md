# Módulo 4 — Gerenciamento operacional

## Escopo entregue

A agenda, o cadastro de clientes, o controle de acesso e o isolamento por empresa foram reaproveitados. O painel administrativo existente foi ampliado. Não foram criados cadastros paralelos ou dados financeiros fictícios para registros antigos.

| Item | Situação | Local |
| --- | --- | --- |
| Agenda dos funcionários | Existente e ampliada com filtros de data, funcionário, resultado e baixa pendente | `/agendamentos` |
| Controle dos atendimentos realizados | Novo, com resultado explícito e evento auditável | `/agendamentos/[id]` |
| Gerenciamento de pagamentos | Resumo mensal, total a receber e histórico dos meses anteriores; registros e estornos nos detalhes do agendamento | `/admin/pagamentos` e detalhes do agendamento |
| Consulta de clientes | Existente e ampliada com busca e filtro de status | `/admin/clientes` |
| Dashboard administrativo | Resumo com quatro indicadores, próximos atendimentos e acessos de gerenciamento | `/admin` |

## Decisões de funcionamento

- O horário encerrado fica **Aguardando baixa**. Nenhum registro é considerado realizado somente porque o tempo passou.
- Administrador e funcionário responsável podem registrar realização ou falta após o término previsto. A confirmação na tela permite revisar o resultado, que não é reversível pela interface.
- Pagamentos são recebimentos manuais, exclusivamente administrativos e vinculados a atendimentos realizados. Dinheiro, Pix, cartão de crédito e cartão de débito são formas de registro, sem processamento externo da cobrança.
- É possível registrar mais de um recebimento, sem ultrapassar o valor dos serviços contratados. O saldo usa os preços preservados no agendamento, não o catálogo atual.
- Estornos são integrais por lançamento. Não apagam o pagamento original e exigem motivo, responsável e data. Reabrem o saldo a receber.
- Realização e movimentos financeiros incrementam a versão do agendamento. Transações serializáveis com novas tentativas protegem as operações concorrentes e formulários antigos retornam mensagem de atualização.
- A empresa é obtida da sessão. Chaves estrangeiras compostas impedem relacionar um pagamento a atendimento ou responsável de outra empresa.
- Clientes veem os próprios recebimentos, mas não podem criar ou estornar lançamentos. Funcionários não administram pagamentos.

## Indicadores

A tela de pagamentos contém apenas **Entrou no mês**, **A receber** e uma tabela dos meses anteriores. Os valores mensais somam os recebimentos e descontam os estornos pela data de cada movimento, no fuso de Brasília. O total a receber considera o saldo de todos os atendimentos realizados. Os textos explicativos abaixo dos títulos foram removidos das telas.

O dashboard mostra apenas quatro indicadores: **Atendimentos hoje**, **Para finalizar**, **Entrou no mês** e **A receber**. Cada indicador abre a tela correspondente. A página não exige seleção de período; o resumo financeiro usa o mês atual em Brasília, com o mesmo cálculo da tela de pagamentos.

A lista dos próximos cinco atendimentos contém horário, cliente, funcionário e acesso aos detalhes. O botão **Novo agendamento** fica no topo. Os acessos de gerenciamento levam a clientes, funcionários, serviços e contas; o link de cadastro dos clientes fica em uma seção recolhida.

## Atualização do banco

Migration: `20261005000000_modulo_4_gerenciamento_operacional`.

A atualização acrescenta os resultados `REALIZADO` e `NAO_COMPARECEU`, os respectivos tipos de evento, formas de pagamento e a tabela `Pagamento`. Mantém os agendamentos antigos e não cria cobranças automaticamente. Há constraints para valor positivo, estorno completo e isolamento entre empresas.

```bash
npm run prisma:generate
npx prisma migrate deploy
```

## Bugs corrigidos durante a revisão

- Redefinição de senha deixa de aceitar o mesmo token em operações simultâneas: bloqueio da conta, consumo do token, troca de senha, invalidação dos demais tokens e revogação das sessões são feitos em uma transação.
- Hashes de senha inválidos ou com parâmetros inesperados não provocam erro no login.
- Conflitos de e-mail no banco retornam mensagem de duplicidade, inclusive quando dois cadastros passam pela consulta inicial ao mesmo tempo.
- Transações da agenda e da operação repetem as validações com atraso progressivo após conflitos de serialização, reduzindo colisões sucessivas.
- O histórico usa identificador como desempate de timestamps, preservando ordenação estável de eventos e recebimentos.
- As telas reconhecem os novos resultados no histórico e distinguem horário terminado de atendimento realizado.
- Filtros normalizam parâmetros repetidos da URL e exibem datas inválidas como erro de formulário.
- Testes HTTP permitem o tempo de compilação inicial das rotas em desenvolvimento; o limite dos testes de banco permanece menor.

## Verificação

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:integration
```

Para incluir as verificações HTTP, inicie a aplicação com o mesmo banco e configure `AGENDA_TEST_BASE_URL`. Os testes usam identificadores exclusivos e removem somente os registros temporários que criam. Cobrem baixa concorrente, recebimento concorrente, estorno concorrente, rollback, isolamento de empresas, autenticação, consumo concorrente do token de senha, preservação na migration e envio real dos formulários HTTP de baixa, recebimento e estorno. O reenvio de um formulário de recebimento não pode duplicar o lançamento.

Resultado após a simplificação da interface: 118 testes unitários e 29 testes de integração passaram, incluindo as verificações HTTP em `http://localhost:3100`. A migration foi aplicada no PostgreSQL local configurado e o cliente Prisma foi regenerado. A verificação de tipos, o lint e o build de produção passaram.

## Limitações atuais

Não há gateway de pagamento, emissão fiscal, notificações, estorno automático no banco ou relatórios exportáveis. A consulta do dashboard carrega os registros da empresa em memória; paginação e agregações no banco podem ser acrescentadas para grandes volumes.

A validação visual por navegador não estava disponível nesta sessão. A renderização autenticada e as mutações foram verificadas por HTTP. As verificações cobrem os fluxos documentados e não constituem garantia de ausência de todo bug possível.
