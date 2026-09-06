import { useState, useEffect, useRef, useMemo } from "react";
import {
  Inbox, CheckSquare, Activity, Calendar, Building2, Users, Repeat,
  BarChart3, Settings, Search, Plus, Clock, AlertCircle, ChevronRight,
  ChevronLeft, X, Link2, History, ArrowRight, Check, Trash2, Edit2,
  Home, Circle, CircleDot, Paperclip, ArrowUpRight, Sparkles, Menu, Mail, Phone
} from "lucide-react";

/* ============================================================
   TOKENS & CONSTANTS
   ============================================================ */

const PRIORITIES = ["Baixa", "Média", "Alta", "Urgente"];
const PRIORITY_COLOR = {
  Baixa: "#8B93A7",
  Média: "#5C7FA6",
  Alta: "#D9822B",
  Urgente: "#D64545",
};
const PRIORITY_DOT = {
  Baixa: "⚪",
  Média: "🔵",
  Alta: "🟠",
  Urgente: "🔴",
};
const STATUSES = ["Pendente", "Em andamento", "Concluída", "Cancelada"];
const DEFAULT_CATEGORIES = [
  "Comercial", "Administrativo", "Interno", "Financeiro",
  "Reuniões", "Documentação", "Acompanhamento", "Outros",
];

const STORAGE_KEY = "brdata-rotina-app-v1";

const NAV = [
  { id: "rotina", label: "Minha Rotina", icon: Home },
  { id: "inbox", label: "Caixa de Entrada", icon: Inbox },
  { id: "tasks", label: "Tarefas", icon: CheckSquare },
  { id: "activities", label: "Atividades", icon: Activity },
  { id: "agenda", label: "Agenda", icon: Calendar },
  { id: "companies", label: "Empresas", icon: Building2 },
  { id: "people", label: "Pessoas", icon: Users },
  { id: "recurring", label: "Recorrentes", icon: Repeat },
  { id: "overview", label: "Visão Geral", icon: BarChart3 },
  { id: "settings", label: "Configurações", icon: Settings },
];

/* ============================================================
   HELPERS
   ============================================================ */

function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function pad(n) { return String(n).padStart(2, "0"); }

function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayStr() { return toDateStr(new Date()); }

function parseLocalDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatDateBR(str) {
  if (!str) return "";
  const d = parseLocalDate(str);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatDateShortBR(str) {
  if (!str) return "";
  const d = parseLocalDate(str);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

function nowTs() {
  const d = new Date();
  return `${toDateStr(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addDays(dateStr, n) {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function isOverdue(t) {
  return t.dueDate && t.dueDate < todayStr() && t.status !== "Concluída" && t.status !== "Cancelada";
}
function isDueToday(t) {
  return t.dueDate === todayStr() && t.status !== "Concluída" && t.status !== "Cancelada";
}
function isDueTomorrow(t) {
  return t.dueDate === addDays(todayStr(), 1) && t.status !== "Concluída" && t.status !== "Cancelada";
}
function isUpcoming(t) {
  return t.dueDate && t.dueDate > addDays(todayStr(), 1) && t.status !== "Concluída" && t.status !== "Cancelada";
}

function computeNextDate(rule, fromDateStr) {
  const base = fromDateStr || todayStr();
  const d = parseLocalDate(base);
  switch (rule.type) {
    case "daily": d.setDate(d.getDate() + 1); break;
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "everyN": d.setDate(d.getDate() + (Number(rule.n) || 1)); break;
    default: d.setDate(d.getDate() + 1);
  }
  return toDateStr(d);
}

function ruleLabel(rule) {
  switch (rule.type) {
    case "daily": return "Todo dia";
    case "weekly": return "Toda semana (mesmo dia)";
    case "monthly": return "Todo mês (mesmo dia)";
    case "everyN": return `A cada ${rule.n || 1} dia(s)`;
    default: return "Recorrente";
  }
}

function emptyData() {
  return {
    tasks: [],
    activities: [],
    companies: [
      { id: uid("co"), name: "BRData Tecnologia" },
    ],
    people: [],
    categories: [...DEFAULT_CATEGORIES],
    recurring: [],
  };
}

function newHistoryEntry(text) {
  return { id: uid("h"), ts: nowTs(), text };
}

/* ============================================================
   NOTIFICATION BOOKKEEPING (localStorage puro, não vai pro Supabase)
   ============================================================ */

const NOTIF_LOG_KEY = "rotina-notified-log";
const NOTIF_ENABLED_KEY = "rotina-notifications-enabled";

function getNotifiedLog() {
  try {
    const raw = localStorage.getItem(NOTIF_LOG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}
function markNotified(taskId) {
  try {
    const log = getNotifiedLog();
    log[taskId] = todayStr();
    localStorage.setItem(NOTIF_LOG_KEY, JSON.stringify(log));
  } catch (e) {}
}
function wasNotifiedToday(taskId) {
  return getNotifiedLog()[taskId] === todayStr();
}
function getNotificationsEnabledPref() {
  try { return localStorage.getItem(NOTIF_ENABLED_KEY) === "1"; } catch (e) { return false; }
}
function setNotificationsEnabledPref(val) {
  try { localStorage.setItem(NOTIF_ENABLED_KEY, val ? "1" : "0"); } catch (e) {}
}

/* ============================================================
   STORAGE HOOK
   ============================================================ */

function useAppData() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const fetched = await window.db.fetchAll();
        setData({ ...emptyData(), ...fetched });
      } catch (e) {
        console.error("Falha ao carregar dados", e);
        setData(emptyData());
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  return [data, setData, loaded];
}

/* ============================================================
   SMALL UI PRIMITIVES
   ============================================================ */

function Badge({ children, color, bg }) {
  return (
    <span className="badge" style={{ color: color || "#374151", background: bg || "#EEF1F6" }}>
      {children}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span className="pbadge" style={{ "--pc": PRIORITY_COLOR[priority] || "#8B93A7" }}>
      <span className="pdot" />{priority}
    </span>
  );
}

function StatusPill({ status }) {
  const map = {
    "Pendente": "#8B93A7",
    "Em andamento": "#5C7FA6",
    "Concluída": "#2F9E5C",
    "Cancelada": "#B0B6C2",
  };
  return <span className="badge" style={{ color: map[status], background: map[status] + "18" }}>{status}</span>;
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="empty-state">
      <Icon size={28} strokeWidth={1.4} />
      <div className="empty-title">{title}</div>
      {hint && <div className="empty-hint">{hint}</div>}
    </div>
  );
}

function IconBtn({ icon: Icon, onClick, title, danger }) {
  return (
    <button className={`icon-btn ${danger ? "danger" : ""}`} onClick={onClick} title={title} type="button">
      <Icon size={15} />
    </button>
  );
}

/* ============================================================
   TASK CARD (used across views)
   ============================================================ */

function TaskRow({ task, companies, people, onOpen, onQuickComplete, bulkMode, selected, onToggleSelect }) {
  const company = companies.find((c) => c.id === task.companyId);
  const person = people.find((p) => p.id === task.personId);
  const overdue = isOverdue(task);
  return (
    <div className={`task-row ${task.status === "Concluída" ? "done" : ""}`} onClick={() => bulkMode ? onToggleSelect(task.id) : onOpen(task)}>
      <button
        className={`check-circle ${bulkMode ? (selected ? "checked" : "") : (task.status === "Concluída" ? "checked" : "")}`}
        onClick={(e) => { e.stopPropagation(); bulkMode ? onToggleSelect(task.id) : onQuickComplete(task); }}
        title={bulkMode ? (selected ? "Desmarcar" : "Selecionar") : (task.status === "Concluída" ? "Reabrir" : "Concluir")}
      >
        {(bulkMode ? selected : task.status === "Concluída") && <Check size={11} strokeWidth={3} />}
      </button>
      <div className="task-row-main">
        {company && <div className="task-row-company">{company.name}</div>}
        <div className="task-row-title">
          {task.title}
          {task.recurringTemplateId && <Repeat size={12} className="inline-icon" />}
        </div>
        <div className="task-row-meta">
          {task.category && <span className="meta-chip">{task.category}</span>}
          {person && <span className="meta-chip">{person.name}</span>}
          {task.dueDate && (
            <span className={`meta-chip ${overdue ? "meta-overdue" : ""}`}>
              <Clock size={11} /> {formatDateShortBR(task.dueDate)}{task.dueTime ? ` ${task.dueTime}` : ""}
            </span>
          )}
        </div>
      </div>
      <PriorityBadge priority={task.priority} />
      <ChevronRight size={15} className="row-chevron" />
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */

export default function App() {
  const [data, setData, loaded] = useAppData();
  const [view, setView] = useState("rotina");
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskFormPrefill, setTaskFormPrefill] = useState(null);
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [activityFormPrefill, setActivityFormPrefill] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [completingTask, setCompletingTask] = useState(null);
  const [personModal, setPersonModal] = useState(null); // null | "new" | person object
  const [companyModal, setCompanyModal] = useState(null); // null | "new" | company object
  const [recurringModal, setRecurringModal] = useState(null); // null | "new" | recurring object
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [inboxDraft, setInboxDraft] = useState("");
  const [companyFilter, setCompanyFilter] = useState(null);
  const [personFilter, setPersonFilter] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileTarget, setProfileTarget] = useState(null); // { type: "company"|"person", id }
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => getNotificationsEnabledPref());
  const [notificationPermission, setNotificationPermission] = useState(() => (typeof Notification !== "undefined" ? Notification.permission : "unsupported"));
  const [bulkCompleteTarget, setBulkCompleteTarget] = useState(null); // array of task ids
  const recurringChecked = useRef(false);
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  // ensure recurring instances exist (runs once after data loaded)
  useEffect(() => {
    if (!loaded || !data || recurringChecked.current) return;
    recurringChecked.current = true;
    ensureRecurringInstances();
    // eslint-disable-next-line
  }, [loaded, data]);

  // lembretes: verifica tarefas atrasadas/vencendo hoje e dispara notificação do navegador
  useEffect(() => {
    if (!loaded) return;
    if (!notificationsEnabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;

    function checkAndNotify() {
      const d = dataRef.current;
      if (!d) return;
      const candidates = d.tasks.filter((t) =>
        !t.inInbox && t.status !== "Concluída" && t.status !== "Cancelada" && t.dueDate && t.dueDate <= todayStr()
      );
      candidates.forEach((t) => {
        if (wasNotifiedToday(t.id)) return;
        const lateFlag = t.dueDate < todayStr();
        try {
          const n = new Notification(lateFlag ? "Tarefa atrasada" : "Tarefa de hoje", {
            body: t.title,
            tag: t.id,
          });
          n.onclick = () => {
            window.focus();
            setSelectedTask(t);
          };
        } catch (e) { /* navegador pode bloquear silenciosamente */ }
        markNotified(t.id);
      });
    }

    checkAndNotify();
    const interval = setInterval(checkAndNotify, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loaded, notificationsEnabled]);

  // atalhos de teclado: N = nova tarefa, / = buscar, Esc = fechar o que estiver aberto
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = (e.target.tagName || "").toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable;

      if (e.key === "Escape") {
        if (selectedTask) { setSelectedTask(null); return; }
        if (taskFormOpen) { setTaskFormOpen(false); setTaskFormPrefill(null); return; }
        if (activityFormOpen) { setActivityFormOpen(false); setActivityFormPrefill(null); return; }
        if (editingActivity) { setEditingActivity(null); return; }
        if (recurringModal) { setRecurringModal(null); return; }
        if (personModal) { setPersonModal(null); return; }
        if (companyModal) { setCompanyModal(null); return; }
        if (completingTask) { setCompletingTask(null); return; }
        if (bulkCompleteTarget) { setBulkCompleteTarget(null); return; }
        if (searchOpen) { setSearchOpen(false); return; }
        if (mobileNavOpen) { setMobileNavOpen(false); return; }
        return;
      }

      if (isTyping) return;
      const anyModalOpen = selectedTask || taskFormOpen || activityFormOpen || editingActivity || recurringModal || personModal || companyModal || completingTask || bulkCompleteTarget;
      if (anyModalOpen) return;

      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setTaskFormPrefill(null);
        setTaskFormOpen(true);
      } else if (e.key === "/") {
        e.preventDefault();
        const el = document.getElementById("global-search-input");
        if (el) el.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTask, taskFormOpen, activityFormOpen, editingActivity, recurringModal, personModal, companyModal, completingTask, bulkCompleteTarget, searchOpen, mobileNavOpen]);

  function toggleNotifications() {
    if (!notificationsEnabled) {
      if (typeof Notification === "undefined") {
        alert("Este navegador não suporta notificações.");
        return;
      }
      Notification.requestPermission().then((perm) => {
        setNotificationPermission(perm);
        if (perm === "granted") {
          setNotificationsEnabledPref(true);
          setNotificationsEnabled(true);
        }
      });
    } else {
      setNotificationsEnabledPref(false);
      setNotificationsEnabled(false);
    }
  }

  if (!loaded || !data) {
    return (
      <div className="app-root loading-root">
        <Style />
        <div className="loading-box">Carregando sua central de rotina…</div>
      </div>
    );
  }

  /* ---------- mutators ---------- */

  function update(mutator) {
    setData((prev) => {
      const next = { ...prev };
      mutator(next);
      return next;
    });
  }

  function ensureRecurringInstances() {
    update((d) => {
      const tasks = [...d.tasks];
      const recurring = d.recurring.map((r) => ({ ...r }));
      recurring.forEach((tpl) => {
        if (!tpl.active) return;
        const open = tasks.find((t) => t.recurringTemplateId === tpl.id && t.status !== "Concluída" && t.status !== "Cancelada");
        if (!open) {
          const due = tpl.nextDueDate || todayStr();
          const newTask = makeTaskFromTemplate(tpl, due);
          tasks.push(newTask);
          tpl.nextDueDate = computeNextDate(tpl.rule, due);
          window.db.insertTask(newTask).catch(console.error);
          window.db.updateRecurring(tpl.id, { nextDueDate: tpl.nextDueDate }).catch(console.error);
        }
      });
      d.tasks = tasks;
      d.recurring = recurring;
    });
  }

  function makeTaskFromTemplate(tpl, dueDate) {
    return {
      id: uid("t"),
      title: tpl.title,
      description: tpl.description || "",
      createdAt: nowTs(),
      dueDate,
      dueTime: tpl.dueTime || "",
      priority: tpl.priority || "Média",
      status: "Pendente",
      category: tpl.category || "Outros",
      subcategory: "",
      personId: tpl.personId || null,
      companyId: tpl.companyId || null,
      originType: "recurring",
      originId: tpl.id,
      relatedTaskIds: [],
      notes: "",
      attachmentsNote: "",
      completedAt: null,
      recurringTemplateId: tpl.id,
      inInbox: false,
      history: [newHistoryEntry(`Gerada automaticamente pela recorrência "${tpl.title}" (${ruleLabel(tpl.rule)}).`)],
    };
  }

  function addTask(task) {
    update((d) => { d.tasks = [...d.tasks, task]; });
    window.db.insertTask(task).catch(console.error);
  }

  function patchTask(id, patch, historyText) {
    const current = data.tasks.find((t) => t.id === id);
    const fullPatch = historyText ? { ...patch, history: [...(current?.history || []), newHistoryEntry(historyText)] } : patch;
    update((d) => {
      d.tasks = d.tasks.map((t) => t.id === id ? { ...t, ...fullPatch } : t);
    });
    window.db.updateTask(id, fullPatch).catch(console.error);
  }

  function deleteTask(id) {
    update((d) => { d.tasks = d.tasks.filter((t) => t.id !== id); });
    window.db.deleteTask(id).catch(console.error);
    setSelectedTask(null);
  }

  function completeTask(task, executionNote) {
    const willComplete = task.status !== "Concluída";
    if (willComplete) {
      patchTask(
        task.id,
        { status: "Concluída", completedAt: nowTs(), completionNote: executionNote || "" },
        `Marcada como concluída. Execução: ${executionNote}`
      );
    } else {
      patchTask(task.id, { status: "Pendente" }, "Reaberta (voltou para Pendente).");
    }
    if (willComplete && task.recurringTemplateId) {
      update((d) => {
        const tpl = d.recurring.find((r) => r.id === task.recurringTemplateId);
        if (tpl && tpl.active) {
          const due = tpl.nextDueDate || computeNextDate(tpl.rule, task.dueDate);
          const exists = d.tasks.find((t) => t.recurringTemplateId === tpl.id && t.status !== "Concluída" && t.status !== "Cancelada");
          if (!exists) {
            const newTask = makeTaskFromTemplate(tpl, due);
            const newNextDue = computeNextDate(tpl.rule, due);
            d.tasks = [...d.tasks, newTask];
            d.recurring = d.recurring.map((r) => r.id === tpl.id ? { ...r, nextDueDate: newNextDue } : r);
            window.db.insertTask(newTask).catch(console.error);
            window.db.updateRecurring(tpl.id, { nextDueDate: newNextDue }).catch(console.error);
          }
        }
      });
    }
  }

  function requestComplete(task) {
    if (task.status === "Concluída") {
      completeTask(task);
    } else {
      setCompletingTask(task);
    }
  }

  function bulkCompleteTasks(ids, note) {
    ids.forEach((id) => {
      const t = data.tasks.find((x) => x.id === id);
      if (t && t.status !== "Concluída") completeTask(t, note);
    });
  }

  function bulkSetCategory(ids, category) {
    update((d) => { d.tasks = d.tasks.map((t) => ids.includes(t.id) ? { ...t, category } : t); });
    ids.forEach((id) => window.db.updateTask(id, { category }).catch(console.error));
  }

  function bulkSetPriority(ids, priority) {
    update((d) => { d.tasks = d.tasks.map((t) => ids.includes(t.id) ? { ...t, priority } : t); });
    ids.forEach((id) => window.db.updateTask(id, { priority }).catch(console.error));
  }

  function bulkDeleteTasks(ids) {
    update((d) => { d.tasks = d.tasks.filter((t) => !ids.includes(t.id)); });
    ids.forEach((id) => window.db.deleteTask(id).catch(console.error));
  }

  function rescheduleTask(task, newDate) {
    const old = task.dueDate;
    patchTask(task.id, { dueDate: newDate }, `Prazo alterado de ${old ? formatDateBR(old) : "sem prazo"} para ${formatDateBR(newDate)}.`);
  }

  function linkTasks(idA, idB) {
    const taskA = data.tasks.find((t) => t.id === idA);
    const taskB = data.tasks.find((t) => t.id === idB);
    const relA = Array.from(new Set([...(taskA?.relatedTaskIds || []), idB]));
    const relB = Array.from(new Set([...(taskB?.relatedTaskIds || []), idA]));
    update((d) => {
      d.tasks = d.tasks.map((t) => {
        if (t.id === idA) return { ...t, relatedTaskIds: relA };
        if (t.id === idB) return { ...t, relatedTaskIds: relB };
        return t;
      });
    });
    window.db.updateTask(idA, { relatedTaskIds: relA }).catch(console.error);
    window.db.updateTask(idB, { relatedTaskIds: relB }).catch(console.error);
  }

  function addActivity(activity) {
    update((d) => { d.activities = [...d.activities, activity]; });
    window.db.insertActivity(activity).catch(console.error);
  }

  function patchActivity(id, form) {
    const patch = {
      title: (form.title || "").trim() || undefined,
      description: form.description || "",
      category: form.category || "",
      companyId: form.companyId || null,
      personId: form.personId || null,
    };
    update((d) => {
      d.activities = d.activities.map((a) => a.id === id ? { ...a, ...patch, title: patch.title || a.title } : a);
    });
    window.db.updateActivity(id, patch).catch(console.error);
  }

  function generateTaskFromActivity(activity, taskDraft) {
    const task = {
      id: uid("t"),
      title: taskDraft.title,
      description: taskDraft.description || "",
      createdAt: nowTs(),
      dueDate: taskDraft.dueDate || "",
      dueTime: taskDraft.dueTime || "",
      priority: taskDraft.priority || "Média",
      status: "Pendente",
      category: taskDraft.category || activity.category || "Outros",
      subcategory: "",
      personId: taskDraft.personId || activity.personId || null,
      companyId: taskDraft.companyId || activity.companyId || null,
      originType: "activity",
      originId: activity.id,
      relatedTaskIds: [],
      notes: "",
      attachmentsNote: "",
      completedAt: null,
      recurringTemplateId: null,
      inInbox: false,
      history: [newHistoryEntry(`Criada a partir da atividade "${activity.title}".`)],
    };
    addTask(task);
    const newGeneratedIds = [...(activity.generatedTaskIds || []), task.id];
    update((d) => {
      d.activities = d.activities.map((a) => a.id === activity.id ? { ...a, generatedTaskIds: newGeneratedIds } : a);
    });
    window.db.updateActivity(activity.id, { generatedTaskIds: newGeneratedIds }).catch(console.error);
    return task;
  }

  function addInboxItem(title) {
    if (!title.trim()) return;
    const task = {
      id: uid("t"),
      title: title.trim(),
      description: "", createdAt: nowTs(), dueDate: "", dueTime: "",
      priority: "Média", status: "Pendente", category: "", subcategory: "",
      personId: null, companyId: null, originType: null, originId: null,
      relatedTaskIds: [], notes: "", attachmentsNote: "", completedAt: null,
      recurringTemplateId: null, inInbox: true,
      history: [newHistoryEntry("Capturada na Caixa de Entrada.")],
    };
    addTask(task);
    setInboxDraft("");
  }

  function processInboxItem(task, patch) {
    patchTask(task.id, { ...patch, inInbox: false }, "Processada a partir da Caixa de Entrada.");
  }

  function upsertCompany(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = data.companies.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const id = uid("co");
    const company = { id, name: trimmed };
    update((d) => { d.companies = [...d.companies, company]; });
    window.db.insertCompany(company).catch(console.error);
    return id;
  }

  function upsertPerson(name, companyId) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = data.people.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.id;
    const id = uid("pe");
    const person = { id, name: trimmed, companyId: companyId || null, role: "", email: "", phone: "", notes: "" };
    update((d) => { d.people = [...d.people, person]; });
    window.db.insertPerson(person).catch(console.error);
    return id;
  }

  function addPersonFull(form) {
    const trimmed = (form.name || "").trim();
    if (!trimmed) return null;
    const id = uid("pe");
    const person = {
      id, name: trimmed, companyId: form.companyId || null,
      role: form.role || "", email: form.email || "", phone: form.phone || "", notes: form.notes || "",
    };
    update((d) => { d.people = [...d.people, person]; });
    window.db.insertPerson(person).catch(console.error);
    return id;
  }

  function patchPerson(id, form) {
    const patch = {
      name: (form.name || "").trim() || undefined,
      role: form.role || "", companyId: form.companyId || null,
      email: form.email || "", phone: form.phone || "", notes: form.notes || "",
    };
    update((d) => {
      d.people = d.people.map((p) => p.id === id ? { ...p, ...patch, name: patch.name || p.name } : p);
    });
    window.db.updatePerson(id, patch).catch(console.error);
  }

  function patchCompany(id, form) {
    const patch = {
      name: (form.name || "").trim() || undefined,
      segment: form.segment || "", city: form.city || "", notes: form.notes || "",
    };
    update((d) => {
      d.companies = d.companies.map((c) => c.id === id ? { ...c, ...patch, name: patch.name || c.name } : c);
    });
    window.db.updateCompany(id, patch).catch(console.error);
  }

  function upsertCompanyFull(form) {
    const trimmed = (form.name || "").trim();
    if (!trimmed) return null;
    const existing = data.companies.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      patchCompany(existing.id, form);
      return existing.id;
    }
    const id = uid("co");
    const company = { id, name: trimmed, segment: form.segment || "", city: form.city || "", notes: form.notes || "" };
    update((d) => { d.companies = [...d.companies, company]; });
    window.db.insertCompany(company).catch(console.error);
    return id;
  }

  function addRecurring(tpl) {
    update((d) => { d.recurring = [...d.recurring, tpl]; });
    window.db.insertRecurring(tpl).catch(console.error);
    ensureRecurringInstances();
  }

  function patchRecurring(id, form) {
    const rule = form.ruleType === "everyN" ? { type: "everyN", n: Number(form.ruleN) || 1 } : { type: form.ruleType };
    const current = data.recurring.find((r) => r.id === id);
    const patch = {
      title: form.title, description: form.description, category: form.category, priority: form.priority,
      companyId: form.companyId, personId: form.personId, dueTime: form.dueTime,
      rule, nextDueDate: form.occurrenceDate || current?.nextDueDate,
    };
    update((d) => {
      d.recurring = d.recurring.map((r) => r.id === id ? { ...r, ...patch } : r);
    });
    window.db.updateRecurring(id, patch).catch(console.error);
  }

  function toggleRecurringActive(id) {
    const current = data.recurring.find((r) => r.id === id);
    const nextActive = !(current?.active);
    update((d) => { d.recurring = d.recurring.map((r) => r.id === id ? { ...r, active: nextActive } : r); });
    window.db.updateRecurring(id, { active: nextActive }).catch(console.error);
  }

  function deleteRecurring(id) {
    update((d) => { d.recurring = d.recurring.filter((r) => r.id !== id); });
    window.db.deleteRecurring(id).catch(console.error);
  }

  function addCategory(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (data.categories.includes(trimmed)) return;
    update((d) => { if (!d.categories.includes(trimmed)) d.categories = [...d.categories, trimmed]; });
    window.db.insertCategory(trimmed).catch(console.error);
  }
  function removeCategory(name) {
    update((d) => { d.categories = d.categories.filter((c) => c !== name); });
    window.db.deleteCategory(name).catch(console.error);
  }

  /* ---------- derived ---------- */

  const openTasks = data.tasks.filter((t) => t.status !== "Concluída" && t.status !== "Cancelada" && !t.inInbox);
  const inboxItems = data.tasks.filter((t) => t.inInbox);
  const overdue = openTasks.filter(isOverdue).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  const dueToday = openTasks.filter(isDueToday);
  const dueTomorrow = openTasks.filter(isDueTomorrow);
  const upcoming = openTasks.filter(isUpcoming).sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")).slice(0, 12);
  const noDate = openTasks.filter((t) => !t.dueDate);
  const recentActivities = [...data.activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  function openTaskDetail(task) { setSelectedTask(task); }

  function globalSearchResults(q) {
    if (!q.trim()) return { tasks: [], activities: [], companies: [], people: [] };
    const lq = q.toLowerCase();
    const company = (id) => data.companies.find((c) => c.id === id)?.name?.toLowerCase() || "";
    const person = (id) => data.people.find((p) => p.id === id)?.name?.toLowerCase() || "";
    return {
      tasks: data.tasks.filter((t) =>
        t.title.toLowerCase().includes(lq) ||
        (t.description || "").toLowerCase().includes(lq) ||
        (t.notes || "").toLowerCase().includes(lq) ||
        (t.category || "").toLowerCase().includes(lq) ||
        company(t.companyId).includes(lq) || person(t.personId).includes(lq)
      ).slice(0, 30),
      activities: data.activities.filter((a) =>
        a.title.toLowerCase().includes(lq) || (a.description || "").toLowerCase().includes(lq) ||
        company(a.companyId).includes(lq) || person(a.personId).includes(lq)
      ).slice(0, 20),
      companies: data.companies.filter((c) => c.name.toLowerCase().includes(lq)),
      people: data.people.filter((p) => p.name.toLowerCase().includes(lq)),
    };
  }

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <div className="app-root">
      <Style />
      {mobileNavOpen && <div className="mobile-nav-backdrop" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <img src="/logo.png" alt="Logo BRData" />
          </div>
          <div className="brand-text">
            <div className="brand-title">Central de Rotina</div>
            <div className="brand-sub">BRData · Comercial</div>
          </div>
          <X size={18} className="mobile-nav-close" onClick={() => setMobileNavOpen(false)} />
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${view === n.id ? "active" : ""}`}
              onClick={() => { setView(n.id); setCompanyFilter(null); setPersonFilter(null); setMobileNavOpen(false); }}
            >
              <n.icon size={16} />
              <span>{n.label}</span>
              {n.id === "inbox" && inboxItems.length > 0 && <span className="nav-count">{inboxItems.length}</span>}
              {n.id === "rotina" && overdue.length > 0 && <span className="nav-count danger">{overdue.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-date">{formatDateBR(todayStr())}</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-hamburger" onClick={() => setMobileNavOpen(true)} title="Menu">
            <Menu size={18} />
          </button>
          <div className="search-wrap">
            <Search size={15} />
            <input
              id="global-search-input"
              placeholder="Buscar tarefas, atividades, empresas, pessoas…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
            />
            {searchQuery && <X size={14} className="clear-x" onClick={() => { setSearchQuery(""); setSearchOpen(false); }} />}
          </div>
          <div className="topbar-actions">
            <button className="btn btn-ghost" onClick={() => { setActivityFormPrefill(null); setActivityFormOpen(true); }}>
              <Activity size={14} /> Nova atividade
            </button>
            <button className="btn btn-primary" onClick={() => { setTaskFormPrefill(null); setTaskFormOpen(true); }}>
              <Plus size={14} /> Nova tarefa
            </button>
          </div>
        </header>

        {searchOpen && searchQuery.trim() && (
          <SearchResults
            results={globalSearchResults(searchQuery)}
            companies={data.companies}
            people={data.people}
            onOpenTask={(t) => { openTaskDetail(t); setSearchOpen(false); }}
            onClose={() => setSearchOpen(false)}
          />
        )}

        <div className="content">
          {view === "rotina" && (
            <RotinaView
              overdue={overdue} dueToday={dueToday} dueTomorrow={dueTomorrow}
              upcoming={upcoming} noDate={noDate} recurring={data.recurring}
              recentActivities={recentActivities}
              companies={data.companies} people={data.people}
              onOpen={openTaskDetail} onQuickComplete={requestComplete}
              onNewTask={() => { setTaskFormPrefill(null); setTaskFormOpen(true); }}
            />
          )}

          {view === "inbox" && (
            <InboxView
              items={inboxItems} draft={inboxDraft} setDraft={setInboxDraft}
              onCapture={addInboxItem}
              onProcess={(task) => { setTaskFormPrefill(task); setTaskFormOpen(true); }}
              onDelete={deleteTask}
            />
          )}

          {view === "tasks" && (
            <TasksView
              tasks={data.tasks.filter((t) => !t.inInbox)}
              categories={data.categories}
              companies={data.companies} people={data.people}
              companyFilter={companyFilter} personFilter={personFilter}
              onOpen={openTaskDetail} onQuickComplete={requestComplete}
              onNewTask={() => { setTaskFormPrefill(null); setTaskFormOpen(true); }}
              onBulkComplete={(ids) => setBulkCompleteTarget(ids)}
              onBulkSetCategory={bulkSetCategory}
              onBulkSetPriority={bulkSetPriority}
              onBulkDelete={bulkDeleteTasks}
            />
          )}

          {view === "activities" && (
            <ActivitiesView
              activities={data.activities} companies={data.companies} people={data.people}
              tasks={data.tasks}
              onNew={() => { setActivityFormPrefill(null); setActivityFormOpen(true); }}
              onEdit={(activity) => setEditingActivity(activity)}
              onGenerateTask={(activity) => { setActivityFormOpen(false); setTaskFormPrefill({ fromActivity: activity }); setTaskFormOpen(true); }}
              onOpenTask={openTaskDetail}
            />
          )}

          {view === "agenda" && (
            <AgendaView
              tasks={openTasks} companies={data.companies} people={data.people}
              onOpen={openTaskDetail} onQuickComplete={requestComplete}
            />
          )}

          {view === "companies" && (
            <CompaniesView
              companies={data.companies} tasks={data.tasks} activities={data.activities} people={data.people}
              onNew={() => setCompanyModal("new")}
              onEdit={(c) => setCompanyModal(c)}
              onSelect={(c) => { setProfileTarget({ type: "company", id: c.id }); setView("profile"); }}
            />
          )}

          {view === "people" && (
            <PeopleView
              people={data.people} companies={data.companies} tasks={data.tasks} activities={data.activities}
              onNew={() => setPersonModal("new")}
              onEdit={(p) => setPersonModal(p)}
              onSelect={(p) => { setProfileTarget({ type: "person", id: p.id }); setView("profile"); }}
            />
          )}

          {view === "profile" && profileTarget && (
            <EntityProfile
              target={profileTarget}
              companies={data.companies} people={data.people} tasks={data.tasks} activities={data.activities}
              onBack={() => setView(profileTarget.type === "company" ? "companies" : "people")}
              onEdit={() => {
                if (profileTarget.type === "company") {
                  const c = data.companies.find((x) => x.id === profileTarget.id);
                  if (c) setCompanyModal(c);
                } else {
                  const p = data.people.find((x) => x.id === profileTarget.id);
                  if (p) setPersonModal(p);
                }
              }}
              onOpenTask={openTaskDetail}
              onQuickComplete={requestComplete}
              onOpenRelated={(type, id) => setProfileTarget({ type, id })}
              onSeeAllTasks={() => {
                if (profileTarget.type === "company") setCompanyFilter(profileTarget.id);
                else setPersonFilter(profileTarget.id);
                setView("tasks");
              }}
              onNewTask={() => {
                setTaskFormPrefill({
                  companyId: profileTarget.type === "company" ? profileTarget.id : (data.people.find((p) => p.id === profileTarget.id)?.companyId || null),
                  personId: profileTarget.type === "person" ? profileTarget.id : null,
                  fromProfile: true,
                });
                setTaskFormOpen(true);
              }}
              onNewActivity={() => {
                setActivityFormPrefill({
                  companyId: profileTarget.type === "company" ? profileTarget.id : (data.people.find((p) => p.id === profileTarget.id)?.companyId || null),
                  personId: profileTarget.type === "person" ? profileTarget.id : null,
                  fromProfile: true,
                });
                setActivityFormOpen(true);
              }}
            />
          )}

          {view === "recurring" && (
            <RecurringView
              recurring={data.recurring} tasks={data.tasks}
              categories={data.categories} companies={data.companies} people={data.people}
              onNew={() => setRecurringModal("new")}
              onEdit={(r) => setRecurringModal(r)}
              onToggle={toggleRecurringActive} onDelete={deleteRecurring}
            />
          )}

          {view === "overview" && (
            <OverviewView tasks={data.tasks.filter((t) => !t.inInbox)} categories={data.categories} />
          )}

          {view === "settings" && (
            <SettingsView
              categories={data.categories} onAdd={addCategory} onRemove={removeCategory}
              notificationsEnabled={notificationsEnabled}
              notificationPermission={notificationPermission}
              onToggleNotifications={toggleNotifications}
            />
          )}
        </div>
      </main>

      {selectedTask && (
        <TaskDetail
          task={data.tasks.find((t) => t.id === selectedTask.id) || selectedTask}
          allTasks={data.tasks}
          activities={data.activities}
          companies={data.companies}
          people={data.people}
          categories={data.categories}
          onClose={() => setSelectedTask(null)}
          onPatch={patchTask}
          onComplete={requestComplete}
          onReschedule={rescheduleTask}
          onDelete={deleteTask}
          onLink={linkTasks}
          onOpenTask={(t) => setSelectedTask(t)}
          onCreateFollowUp={(draft) => {
            const t = {
              id: uid("t"), title: draft.title, description: draft.description || "",
              createdAt: nowTs(), dueDate: draft.dueDate || "", dueTime: draft.dueTime || "",
              priority: draft.priority || "Média", status: "Pendente",
              category: draft.category || selectedTask.category || "Outros", subcategory: "",
              personId: selectedTask.personId, companyId: selectedTask.companyId,
              originType: "task", originId: selectedTask.id, relatedTaskIds: [selectedTask.id],
              notes: "", attachmentsNote: "", completedAt: null, recurringTemplateId: null, inInbox: false,
              history: [newHistoryEntry(`Criada a partir da tarefa "${selectedTask.title}".`)],
            };
            addTask(t);
            patchTask(selectedTask.id, { relatedTaskIds: Array.from(new Set([...(selectedTask.relatedTaskIds || []), t.id])) }, `Gerou a tarefa "${t.title}".`);
            setSelectedTask(t);
          }}
        />
      )}

      {taskFormOpen && (
        <TaskFormModal
          prefill={taskFormPrefill}
          companies={data.companies} people={data.people} categories={data.categories}
          onClose={() => setTaskFormOpen(false)}
          onCreateCompany={upsertCompany}
          onCreatePerson={upsertPerson}
          onSubmit={(draft, nextDraft) => {
            let mainId;
            if (taskFormPrefill && taskFormPrefill.inInbox) {
              mainId = taskFormPrefill.id;
              processInboxItem(taskFormPrefill, draft);
            } else if (taskFormPrefill && taskFormPrefill.fromActivity) {
              const created = generateTaskFromActivity(taskFormPrefill.fromActivity, draft);
              mainId = created.id;
            } else {
              const t = {
                id: uid("t"), ...draft, createdAt: nowTs(), status: "Pendente",
                originType: null, originId: null, relatedTaskIds: [], completedAt: null,
                recurringTemplateId: null, inInbox: false,
                history: [newHistoryEntry("Tarefa criada.")],
              };
              addTask(t);
              mainId = t.id;
            }

            if (nextDraft && nextDraft.title && nextDraft.title.trim()) {
              const followTask = {
                id: uid("t"), title: nextDraft.title.trim(), description: nextDraft.description || "",
                createdAt: nowTs(), dueDate: nextDraft.dueDate || "", dueTime: "",
                priority: nextDraft.priority || "Média", status: "Pendente",
                category: draft.category || "Outros", subcategory: "",
                personId: draft.personId || null, companyId: draft.companyId || null,
                originType: "task", originId: mainId, relatedTaskIds: [mainId],
                notes: "", attachmentsNote: "", completedAt: null, recurringTemplateId: null, inInbox: false,
                history: [newHistoryEntry(`Criada já como próximo passo, junto com a tarefa "${draft.title}".`)],
              };
              addTask(followTask);
              linkTasks(mainId, followTask.id);
              patchTask(mainId, {}, `Próximo passo definido na criação: "${followTask.title}".`);
            }

            setTaskFormOpen(false);
            setTaskFormPrefill(null);
          }}
        />
      )}

      {activityFormOpen && (
        <ActivityFormModal
          prefill={activityFormPrefill}
          companies={data.companies} people={data.people} categories={data.categories}
          onClose={() => setActivityFormOpen(false)}
          onCreateCompany={upsertCompany}
          onCreatePerson={upsertPerson}
          onSubmit={(draft) => {
            const a = { id: uid("a"), ...draft, createdAt: nowTs(), generatedTaskIds: [] };
            addActivity(a);
            setActivityFormOpen(false);
            setActivityFormPrefill(null);
          }}
        />
      )}

      {editingActivity && (
        <ActivityFormModal
          editing={editingActivity}
          companies={data.companies} people={data.people} categories={data.categories}
          onClose={() => setEditingActivity(null)}
          onCreateCompany={upsertCompany}
          onCreatePerson={upsertPerson}
          onSubmit={(draft) => {
            patchActivity(editingActivity.id, draft);
            setEditingActivity(null);
          }}
        />
      )}

      {recurringModal && (
        <RecurringFormModal
          editing={recurringModal === "new" ? null : recurringModal}
          companies={data.companies} people={data.people} categories={data.categories}
          onClose={() => setRecurringModal(null)}
          onSubmit={(draft) => {
            if (recurringModal === "new") {
              const tpl = {
                id: uid("rt"), ...draft, active: true,
                nextDueDate: draft.occurrenceDate || todayStr(),
              };
              addRecurring(tpl);
            } else {
              patchRecurring(recurringModal.id, draft);
            }
            setRecurringModal(null);
          }}
        />
      )}

      {personModal && (
        <PersonFormModal
          companies={data.companies}
          editing={personModal === "new" ? null : personModal}
          onClose={() => setPersonModal(null)}
          onCreateCompany={upsertCompany}
          onSubmit={(form) => {
            if (personModal === "new") addPersonFull(form);
            else patchPerson(personModal.id, form);
            setPersonModal(null);
          }}
        />
      )}

      {companyModal && (
        <CompanyFormModal
          editing={companyModal === "new" ? null : companyModal}
          onClose={() => setCompanyModal(null)}
          onSubmit={(form) => {
            if (companyModal === "new") upsertCompanyFull(form);
            else patchCompany(companyModal.id, form);
            setCompanyModal(null);
          }}
        />
      )}

      {completingTask && (
        <CompleteTaskModal
          task={completingTask}
          onClose={() => setCompletingTask(null)}
          onConfirm={(note) => {
            completeTask(completingTask, note);
            setCompletingTask(null);
          }}
        />
      )}

      {bulkCompleteTarget && (
        <CompleteTaskModal
          task={{ title: `${bulkCompleteTarget.length} tarefa(s) selecionada(s)` }}
          onClose={() => setBulkCompleteTarget(null)}
          onConfirm={(note) => {
            bulkCompleteTasks(bulkCompleteTarget, note);
            setBulkCompleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   ROTINA VIEW
   ============================================================ */

function Section({ title, icon: Icon, count, tone, children, collapsedHint }) {
  return (
    <div className="section">
      <div className={`section-head tone-${tone}`}>
        <Icon size={15} />
        <span>{title}</span>
        <span className="section-count">{count}</span>
      </div>
      {count === 0 ? <div className="section-empty">{collapsedHint}</div> : <div className="section-body">{children}</div>}
    </div>
  );
}

function RotinaView({ overdue, dueToday, dueTomorrow, upcoming, noDate, recurring, recentActivities, companies, people, onOpen, onQuickComplete, onNewTask }) {
  const activeRecurring = recurring.filter((r) => r.active);
  return (
    <div className="view rotina-view">
      <div className="view-header">
        <div>
          <h1>Minha Rotina</h1>
          <p className="view-sub">{formatDateBR(todayStr())} · o que precisa da sua atenção agora</p>
        </div>
        <button className="btn btn-primary" onClick={onNewTask}><Plus size={14} /> Nova tarefa</button>
      </div>

      <div className="rotina-grid">
        <div className="rotina-col">
          <Section title="Atrasadas" icon={AlertCircle} count={overdue.length} tone="danger" collapsedHint="Nenhuma tarefa atrasada. Ótimo sinal.">
            {overdue.map((t) => <TaskRow key={t.id} task={t} companies={companies} people={people} onOpen={onOpen} onQuickComplete={onQuickComplete} />)}
          </Section>
          <Section title="Hoje" icon={Circle} count={dueToday.length} tone="today" collapsedHint="Nada previsto para hoje.">
            {dueToday.map((t) => <TaskRow key={t.id} task={t} companies={companies} people={people} onOpen={onOpen} onQuickComplete={onQuickComplete} />)}
          </Section>
          <Section title="Amanhã" icon={CircleDot} count={dueTomorrow.length} tone="tomorrow" collapsedHint="Nada previsto para amanhã.">
            {dueTomorrow.map((t) => <TaskRow key={t.id} task={t} companies={companies} people={people} onOpen={onOpen} onQuickComplete={onQuickComplete} />)}
          </Section>
          <Section title="Próximas" icon={ArrowRight} count={upcoming.length} tone="next" collapsedHint="Sem tarefas futuras agendadas.">
            {upcoming.map((t) => <TaskRow key={t.id} task={t} companies={companies} people={people} onOpen={onOpen} onQuickComplete={onQuickComplete} />)}
          </Section>
          {noDate.length > 0 && (
            <Section title="Sem prazo definido" icon={Clock} count={noDate.length} tone="muted">
              {noDate.map((t) => <TaskRow key={t.id} task={t} companies={companies} people={people} onOpen={onOpen} onQuickComplete={onQuickComplete} />)}
            </Section>
          )}
        </div>

        <div className="rotina-side">
          <div className="side-card">
            <div className="side-card-head"><Repeat size={14} /> Recorrentes ativas</div>
            {activeRecurring.length === 0 && <div className="side-empty">Nenhuma recorrência ativa.</div>}
            {activeRecurring.map((r) => (
              <div key={r.id} className="side-row">
                <span>{r.title}</span>
                <span className="side-row-sub">{ruleLabel(r.rule)}</span>
              </div>
            ))}
          </div>
          <div className="side-card">
            <div className="side-card-head"><Activity size={14} /> Atividades recentes</div>
            {recentActivities.length === 0 && <div className="side-empty">Nenhuma atividade registrada ainda.</div>}
            {recentActivities.map((a) => {
              const company = companies.find((c) => c.id === a.companyId);
              return (
                <div key={a.id} className="side-row">
                  <span>{a.title}</span>
                  <span className="side-row-sub">{company ? company.name + " · " : ""}{a.createdAt.split(" ")[0].split("-").reverse().join("/")}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   INBOX VIEW
   ============================================================ */

function InboxView({ items, draft, setDraft, onCapture, onProcess, onDelete }) {
  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>Caixa de Entrada</h1>
          <p className="view-sub">Registre agora, organize depois. Nada fica só na sua cabeça.</p>
        </div>
      </div>
      <div className="inbox-capture">
        <Inbox size={16} />
        <input
          autoFocus
          placeholder='Ex: "Enviar contrato para o João"  —  pressione Enter'
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onCapture(draft); } }}
        />
        <button type="button" className="btn btn-primary" onClick={() => onCapture(draft)}>Adicionar</button>
      </div>

      <div className="inbox-list">
        {items.length === 0 && <EmptyState icon={Inbox} title="Caixa de entrada vazia" hint="Tudo que surgir durante o dia, jogue aqui primeiro." />}
        {items.map((t) => (
          <div key={t.id} className="inbox-item">
            <span className="inbox-item-title">{t.title}</span>
            <div className="inbox-item-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => onProcess(t)}>Processar</button>
              <IconBtn icon={Trash2} danger onClick={() => onDelete(t.id)} title="Excluir" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   TASKS VIEW
   ============================================================ */

function TasksView({ tasks, categories, companies, people, companyFilter, personFilter, onOpen, onQuickComplete, onNewTask, onBulkComplete, onBulkSetCategory, onBulkSetPriority, onBulkDelete }) {
  const [status, setStatus] = useState("abertas");
  const [priority, setPriority] = useState("Todas");
  const [category, setCategory] = useState("Todas");
  const [q, setQ] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkCategoryPick, setBulkCategoryPick] = useState("");
  const [bulkPriorityPick, setBulkPriorityPick] = useState("");

  let filtered = tasks;
  if (companyFilter) filtered = filtered.filter((t) => t.companyId === companyFilter);
  if (personFilter) filtered = filtered.filter((t) => t.personId === personFilter);
  if (status === "abertas") filtered = filtered.filter((t) => t.status !== "Concluída" && t.status !== "Cancelada");
  if (status === "atrasadas") filtered = filtered.filter(isOverdue);
  if (status === "hoje") filtered = filtered.filter(isDueToday);
  if (status === "concluidas") filtered = filtered.filter((t) => t.status === "Concluída");
  if (priority !== "Todas") filtered = filtered.filter((t) => t.priority === priority);
  if (category !== "Todas") filtered = filtered.filter((t) => t.category === category);
  if (q.trim()) {
    const lq = q.toLowerCase();
    filtered = filtered.filter((t) => t.title.toLowerCase().includes(lq) || (t.notes || "").toLowerCase().includes(lq));
  }
  filtered = [...filtered].sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));

  const companyName = companyFilter ? companies.find((c) => c.id === companyFilter)?.name : null;
  const personName = personFilter ? people.find((p) => p.id === personFilter)?.name : null;

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function exitBulk() {
    setBulkMode(false);
    setSelectedIds(new Set());
    setBulkCategoryPick("");
    setBulkPriorityPick("");
  }

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>Tarefas</h1>
          <p className="view-sub">
            {companyName && <>Filtrando por empresa: <b>{companyName}</b> · </>}
            {personName && <>Filtrando por pessoa: <b>{personName}</b> · </>}
            {filtered.length} tarefa(s)
          </p>
        </div>
        <div className="task-header-actions">
          <button className="btn btn-ghost" onClick={() => bulkMode ? exitBulk() : setBulkMode(true)}>
            {bulkMode ? "Cancelar seleção" : "Selecionar"}
          </button>
          <button className="btn btn-primary" onClick={onNewTask}><Plus size={14} /> Nova tarefa</button>
        </div>
      </div>

      <div className="filters-bar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="abertas">Abertas</option>
          <option value="atrasadas">Atrasadas</option>
          <option value="hoje">Hoje</option>
          <option value="concluidas">Concluídas</option>
          <option value="todas">Todas</option>
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option>Todas</option>
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>Todas</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input className="filters-search" placeholder="Buscar por título/observações…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {bulkMode && (
        <div className="bulk-bar">
          <span className="bulk-count">{selectedIds.size} selecionada(s)</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setSelectedIds(new Set(filtered.map((t) => t.id)))}
          >Selecionar todas da lista</button>
          <div className="bulk-bar-spacer" />
          <select value={bulkCategoryPick} onChange={(e) => setBulkCategoryPick(e.target.value)}>
            <option value="">Categoria…</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <button
            className="btn btn-ghost btn-sm"
            disabled={!bulkCategoryPick || selectedIds.size === 0}
            onClick={() => { onBulkSetCategory(Array.from(selectedIds), bulkCategoryPick); setBulkCategoryPick(""); }}
          >Aplicar</button>
          <select value={bulkPriorityPick} onChange={(e) => setBulkPriorityPick(e.target.value)}>
            <option value="">Prioridade…</option>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
          <button
            className="btn btn-ghost btn-sm"
            disabled={!bulkPriorityPick || selectedIds.size === 0}
            onClick={() => { onBulkSetPriority(Array.from(selectedIds), bulkPriorityPick); setBulkPriorityPick(""); }}
          >Aplicar</button>
          <button
            className="btn btn-primary btn-sm"
            disabled={selectedIds.size === 0}
            onClick={() => { onBulkComplete(Array.from(selectedIds)); exitBulk(); }}
          ><Check size={13} /> Concluir</button>
          <button
            className="btn btn-ghost btn-sm bulk-delete-btn"
            disabled={selectedIds.size === 0}
            onClick={() => { if (confirm(`Excluir ${selectedIds.size} tarefa(s)? Essa ação não pode ser desfeita.`)) { onBulkDelete(Array.from(selectedIds)); exitBulk(); } }}
          ><Trash2 size={13} /> Excluir</button>
        </div>
      )}

      <div className="task-list">
        {filtered.length === 0 && <EmptyState icon={CheckSquare} title="Nenhuma tarefa encontrada" hint="Ajuste os filtros ou crie uma nova tarefa." />}
        {filtered.map((t) => (
          <TaskRow
            key={t.id} task={t} companies={companies} people={people} onOpen={onOpen} onQuickComplete={onQuickComplete}
            bulkMode={bulkMode} selected={selectedIds.has(t.id)} onToggleSelect={toggleSelect}
          />
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   ACTIVITIES VIEW
   ============================================================ */

function ActivitiesView({ activities, companies, people, tasks, onNew, onEdit, onGenerateTask, onOpenTask }) {
  const sorted = [...activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>Atividades</h1>
          <p className="view-sub">Registro do que já aconteceu — a base do seu histórico.</p>
        </div>
        <button className="btn btn-primary" onClick={onNew}><Plus size={14} /> Nova atividade</button>
      </div>

      <div className="activity-list">
        {sorted.length === 0 && <EmptyState icon={Activity} title="Nenhuma atividade registrada" hint="Toda vez que algo acontecer (reunião, retorno do cliente, ligação), registre aqui." />}
        {sorted.map((a) => {
          const company = companies.find((c) => c.id === a.companyId);
          const person = people.find((p) => p.id === a.personId);
          const generated = tasks.filter((t) => a.generatedTaskIds?.includes(t.id));
          return (
            <div key={a.id} className="activity-card">
              <div className="activity-card-top">
                <div>
                  <div className="activity-title">{a.title}</div>
                  <div className="task-row-meta">
                    {company && <span className="meta-chip">{company.name}</span>}
                    {person && <span className="meta-chip">{person.name}</span>}
                    <span className="meta-chip"><Clock size={11} /> {a.createdAt}</span>
                  </div>
                </div>
                <div className="activity-card-actions">
                  <IconBtn icon={Edit2} onClick={() => onEdit(a)} title="Editar" />
                  <button className="btn btn-ghost btn-sm" onClick={() => onGenerateTask(a)}>
                    <ArrowUpRight size={13} /> Gerar tarefa
                  </button>
                </div>
              </div>
              {a.description && <div className="activity-desc">{a.description}</div>}
              {generated.length > 0 && (
                <div className="activity-generated">
                  {generated.map((t) => (
                    <span key={t.id} className="gen-chip" onClick={() => onOpenTask(t)}>
                      <Link2 size={11} /> {t.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   AGENDA VIEW (grouped by date)
   ============================================================ */

function AgendaView({ tasks, companies, people, onOpen, onQuickComplete }) {
  const withDate = tasks.filter((t) => t.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const groups = {};
  withDate.forEach((t) => { (groups[t.dueDate] = groups[t.dueDate] || []).push(t); });
  const dates = Object.keys(groups).sort();

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>Agenda</h1>
          <p className="view-sub">Suas tarefas com prazo, em ordem cronológica.</p>
        </div>
      </div>
      {dates.length === 0 && <EmptyState icon={Calendar} title="Nada agendado" hint="Defina prazos nas tarefas para vê-las aqui." />}
      {dates.map((date) => (
        <div key={date} className="agenda-group">
          <div className={`agenda-date ${date < todayStr() ? "agenda-past" : date === todayStr() ? "agenda-today" : ""}`}>
            {formatDateBR(date)} {date === todayStr() ? "· Hoje" : date < todayStr() ? "· Atrasado" : ""}
          </div>
          {groups[date].map((t) => <TaskRow key={t.id} task={t} companies={companies} people={people} onOpen={onOpen} onQuickComplete={onQuickComplete} />)}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   COMPANIES / PEOPLE VIEWS
   ============================================================ */

function CompaniesView({ companies, tasks, activities, people, onNew, onEdit, onSelect }) {
  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>Empresas</h1>
          <p className="view-sub">{companies.length} cadastradas</p>
        </div>
        <button className="btn btn-primary" onClick={onNew}><Plus size={14} /> Nova empresa</button>
      </div>
      <div className="grid-cards">
        {companies.length === 0 && <EmptyState icon={Building2} title="Nenhuma empresa cadastrada" hint="Cadastre os clientes, fornecedores e parceiros que aparecem na sua rotina." />}
        {companies.map((c) => {
          const tCount = tasks.filter((t) => t.companyId === c.id && t.status !== "Concluída" && t.status !== "Cancelada").length;
          const aCount = activities.filter((a) => a.companyId === c.id).length;
          const pCount = people.filter((p) => p.companyId === c.id).length;
          return (
            <div key={c.id} className="entity-card" onClick={() => onSelect(c)}>
              <div className="entity-card-head">
                <div className="entity-name"><Building2 size={14} /> {c.name}</div>
                <button className="icon-btn entity-edit-btn" onClick={(e) => { e.stopPropagation(); onEdit(c); }} title="Editar"><Edit2 size={12} /></button>
              </div>
              {(c.segment || c.city) && <div className="entity-role">{[c.segment, c.city].filter(Boolean).join(" · ")}</div>}
              <div className="entity-stats">{tCount} tarefa(s) aberta(s) · {aCount} atividade(s) · {pCount} pessoa(s)</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PeopleView({ people, companies, tasks, activities, onNew, onEdit, onSelect }) {
  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>Pessoas</h1>
          <p className="view-sub">{people.length} cadastradas</p>
        </div>
        <button className="btn btn-primary" onClick={onNew}><Plus size={14} /> Nova pessoa</button>
      </div>
      <div className="grid-cards">
        {people.length === 0 && <EmptyState icon={Users} title="Nenhuma pessoa cadastrada" hint="Cadastre os contatos que aparecem na sua rotina — clientes, fornecedores, colegas." />}
        {people.map((p) => {
          const company = companies.find((c) => c.id === p.companyId);
          const tCount = tasks.filter((t) => t.personId === p.id && t.status !== "Concluída" && t.status !== "Cancelada").length;
          const aCount = activities.filter((a) => a.personId === p.id).length;
          return (
            <div key={p.id} className="entity-card" onClick={() => onSelect(p)}>
              <div className="entity-card-head">
                <div className="entity-name"><Users size={14} /> {p.name}</div>
                <button className="icon-btn entity-edit-btn" onClick={(e) => { e.stopPropagation(); onEdit(p); }} title="Editar"><Edit2 size={12} /></button>
              </div>
              {p.role && <div className="entity-role">{p.role}</div>}
              <div className="entity-stats">{company ? company.name + " · " : ""}{tCount} tarefa(s) aberta(s) · {aCount} atividade(s)</div>
              {(p.email || p.phone) && (
                <div className="entity-contact">
                  {p.email && <span>{p.email}</span>}
                  {p.phone && <span>{p.phone}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   ENTITY PROFILE (empresa ou pessoa — resumo + histórico)
   ============================================================ */

function EntityProfile({ target, companies, people, tasks, activities, onBack, onEdit, onOpenTask, onOpenRelated, onSeeAllTasks, onNewTask, onNewActivity, onQuickComplete }) {
  const isCompany = target.type === "company";
  const entity = isCompany ? companies.find((c) => c.id === target.id) : people.find((p) => p.id === target.id);

  if (!entity) {
    return (
      <div className="view">
        <button className="btn btn-ghost btn-sm" onClick={onBack}><ChevronLeft size={14} /> Voltar</button>
        <EmptyState icon={isCompany ? Building2 : Users} title="Registro não encontrado" hint="Pode ter sido removido." />
      </div>
    );
  }

  const relatedCompany = !isCompany && entity.companyId ? companies.find((c) => c.id === entity.companyId) : null;
  const relatedPeople = isCompany ? people.filter((p) => p.companyId === entity.id) : [];
  const entityTasks = tasks.filter((t) => !t.inInbox && (isCompany ? t.companyId === entity.id : t.personId === entity.id));
  const entityActivities = activities.filter((a) => isCompany ? a.companyId === entity.id : a.personId === entity.id);

  const openTasks = entityTasks.filter((t) => t.status !== "Concluída" && t.status !== "Cancelada").sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  const doneCount = entityTasks.filter((t) => t.status === "Concluída").length;
  const overdueCount = entityTasks.filter(isOverdue).length;

  const timelineEvents = [];
  entityActivities.forEach((a) => timelineEvents.push({ date: a.createdAt, kind: "activity", data: a }));
  entityTasks.forEach((t) => {
    timelineEvents.push({ date: t.createdAt, kind: "task-created", data: t });
    if (t.completedAt) timelineEvents.push({ date: t.completedAt, kind: "task-completed", data: t });
  });
  timelineEvents.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="view profile-view">
      <button className="btn btn-ghost btn-sm profile-back" onClick={onBack}><ChevronLeft size={14} /> Voltar</button>

      <div className="view-header">
        <div>
          <div className="profile-heading">
            {isCompany ? <Building2 size={20} /> : <Users size={20} />}
            <h1>{entity.name}</h1>
          </div>
          <p className="view-sub">
            {isCompany
              ? [entity.segment, entity.city].filter(Boolean).join(" · ") || "Empresa"
              : [entity.role, relatedCompany?.name].filter(Boolean).join(" · ") || "Pessoa"}
          </p>
        </div>
        <div className="profile-actions">
          <button className="icon-btn" onClick={onEdit} title="Editar"><Edit2 size={14} /></button>
        </div>
      </div>

      {!isCompany && relatedCompany && (
        <div className="profile-company-chip" onClick={() => onOpenRelated("company", relatedCompany.id)}>
          <Building2 size={12} /> {relatedCompany.name}
        </div>
      )}
      {!isCompany && (entity.email || entity.phone) && (
        <div className="profile-contact-row">
          {entity.email && <span><Mail size={12} /> {entity.email}</span>}
          {entity.phone && <span><Phone size={12} /> {entity.phone}</span>}
        </div>
      )}

      <div className="profile-quick-actions">
        <button className="btn btn-primary btn-sm" onClick={onNewTask}><Plus size={13} /> Nova tarefa</button>
        <button className="btn btn-ghost btn-sm" onClick={onNewActivity}><Activity size={13} /> Nova atividade</button>
        <button className="btn btn-ghost btn-sm" onClick={onSeeAllTasks}>Ver todas as tarefas</button>
      </div>

      <div className="stat-grid profile-stats">
        <div className="stat-card"><div className="stat-value">{openTasks.length}</div><div className="stat-label">Tarefas abertas</div></div>
        <div className="stat-card tone-danger"><div className="stat-value">{overdueCount}</div><div className="stat-label">Atrasadas</div></div>
        <div className="stat-card tone-success"><div className="stat-value">{doneCount}</div><div className="stat-label">Concluídas</div></div>
        <div className="stat-card"><div className="stat-value">{entityActivities.length}</div><div className="stat-label">Atividades</div></div>
      </div>

      {isCompany && relatedPeople.length > 0 && (
        <div className="side-card profile-people">
          <div className="side-card-head"><Users size={14} /> Pessoas nesta empresa</div>
          <div className="profile-people-list">
            {relatedPeople.map((p) => (
              <div key={p.id} className="gen-chip" onClick={() => onOpenRelated("person", p.id)}>
                {p.name}{p.role ? ` — ${p.role}` : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="drawer-section-title">Tarefas em aberto</div>
      <div className="task-list">
        {openTasks.length === 0 && <EmptyState icon={CheckSquare} title="Nenhuma tarefa em aberto" />}
        {openTasks.map((t) => <TaskRow key={t.id} task={t} companies={companies} people={people} onOpen={onOpenTask} onQuickComplete={onQuickComplete} />)}
      </div>

      <div className="drawer-section-title">Linha do tempo</div>
      <div className="timeline profile-timeline">
        {timelineEvents.length === 0 && <div className="side-empty">Nada registrado ainda.</div>}
        {timelineEvents.map((ev, i) => (
          <div key={i} className={`timeline-item ${ev.kind === "task-completed" ? "completed" : ""}`}>
            <div className="timeline-dot" />
            <div className="timeline-content">
              <div className="timeline-ts">{ev.date}</div>
              {ev.kind === "activity" && (
                <div className="timeline-text">Atividade: {ev.data.title}</div>
              )}
              {ev.kind === "task-created" && (
                <div className="timeline-text timeline-clickable" onClick={() => onOpenTask(ev.data)}>Tarefa criada: {ev.data.title}</div>
              )}
              {ev.kind === "task-completed" && (
                <div className="timeline-text timeline-clickable" onClick={() => onOpenTask(ev.data)}>Tarefa concluída: {ev.data.title}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   RECURRING VIEW
   ============================================================ */

function RecurringView({ recurring, tasks, categories, companies, people, onNew, onEdit, onToggle, onDelete }) {
  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>Recorrentes</h1>
          <p className="view-sub">Tarefas que se repetem automaticamente ao serem concluídas.</p>
        </div>
        <button className="btn btn-primary" onClick={onNew}><Plus size={14} /> Nova recorrência</button>
      </div>
      <div className="task-list">
        {recurring.length === 0 && <EmptyState icon={Repeat} title="Nenhuma recorrência cadastrada" hint='Ex: "Enviar relatório semanal", toda sexta-feira.' />}
        {recurring.map((r) => {
          const company = companies.find((c) => c.id === r.companyId);
          const openCount = tasks.filter((t) => t.recurringTemplateId === r.id).length;
          return (
            <div key={r.id} className="recurring-row">
              <div className={`recur-dot ${r.active ? "on" : "off"}`} />
              <div className="task-row-main">
                <div className="task-row-title">{r.title}</div>
                <div className="task-row-meta">
                  <span className="meta-chip"><Repeat size={11} /> {ruleLabel(r.rule)}</span>
                  {r.category && <span className="meta-chip">{r.category}</span>}
                  {company && <span className="meta-chip">{company.name}</span>}
                  <span className="meta-chip">Próxima: {formatDateShortBR(r.nextDueDate)}</span>
                  <span className="meta-chip">{openCount} gerada(s)</span>
                </div>
              </div>
              <PriorityBadge priority={r.priority} />
              <button className="btn btn-ghost btn-sm" onClick={() => onToggle(r.id)}>{r.active ? "Pausar" : "Ativar"}</button>
              <IconBtn icon={Edit2} onClick={() => onEdit(r)} title="Editar" />
              <IconBtn icon={Trash2} danger onClick={() => onDelete(r.id)} title="Excluir" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   OVERVIEW (DASHBOARD)
   ============================================================ */

function OverviewView({ tasks, categories }) {
  const total = tasks.length;
  const pending = tasks.filter((t) => t.status === "Pendente" || t.status === "Em andamento").length;
  const overdueCount = tasks.filter(isOverdue).length;
  const doneCount = tasks.filter((t) => t.status === "Concluída").length;
  const todayCount = tasks.filter(isDueToday).length;
  const weekEnd = addDays(todayStr(), 7);
  const weekCount = tasks.filter((t) => t.dueDate && t.dueDate >= todayStr() && t.dueDate <= weekEnd && t.status !== "Concluída" && t.status !== "Cancelada").length;
  const completionRate = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const byCategory = {};
  tasks.forEach((t) => {
    const cat = t.category || "Sem categoria";
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });
  const maxCat = Math.max(1, ...Object.values(byCategory));

  const stats = [
    { label: "Pendentes", value: pending, tone: "neutral" },
    { label: "Atrasadas", value: overdueCount, tone: "danger" },
    { label: "Hoje", value: todayCount, tone: "today" },
    { label: "Nesta semana", value: weekCount, tone: "next" },
    { label: "Concluídas", value: doneCount, tone: "success" },
    { label: "Taxa de conclusão", value: `${completionRate}%`, tone: "neutral" },
  ];

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>Visão Geral</h1>
          <p className="view-sub">Panorama rápido, sem excesso de gráficos.</p>
        </div>
      </div>
      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className={`stat-card tone-${s.tone}`}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="side-card cat-breakdown">
        <div className="side-card-head">Tarefas por categoria</div>
        {Object.keys(byCategory).length === 0 && <div className="side-empty">Sem dados ainda.</div>}
        {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
          <div key={cat} className="cat-bar-row">
            <span className="cat-bar-label">{cat}</span>
            <div className="cat-bar-track"><div className="cat-bar-fill" style={{ width: `${(count / maxCat) * 100}%` }} /></div>
            <span className="cat-bar-count">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   SETTINGS VIEW
   ============================================================ */

function SettingsView({ categories, onAdd, onRemove, notificationsEnabled, notificationPermission, onToggleNotifications }) {
  const [draft, setDraft] = useState("");

  const permissionLabel = notificationPermission === "granted" ? "Permitido pelo navegador"
    : notificationPermission === "denied" ? "Bloqueado nas configurações do navegador"
    : notificationPermission === "unsupported" ? "Não suportado neste navegador"
    : "Ainda não solicitado";

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>Configurações</h1>
          <p className="view-sub">Personalize categorias, lembretes e veja os atalhos disponíveis.</p>
        </div>
      </div>

      <div className="settings-section-title">Categorias</div>
      <div className="inline-add">
        <input
          placeholder="Nova categoria" value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { onAdd(draft); setDraft(""); } }}
        />
        <button className="btn btn-primary btn-sm" type="button" onClick={() => { onAdd(draft); setDraft(""); }}><Plus size={13} /> Adicionar</button>
      </div>
      <div className="cat-list">
        {categories.map((c) => (
          <div key={c} className="cat-chip">
            {c}
            <X size={12} onClick={() => onRemove(c)} />
          </div>
        ))}
      </div>

      <div className="settings-section-title">Lembretes</div>
      <div className="side-card">
        <div className="settings-notif-row">
          <div>
            <div className="settings-notif-label">Notificações do navegador para tarefas atrasadas ou de hoje</div>
            <div className="side-row-sub">{permissionLabel}</div>
          </div>
          <button
            className={`btn btn-sm ${notificationsEnabled ? "btn-ghost" : "btn-primary"}`}
            onClick={onToggleNotifications}
            disabled={notificationPermission === "denied"}
          >
            {notificationsEnabled ? "Desativar" : "Ativar"}
          </button>
        </div>
        <div className="next-step-hint">
          Funciona enquanto este app estiver aberto em alguma aba do navegador — feche todas as abas e os lembretes param de disparar.
          {notificationPermission === "denied" && " Você bloqueou notificações para este site anteriormente; para reativar, ajuste isso nas configurações do navegador."}
        </div>
      </div>

      <div className="settings-section-title">Atalhos de teclado</div>
      <div className="side-card">
        <div className="shortcut-row"><kbd>N</kbd><span>Nova tarefa</span></div>
        <div className="shortcut-row"><kbd>/</kbd><span>Focar na busca</span></div>
        <div className="shortcut-row"><kbd>Esc</kbd><span>Fechar o que estiver aberto (modal, detalhe, busca, menu)</span></div>
        <div className="next-step-hint">Não funcionam enquanto você está digitando em um campo de texto.</div>
      </div>
    </div>
  );
}

/* ============================================================
   SEARCH RESULTS DROPDOWN
   ============================================================ */

function SearchResults({ results, companies, people, onOpenTask, onClose }) {
  const total = results.tasks.length + results.activities.length + results.companies.length + results.people.length;
  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-panel" onClick={(e) => e.stopPropagation()}>
        {total === 0 && <div className="side-empty">Nada encontrado.</div>}
        {results.tasks.length > 0 && (
          <div className="search-group">
            <div className="search-group-title">Tarefas</div>
            {results.tasks.map((t) => (
              <div key={t.id} className="search-item" onClick={() => onOpenTask(t)}>
                <CheckSquare size={13} /> {t.title}
              </div>
            ))}
          </div>
        )}
        {results.activities.length > 0 && (
          <div className="search-group">
            <div className="search-group-title">Atividades</div>
            {results.activities.map((a) => (
              <div key={a.id} className="search-item"><Activity size={13} /> {a.title}</div>
            ))}
          </div>
        )}
        {results.companies.length > 0 && (
          <div className="search-group">
            <div className="search-group-title">Empresas</div>
            {results.companies.map((c) => (
              <div key={c.id} className="search-item"><Building2 size={13} /> {c.name}</div>
            ))}
          </div>
        )}
        {results.people.length > 0 && (
          <div className="search-group">
            <div className="search-group-title">Pessoas</div>
            {results.people.map((p) => (
              <div key={p.id} className="search-item"><Users size={13} /> {p.name}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   TASK DETAIL PANEL
   ============================================================ */

function TaskDetail({ task, allTasks, activities, companies, people, categories, onClose, onPatch, onComplete, onReschedule, onDelete, onLink, onCreateFollowUp, onOpenTask }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(task);
  const [linkQuery, setLinkQuery] = useState("");
  const [followOpen, setFollowOpen] = useState(false);
  const [followDraft, setFollowDraft] = useState({ title: "", description: "", dueDate: "", dueTime: "", priority: "Média" });

  useEffect(() => { setForm(task); setEditing(false); }, [task.id]);

  const company = companies.find((c) => c.id === task.companyId);
  const person = people.find((p) => p.id === task.personId);
  const originActivity = task.originType === "activity" ? activities.find((a) => a.id === task.originId) : null;
  const originTask = task.originType === "task" ? allTasks.find((t) => t.id === task.originId) : null;
  const relatedTasks = (task.relatedTaskIds || []).map((id) => allTasks.find((t) => t.id === id)).filter(Boolean);
  const linkResults = linkQuery.trim() ? allTasks.filter((t) => t.id !== task.id && t.title.toLowerCase().includes(linkQuery.toLowerCase())).slice(0, 6) : [];

  function saveEdit() {
    onPatch(task.id, {
      title: form.title, description: form.description, priority: form.priority,
      status: form.status, category: form.category, subcategory: form.subcategory,
      dueTime: form.dueTime, notes: form.notes, attachmentsNote: form.attachmentsNote,
      companyId: form.companyId, personId: form.personId,
    }, "Detalhes da tarefa editados.");
    if (form.dueDate !== task.dueDate) onReschedule(task, form.dueDate);
    setEditing(false);
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div className="drawer-head-top">
            <StatusPill status={task.status} />
            <PriorityBadge priority={task.priority} />
            <div className="spacer" />
            <IconBtn icon={editing ? Check : Edit2} onClick={() => editing ? saveEdit() : setEditing(true)} title={editing ? "Salvar" : "Editar"} />
            <IconBtn icon={Trash2} danger onClick={() => { if (confirm("Excluir esta tarefa?")) onDelete(task.id); }} title="Excluir" />
            <IconBtn icon={X} onClick={onClose} title="Fechar" />
          </div>
          {!editing ? (
            <h2>{task.title}</h2>
          ) : (
            <input className="drawer-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          )}
        </div>

        <div className="drawer-body">
          {!editing && (
            <>
              <div className="drawer-meta-row">
                {task.dueDate && <span className="meta-chip"><Clock size={11} /> {formatDateBR(task.dueDate)}{task.dueTime ? ` às ${task.dueTime}` : ""}</span>}
                {task.category && <span className="meta-chip">{task.category}{task.subcategory ? ` / ${task.subcategory}` : ""}</span>}
                {company && <span className="meta-chip"><Building2 size={11} /> {company.name}</span>}
                {person && <span className="meta-chip"><Users size={11} /> {person.name}{person.role ? ` — ${person.role}` : ""}</span>}
              </div>
              {task.description && <p className="drawer-desc">{task.description}</p>}

              <div className="drawer-actions-row">
                <button className="btn btn-primary btn-sm" onClick={() => onComplete(task)}>
                  <Check size={13} /> {task.status === "Concluída" ? "Reabrir" : "Concluir"}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setFollowOpen((v) => !v)}>
                  <ArrowUpRight size={13} /> Criar tarefa relacionada
                </button>
                <input
                  type="date" className="due-quick-input"
                  value={task.dueDate || ""}
                  onChange={(e) => onReschedule(task, e.target.value)}
                />
              </div>

              {followOpen && (
                <div className="follow-form">
                  <input placeholder="Título da nova tarefa" value={followDraft.title} onChange={(e) => setFollowDraft({ ...followDraft, title: e.target.value })} />
                  <textarea rows={2} placeholder="Descrição (opcional)" value={followDraft.description} onChange={(e) => setFollowDraft({ ...followDraft, description: e.target.value })} />
                  <div className="follow-form-row">
                    <input type="date" value={followDraft.dueDate} onChange={(e) => setFollowDraft({ ...followDraft, dueDate: e.target.value })} />
                    <input type="time" value={followDraft.dueTime} onChange={(e) => setFollowDraft({ ...followDraft, dueTime: e.target.value })} />
                    <select value={followDraft.priority} onChange={(e) => setFollowDraft({ ...followDraft, priority: e.target.value })}>
                      {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      if (followDraft.title.trim()) {
                        onCreateFollowUp(followDraft);
                        setFollowOpen(false);
                        setFollowDraft({ title: "", description: "", dueDate: "", dueTime: "", priority: "Média" });
                      }
                    }}
                  >Criar</button>
                </div>
              )}
            </>
          )}

          {editing && (
            <div className="edit-form">
              <label>Descrição<textarea rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <div className="edit-grid">
                <label>Prazo<input type="date" value={form.dueDate || ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
                <label>Horário<input type="time" value={form.dueTime || ""} onChange={(e) => setForm({ ...form, dueTime: e.target.value })} /></label>
                <label>Prioridade
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
                <label>Status
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label>Categoria
                  <select value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="">—</option>
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label>Subcategoria<input value={form.subcategory || ""} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} /></label>
                <label>Empresa
                  <select value={form.companyId || ""} onChange={(e) => { const id = e.target.value || null; const keepPerson = people.find((p) => p.id === form.personId)?.companyId === id; setForm({ ...form, companyId: id, personId: keepPerson ? form.personId : null }); }}>
                    <option value="">—</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label>Pessoa
                  <select value={form.personId || ""} onChange={(e) => setForm({ ...form, personId: e.target.value || null })}>
                    <option value="">—</option>
                    {(form.companyId ? people.filter((p) => p.companyId === form.companyId) : people).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
              </div>
              <label>Observações<textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
              <label>Anexos (link ou referência)<input placeholder="Cole um link ou descreva o anexo" value={form.attachmentsNote || ""} onChange={(e) => setForm({ ...form, attachmentsNote: e.target.value })} /></label>
              <button className="btn btn-primary btn-sm" onClick={saveEdit}><Check size={13} /> Salvar alterações</button>
            </div>
          )}

          {(originActivity || originTask) && (
            <div className="origin-box">
              <History size={13} />
              <span>Originada por: {originActivity ? `atividade "${originActivity.title}"` : `tarefa "${originTask.title}"`}</span>
            </div>
          )}

          {task.completionNote && !editing && (
            <div className="notes-box completion-box"><Check size={12} /> <span><b>Execução:</b> {task.completionNote}</span></div>
          )}
          {task.notes && !editing && (
            <div className="notes-box"><b>Observações:</b> {task.notes}</div>
          )}
          {task.attachmentsNote && !editing && (
            <div className="notes-box"><Paperclip size={12} /> {task.attachmentsNote}</div>
          )}

          <div className="drawer-section-title">Tarefas relacionadas</div>
          <div className="related-box">
            {relatedTasks.length === 0 && <div className="side-empty">Nenhuma vinculada ainda.</div>}
            {relatedTasks.map((t) => (
              <div key={t.id} className="gen-chip" onClick={() => onOpenTask(t)}>{t.title}</div>
            ))}
            <div className="link-search">
              <input placeholder="Vincular a outra tarefa existente…" value={linkQuery} onChange={(e) => setLinkQuery(e.target.value)} />
              {linkResults.length > 0 && (
                <div className="link-results">
                  {linkResults.map((t) => (
                    <div key={t.id} className="link-result-item" onClick={() => { onLink(task.id, t.id); setLinkQuery(""); }}>{t.title}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="drawer-section-title">Linha do tempo</div>
          <div className="timeline">
            {(task.history || []).map((h, i) => (
              <div key={h.id} className="timeline-item">
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <div className="timeline-ts">{h.ts}</div>
                  <div className="timeline-text">{h.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ENTITY PICKER (company / person quick add+select)
   ============================================================ */

function EntityPicker({ label, options, value, onChange, onCreate, placeholder }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);
  const filtered = q.trim() ? options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <div className="entity-picker">
      <label>{label}</label>
      <div className="entity-picker-box" onClick={() => setOpen(true)}>
        {selected ? selected.name : <span className="ph">{placeholder || "Selecionar…"}</span>}
      </div>
      {open && (
        <div className="entity-picker-panel">
          <input autoFocus placeholder="Buscar ou criar novo…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="entity-picker-list">
            <div className="entity-picker-item" onClick={() => { onChange(null); setOpen(false); setQ(""); }}>— Nenhum —</div>
            {filtered.map((o) => (
              <div key={o.id} className="entity-picker-item" onClick={() => { onChange(o.id); setOpen(false); setQ(""); }}>{o.name}</div>
            ))}
            {q.trim() && !options.some((o) => o.name.toLowerCase() === q.trim().toLowerCase()) && (
              <div className="entity-picker-item create" onClick={() => { const id = onCreate(q.trim()); onChange(id); setOpen(false); setQ(""); }}>
                <Plus size={12} /> Criar "{q.trim()}"
              </div>
            )}
          </div>
          <button type="button" className="btn btn-ghost btn-sm entity-picker-close" onClick={() => { setOpen(false); setQ(""); }}>Fechar</button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TASK FORM MODAL
   ============================================================ */

function TaskFormModal({ prefill, companies, people, categories, onClose, onSubmit, onCreateCompany, onCreatePerson }) {
  const base = prefill && prefill.inInbox ? prefill : prefill && prefill.fromActivity ? {
    title: "", companyId: prefill.fromActivity.companyId, personId: prefill.fromActivity.personId, category: prefill.fromActivity.category,
  } : prefill && prefill.fromProfile ? {
    title: "", companyId: prefill.companyId, personId: prefill.personId,
  } : {};
  const [form, setForm] = useState({
    title: base.title || "",
    description: base.description || "",
    dueDate: base.dueDate || "",
    dueTime: base.dueTime || "",
    priority: base.priority || "Média",
    status: base.status || "Pendente",
    category: base.category || categories[0] || "",
    subcategory: base.subcategory || "",
    companyId: base.companyId || null,
    personId: base.personId || null,
    notes: base.notes || "",
    attachmentsNote: "",
  });

  const isFromActivity = !!(prefill && prefill.fromActivity);

  const [wantsNext, setWantsNext] = useState(false);
  const [nextForm, setNextForm] = useState({ title: "", description: "", dueDate: "", priority: "Média" });

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (wantsNext && !nextForm.title.trim()) return;
    onSubmit(form, wantsNext ? nextForm : null);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{isFromActivity ? "Gerar tarefa a partir da atividade" : prefill && prefill.inInbox ? "Processar item da caixa de entrada" : "Nova tarefa"}</h3>
          <X size={16} onClick={onClose} />
        </div>
        <div className="modal-body">
          <label>Título<input autoFocus required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") submit(e); }} /></label>
          <label>Descrição<textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="edit-grid">
            <label>Prazo<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
            <label>Horário<input type="time" value={form.dueTime} onChange={(e) => setForm({ ...form, dueTime: e.target.value })} /></label>
            <label>Prioridade
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label>Status
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label>Categoria
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">—</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Subcategoria<input value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} /></label>
          </div>
          <div className="edit-grid">
            <EntityPicker label="Empresa" options={companies} value={form.companyId} onChange={(id) => setForm({ ...form, companyId: id, personId: people.find((p) => p.id === form.personId)?.companyId === id ? form.personId : null })} onCreate={onCreateCompany} />
            <EntityPicker label="Pessoa" options={form.companyId ? people.filter((p) => p.companyId === form.companyId) : people} value={form.personId} onChange={(id) => setForm({ ...form, personId: id })} onCreate={(name) => onCreatePerson(name, form.companyId)} placeholder={form.companyId ? "Selecionar…" : "Selecione uma empresa primeiro (opcional)"} />
          </div>
          <label>Observações<textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <label>Anexos (link ou referência)<input value={form.attachmentsNote} onChange={(e) => setForm({ ...form, attachmentsNote: e.target.value })} /></label>

          <div className="next-step-toggle" onClick={() => setWantsNext((v) => !v)}>
            <div className={`toggle-box ${wantsNext ? "on" : ""}`}>{wantsNext && <Check size={11} strokeWidth={3} />}</div>
            <span>Já criar o próximo passo, linkado a esta tarefa</span>
          </div>
          {wantsNext && (
            <div className="next-step-form">
              <label>Título do próximo passo
                <input
                  placeholder='Ex: "Fazer follow-up com o cliente"'
                  value={nextForm.title}
                  onChange={(e) => setNextForm({ ...nextForm, title: e.target.value })}
                />
              </label>
              <label>Descrição do próximo passo
                <textarea rows={2} value={nextForm.description} onChange={(e) => setNextForm({ ...nextForm, description: e.target.value })} />
              </label>
              <div className="edit-grid">
                <label>Prazo<input type="date" value={nextForm.dueDate} onChange={(e) => setNextForm({ ...nextForm, dueDate: e.target.value })} /></label>
                <label>Prioridade
                  <select value={nextForm.priority} onChange={(e) => setNextForm({ ...nextForm, priority: e.target.value })}>
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
              </div>
              <div className="next-step-hint">Empresa, pessoa e categoria serão herdadas da tarefa acima — dá para ajustar depois, na própria tarefa.</div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={submit}>Salvar tarefa</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ACTIVITY FORM MODAL
   ============================================================ */

function ActivityFormModal({ prefill, editing, companies, people, categories, onClose, onSubmit, onCreateCompany, onCreatePerson }) {
  const [form, setForm] = useState({
    title: editing?.title || "",
    description: editing?.description || "",
    category: editing?.category || categories[0] || "",
    companyId: editing ? (editing.companyId ?? null) : ((prefill && prefill.companyId) || null),
    personId: editing ? (editing.personId ?? null) : ((prefill && prefill.personId) || null),
  });
  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit(form);
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{editing ? "Editar atividade" : "Nova atividade"}</h3>
          <X size={16} onClick={onClose} />
        </div>
        <div className="modal-body">
          <label>O que aconteceu?<input autoFocus required placeholder='Ex: "Cliente respondeu pedindo para retornar na sexta"' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") submit(e); }} /></label>
          <label>Detalhes<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label>Categoria
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">—</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <div className="edit-grid">
            <EntityPicker label="Empresa" options={companies} value={form.companyId} onChange={(id) => setForm({ ...form, companyId: id, personId: people.find((p) => p.id === form.personId)?.companyId === id ? form.personId : null })} onCreate={onCreateCompany} />
            <EntityPicker label="Pessoa" options={form.companyId ? people.filter((p) => p.companyId === form.companyId) : people} value={form.personId} onChange={(id) => setForm({ ...form, personId: id })} onCreate={(name) => onCreatePerson(name, form.companyId)} placeholder={form.companyId ? "Selecionar…" : "Selecione uma empresa primeiro (opcional)"} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={submit}>{editing ? "Salvar alterações" : "Registrar atividade"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PERSON FORM MODAL
   ============================================================ */

function PersonFormModal({ companies, editing, onClose, onSubmit, onCreateCompany }) {
  const [form, setForm] = useState({
    name: editing?.name || "", role: editing?.role || "", companyId: editing?.companyId || null,
    email: editing?.email || "", phone: editing?.phone || "", notes: editing?.notes || "",
  });

  function submit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{editing ? "Editar pessoa" : "Nova pessoa"}</h3>
          <X size={16} onClick={onClose} />
        </div>
        <div className="modal-body">
          <label>Nome<input autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") submit(e); }} /></label>
          <label>Cargo / função na instituição<input placeholder="Ex: Gerente Comercial, Sócio, Financeiro…" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></label>
          <EntityPicker label="Empresa" options={companies} value={form.companyId} onChange={(id) => setForm({ ...form, companyId: id })} onCreate={onCreateCompany} />
          <div className="edit-grid">
            <label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label>Telefone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          </div>
          <label>Observações<textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={submit}>{editing ? "Salvar alterações" : "Salvar pessoa"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   COMPANY FORM MODAL
   ============================================================ */

function CompanyFormModal({ editing, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: editing?.name || "", segment: editing?.segment || "", city: editing?.city || "", notes: editing?.notes || "",
  });

  function submit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{editing ? "Editar empresa" : "Nova empresa"}</h3>
          <X size={16} onClick={onClose} />
        </div>
        <div className="modal-body">
          <label>Nome<input autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") submit(e); }} /></label>
          <div className="edit-grid">
            <label>Segmento<input placeholder="Ex: Varejo, Indústria…" value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} /></label>
            <label>Cidade<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
          </div>
          <label>Observações<textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={submit}>{editing ? "Salvar alterações" : "Salvar empresa"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RECURRING FORM MODAL
   ============================================================ */

function RecurringFormModal({ editing, companies, people, categories, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: editing?.title || "", description: editing?.description || "",
    category: editing?.category || categories[0] || "", priority: editing?.priority || "Média",
    companyId: editing?.companyId || null, personId: editing?.personId || null, dueTime: editing?.dueTime || "",
    ruleType: editing?.rule?.type || "weekly", ruleN: editing?.rule?.n || 2,
    occurrenceDate: editing?.nextDueDate || todayStr(),
  });
  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const rule = form.ruleType === "everyN" ? { type: "everyN", n: Number(form.ruleN) || 1 } : { type: form.ruleType };
    onSubmit({
      title: form.title, description: form.description, category: form.category, priority: form.priority,
      companyId: form.companyId, personId: form.personId, dueTime: form.dueTime,
      rule, occurrenceDate: form.occurrenceDate,
    });
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{editing ? "Editar recorrência" : "Nova tarefa recorrente"}</h3>
          <X size={16} onClick={onClose} />
        </div>
        <div className="modal-body">
          <label>Título<input autoFocus required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") submit(e); }} /></label>
          <label>Descrição<textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="edit-grid">
            <label>Repetir
              <select value={form.ruleType} onChange={(e) => setForm({ ...form, ruleType: e.target.value })}>
                <option value="daily">Todo dia</option>
                <option value="weekly">Toda semana (mesmo dia da ocorrência abaixo)</option>
                <option value="monthly">Todo mês (mesmo dia da ocorrência abaixo)</option>
                <option value="everyN">A cada X dias</option>
              </select>
            </label>
            {form.ruleType === "everyN" && (
              <label>Intervalo (dias)<input type="number" min="1" value={form.ruleN} onChange={(e) => setForm({ ...form, ruleN: e.target.value })} /></label>
            )}
            <label>{editing ? "Próxima ocorrência" : "Primeira ocorrência"}<input type="date" value={form.occurrenceDate} onChange={(e) => setForm({ ...form, occurrenceDate: e.target.value })} /></label>
            <label>Horário<input type="time" value={form.dueTime} onChange={(e) => setForm({ ...form, dueTime: e.target.value })} /></label>
            <label>Prioridade
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label>Categoria
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">—</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <div className="edit-grid">
            <EntityPicker label="Empresa" options={companies} value={form.companyId} onChange={(id) => setForm({ ...form, companyId: id, personId: people.find((p) => p.id === form.personId)?.companyId === id ? form.personId : null })} onCreate={() => null} />
            <EntityPicker label="Pessoa" options={form.companyId ? people.filter((p) => p.companyId === form.companyId) : people} value={form.personId} onChange={(id) => setForm({ ...form, personId: id })} onCreate={() => null} placeholder={form.companyId ? "Selecionar…" : "Selecione uma empresa primeiro (opcional)"} />
          </div>
          {editing && (
            <div className="next-step-hint">Editar aqui muda o modelo da recorrência e a próxima geração — tarefas já geradas anteriormente não são alteradas.</div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-primary" onClick={submit}>{editing ? "Salvar alterações" : "Criar recorrência"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   COMPLETE TASK MODAL (descrição de execução obrigatória)
   ============================================================ */

function CompleteTaskModal({ task, onClose, onConfirm }) {
  const [note, setNote] = useState("");
  const trimmed = note.trim();

  function confirm() {
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Concluir tarefa</h3>
          <X size={16} onClick={onClose} />
        </div>
        <div className="modal-body">
          <div className="complete-task-title">{task.title}</div>
          <label>
            <span>Como foi a execução? <span className="required-mark">(obrigatório)</span></span>
            <textarea
              autoFocus
              rows={4}
              placeholder="Descreva o que foi feito, o resultado, e qualquer detalhe que ajude a entender o contexto depois…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={!trimmed} onClick={confirm}>
              <Check size={13} /> Concluir tarefa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STYLE
   ============================================================ */

function Style() {
  return (
    <style>{`
      :root {
        --ink: #1C2230;
        --ink-soft: #545E70;
        --bg: #F5F6F9;
        --panel: #FFFFFF;
        --border: #E4E7EE;
        --accent: #237CC0;
        --accent-soft: #237CC014;
        --brand-blue: #F08516;
        --brand-blue-soft: #F0851614;
        --danger: #D64545;
        --today: #237CC0;
        --tomorrow: #C9A227;
        --next: #F08516;
        --radius: 8px;
        --mono: 'IBM Plex Mono', 'SFMono-Regular', Menlo, monospace;
        --sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        --display: 'Sora', 'Inter', sans-serif;
      }
      * { box-sizing: border-box; }
      .app-root { display: flex; min-height: 100vh; background: var(--bg); color: var(--ink); font-family: var(--sans); font-size: 13.5px; }
      .loading-root { align-items: center; justify-content: center; }
      .loading-box { color: var(--ink-soft); }

      /* Sidebar */
      .sidebar { width: 220px; flex-shrink: 0; background: var(--panel); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 18px 12px; }
      .brand { display: flex; align-items: center; gap: 10px; padding: 4px 8px 20px; }
      .brand-mark { width: 32px; height: 32px; border-radius: 7px; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .brand-mark img { width: 100%; height: 100%; object-fit: cover; }
      .brand-title { font-family: var(--display); font-weight: 600; font-size: 13.5px; line-height: 1.2; }
      .brand-sub { color: var(--ink-soft); font-size: 11px; }
      .nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
      .nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: none; background: transparent; border-radius: 7px; cursor: pointer; color: var(--ink-soft); font-size: 13px; text-align: left; font-family: var(--sans); }
      .nav-item:hover { background: #F0F2F6; color: var(--ink); }
      .nav-item.active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
      .nav-item span:first-of-type { flex: 1; }
      .nav-count { background: #DDE2EA; color: var(--ink-soft); font-size: 10.5px; padding: 1px 6px; border-radius: 10px; font-family: var(--mono); }
      .nav-count.danger { background: var(--danger); color: #fff; }
      .sidebar-footer { padding: 10px 8px 0; border-top: 1px solid var(--border); margin-top: 8px; }
      .sidebar-date { font-family: var(--mono); font-size: 11px; color: var(--ink-soft); }

      /* Main */
      .main { flex: 1; display: flex; flex-direction: column; min-width: 0; position: relative; }
      .topbar { display: flex; align-items: center; gap: 14px; padding: 14px 24px; border-bottom: 1px solid var(--border); background: var(--panel); position: sticky; top: 0; z-index: 5; }
      .search-wrap { flex: 1; max-width: 460px; display: flex; align-items: center; gap: 8px; background: var(--bg); border: 1px solid var(--border); border-radius: 7px; padding: 7px 10px; color: var(--ink-soft); }
      .search-wrap input { border: none; background: transparent; outline: none; flex: 1; font-size: 13px; color: var(--ink); }
      .clear-x { cursor: pointer; }
      .topbar-actions { display: flex; gap: 8px; margin-left: auto; }

      .content { padding: 22px 26px 60px; overflow-y: auto; }
      .view { max-width: 980px; }
      .view-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; gap: 12px; }
      .view-header h1 { font-family: var(--display); font-size: 20px; margin: 0 0 3px; font-weight: 650; }
      .view-sub { color: var(--ink-soft); font-size: 12.5px; margin: 0; }

      /* Buttons */
      .btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 7px; padding: 8px 13px; font-size: 12.5px; font-weight: 550; cursor: pointer; border: 1px solid transparent; font-family: var(--sans); white-space: nowrap; }
      .btn-primary { background: var(--accent); color: #fff; }
      .btn-primary:hover { background: #0C5A51; }
      .btn-ghost { background: var(--panel); color: var(--ink); border-color: var(--border); }
      .btn-ghost:hover { background: var(--bg); }
      .btn-sm { padding: 5px 9px; font-size: 11.5px; }
      .icon-btn { border: 1px solid var(--border); background: var(--panel); border-radius: 6px; padding: 5px 6px; cursor: pointer; color: var(--ink-soft); display: flex; }
      .icon-btn:hover { background: var(--bg); color: var(--ink); }
      .icon-btn.danger:hover { background: #FCE9E9; color: var(--danger); border-color: #F3C6C6; }

      /* Sections (rotina) */
      .rotina-grid { display: grid; grid-template-columns: 1fr 260px; gap: 24px; align-items: start; }
      .rotina-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
      .section { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
      .section-head { display: flex; align-items: center; gap: 8px; padding: 10px 14px; font-weight: 600; font-size: 12.5px; border-bottom: 1px solid var(--border); }
      .section-head.tone-danger { color: var(--danger); }
      .section-head.tone-today { color: var(--today); }
      .section-head.tone-tomorrow { color: var(--tomorrow); }
      .section-head.tone-next { color: var(--next); }
      .section-head.tone-muted { color: var(--ink-soft); }
      .section-count { margin-left: auto; font-family: var(--mono); font-size: 11px; color: var(--ink-soft); }
      .section-empty { padding: 12px 14px; font-size: 12px; color: var(--ink-soft); }
      .section-body { display: flex; flex-direction: column; }

      .rotina-side { display: flex; flex-direction: column; gap: 14px; }
      .side-card { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; }
      .side-card-head { display: flex; align-items: center; gap: 7px; font-weight: 600; font-size: 12px; margin-bottom: 8px; color: var(--ink-soft); }
      .side-row { display: flex; flex-direction: column; padding: 6px 0; border-top: 1px solid var(--border); font-size: 12px; }
      .side-row:first-of-type { border-top: none; }
      .side-row-sub { color: var(--ink-soft); font-size: 10.5px; font-family: var(--mono); }
      .side-empty { color: var(--ink-soft); font-size: 12px; }

      /* Task row */
      .task-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-top: 1px solid var(--border); cursor: pointer; }
      .section-body .task-row:first-child { border-top: none; }
      .task-row:hover { background: #FAFBFC; }
      .task-row.done .task-row-title { text-decoration: line-through; color: var(--ink-soft); }
      .check-circle { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid #C7CDD8; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; color: #fff; }
      .check-circle.checked { background: var(--accent); border-color: var(--accent); }
      .task-row-main { flex: 1; min-width: 0; }
      .task-row-company { font-weight: 700; font-size: 11.5px; color: var(--accent); text-transform: uppercase; letter-spacing: .02em; margin-bottom: 2px; }
      .task-row-title { font-weight: 550; font-size: 13px; display: flex; align-items: center; gap: 6px; }
      .inline-icon { color: var(--ink-soft); }
      .task-row-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
      .meta-chip { display: inline-flex; align-items: center; gap: 3px; background: var(--bg); color: var(--ink-soft); font-size: 10.5px; padding: 2px 7px; border-radius: 5px; font-family: var(--mono); }
      .meta-overdue { background: #FCE9E9; color: var(--danger); }
      .row-chevron { color: #C7CDD8; flex-shrink: 0; }

      .pbadge { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; color: var(--pc); flex-shrink: 0; white-space: nowrap; }
      .pdot { width: 6px; height: 6px; border-radius: 50%; background: var(--pc); }
      .badge { font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }

      .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 46px 20px; color: var(--ink-soft); gap: 8px; text-align: center; }
      .empty-title { font-weight: 600; font-size: 13px; color: var(--ink); }
      .empty-hint { font-size: 12px; max-width: 340px; }

      /* Inbox */
      .inbox-capture { display: flex; align-items: center; gap: 10px; background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 14px; margin-bottom: 16px; color: var(--ink-soft); }
      .inbox-capture input { flex: 1; border: none; outline: none; font-size: 13.5px; background: transparent; color: var(--ink); }
      .inbox-list { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); }
      .inbox-item { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; border-top: 1px solid var(--border); }
      .inbox-item:first-child { border-top: none; }
      .inbox-item-title { font-size: 13px; }
      .inbox-item-actions { display: flex; gap: 6px; }

      /* Filters bar */
      .filters-bar { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
      .filters-bar select, .filters-bar input { border: 1px solid var(--border); border-radius: 6px; padding: 7px 9px; font-size: 12px; background: var(--panel); color: var(--ink); }
      .filters-search { flex: 1; min-width: 180px; }
      .task-list { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); }
      .task-header-actions { display: flex; gap: 8px; }
      .bulk-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: var(--accent-soft); border: 1px solid var(--border); border-radius: var(--radius); padding: 9px 12px; margin-bottom: 12px; }
      .bulk-bar select { border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; font-size: 12px; background: var(--panel); }
      .bulk-count { font-weight: 700; font-size: 12px; color: var(--accent); }
      .bulk-bar-spacer { flex: 1; min-width: 6px; }
      .bulk-delete-btn { color: var(--danger); }

      /* Activities */
      .activity-list { display: flex; flex-direction: column; gap: 10px; }
      .activity-card { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 13px 15px; }
      .activity-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
      .activity-card-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
      .activity-title { font-weight: 600; font-size: 13.5px; margin-bottom: 5px; }
      .activity-desc { margin-top: 8px; font-size: 12.5px; color: var(--ink-soft); line-height: 1.5; }
      .activity-generated { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
      .gen-chip { display: inline-flex; align-items: center; gap: 4px; background: var(--accent-soft); color: var(--accent); font-size: 11px; padding: 3px 9px; border-radius: 12px; cursor: pointer; font-weight: 550; }

      /* Agenda */
      .agenda-group { margin-bottom: 16px; }
      .agenda-date { font-family: var(--mono); font-size: 11.5px; font-weight: 600; color: var(--ink-soft); margin-bottom: 6px; padding-left: 2px; }
      .agenda-today { color: var(--today); }
      .agenda-past { color: var(--danger); }

      /* Companies / people */
      .inline-add { display: flex; gap: 8px; margin-bottom: 16px; }
      .inline-add input, .inline-add select { border: 1px solid var(--border); border-radius: 6px; padding: 7px 10px; font-size: 12.5px; background: var(--panel); }
      .inline-add input { flex: 1; max-width: 320px; }
      .grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
      .entity-card { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 13px 14px; cursor: pointer; }
      .entity-card:hover { border-color: var(--accent); }
      .entity-name { display: flex; align-items: center; gap: 7px; font-weight: 600; font-size: 13px; margin-bottom: 5px; }
      .entity-stats { font-size: 11px; color: var(--ink-soft); }
      .entity-role { font-size: 11.5px; color: var(--accent); font-weight: 600; margin-bottom: 4px; }
      .entity-contact { display: flex; flex-direction: column; gap: 1px; font-size: 10.5px; color: var(--ink-soft); font-family: var(--mono); margin-top: 6px; }
      .entity-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
      .entity-card-head .entity-name { margin-bottom: 0; }
      .entity-edit-btn { opacity: 0; flex-shrink: 0; }
      .entity-card:hover .entity-edit-btn { opacity: 1; }

      /* Recurring */
      .recurring-row { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-top: 1px solid var(--border); }
      .task-list .recurring-row:first-child, .recurring-row:first-child { border-top: none; }
      .recur-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .recur-dot.on { background: var(--accent); }
      .recur-dot.off { background: #C7CDD8; }

      /* Overview */
      .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 18px; }
      .stat-card { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
      .stat-value { font-family: var(--display); font-size: 24px; font-weight: 700; }
      .stat-card.tone-danger .stat-value { color: var(--danger); }
      .stat-card.tone-today .stat-value { color: var(--today); }
      .stat-card.tone-next .stat-value { color: var(--next); }
      .stat-card.tone-success .stat-value { color: #2F9E5C; }
      .stat-label { font-size: 11.5px; color: var(--ink-soft); margin-top: 3px; }
      .cat-breakdown { margin-top: 4px; }
      .cat-bar-row { display: flex; align-items: center; gap: 10px; padding: 5px 0; }
      .cat-bar-label { width: 130px; font-size: 12px; flex-shrink: 0; }
      .cat-bar-track { flex: 1; height: 7px; background: var(--bg); border-radius: 4px; overflow: hidden; }
      .cat-bar-fill { height: 100%; background: var(--accent); }
      .cat-bar-count { font-family: var(--mono); font-size: 11px; color: var(--ink-soft); width: 24px; text-align: right; }

      /* Settings */
      .cat-list { display: flex; flex-wrap: wrap; gap: 8px; }
      .cat-chip { display: flex; align-items: center; gap: 6px; background: var(--panel); border: 1px solid var(--border); padding: 5px 10px; border-radius: 14px; font-size: 12px; }
      .cat-chip svg { cursor: pointer; color: var(--ink-soft); }
      .settings-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-soft); font-weight: 700; margin: 22px 0 8px; }
      .settings-section-title:first-of-type { margin-top: 0; }
      .settings-notif-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
      .settings-notif-label { font-size: 12.5px; font-weight: 600; }
      .shortcut-row { display: flex; align-items: center; gap: 10px; padding: 5px 0; font-size: 12.5px; }
      .shortcut-row kbd { background: var(--bg); border: 1px solid var(--border); border-bottom-width: 2px; border-radius: 5px; padding: 2px 7px; font-family: var(--mono); font-size: 11px; min-width: 20px; text-align: center; }

      /* Search overlay */
      .search-overlay { position: fixed; inset: 0; z-index: 40; background: rgba(20,24,34,0.05); }
      .search-panel { position: absolute; top: 66px; left: 244px; width: 460px; max-height: 60vh; overflow-y: auto; background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: 0 10px 30px rgba(20,24,34,0.12); padding: 8px; }
      .search-group { margin-bottom: 6px; }
      .search-group-title { font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--ink-soft); padding: 6px 8px 2px; }
      .search-item { display: flex; align-items: center; gap: 8px; padding: 7px 8px; font-size: 12.5px; border-radius: 6px; cursor: pointer; }
      .search-item:hover { background: var(--bg); }

      /* Drawer (task detail) */
      .drawer-overlay { position: fixed; inset: 0; background: rgba(20,24,34,0.28); z-index: 50; display: flex; justify-content: flex-end; }
      .drawer { width: 460px; max-width: 92vw; background: var(--panel); height: 100%; overflow-y: auto; box-shadow: -8px 0 30px rgba(20,24,34,0.15); }
      .drawer-head { padding: 18px 20px 6px; border-bottom: 1px solid var(--border); }
      .drawer-head-top { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
      .spacer { flex: 1; }
      .drawer-head h2 { font-family: var(--display); font-size: 17px; margin: 0 0 14px; }
      .drawer-title-input { font-family: var(--display); font-size: 17px; border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; width: 100%; margin-bottom: 14px; }
      .drawer-body { padding: 16px 20px 40px; }
      .drawer-meta-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
      .drawer-desc { font-size: 13px; color: var(--ink-soft); line-height: 1.55; margin: 0 0 14px; }
      .drawer-actions-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
      .due-quick-input { border: 1px solid var(--border); border-radius: 6px; padding: 5px 8px; font-size: 11.5px; }
      .follow-form { display: flex; flex-direction: column; gap: 6px; margin: 10px 0; background: var(--bg); padding: 10px; border-radius: 7px; }
      .follow-form input, .follow-form select, .follow-form textarea { border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; font-size: 12px; font-family: var(--sans); width: 100%; }
      .follow-form-row { display: flex; gap: 6px; flex-wrap: wrap; }
      .follow-form-row input, .follow-form-row select { flex: 1; min-width: 100px; width: auto; }

      .origin-box { display: flex; align-items: center; gap: 7px; background: var(--accent-soft); color: var(--accent); padding: 8px 10px; border-radius: 7px; font-size: 12px; margin: 8px 0; }
      .notes-box { font-size: 12.5px; background: var(--bg); padding: 8px 10px; border-radius: 7px; margin-bottom: 8px; line-height: 1.5; display: flex; gap: 6px; align-items: flex-start; }
      .drawer-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-soft); font-weight: 700; margin: 20px 0 8px; }
      .related-box { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
      .link-search { position: relative; width: 100%; margin-top: 6px; }
      .link-search input { width: 100%; border: 1px solid var(--border); border-radius: 6px; padding: 7px 9px; font-size: 12px; }
      .link-results { position: absolute; top: 100%; left: 0; right: 0; background: var(--panel); border: 1px solid var(--border); border-radius: 6px; margin-top: 3px; z-index: 5; box-shadow: 0 6px 18px rgba(20,24,34,0.1); }
      .link-result-item { padding: 7px 9px; font-size: 12px; cursor: pointer; }
      .link-result-item:hover { background: var(--bg); }

      .timeline { display: flex; flex-direction: column; }
      .timeline-item { display: flex; gap: 10px; padding-bottom: 14px; position: relative; }
      .timeline-item:not(:last-child)::before { content: ''; position: absolute; left: 3px; top: 12px; bottom: -2px; width: 1px; background: var(--border); }
      .timeline-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); margin-top: 5px; flex-shrink: 0; }
      .timeline-ts { font-family: var(--mono); font-size: 10.5px; color: var(--ink-soft); }
      .timeline-text { font-size: 12.5px; margin-top: 2px; }

      /* Edit form */
      .edit-form label, .modal-body label { display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; color: var(--ink-soft); font-weight: 600; margin-bottom: 10px; }
      .edit-form input, .edit-form select, .edit-form textarea,
      .modal-body input, .modal-body select, .modal-body textarea { border: 1px solid var(--border); border-radius: 6px; padding: 7px 9px; font-size: 12.5px; color: var(--ink); font-family: var(--sans); font-weight: 400; }
      .edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }

      /* Modal */
      .modal-overlay { position: fixed; inset: 0; background: rgba(20,24,34,0.32); z-index: 60; display: flex; align-items: center; justify-content: center; padding: 20px; }
      .modal { background: var(--panel); border-radius: 10px; width: 520px; max-width: 100%; max-height: 88vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(20,24,34,0.25); }
      .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
      .modal-head h3 { font-family: var(--display); font-size: 15px; margin: 0; }
      .modal-head svg { cursor: pointer; color: var(--ink-soft); }
      .modal-body { padding: 16px 20px 20px; }
      .modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
      .next-step-toggle { display: flex; align-items: center; gap: 9px; padding: 9px 0 3px; cursor: pointer; user-select: none; }
      .next-step-toggle span { font-size: 12.5px; font-weight: 600; color: var(--ink); }
      .toggle-box { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid #C7CDD8; background: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff; }
      .toggle-box.on { background: var(--accent); border-color: var(--accent); }
      .next-step-form { background: var(--accent-soft); border-radius: 8px; padding: 12px; margin: 8px 0 4px; }
      .next-step-hint { font-size: 11px; color: var(--ink-soft); margin-top: 2px; }
      .complete-task-title { font-weight: 600; font-size: 14px; margin-bottom: 10px; }
      .required-mark { font-weight: 400; color: var(--danger); font-size: 10.5px; text-transform: none; letter-spacing: 0; }
      .btn:disabled { opacity: .45; cursor: not-allowed; }
      .completion-box { background: #E9F6EF; color: #1E6B41; }
      .completion-box b { color: #1E6B41; }

      /* Entity picker */
      .entity-picker { position: relative; display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; color: var(--ink-soft); font-weight: 600; margin-bottom: 10px; }
      .entity-picker-box { border: 1px solid var(--border); border-radius: 6px; padding: 7px 9px; font-size: 12.5px; color: var(--ink); font-weight: 400; cursor: pointer; background: #fff; }
      .entity-picker-box .ph { color: #A7ADB9; }
      .entity-picker-panel { position: absolute; top: 100%; left: 0; right: 0; background: var(--panel); border: 1px solid var(--border); border-radius: 7px; margin-top: 3px; z-index: 20; box-shadow: 0 10px 26px rgba(20,24,34,0.14); padding: 8px; }
      .entity-picker-panel input { width: 100%; border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; font-size: 12px; margin-bottom: 6px; font-weight: 400; }
      .entity-picker-list { max-height: 160px; overflow-y: auto; }
      .entity-picker-item { padding: 6px 8px; font-size: 12px; border-radius: 5px; cursor: pointer; font-weight: 400; color: var(--ink); }
      .entity-picker-item:hover { background: var(--bg); }
      .entity-picker-item.create { color: var(--accent); font-weight: 600; }
      .entity-picker-close { width: 100%; margin-top: 4px; justify-content: center; }

      .mobile-hamburger { display: none; border: 1px solid var(--border); background: var(--panel); border-radius: 7px; padding: 7px 9px; color: var(--ink); cursor: pointer; flex-shrink: 0; }
      .mobile-nav-backdrop { display: none; }
      .mobile-nav-close { display: none; cursor: pointer; color: var(--ink-soft); margin-left: auto; }

      .profile-view { max-width: 760px; }
      .profile-back { margin-bottom: 10px; }
      .profile-heading { display: flex; align-items: center; gap: 9px; color: var(--ink-soft); }
      .profile-heading h1 { color: var(--ink); }
      .profile-actions { display: flex; gap: 6px; }
      .profile-company-chip { display: inline-flex; align-items: center; gap: 5px; background: var(--accent-soft); color: var(--accent); font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 12px; cursor: pointer; margin-bottom: 10px; width: fit-content; }
      .profile-contact-row { display: flex; gap: 14px; font-size: 12px; color: var(--ink-soft); margin-bottom: 14px; }
      .profile-contact-row span { display: inline-flex; align-items: center; gap: 5px; font-family: var(--mono); }
      .profile-quick-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
      .profile-stats { margin-bottom: 18px; }
      .profile-people { margin-bottom: 18px; }
      .profile-people-list { display: flex; flex-wrap: wrap; gap: 6px; }
      .timeline-clickable { cursor: pointer; }
      .timeline-clickable:hover { text-decoration: underline; color: var(--accent); }
      .timeline-item.completed .timeline-dot { background: #2F9E5C; }
      .profile-timeline { margin-bottom: 10px; }

      @media (max-width: 860px) {
        .sidebar { display: flex; position: fixed; top: 0; left: 0; bottom: 0; width: 260px; max-width: 82vw; z-index: 70; transform: translateX(-100%); transition: transform .22s ease; box-shadow: 8px 0 24px rgba(20,24,34,0.18); }
        .sidebar.mobile-open { transform: translateX(0); }
        .mobile-nav-backdrop { display: block; position: fixed; inset: 0; background: rgba(20,24,34,0.35); z-index: 65; }
        .mobile-nav-close { display: block; }
        .mobile-hamburger { display: inline-flex; }
        .rotina-grid { grid-template-columns: 1fr; }
        .drawer { width: 100%; }
        .search-panel { left: 14px; right: 14px; width: auto; }
        .edit-grid { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}
