import { supabase } from "@/integrations/supabase/client";

export type CourseVisibility = "publico" | "restrito";

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  active: boolean;
  created_at: string;
}

export interface GroupMember {
  userId: string;
  nome: string;
  email: string;
}

export const accessKeys = {
  groups: ["access", "groups"] as const,
  group: (id: string) => ["access", "group", id] as const,
  groupCourses: (id: string) => ["access", "group-courses", id] as const,
  groupMembers: (id: string) => ["access", "group-members", id] as const,
  memberships: ["access", "memberships"] as const,
  directCourses: ["access", "direct-courses"] as const,
  courseAccess: (id: string) => ["access", "course-access", id] as const,
  categories: ["access", "categories"] as const,
};

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

async function audit(entry: {
  action: string;
  group_id?: string | null;
  course_id?: string | null;
  target_user_id?: string | null;
  detalhe?: string;
}) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("access_audit").insert({
    actor_id: data.user.id,
    action: entry.action,
    group_id: entry.group_id ?? null,
    course_id: entry.course_id ?? null,
    target_user_id: entry.target_user_id ?? null,
    detalhe: entry.detalhe ?? "",
  });
}

/* --------------------------------- Grupos --------------------------------- */

export async function listGroups(): Promise<UserGroup[]> {
  const { data, error } = await supabase.from("user_groups").select("*").order("name");
  fail(error);
  return (data ?? []) as UserGroup[];
}

export async function getGroup(id: string): Promise<UserGroup | null> {
  const { data, error } = await supabase.from("user_groups").select("*").eq("id", id).maybeSingle();
  fail(error);
  return (data as UserGroup | null) ?? null;
}

export async function createGroup(input: { name: string; description: string }) {
  const { data, error } = await supabase
    .from("user_groups")
    .insert({ name: input.name, description: input.description })
    .select("*")
    .single();
  fail(error);
  const group = data as UserGroup;
  await audit({ action: "grupo_criado", group_id: group.id, detalhe: group.name });
  return group;
}

export async function updateGroup(
  id: string,
  input: Partial<{ name: string; description: string; active: boolean }>,
) {
  const { error } = await supabase.from("user_groups").update(input).eq("id", id);
  fail(error);
  await audit({ action: "grupo_atualizado", group_id: id });
}

export async function deleteGroup(id: string) {
  const { error } = await supabase.from("user_groups").delete().eq("id", id);
  fail(error);
  await audit({ action: "grupo_excluido", group_id: id });
}

/* ---------------------------- Cursos por grupo ---------------------------- */

export async function listGroupCourseIds(groupId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("group_courses")
    .select("course_id")
    .eq("group_id", groupId);
  fail(error);
  return (data ?? []).map((r) => r.course_id);
}

export async function setGroupCourses(groupId: string, courseIds: string[]) {
  const atuais = await listGroupCourseIds(groupId);
  const adicionar = courseIds.filter((id) => !atuais.includes(id));
  const remover = atuais.filter((id) => !courseIds.includes(id));

  if (adicionar.length > 0) {
    const { error } = await supabase
      .from("group_courses")
      .insert(adicionar.map((course_id) => ({ group_id: groupId, course_id })));
    fail(error);
  }
  if (remover.length > 0) {
    const { error } = await supabase
      .from("group_courses")
      .delete()
      .eq("group_id", groupId)
      .in("course_id", remover);
    fail(error);
  }
  for (const course_id of adicionar) {
    await audit({ action: "curso_liberado_para_grupo", group_id: groupId, course_id });
  }
  for (const course_id of remover) {
    await audit({ action: "curso_removido_do_grupo", group_id: groupId, course_id });
  }
}

/* --------------------------- Usuários por grupo --------------------------- */

export async function listGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from("user_group_members")
    .select("user_id")
    .eq("group_id", groupId);
  fail(error);
  const ids = (data ?? []).map((r) => r.user_id);
  if (ids.length === 0) return [];
  const { data: profiles, error: profError } = await supabase
    .from("profiles")
    .select("id, nome, email")
    .in("id", ids);
  fail(profError);
  return (profiles ?? []).map((p) => ({ userId: p.id, nome: p.nome || p.email, email: p.email }));
}

export async function addGroupMember(groupId: string, userId: string) {
  const { error } = await supabase
    .from("user_group_members")
    .insert({ group_id: groupId, user_id: userId });
  fail(error);
  await audit({ action: "usuario_adicionado_ao_grupo", group_id: groupId, target_user_id: userId });
}

