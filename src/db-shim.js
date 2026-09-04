/**
 * Camada de dados relacional da Central de Rotina.
 *
 * Substitui o antigo storage-shim.js (que guardava tudo como um único
 * JSON dentro de uma linha da tabela rotina_app_storage) por tabelas
 * próprias por entidade: rotina_tasks, rotina_activities,
 * rotina_companies, rotina_people, rotina_categories, rotina_recurring.
 *
 * Expõe `window.db` com a interface que o App.jsx espera:
 *   fetchAll(), insertTask/updateTask/deleteTask,
 *   insertActivity/updateActivity, insertCompany/updateCompany,
 *   insertPerson/updatePerson, insertRecurring/updateRecurring/deleteRecurring,
 *   insertCategory/deleteCategory.
 *
 * Ver README.md para o SQL de criação das tabelas e o script de
 * migração dos dados que já estavam no formato antigo (blob único).
 */

import { supabase } from "./supabaseClient.js";

/* ---------- mapeamento de campos (camelCase JS <-> snake_case SQL) ---------- */

function taskFromRow(r) {
  return {
    id: r.id,
    title: r.title || "",
    description: r.description || "",
    createdAt: r.created_at || "",
    dueDate: r.due_date || "",
    dueTime: r.due_time || "",
    priority: r.priority || "Média",
    status: r.status || "Pendente",
    category: r.category || "",
    subcategory: r.subcategory || "",
    personId: r.person_id || null,
    companyId: r.company_id || null,
    originType: r.origin_type || null,
    originId: r.origin_id || null,
    relatedTaskIds: r.related_task_ids || [],
    notes: r.notes || "",
    attachmentsNote: r.attachments_note || "",
    completedAt: r.completed_at || null,
    completionNote: r.completion_note || "",
    recurringTemplateId: r.recurring_template_id || null,
    inInbox: !!r.in_inbox,
    history: r.history || [],
  };
}
const TASK_FIELD_MAP = {
  title: "title", description: "description", createdAt: "created_at", dueDate: "due_date",
  dueTime: "due_time", priority: "priority", status: "status", category: "category",
  subcategory: "subcategory", personId: "person_id", companyId: "company_id",
  originType: "origin_type", originId: "origin_id", relatedTaskIds: "related_task_ids",
  notes: "notes", attachmentsNote: "attachments_note", completedAt: "completed_at",
  completionNote: "completion_note", recurringTemplateId: "recurring_template_id",
  inInbox: "in_inbox", history: "history",
};

function activityFromRow(r) {
  return {
    id: r.id,
    title: r.title || "",
    description: r.description || "",
    createdAt: r.created_at || "",
    category: r.category || "",
    companyId: r.company_id || null,
    personId: r.person_id || null,
    generatedTaskIds: r.generated_task_ids || [],
  };
}
const ACTIVITY_FIELD_MAP = {
  title: "title", description: "description", createdAt: "created_at", category: "category",
  companyId: "company_id", personId: "person_id", generatedTaskIds: "generated_task_ids",
};

function companyFromRow(r) {
  return { id: r.id, name: r.name || "", segment: r.segment || "", city: r.city || "", notes: r.notes || "" };
}
const COMPANY_FIELD_MAP = { name: "name", segment: "segment", city: "city", notes: "notes" };

function personFromRow(r) {
  return {
    id: r.id, name: r.name || "", companyId: r.company_id || null,
    role: r.role || "", email: r.email || "", phone: r.phone || "", notes: r.notes || "",
  };
}
const PERSON_FIELD_MAP = { name: "name", companyId: "company_id", role: "role", email: "email", phone: "phone", notes: "notes" };

function recurringFromRow(r) {
  return {
    id: r.id, title: r.title || "", description: r.description || "", category: r.category || "",
    priority: r.priority || "Média", companyId: r.company_id || null, personId: r.person_id || null,
    dueTime: r.due_time || "", rule: r.rule || { type: "weekly" }, active: !!r.active,
    nextDueDate: r.next_due_date || "",
  };
}
const RECURRING_FIELD_MAP = {
  title: "title", description: "description", category: "category", priority: "priority",
  companyId: "company_id", personId: "person_id", dueTime: "due_time", rule: "rule",
  active: "active", nextDueDate: "next_due_date",
};

function mapToRow(fieldMap, obj) {
  const row = {};
  Object.keys(obj).forEach((k) => {
    if (fieldMap[k]) row[fieldMap[k]] = obj[k];
  });
  return row;
}

/* ---------- fetch ---------- */

