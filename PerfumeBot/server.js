const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// Banco de dados simulado: os produtos ficam em memória neste servidor.
const perfumes = [
  { id: 1, nome: "Urban Night", marca: "Essenza", genero: "Masculino", aroma: "Amadeirado", preco: 249.90, estoque: 8 },
  { id: 2, nome: "Classic Wood", marca: "Essenza", genero: "Masculino", aroma: "Clássico", preco: 189.90, estoque: 5 },
  { id: 3, nome: "Golden Night", marca: "Essenza", genero: "Unissex", aroma: "Doce e amadeirado", preco: 279.90, estoque: 4 },
  { id: 4, nome: "Floral Dream", marca: "Essenza", genero: "Feminino", aroma: "Floral", preco: 219.90, estoque: 7 },
  { id: 5, nome: "Fresh Bloom", marca: "Essenza", genero: "Feminino", aroma: "Cítrico e fresco", preco: 159.90, estoque: 10 }
];

const pedidos = [
  { id: "PB1001", cliente: "Cliente demonstração", produto: "Golden Night", status: "Em preparação" }
];

function responder(res, status, dados) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(dados));
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let corpo = "";
    req.on("data", parte => corpo += parte);
    req.on("end", () => {
      try { resolve(corpo ? JSON.parse(corpo) : {}); }
      catch (erro) { reject(erro); }
    });
    req.on("error", reject);
  });
}

function formatarPreco(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// API simulada: responde perguntas consultando o catálogo em memória.
function responderChat(pergunta) {
  const texto = String(pergunta || "").toLowerCase();

  if (texto.includes("entrega") || texto.includes("pedido") || texto.includes("rastre")) {
    return {
      resposta: "Temos um pedido de demonstração PB1001. O status atual é: " +
        (pedidos.find(p => p.id === "PB1001")?.status || "Não encontrado") +
        ". Você também pode clicar em “Simular webhook” para receber uma atualização.",
      origem: "API de pedidos simulada"
    };
  }

  if (texto.includes("doce") || texto.includes("noite") || texto.includes("recomend")) {
    const p = perfumes.find(item => item.id === 3);
    return {
      resposta: `Minha sugestão é ${p.nome}, com aroma ${p.aroma.toLowerCase()}, por ${formatarPreco(p.preco)}.`,
      produto: p,
      origem: "API de catálogo simulada"
    };
  }

  if (texto.includes("masculino") || texto.includes("preço") || texto.includes("precos") ||
      texto.includes("preços") || texto.includes("até") || texto.includes("valor") ||
      texto.includes("catálogo") || texto.includes("catalogo")) {
    const encontrados = perfumes.filter(p => p.genero === "Masculino" && p.preco <= 300);
    const lista = encontrados.map(p => `${p.nome}: ${formatarPreco(p.preco)} (estoque: ${p.estoque})`).join("\n");
    return {
      resposta: "Encontrei estas opções masculinas de até R$ 300:\n" + lista,
      produtos: encontrados,
      origem: "API de catálogo simulada"
    };
  }

  return {
    resposta: "Posso ajudar com preços, perfumes masculinos, recomendações de aromas doces ou informações sobre pedidos. O que você procura?",
    origem: "Assistente PerfumeBot"
  };
}

const server = http.createServer(async (req, res) => {
  // Permite chamadas OPTIONS para facilitar testes da API.
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    // ROTA DA API: catálogo de perfumes.
    if (req.method === "GET" && url.pathname === "/api/perfumes") {
      return responder(res, 200, {
        sucesso: true,
        total: perfumes.length,
        dados: perfumes
      });
    }

    // ROTA DA API: chatbot.
    if (req.method === "POST" && url.pathname === "/api/chat") {
      const corpo = await lerCorpo(req);
      if (!corpo.pergunta) {
        return responder(res, 400, { sucesso: false, erro: "Informe uma pergunta." });
      }
      return responder(res, 200, {
        sucesso: true,
        ...responderChat(corpo.pergunta)
      });
    }

    // ROTA DA API: consulta de pedido.
    if (req.method === "GET" && url.pathname.startsWith("/api/pedidos/")) {
      const id = url.pathname.split("/").pop();
      const pedido = pedidos.find(p => p.id === id);
      if (!pedido) return responder(res, 404, { sucesso: false, erro: "Pedido não encontrado." });
      return responder(res, 200, { sucesso: true, pedido });
    }

    // WEBHOOK SIMULADO:
    // Em um cenário real, outro sistema faria um POST nesta rota quando o pedido mudasse.
    if (req.method === "POST" && url.pathname === "/webhook/pedido-status") {
      const evento = await lerCorpo(req);
      const pedido = pedidos.find(p => p.id === evento.pedidoId);

      if (!pedido) {
        return responder(res, 404, { sucesso: false, erro: "Pedido do webhook não encontrado." });
      }

      pedido.status = evento.novoStatus || "Enviado";
      console.log("WEBHOOK RECEBIDO:", evento);

      return responder(res, 200, {
        sucesso: true,
        tipoEvento: "pedido.status_atualizado",
        mensagem: `Webhook recebido! O pedido ${pedido.id} agora está: ${pedido.status}.`,
        pedido
      });
    }

    // Arquivos do site.
    const arquivoRelativo = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
    const caminho = path.normalize(path.join(PUBLIC_DIR, arquivoRelativo));

    if (!caminho.startsWith(PUBLIC_DIR)) {
      return responder(res, 403, { erro: "Acesso não permitido." });
    }

    fs.readFile(caminho, (erro, conteudo) => {
      if (erro) return responder(res, 404, { erro: "Arquivo não encontrado." });

      const extensoes = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8"
      };
      res.writeHead(200, { "Content-Type": extensoes[path.extname(caminho)] || "application/octet-stream" });
      res.end(conteudo);
    });
  } catch (erro) {
    console.error(erro);
    responder(res, 500, { sucesso: false, erro: "Erro interno no servidor." });
  }
});

server.listen(PORT, () => {
  console.log(`PerfumeBot funcionando em http://localhost:${PORT}`);
  console.log("API: GET /api/perfumes | POST /api/chat | GET /api/pedidos/PB1001");
  console.log("Webhook de demonstração: POST /webhook/pedido-status");
});