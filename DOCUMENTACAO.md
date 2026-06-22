# Medic AI - Documentação do Sistema

## 1. Descrição do Sistema

O **Medic AI** é um assistente inteligente de documentação clínica que auxilia médicos durante consultas presenciais. O sistema combina transcrição de áudio em tempo real com inteligência artificial para automatizar a criação de prontuários médicos, reduzindo o tempo gasto com burocracia e permitindo que o profissional foque no paciente.

### Problema que resolve

Médicos gastam muito do tempo de consulta preenchendo prontuários manualmente. Isso gera:

- Perda de atenção ao paciente durante o atendimento
- Prontuários incompletos ou com informações omitidas
- Fadiga documental, especialmente em plantões longos
- Dificuldade em manter um padrão de qualidade na documentação clínica

### Como funciona

1. O médico inicia a consulta no sistema e ativa a gravação de áudio
2. A fala é transcrita em tempo real (médico e paciente são diferenciados por diarização)
3. Um copiloto de IA analisa a transcrição continuamente, sugerindo perguntas complementares e hipóteses diagnósticas
4. Ao final da consulta, a IA gera um prontuário médico estruturado completo
5. O médico revisa, edita se necessário, e finaliza o documento

---

## 2. Arquitetura do Sistema

### Visão Geral

```
┌─────────────────────┐     WebSocket      ┌──────────────────┐
│   Frontend          │◄──────────────────►│   Deepgram API   │
│   (Next.js 15)      │   Transcrição      │   (nova-2)       │
│   :3000             │   em tempo real     └──────────────────┘
│                     │
│                     │     REST API        ┌──────────────────┐
│                     │◄──────────────────►│   Backend         │
└─────────────────────┘   JSON / JWT        │   (Spring Boot)  │
                                            │   :8080          │
                                            │                  │
                                            │   ┌────────────┐ │     ┌──────────────────┐
                                            │   │ LangChain4j│─┼────►│   OpenAI API     │
                                            │   └────────────┘ │     │   (gpt-4o-mini)  │
                                            │                  │     └──────────────────┘
                                            │   ┌────────────┐ │     ┌──────────────────┐
                                            │   │  JPA       │─┼────►│   PostgreSQL 16  │
                                            │   └────────────┘ │     │   :5435          │
                                            │                  │     └──────────────────┘
                                            └──────────────────┘
```

### Backend — Spring Boot 3.4.1 / Java 21

Organizado no pacote `br.com.medic`:

| Camada | Pacote | Responsabilidade |
|---|---|---|
| **Entidades** | `entity/` | Modelos JPA: `Medico`, `Paciente`, `Consulta` |
| **Controllers** | `controller/` | Endpoints REST: `MedicoController`, `PacienteController`, `ConsultaController` |
| **Services** | `service/` | Lógica de negócio: `ConsultaService`, `DeepgramService` |
| **IA** | `service/ai/` | Interface LangChain4j `MedicoAssistenteAi` com 4 métodos de IA |
| **Segurança** | `security/` | Spring Security, filtro JWT, geração de tokens |
| **Config** | `config/` | Configuração do LangChain4j (`AiConfig`), CORS |
| **DTOs** | `dto/` | Objetos de transferência para requisições e respostas da API |
| **Repositórios** | `repository/` | Interfaces JPA Repository |

### Frontend — Next.js 15 / React 19 / TypeScript

Utiliza o App Router do Next.js:

| Rota | Descrição |
|---|---|
| `/login` | Tela de login com autenticação JWT |
| `/` | Dashboard principal — listagem de pacientes, busca, cadastro, iniciar consulta |
| `/consulta/[id]` | Interface de consulta com três painéis: dados estruturados, transcrição ao vivo, copiloto IA |

