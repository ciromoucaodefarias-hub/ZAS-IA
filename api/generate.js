// Vercel serverless function (Node.js)
// Expects POST with JSON { dados: { nome, descricao, publico, tipo, paginas, cores, funcoes } }
// Requires environment variables: OPENAI_API_KEY and optionally ZAS_API_TOKEN (a simple token to protect the endpoint)

const fetch = require('node-fetch');
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // Simple token-based auth (optional). Set ZAS_API_TOKEN in environment.
    const token = process.env.ZAS_API_TOKEN;
    if (token) {
      const incoming = req.headers['x-zas-ia-key'] || '';
      if (!incoming || incoming !== token) return res.status(401).send('Unauthorized');
    }

    const body = req.body || {};
    const dados = body.dados || {};
    if (!dados.nome || !dados.descricao) return res.status(400).send('Nome e Descrição são obrigatórios.');

    // Build prompt (Português)
    const prompt = `Você é a ZAS IA – IA especialista em criar sites completos.\nGere apenas o código HTML completo (com CSS e JS embutidos quando necessário) baseado no briefing em português:\n\nNome: ${dados.nome}\nDescrição: ${dados.descricao}\nPúblico: ${dados.publico || ''}\nTipo: ${dados.tipo || ''}\nPáginas: ${dados.paginas || ''}\nCores: ${dados.cores || ''}\nFuncionalidades: ${dados.funcoes || ''}\n\nRequisitos:\n- Retorne SOMENTE o HTML pronto (arquivo html completo).\n- Não inclua explicações nem comentários longos.\n- Insira meta tags básicas e responsividade.\n`;

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) return res.status(500).send('Missing OPENAI_API_KEY');

    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é a IA chamada ZAS IA, especializada em gerar websites completos em HTML.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 3000,
      temperature: 0.7
    };

    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).send(`OpenAI error: ${text}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return res.status(500).send('Invalid response from OpenAI');

    // Return the generated HTML
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ html: content });

  } catch (err) {
    console.error('Function error:', err);
    return res.status(500).send('Internal Server Error');
  }
};