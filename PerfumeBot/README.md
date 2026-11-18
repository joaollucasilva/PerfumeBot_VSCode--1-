# PerfumeBot — projeto para Visual Studio Code

Protótipo de uma loja de perfumes com chatbot, API REST e webhook simulados usando Node.js sem bibliotecas externas.

## Requisitos
- Node.js 18 ou superior
- Visual Studio Code

## Como executar
1. Extraia a pasta `PerfumeBot`.
2. Abra essa pasta no Visual Studio Code.
3. Abra **Terminal > Novo Terminal**.
4. Execute:

   ```bash
   npm start
   ```

   Também é possível executar `node server.js`.

5. No navegador, acesse: http://localhost:3000

Não abra o `index.html` diretamente. O site precisa do servidor Node.js para as chamadas da API e do webhook funcionarem.

## O que foi simulado

### API REST
- `GET /api/perfumes` — retorna o catálogo e o estoque fictício.
- `POST /api/chat` — recebe `{ "pergunta": "..." }` e devolve uma resposta.
- `GET /api/pedidos/PB1001` — consulta o pedido de demonstração.

### Webhook
- `POST /webhook/pedido-status` — recebe um evento com `pedidoId` e `novoStatus` e atualiza o pedido em memória.
- O botão **Simular webhook: pedido enviado** envia esse evento para demonstrar a notificação.

## Testes manuais da API
Com o servidor ligado, abra no navegador:
- http://localhost:3000/api/perfumes
- http://localhost:3000/api/pedidos/PB1001

Para testar o chat e o webhook, use a interface do site.

## Importante para a apresentação
Esta é uma simulação acadêmica local:
- Os produtos e pedidos ficam em memória no servidor; não há banco de dados.
- A API é criada pelo próprio projeto, não é uma API de fornecedor real.
- O webhook é demonstrado pelo botão, que envia um POST ao endpoint local. Em produção, o sistema de pedidos enviaria o evento automaticamente.
- Não há compra, pagamento ou envio real.