### Modelo de Dados

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│     Medico       │       │    Paciente       │       │    Consulta      │
│──────────────────│       │──────────────────│       │──────────────────│
│ id (UUID) PK     │──1:N─►│ id (Long) PK     │──1:N─►│ id (Long) PK     │
│ nome             │       │ medico_id FK     │       │ paciente_id FK   │
│ email (unique)   │       │ nome             │       │ usuario_id FK    │
│ senha (BCrypt)   │       │ cpf              │       │ dataConsulta     │
│ crm              │       │ telefone         │       │ status (enum)    │
│ especialidade    │       │ email            │       │ audioPath        │
└──────────────────┘       │ dataNascimento   │       │ transcricaoBruta │
                           │ sexo             │       │ iaDadosEstrutrad.│
                           │ dataCadastro     │       │ anamneseFormatada│
                           │                  │       │ prontuarioGerado │
                           │ UNIQUE(cpf,      │       │ duracaoAudioSeg  │
                           │   medico_id)     │       └──────────────────┘
                           └──────────────────┘
```

- **Medico** implementa `UserDetails` do Spring Security (autenticação por email)
- **Paciente** possui constraint `UNIQUE(cpf, medico_id)` — cada médico tem sua lista isolada de pacientes
- **Consulta** possui flag `prontuarioGerado` que impede geração duplicada do documento pela IA

### Fluxo de Integração com IA

O sistema utiliza 4 métodos de IA via LangChain4j (`MedicoAssistenteAi`):

| Método | Quando é chamado | O que retorna |
|---|---|---|
| `analisarCopilotoTempoReal()` | A cada 15s durante a gravação | Perguntas sugeridas, hipóteses diagnósticas, dados extraídos (queixa, HDA, sintomas, antecedentes, medicamentos, alergias) |
| `analisarConsulta()` | Ao solicitar análise estruturada | Prontuário estruturado: resumo, revisão de sistemas, impressão diagnóstica, conduta |
| `gerarSugestoesClinicas()` | Ao solicitar sugestões | 3 hipóteses diagnósticas, exames complementares, referências a diretrizes (SBC, AMB, ADA) |
| `redigirProntuarioTexto()` | Ao gerar documento final | Documento formatado com todas as seções do prontuário médico |

### Endpoints da API REST

#### Médicos (`/medicos`)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/medicos` | Cadastro de novo médico |

#### Pacientes (`/pacientes`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/pacientes` | Listar pacientes do médico logado |
| `POST` | `/pacientes` | Cadastrar novo paciente |

#### Consultas (`/consultas`)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/consultas/iniciar` | Iniciar nova consulta |
| `GET` | `/consultas/{id}` | Buscar consulta por ID |
| `GET` | `/consultas/paciente/{pacienteId}` | Histórico de consultas de um paciente |
| `POST` | `/consultas/{id}/gerar-documento` | Gerar prontuário via IA (uso único por consulta) |
| `PUT` | `/consultas/{id}/finalizar` | Finalizar consulta com documento editado |
| `GET` | `/consultas/{id}/sugestoes` | Obter sugestões clínicas da IA |
| `POST` | `/consultas/sugestoes-tempo-real` | Análise do copiloto em tempo real |
| `PATCH` | `/consultas/{id}/rascunho` | Auto-save de transcrição e dados do copiloto |
| `GET` | `/consultas/deepgram-token` | Gerar chave temporária do Deepgram |
| `GET` | `/consultas/{id}/download-pdf` | Baixar prontuário em PDF |

---

## 3. Tecnologias Utilizadas

### Backend

| Tecnologia | Versão | Finalidade |
|---|---|---|
| Java | 21 | Linguagem principal |
| Spring Boot | 3.4.1 | Framework da aplicação |
| Spring Data JPA | (gerenciado) | Persistência e ORM |
| Spring Security | (gerenciado) | Autenticação e autorização |
| Spring Validation | (gerenciado) | Validação de dados de entrada |
| PostgreSQL Driver | (gerenciado) | Conector do banco de dados |
| LangChain4j | 1.10.0 | Integração com LLMs (OpenAI GPT-4o-mini) |
| LangChain4j PGVector | 1.10.0 | Suporte a embeddings vetoriais (preparado para RAG) |
| LangChain4j PDF Parser | 1.10.0 | Parsing de documentos PDF |
| Auth0 java-jwt | 4.4.0 | Criação e validação de tokens JWT |
| AWS SDK S3 | 1.12.553 | Upload de arquivos para Cloudflare R2 (preparado, ainda não ativo) |
| Commons IO | 2.13.0 | Utilitários de manipulação de arquivos |
| Thymeleaf | (gerenciado) | Template engine para geração de PDFs |
| Flying Saucer | 9.1.22 | Renderização HTML para PDF |

