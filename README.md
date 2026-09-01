# Knowledge Navigator

Crie uma plataforma web moderna de treinamento corporativo chamada **Trilha de Conhecimento Estratégico – Ongoing**.

O objetivo é criar uma plataforma de aprendizagem onde administradores possam cadastrar cursos, módulos e aulas, e colaboradores possam consumir o conteúdo e acompanhar sua evolução.

## Tecnologias

Utilize:

- React

- TypeScript

- Vite

- Tailwind CSS

- shadcn/ui

- Lucide Icons

- React Router

- Supabase (Autenticação, Banco de Dados e Storage)

A aplicação deve ser totalmente responsiva.

---

# Autenticação

Implementar autenticação com Supabase.

Criar telas de:

- Login

- Recuperação de senha

Após autenticação, redirecionar para o Dashboard.

Existem dois perfis:

- Administrador

- Aluno

O menu deve mudar conforme o perfil.

---

# Dashboard do Aluno

Mostrar:

- Saudação

- Progresso geral da trilha

- Próximo módulo

- Quantidade de módulos concluídos

- Últimos conteúdos acessados

Criar cards para cada módulo contendo:

- Nome

- Descrição

- Progresso

- Status

- Botão "Continuar"

---

# Dashboard Administrativo

Criar um painel administrativo para gerenciamento completo do conteúdo.

O administrador deve conseguir:

- Criar cursos

- Editar cursos

- Excluir cursos

Dentro de cada curso:

- Criar módulos

- Alterar ordem dos módulos

- Editar módulos

- Excluir módulos

Dentro de cada módulo:

- Criar aulas

- Editar aulas

- Excluir aulas

- Alterar ordem das aulas

---

# Página da Aula

Cada aula poderá possuir vários blocos de conteúdo.

Os blocos devem ser organizados em sequência.

Tipos de blocos:

- Texto formatado

- Título

- Subtítulo

- Imagem

- PDF

- Vídeo enviado

- Vídeo do YouTube

- Link externo

- Lista

- Citação

- Caixa de destaque

Cada bloco pode ser adicionado, removido e reorganizado pelo administrador.

---

# Upload de Arquivos

Utilizar Supabase Storage.

Permitir upload de:

- PDF

- DOCX

- PPTX

- XLSX

- PNG

- JPG

- MP4

Após upload:

- salvar URL no banco

- exibir preview quando possível

Para vídeos:

Se for MP4:

Exibir player HTML5.

Se for YouTube:

Incorporar automaticamente.

---

# Editor de Conteúdo

Criar um editor simples para o administrador.

O administrador deve conseguir adicionar blocos clicando em:

+ Adicionar bloco

Escolher entre:

- Texto

- Imagem

- PDF

- Vídeo

- Link

Depois preencher os dados.

Não utilizar editores complexos como TinyMCE ou CKEditor.

Utilizar componentes do shadcn/ui.

---

# Controle de Progresso

Cada aluno possui progresso individual.

Ao clicar em:

"Marcar aula como concluída"

Atualizar automaticamente:

- progresso da aula

- progresso do módulo

- progresso do curso

Mostrar barra de progresso em todas as telas.

---

# Estrutura do Banco de Dados

Criar tabelas:

profiles

- id

- nome

- email

- role

courses

- id

- titulo

- descricao

modules

- id

- course_id

- titulo

- descricao

- ordem

lessons

- id

- module_id

- titulo

- descricao

- ordem

lesson_blocks

- id

- lesson_id

- tipo

- conteudo

- ordem

progress

- id

- user_id

- lesson_id

- completed

- completed_at

files

- id

- lesson_block_id

- nome

- url

- tipo

---

# Navegação

Sidebar contendo:

Dashboard

Cursos

Minha Trilha

Materiais

Perfil

Se administrador:

Dashboard

Cursos

Módulos

Aulas

Arquivos

Usuários

---

# Interface

Utilizar visual corporativo moderno.

Priorizar:

- bastante espaço em branco

- cards

- cantos arredondados

- sombras suaves

- animações discretas

- boa experiência em desktop e mobile

---

# Funcionalidades

Implementar:

- busca por cursos

- busca por módulos

- busca por aulas

- filtros

- paginação

- loading

- estados vazios

- toasts de sucesso e erro

- confirmação antes de excluir registros

---

# Conteúdo inicial

Criar automaticamente um curso chamado:

**Trilha de Conhecimento Estratégico – Ongoing**

Criar os módulos:

- Apresentação da Trilha

- Domínio da InMediam

- Fundamentos do Mercado Imobiliário

- Jornada Completa da Locação

- Aspectos Jurídicos e Gestão de Riscos

- Captação e Retenção de Imóveis

- Marketing Imobiliário

- Performance em Portais

- Análise de Indicadores

- Atuação Consultiva

- Níveis de Maturidade

- Metodologia

- Avaliação

- Certificação

Criar uma aula de exemplo em cada módulo para demonstrar a estrutura.

Não gerar conteúdos reais, apenas placeholders.

---

# Requisitos

- Código limpo e organizado

- Componentização

- Tipagem completa em TypeScript

- Banco de dados pronto para expansão

- Uso de Supabase Storage para todos os arquivos

- Sistema preparado para receber centenas de aulas, PDFs, vídeos e documentos sem necessidade de alterar o código.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://trilhadeconhecimentoestrategico.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c5e65415-a6d9-45d0-88bc-2e75dfbe702f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