export async function removeGroupMember(groupId: string, userId: string) {
  const { error } = await supabase
    .from("user_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  fail(error);
  await audit({ action: "usuario_removido_do_grupo", group_id: groupId, target_user_id: userId });
}

/* ------------------------- Visão geral de acessos ------------------------- */

export interface MembershipRow {
  user_id: string;
  group_id: string;
}

export async function listAllMemberships(): Promise<MembershipRow[]> {
  const { data, error } = await supabase.from("user_group_members").select("user_id, group_id");
  fail(error);
  return (data ?? []) as MembershipRow[];
}

export async function listAllGroupCourses(): Promise<{ group_id: string; course_id: string }[]> {
  const { data, error } = await supabase.from("group_courses").select("group_id, course_id");
  fail(error);
  return data ?? [];
}

export async function listAllDirectCourses(): Promise<{ user_id: string; course_id: string }[]> {
  const { data, error } = await supabase.from("user_courses").select("user_id, course_id");
  fail(error);
  return data ?? [];
}

export async function setUserGroups(userId: string, groupIds: string[]) {
  const { data, error } = await supabase
    .from("user_group_members")
    .select("group_id")
    .eq("user_id", userId);
  fail(error);
  const atuais = (data ?? []).map((r) => r.group_id);
  const adicionar = groupIds.filter((id) => !atuais.includes(id));
  const remover = atuais.filter((id) => !groupIds.includes(id));
  if (adicionar.length > 0) {
    const res = await supabase
      .from("user_group_members")
      .insert(adicionar.map((group_id) => ({ group_id, user_id: userId })));
    fail(res.error);
  }
  if (remover.length > 0) {
    const res = await supabase
      .from("user_group_members")
      .delete()
      .eq("user_id", userId)
      .in("group_id", remover);
    fail(res.error);
  }
  for (const group_id of adicionar) {
    await audit({ action: "usuario_adicionado_ao_grupo", group_id, target_user_id: userId });
  }
  for (const group_id of remover) {
    await audit({ action: "usuario_removido_do_grupo", group_id, target_user_id: userId });
  }
}

export async function setUserDirectCourses(userId: string, courseIds: string[]) {
  const { data, error } = await supabase
    .from("user_courses")
    .select("course_id")
    .eq("user_id", userId);
  fail(error);
  const atuais = (data ?? []).map((r) => r.course_id);
  const adicionar = courseIds.filter((id) => !atuais.includes(id));
  const remover = atuais.filter((id) => !courseIds.includes(id));
  if (adicionar.length > 0) {
    const res = await supabase
      .from("user_courses")
      .insert(adicionar.map((course_id) => ({ course_id, user_id: userId })));
    fail(res.error);
  }
  if (remover.length > 0) {
    const res = await supabase
      .from("user_courses")
      .delete()
      .eq("user_id", userId)
      .in("course_id", remover);
    fail(res.error);
  }
  for (const course_id of adicionar) {
    await audit({ action: "acesso_direto_concedido", course_id, target_user_id: userId });
  }
  for (const course_id of remover) {
    await audit({ action: "acesso_direto_removido", course_id, target_user_id: userId });
  }
}

/* --------------------------- Acessos de um curso -------------------------- */

export interface CourseAccessSummary {
  visibility: CourseVisibility;
  groups: { group: UserGroup; usuarios: number }[];
  diretos: number;
  total: number;
}

export async function courseAccessSummary(courseId: string): Promise<CourseAccessSummary> {
  const [{ data: course }, { data: gc }, { data: uc }, groups, memberships] = await Promise.all([
    supabase.from("courses").select("visibility").eq("id", courseId).maybeSingle(),
    supabase.from("group_courses").select("group_id").eq("course_id", courseId),
    supabase.from("user_courses").select("user_id").eq("course_id", courseId),
    listGroups(),
    listAllMemberships(),
  ]);

  const groupIds = (gc ?? []).map((r) => r.group_id);
  const detalhes = groups
    .filter((g) => groupIds.includes(g.id))
    .map((group) => ({
      group,
      usuarios: memberships.filter((m) => m.group_id === group.id).length,
    }));

  const usuariosGrupo = new Set(
    memberships.filter((m) => groupIds.includes(m.group_id)).map((m) => m.user_id),
  );
  const diretos = (uc ?? []).map((r) => r.user_id);
  diretos.forEach((id) => usuariosGrupo.add(id));

  return {
    visibility: ((course as { visibility?: CourseVisibility } | null)?.visibility ??
      "publico") as CourseVisibility,
    groups: detalhes,
    diretos: diretos.length,
    total: usuariosGrupo.size,
  };
}

export async function setCourseVisibility(courseId: string, visibility: CourseVisibility) {
  const { error } = await supabase.from("courses").update({ visibility }).eq("id", courseId);
  fail(error);
  await audit({ action: "visibilidade_alterada", course_id: courseId, detalhe: visibility });
}

export async function setCourseGroups(courseId: string, groupIds: string[]) {
  const { data, error } = await supabase
    .from("group_courses")
    .select("group_id")
    .eq("course_id", courseId);
  fail(error);
  const atuais = (data ?? []).map((r) => r.group_id);
  const adicionar = groupIds.filter((id) => !atuais.includes(id));
  const remover = atuais.filter((id) => !groupIds.includes(id));
  if (adicionar.length > 0) {
    const res = await supabase
      .from("group_courses")
      .insert(adicionar.map((group_id) => ({ group_id, course_id: courseId })));
    fail(res.error);
  }
  if (remover.length > 0) {
    const res = await supabase
      .from("group_courses")
      .delete()
      .eq("course_id", courseId)
      .in("group_id", remover);
    fail(res.error);
  }
  for (const group_id of adicionar) {
    await audit({ action: "curso_liberado_para_grupo", group_id, course_id: courseId });
  }
  for (const group_id of remover) {
    await audit({ action: "curso_removido_do_grupo", group_id, course_id: courseId });
  }
}

/* -------------------------------- Categorias ------------------------------- */

export interface Category {
  id: string;
  nome: string;
  descricao: string;
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("id, nome, descricao").order("nome");
  fail(error);
  return (data ?? []) as Category[];
}
