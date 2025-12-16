## Visão Geral do Aplicativo: SLOB_SERVIÇOS

**SLOB_SERVIÇOS** é uma aplicação web construída com Next.js, React, Firebase e Tailwind CSS, projetada para autônomos e pequenos prestadores de serviço (como pintores, eletricistas, encanadores) gerenciarem seus orçamentos, clientes e finanças de forma eficiente.

O sistema permite que o usuário crie orçamentos detalhados, acompanhe o status de cada um, registre pagamentos e analise seu desempenho financeiro através de um painel interativo.

### Stack de Tecnologia

- **Frontend:** Next.js (App Router), React, TypeScript
- **UI:** shadcn/ui, Tailwind CSS, Lucide Icons, Recharts (para gráficos)
- **Backend & Banco de Dados:** Firebase (Firestore, Authentication, Storage)
- **Funcionalidades de IA:** Genkit com modelos do Google AI para sugestão de tarefas.
- **Validação de Formulários:** Zod e React Hook Form.
- **Geração de Relatórios:** jsPDF e jspdf-autotable para exportação em PDF.

---

### Estrutura e Funcionalidades Principais

#### 1. Autenticação de Usuário
- **Login e Cadastro:** Os usuários podem se cadastrar e fazer login usando e-mail/senha ou através de autenticação com o Google.
- **Gerenciamento de Sessão:** A sessão do usuário é gerenciada no lado do cliente, garantindo que apenas usuários autenticados acessem as funcionalidades principais. O `AppContent` e o `useUser` hook controlam o redirecionamento entre páginas de autenticação e o painel principal.

#### 2. Painel (Dashboard)
- **Visão Geral Financeira:** Apresenta um conjunto de cards com estatísticas chave, como "Total Orçado", "Total Recebido", "Lucro Total", "Pendente", etc.
- **Cards Interativos:** Cada card no painel é um link que leva à página de orçamentos, pré-filtrada com o status correspondente (ex: clicar em "Em Prospecção" filtra os orçamentos com esse status).
- **Gráficos:**
    - **Visão por Período:** Um gráfico de barras que mostra o valor total dos orçamentos criados ao longo do tempo (visão anual por mês ou visão mensal por dia, dependendo do filtro).
    - **Distribuição por Status:** Um gráfico de pizza que mostra a proporção de orçamentos em cada status ("prospecção", "ativo", "concluído", "cancelado").
- **Orçamentos Recentes:** Uma lista dos últimos 5 orçamentos criados.
- **Relatórios:** Uma aba dedicada permite ao usuário gerar relatórios em PDF ou compartilhar resumos via WhatsApp para um período de datas selecionado.

#### 3. Gerenciamento de Clientes (`/clientes`)
- **CRUD de Clientes:** Os usuários podem criar, visualizar, editar e deletar clientes.
- **Lista de Clientes:** A página principal de clientes exibe uma tabela com todos os clientes, com um campo de filtro para busca por nome.
- **Detalhes do Cliente:** Uma página de detalhes para cada cliente mostra suas informações de contato e uma lista de todos os orçamentos associados a ele, com links para criar um novo orçamento ou ver detalhes de um existente. Inclui botões de ação rápida para ligar ou enviar mensagem via WhatsApp.

#### 4. Gerenciamento de Orçamentos (`/orcamentos`)
- **CRUD de Orçamentos:** Funcionalidades completas para criar, ler, atualizar e deletar orçamentos.
- **Lista de Orçamentos:** Tabela com filtros avançados por cliente, descrição da tarefa e status do orçamento. Exibe um resumo financeiro com base nos filtros aplicados.
- **Formulário de Criação/Edição de Orçamento:**
    - **Tipos de Orçamento:** O usuário pode escolher entre "Por Diária" (cálculo baseado em período e valor/dia) ou "Por Tarefa" (valor fixo).
    - **Tipos de Serviço Especializados:** O formulário se adapta ao "Tipo de Serviço":
        - **Pintura:** Habilita campos para cálculo de área (altura x largura), valor por m² e número de demãos.
        - **Elétrica:** Permite adicionar uma lista de itens (descrição, quantidade, valor unitário), com sugestões de itens pré-cadastrados.
        - **Hidráulica:** Funciona de forma similar à Elétrica, com sua própria lista de itens pré-cadastrados.
        - **Outro/Alvenaria:** Utiliza um campo de valor total fixo.
    - **Assistente de IA:** Um botão "Sugerir Tarefas" usa o Genkit para gerar descrições de tarefas com base nos dados do cliente.
    - **Resumo Financeiro:** O formulário exibe um resumo em tempo real do valor total, custo de material e lucro.
- **Detalhes do Orçamento:**
    - Exibe todas as informações do orçamento.
    - **Gerenciamento de Pagamentos:** Mostra o progresso do pagamento, saldo devedor e um histórico detalhado. O usuário pode adicionar novos pagamentos, editar ou excluir pagamentos existentes através de um diálogo modal.

#### 5. Configurações (`/configuracoes`)
- **Perfil de Usuário:** O usuário pode atualizar seu nome de exibição e foto de perfil. A foto é enviada para o Firebase Storage e o usuário pode escolher entre imagens já enviadas de uma galeria.
- **Dados da Empresa:** O usuário pode salvar as informações da sua empresa (nome, CNPJ, contato), que são usadas nos relatórios em PDF.
- **Itens de Serviço:** O usuário pode pré-cadastrar itens e seus preços padrão para os serviços de "Elétrica" e "Hidráulica", agilizando a criação de novos orçamentos.
- **Configuração de Diária:** Permite definir valores padrão para a jornada de trabalho e o valor da diária.

---

### Estrutura de Dados no Firestore

O banco de dados é estruturado em sub-coleções dentro do documento de cada usuário para garantir a privacidade dos dados através de regras de segurança.

- `/users/{userId}`: Armazena o perfil básico do usuário (UID, email, etc.).
- `/users/{userId}/clients/{clientId}`: Coleção dos clientes daquele usuário.
- `/users/{userId}/budgets/{budgetId}`: Coleção dos orçamentos do usuário. Cada orçamento contém um sub-array `paymentHistory` para os pagamentos.
- `/users/{userId}/companyProfile/{profileId}`: Documento único (ou o primeiro da coleção) com os dados da empresa do usuário.
- `/users/{userId}/electricalServiceItems/{itemId}`: Itens de serviço de elétrica pré-cadastrados pelo usuário.
- `/users/{userId}/hydraulicServiceItems/{itemId}`: Itens de serviço de hidráulica pré-cadastrados pelo usuário.

### Regras de Segurança

- **Firestore:** As regras (`firestore.rules`) garantem que um usuário só pode ler e escrever dados dentro de seu próprio caminho `/users/{userId}/{allPaths=**}`.
- **Storage:** As regras (`storage.rules`) permitem que qualquer pessoa leia as fotos de perfil (para exibição pública), mas apenas o dono da conta pode fazer upload de novas imagens para sua pasta (`/profile-images/{userId}/{fileName}`), com um limite de tamanho de 5MB.

Este prompt deve fornecer uma base sólida para entender o estado atual do projeto e orientar os próximos passos de desenvolvimento.