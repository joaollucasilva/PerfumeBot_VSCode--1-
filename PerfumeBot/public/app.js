const areaMensagens = document.getElementById("mensagens");
const formulario = document.getElementById("form-chat");
const campoPergunta = document.getElementById("pergunta");

function moeda(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function adicionarMensagem(texto, tipo) {
  const elemento = document.createElement("div");
  elemento.className = `mensagem ${tipo}`;
  elemento.textContent = texto;
  areaMensagens.appendChild(elemento);
  areaMensagens.scrollTop = areaMensagens.scrollHeight;
}

// CHAMADA À API: busca os perfumes no servidor Node.js.
async function carregarCatalogo() {
  const status = document.getElementById("status-api");
  try {
    const resposta = await fetch("/api/perfumes");
    const resultado = await resposta.json();
    if (!resposta.ok) throw new Error("Falha na API");

    document.getElementById("produtos").innerHTML = resultado.dados.map(p => `
      <article class="produto">
        <div class="produto-icone">🧴</div>
        <h3>${p.nome}</h3>
        <p>${p.genero} · ${p.aroma}</p>
        <strong>${moeda(p.preco)}</strong>
        <p>Estoque disponível: ${p.estoque}</p>
      </article>
    `).join("");
    status.textContent = `✓ API conectada · ${resultado.total} produtos`;
  } catch (erro) {
    status.textContent = "API indisponível";
    console.error(erro);
  }
}

// CHAMADA À API: envia a pergunta e recebe a resposta do chatbot.
async function enviarPergunta(pergunta) {
  if (!pergunta.trim()) return;
  adicionarMensagem(pergunta, "usuario");

  try {
    const resposta = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta })
    });
    const resultado = await resposta.json();
    if (!resposta.ok) throw new Error(resultado.erro || "Erro na API");
    adicionarMensagem(resultado.resposta, "bot");
  } catch (erro) {
    adicionarMensagem("Não consegui acessar o servidor. Verifique se o projeto está em execução.", "bot");
    console.error(erro);
  }
}

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const pergunta = campoPergunta.value;
  campoPergunta.value = "";
  await enviarPergunta(pergunta);
});

document.querySelectorAll("[data-pergunta]").forEach(botao => {
  botao.addEventListener("click", () => enviarPergunta(botao.dataset.pergunta));
});

// WEBHOOK SIMULADO: o navegador envia um evento ao endpoint do servidor.
// Em uma integração real, esse POST seria enviado pelo sistema de pedidos.
document.getElementById("simular-webhook").addEventListener("click", async () => {
  try {
    const resposta = await fetch("/webhook/pedido-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evento: "pedido.status_atualizado",
        pedidoId: "PB1001",
        novoStatus: "Enviado"
      })
    });
    const resultado = await resposta.json();
    if (!resposta.ok) throw new Error(resultado.erro || "Falha no webhook");
    adicionarMensagem("🔔 NOTIFICAÇÃO DO WEBHOOK\n" + resultado.mensagem, "bot");
  } catch (erro) {
    adicionarMensagem("Não foi possível simular o webhook. Confira o servidor.", "bot");
    console.error(erro);
  }
});

carregarCatalogo();