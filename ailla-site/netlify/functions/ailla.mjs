// Função do site da Ailla (Netlify): recebe a pergunta do app e pede a resposta ao Gemini.
// A chave fica guardada no Netlify (variável GEMINI_API_KEY) e nunca vai para o celular de quem usa o app.

const env = (k) => (globalThis.Netlify?.env?.get?.(k)) ?? process.env[k];

const PUBLICO = {
  kids: 'uma criança de 7 a 12 anos. Use frases curtas e alegres. Se o pedido envolver dinheiro, compras, encontros, sair sozinha ou temas de adulto, o primeiro passo deve ser chamar um adulto responsável.',
  geral: 'um adulto que quer mais autonomia no dia a dia. Seja direto.',
  idoso: 'uma pessoa idosa com pouca experiência com celular. Seja calmo, diga exatamente onde tocar, use palavras simples e reforce cuidados com golpes.',
  acessivel: 'uma pessoa com deficiência (visual, auditiva ou motora). Inclua dicas de acessibilidade quando fizer sentido, como leitor de tela, ditado por voz, legendas ou atalhos.'
};

function regras(modo) {
  return `Você é a Ailla, uma vagalume simpática dentro de um app de tecnologia assistiva. Lema: "Ailla ilumina, você caminha."
Seu papel é GUIAR, nunca executar: você não faz nada pela pessoa, não acessa o celular dela e não realiza pagamentos. Você explica para ela mesma fazer.
Público deste modo: ${PUBLICO[modo]}
Como responder:
- Português do Brasil, tom acolhedor e sem julgamento, sem termos técnicos.
- Até 110 palavras. Texto simples, sem markdown, sem asteriscos e sem títulos.
- Quando for uma tarefa, dê de 3 a 5 passos numerados (1., 2., 3.), cada um numa linha, e termine perguntando se a pessoa conseguiu ou travou em algum passo.
- Antes de passos com dinheiro, senha, dados pessoais ou desconhecidos, escreva uma linha começando com "Atenção:".
- Nunca invente endereços, nomes de lojas, telefones ou links.
- Se a mensagem disser que o app vai mostrar botões de mapa, diga que os botões estão logo abaixo da sua resposta.
- Se a pessoa fizer uma pergunta ou pesquisa de conhecimento (história, pessoas, ciência, geografia, curiosidades, significado de palavras, qualquer assunto), responda direto com a informação, em linguagem simples e sem passos numerados. Responder perguntas não é fazer a tarefa por ela: é iluminar o caminho. Se fizer sentido, termine sugerindo onde a pessoa pode aprender mais sozinha.
- Se o pedido for perigoso, ilegal ou fora do seu papel, recuse com gentileza e indique um caminho seguro, como um adulto de confiança, um familiar ou um canal oficial.`;
}

function promptGuia(modo, q) {
  return `Você é a Ailla, uma vagalume que guia pessoas no mundo digital. Lema: "Ailla ilumina, você caminha." Você NUNCA faz a tarefa pela pessoa: só explica o passo a passo para ela mesma fazer no celular dela.
Público: ${PUBLICO[modo]}
Pedido da pessoa: "${q}"

Responda SOMENTE com um JSON neste formato:
{"titulo":"nome curto da tarefa","passos":[{"t":"instrução curta","ajuda":"explicação extra simples","alerta":"aviso de segurança ou string vazia"}],"lugar":"tipo de lugar físico se o pedido é ir a algum lugar (ex.: shopping, farmácia), senão string vazia","links":[{"rotulo":"texto do botão","url":"https://..."}]}
Regras: português do Brasil; de 3 a 6 passos; cada "t" com no máximo 14 palavras; use "alerta" só em passos sensíveis (dinheiro, dados, senhas, desconhecidos, sair de casa). Nunca invente endereços, nomes de estabelecimentos ou telefones. Em "links", use no máximo 2 sites oficiais que você tenha certeza que existem (ex.: gov.br), ou deixe vazio. Se o pedido for perigoso ou ilegal, devolva passos que orientem a pessoa a buscar ajuda segura.`;
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

async function gemini(system, contents, asJson) {
  const key = env('GEMINI_API_KEY');
  if (!key) return { erro: 'sem_chave' };
  const modelos = [env('GEMINI_MODEL') || 'gemini-3.8-flash', 'gemini-flash-latest'];
  for (const modelo of modelos) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: Object.assign({ temperature: 0.6, maxOutputTokens: 2048 }, asJson ? { responseMimeType: 'application/json' } : {})
      })
    });
    if (r.status === 404) continue; // modelo não existe nesta conta: tenta o próximo
    if (r.status === 429) return { erro: 'limite' };
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { console.error('Gemini', r.status, JSON.stringify(d).slice(0, 500)); return { erro: 'gemini' }; }
    const c = d.candidates && d.candidates[0];
    const texto = c && c.content && Array.isArray(c.content.parts) ? c.content.parts.map((p) => p.text || '').join('').trim() : '';
    if (!texto) return { erro: 'bloqueado' };
    return { texto };
  }
  return { erro: 'modelo' };
}

export default async (req) => {
  if (req.method !== 'POST') return json({ code: 'method' }, 405);
  const raw = await req.text();
  if (raw.length > 20000) return json({ code: 'grande' }, 413);
  let b; try { b = JSON.parse(raw); } catch { return json({ code: 'invalido' }, 400); }
  const modo = PUBLICO[b.modo] ? b.modo : 'geral';

  if (b.tipo === 'guia') {
    const q = String(b.pedido || '').slice(0, 300).replace(/"/g, "'");
    if (!q) return json({ code: 'vazio' }, 400);
    const r = await gemini('Responda apenas com JSON válido.', [{ role: 'user', parts: [{ text: promptGuia(modo, q) }] }], true);
    if (r.erro === 'limite') return json({ code: 'rate_limited' }, 429);
    if (r.erro) return json({ code: r.erro }, 502);
    let obj = null;
    try { obj = JSON.parse(r.texto.replace(/^```(json)?|```$/g, '').trim()); } catch { obj = null; }
    return obj ? json({ json: obj }) : json({ code: 'invalid_json' }, 502);
  }

  // conversa
  const msgs = (Array.isArray(b.mensagens) ? b.mensagens : []).slice(-12)
    .map((m) => ({ role: m && m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String((m && m.content) || '').slice(0, 1200) }] }))
    .filter((m) => m.parts[0].text);
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return json({ code: 'vazio' }, 400);
  const r = await gemini(regras(modo), msgs, false);
  if (r.erro === 'limite') return json({ code: 'rate_limited' }, 429);
  if (r.erro === 'bloqueado') return json({ text: 'Esse assunto eu não consigo guiar. Que tal pedir ajuda a alguém de confiança?' });
  if (r.erro) return json({ code: r.erro }, 502);
  return json({ text: r.texto.replace(/\*\*/g, '') });
};

export const config = { path: '/api/ailla' };
