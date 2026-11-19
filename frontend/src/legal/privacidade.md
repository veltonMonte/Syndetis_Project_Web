# Política de Privacidade da Syndetis

Versão 2026-11-18 · Vigente a partir de [PREENCHER: data de publicação]

> **Rascunho para revisão jurídica.** Este texto ainda não foi revisado por um advogado e não deve ser publicado como versão definitiva antes dessa revisão. Os trechos marcados com [PREENCHER] dependem de dados ou decisões da empresa.

Esta Política explica quais dados pessoais a Syndetis trata, por quê, com quem os compartilha e como você exerce seus direitos, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, a LGPD) e o Marco Civil da Internet (Lei nº 12.965/2014).

## 1. Quem é responsável pelos seus dados

A Syndetis tem **dois papéis diferentes**, conforme quem você é:

| Quem você é | Papel da Syndetis | Quem decide sobre os seus dados |
| --- | --- | --- |
| Lojista (quem cria uma loja, cardápio ou bilheteria) ou visitante do site da Syndetis | Controladora | A Syndetis |
| Comprador de uma loja hospedada na Syndetis | Operadora | A loja em que você comprou, que é a controladora |

**Se você é Comprador**, a loja em que você comprou decide como seus dados são usados e responde pelos seus pedidos. A Syndetis só trata esses dados para operar a loja, seguindo as instruções dela (art. 39 da LGPD). Para exercer seus direitos, fale primeiro com a loja; se escrever para a Syndetis, encaminharemos o pedido à loja e a ajudaremos a responder.

**Controladora (dados de Lojistas e visitantes):**

- Razão social: [PREENCHER]
- CNPJ: [PREENCHER]
- Endereço: [PREENCHER]
- Encarregado pelo tratamento de dados pessoais (DPO): [PREENCHER: nome]
- E-mail do encarregado: [PREENCHER]

## 2. Dados dos Lojistas (Syndetis como controladora)

| Dados | Para quê | Base legal (art. 7º da LGPD) |
| --- | --- | --- |
| Nome, e-mail e senha (a senha é guardada apenas como hash BCrypt, nunca em texto) | Criar e manter a conta, autenticar o acesso | Execução de contrato (inciso V) |
| Identificador da conta Google ou GitHub, quando você entra com login social | Permitir o login social | Execução de contrato (inciso V) |
| CNPJ, razão social, situação cadastral e se é MEI, obtidos na Receita Federal por meio da BrasilAPI | Conceder o selo Verificado Syndetis e impedir que um mesmo CNPJ abra várias contas | Execução de contrato (inciso V) e legítimo interesse na prevenção a fraudes (inciso IX) |
| CPF de contas antigas: guardamos apenas uma forma mascarada e um código criptográfico (HMAC) que não permite recuperar o número | Impedir que um mesmo documento abra várias contas | Legítimo interesse na prevenção a fraudes (inciso IX) |
| Versão dos Termos e da Política aceita, data, hora e meio do aceite | Comprovar o aceite | Exercício regular de direitos (inciso VI) |
| Registros de acesso (endereço IP, data e hora) | Segurança e cumprimento do art. 15 do Marco Civil da Internet | Cumprimento de obrigação legal (inciso II) e legítimo interesse (inciso IX) |
| Tokens de sessão (guardados apenas como hash) | Manter você conectado com segurança | Execução de contrato (inciso V) |
| Nome, e-mail e CPF ou CNPJ do pagador, plano, valores e situação das mensalidades | Cobrar a Assinatura pelo Asaas e emitir documentos fiscais | Execução de contrato (inciso V) e obrigação legal (inciso II) |
| Identificador e apelido da conta Mercado Pago e tokens de acesso (criptografados com AES-256-GCM) | Receber os pagamentos das vendas na conta do Lojista | Execução de contrato (inciso V) |
| Nome da loja, layout, produtos, imagens e textos | Exibir a loja | Execução de contrato (inciso V) |
| Mensagens enviadas ao atendimento | Responder e registrar o atendimento | Execução de contrato (inciso V) e legítimo interesse (inciso IX) |

Não usamos dados pessoais para publicidade direcionada, não vendemos dados e não tomamos decisões exclusivamente automatizadas que afetem seus interesses (art. 20 da LGPD).

## 3. Dados dos Compradores (Syndetis como operadora)

Ao comprar em uma loja hospedada na Syndetis, a loja coleta, e a Syndetis guarda em seu nome:

- nome, e-mail, telefone e, quando a loja pede, CPF;
- endereço de entrega;
- itens, valores, situação e histórico dos pedidos;
- identificador do pagamento devolvido pelo Mercado Pago (a Syndetis **não** recebe nem guarda dados de cartão);
- e-mail e senha (como hash) da conta de comprador, se você criar uma para acompanhar pedidos.

Esses dados servem para registrar e entregar o pedido, processar o pagamento, enviar notificações do pedido e permitir que a loja atenda você. A base legal é definida pela loja, normalmente a execução do contrato de compra (art. 7º, inciso V). Os termos e a política de privacidade de cada loja ficam na própria loja.

