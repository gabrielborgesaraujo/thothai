# Documentação do Projeto: ThothAI

## 1. Visão Geral do Projeto

### 1.1. Propósito e Motivação
O ThothAI é uma plataforma concebida para simplificar e potencializar a construção e a manutenção de uma identidade digital profissional robusta e independente. Em cenários de mercado dinâmicos, gerenciar a presença online e consolidar uma persona técnica de destaque frequentemente exige um esforço fragmentado entre diferentes ferramentas. O ThothAI soluciona este problema ao atuar como um hub central inteligente para criação, curadoria, gerenciamento e publicação de conteúdos técnicos, artigos, ideias e tutoriais.

A plataforma servirá como o núcleo da presença digital do publicador. A estratégia operacional consiste na criação de publicações densas e completas na plataforma e na posterior distribuição de fragmentos estratégicos ("iscas de conteúdo") em redes profissionais corporativas, direcionando o tráfego de leitores qualificados de volta para o ambiente centralizado.

### 1.2. Público-Alvo e Evolução de Escala
O ecossistema foi projetado sob uma arquitetura escalável e estruturado para evoluir em fases distintas de maturação e expansão:

* **Fase 1 (MVP — Usuário Único / Single Publisher):** Foco inicial estrito no criador e administrador central da plataforma, funcionando como uma vitrine profissional automatizada, validação de produto e consolidação da prova de conceito frente aos seus leitores e ouvintes.
* **Fase 2 (Plataforma Aberta — Multi-tenant):**
    * **Publicadores (Creators):** Profissionais técnicos de mercado que demandam um espaço otimizado, inteligente e independente para gerenciar suas marcas.
    * **Leitores e Consumidores:** Comunidade de usuários interessada em consumir conteúdos técnicos de alta qualidade, dotada de recursos para criar perfis de leitura e seguir publicadores.

### 1.3. Objetivos e Metas de Sucesso
* **Gerenciamento Simplificado:** Prover uma interface administrativa de altíssima usabilidade para composição, revisão e publicação ágil de conteúdos digitais.
* **Aceleração Inteligente:** Otimizar o processo de pesquisa e escrita técnica por meio de integrações ativas com Inteligência Artificial e motores de busca em tempo real.
* **Arquitetura Flexível:** Assegurar que o MVP nasça tecnicamente preparado para transicionar do modelo de inquilino único para a arquitetura multi-tenant sem a necessidade de refatorações estruturais.

---

## 2. Requisitos do Sistema (Escopo do MVP)

### 2.1. Requisitos Funcionais (RF)

| ID | Requisito | Descrição Detalhada |
| :--- | :--- | :--- |
| **RF01** | **Autenticação Administrativa** | O sistema deve restringir o acesso ao painel de controle por meio de uma tela de login segura. No escopo do MVP, haverá suporte exclusivo para um único usuário administrador. |
| **RF02** | **Gerenciador de Postagens (CRUD)** | O painel administrativo deve oferecer capacidade total de criação, leitura, atualização e exclusão de artigos, tutoriais e notas. Deve suportar os status "Rascunho" e "Publicado", aceitando formatação rica ou Markdown. |
| **RF03** | **Upload de Mídias Incorporadas** | O editor de postagens deve disponibilizar uma funcionalidade para upload de arquivos de imagem, que serão persistidos de forma independente e retornarão uma URL pública injetada no texto. |
| **RF04** | **Assistência de Rascunho com IA e Busca Viva** | O painel deve disponibilizar um gerador de rascunhos baseado em IA. Ao informar um tema, o sistema buscará contextos atualizados na internet e os usará como base para estruturar um rascunho de texto técnico. |
| **RF05** | **Revisão Contextual via IA** | Mecanismo que, ao ser acionado, analisa o conteúdo textual corrente e gera recomendações de correções ortográficas, gramaticais e adequação de vocabulário técnico. |
| **RF06** | **Portal Público de Leitura** | Interface web de livre acesso contendo a listagem cronológica reversa das postagens e páginas internas de leitura limpas, otimizadas para texto e código formatado. |
| **RF07** | **Hub de Identidade e Contato** | A página inicial deve destacar o cartão de apresentação do publicador (foto, biografia) e Call to Actions direcionando para redes corporativas (LinkedIn) ou e-mail. |
| **RF08** | **Módulo de Portfólio Curricular** | Área pública para apresentação de qualificações (experiências, formação, hard skills). O painel deve permitir o gerenciamento e a ocultação seletiva desses dados. |

### 2.2. Requisitos Não-Funcionais (RNF)

| ID | Atributo / Restrição | Especificação Técnica |
| :--- | :--- | :--- |
| **RNF01** | **Armazenamento de Objetos** | Toda mídia estática manipulada pela plataforma deve ser persistida em uma infraestrutura independente baseada em **MinIO**. |
| **RNF02** | **Resiliência e Tolerância a Falhas** | Integrações síncronas com APIs externas (motor de busca e LLM) devem possuir timeouts e tratamento de exceções para garantir a estabilidade do painel em caso de falhas de terceiros. |
| **RNF03** | **Isolamento Multi-tenant Adormecido** | O esquema de banco de dados do MVP deve possuir chaves de isolamento de inquilinos em todas as entidades persistidas, aplicando filtros de autoria nas consultas. |
| **RNF04** | **Responsividade com Foco em Leitura** | A interface pública deve ser construída com a abordagem *Mobile First*, garantindo que textos e blocos de código se ajustem perfeitamente a displays menores. |
| **RNF05** | **Otimização de Metadados (SEO)** | As páginas devem renderizar dinamicamente tags OpenGraph e Twitter Cards no cabeçalho HTML, garantindo pré-visualizações ricas ao compartilhar links em outras redes. |
