# Fase 6 — Evolução da Plataforma

Transformar a plataforma de "uma trilha" em um ambiente corporativo com múltiplos cursos, conteúdo reutilizável e acesso por grupos — sem quebrar progresso, avaliações e certificados.

## Etapa 1 — Base de dados (fundação)

Novas tabelas (migrations aditivas, nada é apagado):

- `module_lessons` (module_id, lesson_id, ordem, obrigatorio) — associação N:N entre módulos e aulas. Migração automática: cada aula atual gera uma associação com seu módulo, preservando a ordem. A coluna `lessons.module_id` continua existindo por compatibilidade até a Etapa 3.
- `user_groups`, `user_group_members`, `group_courses`, `user_courses` — grupos, membros, cursos do grupo e acesso direto.
- `access_audit` — quem concedeu qual acesso, quando.
- `categories` + `courses.category_id` — categorização de cursos.
- `courses.visibility` ('publico' | 'restrito') e `courses.destaque` (boolean).

Segurança: função `private.can_access_course(user, course)` (grupo OU acesso direto OU público) usada nas policies RLS de `courses`, `modules`, `lessons`, `lesson_blocks`, `files` e no storage. Grupos e associações só são gerenciáveis por admin. GRANTs em todas as tabelas novas.

## Etapa 2 — Controle de acesso (admin + aluno)

- `/admin/grupos`: criar, editar, ativar/desativar, excluir grupos; dentro do grupo, checkboxes de cursos e gestão de usuários do grupo.
- `/admin/usuarios`: passa a exibir grupos e cursos disponíveis por usuário, com painel "Gerenciar acessos" (grupos + acessos diretos).
- CMS do curso: bloco "Quem pode acessar este curso?" (Público / Grupos específicos) e resumo "Acessos" com contagem por grupo, acesso direto e total.
- Aluno: rota de curso mostra tela "Acesso restrito" quando não autorizado, com botão "Voltar para meus cursos".

## Etapa 3 — Conteúdo reutilizável no CMS

- Aula deixa de pertencer a um único módulo: leitura/ordenação passam por `module_lessons`.
- No módulo: "+ Criar novo conteúdo" e "+ Adicionar conteúdo existente" (busca por título/descrição/categoria).
- Badge "Usado em N cursos" na aula, com lista dos cursos ao clicar.
- Excluir aula dentro do módulo abre diálogo: "Remover deste curso" (apaga só a associação) ou "Excluir permanentemente" (bloqueado/confirmação extra se ainda houver associações).
- Aviso ao editar aula reutilizada: "Esta alteração será aplicada a todos os cursos que utilizam este conteúdo."
- Progresso continua por `user_id + lesson_id` (reaproveitado entre cursos); conclusão do curso soma apenas as aulas associadas àquele curso.

## Etapa 4 — Dashboards

Aluno (`/dashboard`): saudação "Olá, [Nome]! 👋", card de progresso geral (% + cursos em andamento/concluídos), "Continue de onde parou", "Meus cursos" (apenas cursos permitidos e publicados) com busca e filtros Todos / Em andamento / Não iniciados / Concluídos, seção "Em destaque", card "Meus certificados" e "Atividade recente" (aulas concluídas, avaliações, certificados). Estado vazio dedicado quando não há cursos liberados.

Admin (`/dashboard` como admin): indicadores de cursos, conteúdos, alunos, cursos em andamento, certificados emitidos, taxa média de conclusão, alunos ativos e rankings de cursos e conteúdos mais acessados.

## Etapa 5 — Dados de teste e verificação

Grupos Comercial e Financeiro com cursos associados, verificação de que aluno de um grupo não enxerga (nem via URL) cursos do outro, e checagem de responsividade.

## Notas técnicas

- Todas as consultas de acesso usam funções SQL agregadas (RPC) para evitar N+1 com centenas de cursos.
- Certificados e avaliações permanecem vinculados ao curso; a carga horária passa a somar as aulas associadas via `module_lessons`.
- Nenhuma aula, bloco ou arquivo é duplicado ao reutilizar conteúdo.
