-- roles
CREATE TYPE public.app_role AS ENUM ('admin', 'aluno');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'aluno',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'aluno') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- content
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  capa_url TEXT,
  publicado BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_modules_course ON public.modules(course_id, ordem);

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lessons_module ON public.lessons(module_id, ordem);

CREATE TABLE public.lesson_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  conteudo JSONB NOT NULL DEFAULT '{}'::jsonb,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_blocks_lesson ON public.lesson_blocks(lesson_id, ordem);

CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_block_id UUID REFERENCES public.lesson_blocks(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  path TEXT,
  tipo TEXT NOT NULL DEFAULT '',
  tamanho BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_files_block ON public.files(lesson_block_id);

CREATE TABLE public.progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX idx_progress_user ON public.progress(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_blocks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress TO authenticated;
GRANT ALL ON public.courses, public.modules, public.lessons, public.lesson_blocks, public.files, public.progress TO service_role;

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_read" ON public.courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "courses_admin" ON public.courses FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "modules_read" ON public.modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "modules_admin" ON public.modules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "lessons_read" ON public.lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "lessons_admin" ON public.lessons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "blocks_read" ON public.lesson_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "blocks_admin" ON public.lesson_blocks FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "files_read" ON public.files FOR SELECT TO authenticated USING (true);
CREATE POLICY "files_admin" ON public.files FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "progress_own" ON public.progress FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "progress_admin_read" ON public.progress FOR SELECT TO authenticated USING (public.is_admin());

CREATE TRIGGER t_courses_upd BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_modules_upd BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_lessons_upd BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_blocks_upd BEFORE UPDATE ON public.lesson_blocks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- seed
INSERT INTO public.courses (id, titulo, descricao) VALUES
('11111111-1111-4111-8111-111111111111', 'Trilha de Conhecimento Estratégico – Ongoing', 'Programa corporativo de desenvolvimento contínuo com módulos sobre mercado imobiliário, locação, jurídico, marketing e performance.');

INSERT INTO public.modules (id, course_id, titulo, descricao, ordem) VALUES
('22222222-0001-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Apresentação da Trilha','Visão geral do programa e objetivos de aprendizagem.',1),
('22222222-0002-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Domínio da InMediam','Contexto, cultura e posicionamento da empresa.',2),
('22222222-0003-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Fundamentos do Mercado Imobiliário','Conceitos essenciais do setor.',3),
('22222222-0004-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Jornada Completa da Locação','Etapas do processo de locação ponta a ponta.',4),
('22222222-0005-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Aspectos Jurídicos e Gestão de Riscos','Contratos, garantias e mitigação de riscos.',5),
('22222222-0006-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Captação e Retenção de Imóveis','Estratégias de originação e fidelização.',6),
('22222222-0007-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Marketing Imobiliário','Posicionamento, conteúdo e geração de demanda.',7),
('22222222-0008-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Performance em Portais','Otimização de anúncios e conversão.',8),
('22222222-0009-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Análise de Indicadores','KPIs, metas e leitura de resultados.',9),
('22222222-0010-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Atuação Consultiva','Diagnóstico e recomendação ao cliente.',10),
('22222222-0011-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Níveis de Maturidade','Escala de evolução do profissional.',11),
('22222222-0012-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Metodologia','Como o programa é conduzido.',12),
('22222222-0013-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Avaliação','Critérios de avaliação e feedback.',13),
('22222222-0014-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Certificação','Requisitos para emissão do certificado.',14);

INSERT INTO public.lessons (id, module_id, titulo, descricao, ordem)
SELECT ('33333333-' || lpad((row_number() OVER (ORDER BY m.ordem))::text, 4, '0') || '-4111-8111-111111111111')::uuid,
       m.id, 'Aula 1 – ' || m.titulo, 'Aula de exemplo demonstrando a estrutura de conteúdo do módulo.', 1
FROM public.modules m WHERE m.course_id = '11111111-1111-4111-8111-111111111111';

INSERT INTO public.lesson_blocks (lesson_id, tipo, conteudo, ordem)
SELECT l.id, 'titulo', jsonb_build_object('texto', l.titulo), 1 FROM public.lessons l;
INSERT INTO public.lesson_blocks (lesson_id, tipo, conteudo, ordem)
SELECT l.id, 'texto', jsonb_build_object('texto', 'Conteúdo placeholder. O administrador pode editar esta aula e adicionar textos, imagens, PDFs, vídeos e links.'), 2 FROM public.lessons l;
INSERT INTO public.lesson_blocks (lesson_id, tipo, conteudo, ordem)
SELECT l.id, 'destaque', jsonb_build_object('texto', 'Dica: use o editor de blocos para montar a aula na ordem que preferir.'), 3 FROM public.lessons l;