### Frontend

| Tecnologia | Versão | Finalidade |
|---|---|---|
| Next.js | 15 | Framework React com App Router |
| React | 19 | Biblioteca de UI |
| TypeScript | 5 | Tipagem estática |
| Tailwind CSS | 4 | Estilização utilitária |
| Deepgram SDK | 4.11.3 | Transcrição de áudio em tempo real (WebSocket) |
| Lucide React | 0.563.0 | Biblioteca de ícones |

### Infraestrutura

| Tecnologia | Versão | Finalidade |
|---|---|---|
| PostgreSQL | 16 (Alpine) | Banco de dados relacional |
| Docker / Docker Compose | - | Orquestração de containers (banco e adminer) |
| Adminer | latest | Interface web de administração do banco |

### APIs Externas

| Serviço | Modelo/Plano | Uso |
|---|---|---|
| OpenAI | gpt-4o-mini (temp: 0.0) | Análise clínica, geração de prontuários, copiloto |
| Deepgram | nova-2 (pt-BR) | Transcrição de áudio em tempo real com diarização |

---

## 4. Instruções de Uso e Reprodução do Ambiente

### Pré-requisitos

- **Java 21** (JDK)
- **Maven** 3.8+
- **Node.js** 18+ e **npm**
- **Docker** e **Docker Compose**
- Contas e chaves de API:
  - OpenAI (chave de API para gpt-4o-mini)
  - Deepgram (chave de API e ID do projeto)
  - Cloudflare R2 (opcional — account ID, access key, secret key, nome do bucket — preparado para armazenamento de áudio futuro)

### Passo 1 — Clonar o repositório

```bash
git clone <url-do-repositorio>
cd medic_ai
```

### Passo 2 — Subir o banco de dados

```bash
docker-compose up -d
```

Isso inicia:
- **PostgreSQL** na porta `5435` (banco: `medic_ai`, usuário: `admin`)
- **Adminer** na porta `8081` (interface web para visualizar o banco)

### Passo 3 — Configurar variáveis de ambiente

O backend lê todas as configurações sensíveis a partir de variáveis de ambiente. Copie o arquivo de exemplo e preencha:

```bash
cp .env.example .env
```

Variáveis obrigatórias para desenvolvimento local:

| Variável | Descrição | Exemplo |
|---|---|---|
| `OPENAI_API_KEY` | Chave de API da OpenAI | `sk-proj-...` |
| `DEEPGRAM_API_KEY` | Chave de API do Deepgram | `f6e4b...` |
| `DEEPGRAM_PROJECT_ID` | ID do projeto no Deepgram | `12962101-...` |
| `JWT_SECRET` | Segredo para assinatura JWT | qualquer string segura |

As demais variáveis (`DATABASE_URL`, `PORT`, etc.) já possuem valores padrão para desenvolvimento local. Consulte `.env.example` para a lista completa.

### Passo 4 — Iniciar o backend

```bash
cd backend
mvn spring-boot:run
```

O servidor Spring Boot será iniciado na porta **8080**.

Na primeira execução, o Hibernate cria automaticamente as tabelas no banco (`ddl-auto=update`).

### Passo 5 — Iniciar o frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend será iniciado na porta **3000**.

### Passo 6 — Acessar o sistema

1. Acesse `http://localhost:3000`
2. Na tela de login, clique em **"Criar conta"** e preencha nome, e-mail, CRM e senha
3. Após o cadastro, o sistema faz login automaticamente e redireciona ao dashboard
4. Cadastre pacientes pelo dashboard
5. Inicie uma consulta — ative o microfone e converse normalmente

### Comandos Úteis

```bash
# Build do backend (gerar JAR)
cd backend && mvn clean package

# Testes do backend
cd backend && mvn test

# Build de produção do frontend
cd frontend && npm run build

# Lint do frontend
cd frontend && npm run lint

# Visualizar banco de dados
# Acesse http://localhost:8081 (Adminer)
# Sistema: PostgreSQL, Servidor: postgres, Usuário: admin, Banco: medic_ai
```