async function fetchAll() {
  const [tasksRes, activitiesRes, companiesRes, peopleRes, categoriesRes, recurringRes] = await Promise.all([
    supabase.from("rotina_tasks").select("*"),
    supabase.from("rotina_activities").select("*"),
    supabase.from("rotina_companies").select("*"),
    supabase.from("rotina_people").select("*"),
    supabase.from("rotina_categories").select("*"),
    supabase.from("rotina_recurring").select("*"),
  ]);

  [tasksRes, activitiesRes, companiesRes, peopleRes, categoriesRes, recurringRes].forEach((res) => {
    if (res.error) console.error("Erro ao buscar dados do Supabase:", res.error);
  });

  return {
    tasks: (tasksRes.data || []).map(taskFromRow),
    activities: (activitiesRes.data || []).map(activityFromRow),
    companies: (companiesRes.data || []).map(companyFromRow),
    people: (peopleRes.data || []).map(personFromRow),
    categories: (categoriesRes.data || []).map((r) => r.name),
    recurring: (recurringRes.data || []).map(recurringFromRow),
  };
}

/* ---------- tasks ---------- */

async function insertTask(task) {
  const { error } = await supabase.from("rotina_tasks").insert({ id: task.id, ...mapToRow(TASK_FIELD_MAP, task) });
  if (error) console.error("insertTask falhou", error);
}
async function updateTask(id, patch) {
  const row = mapToRow(TASK_FIELD_MAP, patch);
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("rotina_tasks").update(row).eq("id", id);
  if (error) console.error("updateTask falhou", error);
}
async function deleteTask(id) {
  const { error } = await supabase.from("rotina_tasks").delete().eq("id", id);
  if (error) console.error("deleteTask falhou", error);
}

/* ---------- activities ---------- */

async function insertActivity(activity) {
  const { error } = await supabase.from("rotina_activities").insert({ id: activity.id, ...mapToRow(ACTIVITY_FIELD_MAP, activity) });
  if (error) console.error("insertActivity falhou", error);
}
async function updateActivity(id, patch) {
  const row = mapToRow(ACTIVITY_FIELD_MAP, patch);
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("rotina_activities").update(row).eq("id", id);
  if (error) console.error("updateActivity falhou", error);
}

/* ---------- companies ---------- */

async function insertCompany(company) {
  const { error } = await supabase.from("rotina_companies").insert({ id: company.id, ...mapToRow(COMPANY_FIELD_MAP, company) });
  if (error) console.error("insertCompany falhou", error);
}
async function updateCompany(id, patch) {
  const row = mapToRow(COMPANY_FIELD_MAP, patch);
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("rotina_companies").update(row).eq("id", id);
  if (error) console.error("updateCompany falhou", error);
}

/* ---------- people ---------- */

async function insertPerson(person) {
  const { error } = await supabase.from("rotina_people").insert({ id: person.id, ...mapToRow(PERSON_FIELD_MAP, person) });
  if (error) console.error("insertPerson falhou", error);
}
async function updatePerson(id, patch) {
  const row = mapToRow(PERSON_FIELD_MAP, patch);
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("rotina_people").update(row).eq("id", id);
  if (error) console.error("updatePerson falhou", error);
}

/* ---------- recurring ---------- */

async function insertRecurring(tpl) {
  const { error } = await supabase.from("rotina_recurring").insert({ id: tpl.id, ...mapToRow(RECURRING_FIELD_MAP, tpl) });
  if (error) console.error("insertRecurring falhou", error);
}
async function updateRecurring(id, patch) {
  const row = mapToRow(RECURRING_FIELD_MAP, patch);
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("rotina_recurring").update(row).eq("id", id);
  if (error) console.error("updateRecurring falhou", error);
}
async function deleteRecurring(id) {
  const { error } = await supabase.from("rotina_recurring").delete().eq("id", id);
  if (error) console.error("deleteRecurring falhou", error);
}

/* ---------- categories ---------- */

async function insertCategory(name) {
  const { error } = await supabase.from("rotina_categories").upsert({ name });
  if (error) console.error("insertCategory falhou", error);
}
async function deleteCategory(name) {
  const { error } = await supabase.from("rotina_categories").delete().eq("name", name);
  if (error) console.error("deleteCategory falhou", error);
}

if (typeof window !== "undefined" && !window.db) {
  window.db = {
    fetchAll,
    insertTask, updateTask, deleteTask,
    insertActivity, updateActivity,
    insertCompany, updateCompany,
    insertPerson, updatePerson,
    insertRecurring, updateRecurring, deleteRecurring,
    insertCategory, deleteCategory,
  };
}
