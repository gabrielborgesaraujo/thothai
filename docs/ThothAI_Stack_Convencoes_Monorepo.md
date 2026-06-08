# Documentação do Projeto: ThothAI

## 1. Arquitetura e Stack Tecnológica (Monorepo)

A arquitetura do projeto adota uma abordagem moderna baseada em **Monorepo**, garantindo partilha eficiente de contratos e integração contínua unificada. O sistema foca em modularidade rígida no backend e alta performance de indexação (SEO) no frontend.

| Camada / Domínio | Tecnologia Selecionada | Justificativa / Papel no Ecossistema |
| :--- | :--- | :--- |
| **Repositório** | **Monorepo** | Código backend e frontend residem no mesmo repositório, facilitando a rastreabilidade (commits unificados) e sincronização de contratos de API. |
| **Backend (API)** | **Kotlin + Spring Boot + Spring Modulith** | Estabelece um *monólito modular*. Garante isolamento estrito de domínios (DDD) e comunicação orientada a eventos internos, evitando a complexidade de microsserviços. |
| **Frontend (Web)** | **Angular SSR + TailwindCSS + AngularMaterial** | Adoção de Server-Side Rendering (SSR) é vital para indexação (SEO) e partilha em redes sociais. |
| **Banco de Dados** | **PostgreSQL** | Persistência primária da aplicação, selecionado por sua robustez e capacidade avançada de indexação. |
| **Armazenamento** | **MinIO** | Servidor de objetos compatível com a API S3 para persistência independente de mídias. |
| **Infraestrutura** | **Docker + Docker Compose** | Empacotamento completo do sistema num ecossistema imutável. |

---

## 2. Convenções de Código (Coding Guidelines)

### 2.1. Versionamento (Git e Monorepo)
* **Estratégia:** *Trunk-based Development*. Commits na branch principal devem abranger alterações consistentes tanto no diretório do backend quanto no frontend.
* **Padrão de Commits:** Uso de **Conventional Commits** com escopos definidos (ex: `feat(api):` ou `fix(web):`).

### 2.2. Padrões de Backend (Spring Modulith)
* **Arquitetura de Módulos:** O código deve ser organizado por domínios de negócio (ex: `content`, `identity`) e não por camadas técnicas genéricas na raiz.
* **Isolamento e Encapsulamento:** Classes de lógica interna não devem ser expostas. O Spring Modulith testará e falhará o build caso ocorram quebras de encapsulamento ou dependências cíclicas.
* **Comunicação Interna:** Interações transversais devem utilizar a publicação de eventos (Spring Application Events).
* **Linting:** Utilização do `ktlint`.

### 2.3. Padrões de Frontend (Angular SSR)
* **Renderização:** Rotas públicas devem priorizar o render no servidor (SSR) ou pré-renderização. Rotas administrativas podem utilizar renderização no lado do cliente (CSR).
* **Arquitetura Angular:** Privilegiar *Standalone Components* para manter a árvore de dependências limpa.
* **Estilização:** TailwindCSS para layout geral; Angular Material para interações complexas.

### 2.4. Padrões de Banco de Dados
* **Nomenclatura:** Uso de `snake_case`, obrigatoriamente no plural para tabelas.
* **Migrações:** Uso obrigatório de *Flyway* ou *Liquibase*.