### Deploy em Produção

#### Backend — Render

1. Crie um novo **Web Service** no Render
2. Conecte ao repositório Git e aponte para o diretório `backend/`
3. Configure:
   - **Runtime:** Docker
   - **Docker Context:** `backend`
   - **Dockerfile Path:** `backend/Dockerfile`
4. Adicione as variáveis de ambiente nas **Environment Variables** do Render:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | URL do PostgreSQL do Render (ex: `jdbc:postgresql://host:5432/db`) |
| `DATABASE_USERNAME` | Usuário do banco |
| `DATABASE_PASSWORD` | Senha do banco |
| `JWT_SECRET` | String segura para assinatura JWT |
| `OPENAI_API_KEY` | Chave da OpenAI |
| `DEEPGRAM_API_KEY` | Chave do Deepgram |
| `DEEPGRAM_PROJECT_ID` | ID do projeto Deepgram |
| `CORS_ALLOWED_ORIGINS` | URL do frontend na Vercel (ex: `https://medic-ai.vercel.app`) |

O Render define a variável `PORT` automaticamente.

#### Frontend — Vercel

1. Crie um novo projeto na Vercel e conecte ao repositório Git
2. Configure o **Root Directory** como `frontend`
3. Adicione a variável de ambiente:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL do backend no Render (ex: `https://medic-ai.onrender.com`) |

4. A Vercel detecta Next.js automaticamente e configura o build.

#### Banco de Dados — PostgreSQL no Render

1. Crie um **PostgreSQL** no Render
2. Copie a **External Database URL** e converta para o formato JDBC:
   - Render fornece: `postgres://user:pass@host:5432/db`
   - Formato JDBC: `jdbc:postgresql://host:5432/db`
3. Configure `DATABASE_URL`, `DATABASE_USERNAME` e `DATABASE_PASSWORD` no Web Service

---

## 5. Evoluções e Melhorias Possíveis

### Segurança e Conformidade

- **Criptografia de dados sensíveis**: O `CryptoConverter` (AES-256) está previsto na arquitetura mas não implementado. Campos como `transcricaoBruta`, `iaDadosEstruturados` e `anamneseFormatada` contêm dados médicos sensíveis (LGPD/HIPAA).

### Funcionalidades

- **Armazenamento de áudio (Cloudflare R2)**: A infraestrutura de upload para Cloudflare R2 já está implementada (`StorageService`, `R2Config`, AWS SDK S3), mas o fluxo ainda não conecta a gravação ao upload. Atualmente o áudio é enviado ao Deepgram para transcrição e descartado ao fechar a página. Ativar o armazenamento permitiria reouvir consultas, re-transcrever, e manter backup legal dos atendimentos.
- **Upload de áudio externo**: Permitir que o médico envie arquivos de áudio (ex: gravações do celular, áudios de WhatsApp) para transcrição e geração de prontuário, além da gravação ao vivo.
- **RAG (Retrieval-Augmented Generation)**: Implementar base de conhecimento vetorial (a dependência `langchain4j-pgvector` já está no projeto) para que a IA consulte protocolos clínicos, bulas, CID-10, diretrizes médicas atualizadas. Isso melhora a precisão das sugestões e fundamenta recomendações com evidências.
- **Integração com WhatsApp Business**: Receber áudios de pacientes diretamente via API do WhatsApp para triagem ou pré-consulta.
- **Feedback loop**: Permitir que médicos avaliem a qualidade das sugestões da IA para melhoria contínua.
- **CI/CD**: Pipeline de build, testes e deploy automatizado (GitHub Actions, por exemplo).
- **Templates de prontuário por especialidade**: Modelos diferentes para cardiologia, pediatria, psiquiatria, etc.
- **Assinatura digital**: Integração com certificado digital ICP-Brasil para validade jurídica do prontuário.

---

## 6. Modelo de Negócio e Estratégia de Receita

### Proposta de Valor

O Medic AI reduz em até 70% o tempo que médicos gastam com documentação clínica, permitindo consultas mais humanizadas e produtivas. O sistema transforma uma gravação de voz em um prontuário médico completo, revisado e editável — em segundos.

### Público-alvo

