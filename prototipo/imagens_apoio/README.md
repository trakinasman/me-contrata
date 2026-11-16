# Imagens de apoio

Prints e imagens levantados durante o projeto para apoiar decisões (concorrentes, vagas, layouts, perfis).
**As imagens não vão para o Git** (`.gitignore`): podem ter dados pessoais e direito autoral de terceiros.
**Este índice vai para o Git**, e por isso não deve conter nome de pessoa, e-mail nem dado de candidato.

## Como registrar

Uma linha por imagem, logo que ela entrar na pasta. Nome do arquivo no padrão `AAAA-MM-DD_assunto_detalhe.png`
(por exemplo, `2026-11-16_linkelyzer_precos.png`).

| Arquivo | Data | De onde veio | O que mostra | Para que serve (etapa ou decisão) |
|---|---|---|---|---|
| (exemplo) 2026-11-16_linkelyzer_precos.png | 16/11/2026 | linkelyzer.com.br, página de preços | Planos e créditos | Referência de preço (Etapa 8) |
| 12_sites_vagas.png | 16/11/2026 | Post de Instagram da RH+ Experts (print) | Lista de 12 sites de emprego do Brasil: LinkedIn, Gupy, InfoJobs, Vagas.com, Catho, Indeed, Sólides, Glassdoor, Trabalha Brasil, IEL, CIEE, Abler. A empresa vende o serviço de reformular currículo e perfis | Fontes do agente de vagas (comparar com as atuais); concorrente de serviço humano |
| 12_sites_vagas_a.png | 16/11/2026 | Post de Instagram sobre imigração para Portugal (print) | 9 sites de vagas em Portugal (Net-Empregos, SAPO Emprego, LinkedIn, Indeed PT, remoteOK, Europe Language Jobs, Jobs in Network, Talent.com, BeFinder) e dicas de currículo no modelo europeu | Vagas fora do Brasil (seção do PROXIMOS_PASSOS) |
| 12_sites_vagas_b.png | 16/11/2026 | Post de Instagram, conta não visível (print) | "Lista definitiva" de 19 sites de emprego remoto (FlexJobs, Just Remote, We Work Remotely, Remote.co, Virtual Vocations, Working Nomads, Pangian, Arc, RemoteOK, Fiverr, Authentic Jobs, Jobspresso, Outsourcely, JobRack, Freelancer, Upwork, Toptal, Wellfound, Himalayas) | Vagas remotas no exterior; vários são mercados de freelancer, não de emprego |
| curriculo_ia.png | 16/11/2026 | Post de Instagram @curriculo.napratica (print) | Palavras que enfraquecem o currículo (Responsável por, Auxiliei em, Trabalhei com, Tenho experiência em, Boa comunicação, Proativo) e a troca sugerida | Humanizador e skill li-candidatura; atenção: várias trocas sugeridas inflam o fato |
| hire_international_1.pdf | 16/11/2026 | Reclame Aqui, empresa HIRE BRAZIL (impressão da página, sem texto selecionável) | Reclamação de 07/09/2026 (respondida): cancelamento e reembolso do Curso Remoto Express pedidos dentro dos 7 dias e não atendidos; resposta da empresa | Queixas da Hire International/Hire Brazil (planilha de concorrentes) |
| hire_international_2.pdf | 16/11/2026 | Reclame Aqui, empresa HIRE BRAZIL (impressão da página, sem texto selecionável) | Reclamação de 27/05/2026 (respondida): Pacote Moeda Forte sem acesso integral e suporte; reembolso feito depois do pedido de cancelamento | Queixas da Hire International/Hire Brazil |
| hire_international_3.pdf | 16/11/2026 | Reclame Aqui, empresa HIRE BRAZIL (impressão da página, sem texto selecionável) | Reclamação de 24/05/2026 (resolvida): cancelamento da mentoria dentro de 7 dias sem retorno; reembolso feito em 2 dias pela Hotmart; consumidor deu nota 10 | Queixas da Hire International/Hire Brazil |
| hire_international_4.pdf | 16/11/2026 | Reclame Aqui, empresa HIRE BRAZIL (impressão da página, sem texto selecionável) | Reclamação de 22/04/2026 (respondida): Combo Remoto Express com conteúdo raso e sem acesso à plataforma; resposta da empresa | Queixas da Hire International/Hire Brazil |

## Regras

- Dado pessoal (perfil de LinkedIn de alguém, e-mail, telefone): cobrir antes de guardar, ou não guardar.
- Print de site de terceiros: só para estudo interno; não publicar nem embutir no app.
- Quem pedir ao Claude para ler uma imagem aqui deve citar o nome do arquivo.
- PDF de impressão de página (como os do Reclame Aqui) não tem texto selecionável: o Claude precisa renderizar as páginas (PyMuPDF numa pasta temporária); se for possível, salve também como imagem ou copie o texto.
- As reclamações trazem nome e cidade de consumidores: não copiar esses dados para o índice nem para a planilha.