## 4. Com quem compartilhamos

Compartilhamos dados somente com os fornecedores necessários para a Plataforma funcionar, que atuam como operadores ou suboperadores, e com autoridades quando a lei ou uma ordem judicial exigir.

| Fornecedor | Para quê | Dados | Onde |
| --- | --- | --- | --- |
| Cloudflare | Entrega do site, proteção contra ataques | Endereço IP, dados técnicos da requisição | Rede global, incluindo os EUA |
| Amazon Web Services (AWS) | Servidores da Plataforma | Todos os dados tratados pela Plataforma | EUA (região us-east-1) |
| Neon | Banco de dados PostgreSQL | Todos os dados guardados pela Plataforma | EUA (região us-east-2) |
| Mercado Pago | Pagamento das compras nas lojas | Dados do pedido e do Comprador necessários ao pagamento | [PREENCHER] |
| Asaas | Cobrança da Assinatura do Lojista | Nome, e-mail, CPF ou CNPJ, valor | Brasil |
| BrasilAPI | Consulta do CNPJ na Receita Federal | Apenas o número do CNPJ | [PREENCHER] |
| Google e GitHub | Login social, quando você escolhe | Dados que você autoriza na tela do provedor | EUA |
| Correios | Cálculo de frete | CEP de origem e destino, peso e dimensões | Brasil |
| [PREENCHER: provedor de e-mail] | Notificações por e-mail | Nome, e-mail, conteúdo da mensagem | [PREENCHER] |
| [PREENCHER: provedor de WhatsApp] | Notificações por WhatsApp | Nome, telefone, conteúdo da mensagem | [PREENCHER] |
| [PREENCHER: provedor de IA] | Recursos de IA da Sessão Maker | Textos e imagens que o Lojista envia ao recurso | [PREENCHER] |

[PREENCHER: confirmar os provedores de e-mail, WhatsApp e IA. Hoje o código registra e-mails e mensagens de WhatsApp em log, sem um provedor real ligado.]

## 5. Transferência internacional

Parte dos servidores fica nos Estados Unidos. A transferência é feita com base no art. 33 da LGPD, por meio de [PREENCHER: mecanismo, por exemplo as cláusulas-padrão contratuais aprovadas pela ANPD na Resolução CD/ANPD nº 19/2024], e os fornecedores são obrigados a proteger os dados com nível de segurança compatível com a lei brasileira.

## 6. Por quanto tempo guardamos

| Dados | Prazo |
| --- | --- |
| Conta do Lojista | Enquanto a conta existir e por [PREENCHER] depois do encerramento |
| Registros de acesso | 6 meses (art. 15 do Marco Civil da Internet) [PREENCHER: confirmar onde esses registros são guardados] |
| Tokens de sessão | Até expirarem (30 dias) ou serem revogados |
| Registros de aceite | Enquanto a conta existir e pelo prazo de prescrição de eventuais ações [PREENCHER] |
| Dados de cobrança e fiscais | Pelo prazo da legislação tributária (em geral, 5 anos) |
| Dados dos Compradores | Enquanto a loja os mantiver ativos; depois do encerramento da loja, por [PREENCHER] |

Terminado o prazo, os dados são eliminados ou anonimizados, salvo as exceções do art. 16 da LGPD.

## 7. Seus direitos

Você pode pedir, a qualquer momento (art. 18 da LGPD):

- confirmação de que tratamos seus dados e acesso a eles;
- correção de dados incompletos, inexatos ou desatualizados;
- anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;
- portabilidade dos dados a outro fornecedor;
- eliminação dos dados tratados com base no consentimento;
- informação sobre com quem compartilhamos seus dados;
- informação sobre a possibilidade de não consentir e suas consequências;
- revogação do consentimento;
- oposição a um tratamento feito com base no legítimo interesse.

Para exercer esses direitos, escreva para o encarregado em [PREENCHER: e-mail do encarregado]. Podemos pedir uma confirmação de identidade para proteger você. Respondemos em até 15 dias (art. 19 da LGPD). Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD), em https://www.gov.br/anpd.

## 8. Segurança

Usamos conexões criptografadas (HTTPS), guardamos senhas apenas como hash BCrypt, guardamos tokens de sessão e códigos de login apenas como hash, criptografamos os tokens do Mercado Pago e limitamos o acesso interno aos dados. Nenhum sistema é totalmente imune a falhas. Se ocorrer um incidente de segurança que possa trazer risco ou dano relevante, avisaremos a ANPD e os titulares afetados, conforme o art. 48 da LGPD e a Resolução CD/ANPD nº 15/2024.

## 9. Crianças e adolescentes

A conta de Lojista é para maiores de 18 anos. A Syndetis não coleta intencionalmente dados de crianças. Lojas cujo público inclua menores devem seguir o art. 14 da LGPD.

## 10. Cookies

Usamos apenas cookies e armazenamento local necessários para o site funcionar. Detalhes na [Política de Cookies](#/legal/cookies).

## 11. Alterações

Quando esta Política mudar, publicaremos a nova versão nesta página, com a data. Mudanças relevantes serão avisadas por e-mail e no painel.