| Segmento | Perfil | Dor principal |
|---|---|---|
| **Médicos autônomos** | Consultórios particulares, 1-3 profissionais | Tempo perdido com papelada, falta de secretária |
| **Clínicas e policlínicas** | 5-50 médicos, múltiplas especialidades | Padronização de prontuários, produtividade |
| **Hospitais e redes** | 50+ médicos, alto volume de atendimentos | Escala, compliance, integração com PEP |
| **Operadoras de saúde** | Planos de saúde, cooperativas médicas | Qualidade da documentação para auditoria |

### Modelos de Receita

#### Modelo 1 — SaaS por assinatura (recomendado para início)

| Plano | Preço/mês | Inclui |
|---|---|---|
| **Essencial** | R$ 149/médico | Até 100 consultas/mês, transcrição, prontuário IA |
| **Profissional** | R$ 299/médico | Consultas ilimitadas, copiloto em tempo real, exportação PDF, suporte prioritário |
| **Clínica** | R$ 199/médico (mín. 5) | Tudo do Profissional + painel administrativo, relatórios de produtividade |
| **Enterprise** | Sob consulta | On-premise, integração com PEP/HIS, SLA dedicado, customização |

**Justificativa de preço:** Um médico que atende 20 pacientes/dia e economiza 5 minutos por consulta ganha ~1h40min/dia. A R$ 300/hora de consulta particular, o ROI mensal é de ~R$ 33.000 — o sistema se paga em um único dia de uso.

---

## Anexo: Estrutura de Diretórios

```
medic_ai/
├── docker-compose.yml
├── CLAUDE.md
├── DOCUMENTACAO.md              ← este arquivo
│
├── backend/
│   ├── pom.xml
│   └── src/main/
│       ├── java/br/com/medic/
│       │   ├── ProntuarioApplication.java
│       │   ├── config/
│       │   │   ├── AiConfig.java
│       │   │   └── CorsConfig.java
│       │   ├── controller/
│       │   │   ├── AutenticacaoController.java
│       │   │   ├── ConsultaController.java
│       │   │   ├── MedicoController.java
│       │   │   └── PacienteController.java
│       │   ├── dto/
│       │   │   ├── ConsultaDetalhadaDto.java
│       │   │   ├── ConsultaResponseDto.java
│       │   │   ├── CopilotoResponseDto.java
│       │   │   ├── DadosAutenticacao.java
│       │   │   ├── DadosCadastroMedicoDto.java
│       │   │   ├── DadosCadastroPacienteDto.java
│       │   │   ├── DadosListagemPacienteDto.java
│       │   │   ├── DadosTokenJWT.java
│       │   │   ├── PacienteResponseDto.java
│       │   │   ├── ProntuarioEdicaoDto.java
│       │   │   └── ProntuarioGeradoDto.java
│       │   ├── entity/
│       │   │   ├── Consulta.java
│       │   │   ├── Medico.java
│       │   │   └── Paciente.java
│       │   ├── enums/
│       │   │   └── StatusConsulta.java
│       │   ├── repository/
│       │   │   ├── ConsultaRepository.java
│       │   │   ├── MedicoRepository.java
│       │   │   └── PacienteRepository.java
│       │   ├── security/
│       │   │   ├── SecurityConfigurations.java
│       │   │   ├── SecurityFilter.java
│       │   │   └── TokenService.java
│       │   ├── service/
│       │   │   ├── AutenticacaoService.java
│       │   │   ├── ConsultaService.java
│       │   │   ├── DeepgramService.java
│       │   │   └── StorageService.java
│       │   ├── service/ai/
│       │   │   └── MedicoAssistenteAi.java
│       │   ├── storage/
│       │   │   └── R2Config.java
│       │   └── util/
│       │       ├── CryptoConverter.java
│       │       └── GlobalExceptionHandler.java
│       └── resources/
│           └── application.properties
│
└── frontend/
    ├── package.json
    ├── next.config.ts
    └── app/
        ├── layout.tsx
        ├── globals.css
        ├── page.tsx                  (Dashboard)
        ├── login/
        │   └── page.tsx              (Login)
        └── consulta/
            └── [id]/
                └── page.tsx          (Interface de consulta)
```
