
'use server';

export async function getSmartSuggestions(boardName: string, devices: { type: string, label: string, amps: number }[]) {
  const apiKey = process.env.NVIDIA_API_KEY;
  console.log("DeepSeek AI Action: API Key status:", apiKey ? "Present" : "Missing");

  const baseUrl = "https://integrate.api.nvidia.com/v1";
  const model = "deepseek-ai/deepseek-v4-flash";

  const prompt = `
    Você é um assistente especializado em projetos elétricos residenciais e industriais (QDC).
    O usuário está montando um Quadro de Distribuição de Circuitos (QDC).
    
    Dados atuais do projeto:
    - Nome do Quadro: ${boardName}
    - Componentes Instalados: ${JSON.stringify(devices.map(d => ({ type: d.type, label: d.label, amps: d.amps })))}
    
    Tarefa:
    Forneça 3 sugestões de melhoria técnica para este quadro, focando EXCLUSIVAMENTE em:
    1. Segurança (presença de IDR/DR para proteção de pessoas e DPS para surtos).
    2. Organização técnica (renomeação de circuitos conforme NBR 5410).
    3. Balanceamento de fases e dimensionamento de cabos/disjuntores.
    
    Importante: Se o quadro não tiver um IDR ou DPS, você DEVE sugerir a instalação imediata.
    
    Responda apenas em um array JSON de strings, em Português do Brasil.
    Exemplo: ["Sugestão 1", "Sugestão 2", "Sugestão 3"]
  `;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error(`NVIDIA API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Tenta extrair o JSON se o modelo retornar texto extra
    const jsonMatch = content.match(/\[.*\]/s);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : ["Erro ao processar sugestões."];
  } catch (error) {
    console.error("AI Action Error:", error);
    return ["Não foi possível obter sugestões no momento."];
  }
}
