import { useState, useEffect, useRef, useMemo } from "react";
import {
  Inbox, CheckSquare, Activity, Calendar, Building2, Users, Repeat,
  BarChart3, Settings, Search, Plus, Clock, AlertCircle, ChevronRight,
  ChevronLeft, X, Link2, History, ArrowRight, Check, Trash2, Edit2,
  Home, Circle, CircleDot, Paperclip, ArrowUpRight, Sparkles, Menu, Mail, Phone,
  Sun, Moon, MapPin, Tag, Target, MessageCircle, ChevronDown, Eye, Download, Upload, Wallet
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

// Senha exigida para confirmar qualquer exclusão de registro. Troque o valor abaixo para alterar a senha.
const ADMIN_DELETE_PASSWORD = "brdata2026";
const DEFAULT_CATEGORIES = [
  "Comercial", "Administrativo", "Interno", "Financeiro",
  "Reuniões", "Documentação", "Acompanhamento", "Outros",
];

// Campos de CRM para Empresas/Pessoas (leads e cadastros)
const ENTITY_TYPES = ["Cliente", "Ex-cliente", "Prospect", "Parceiro", "Colaborador", "Fornecedor"];
const CRM_STAGES = ["Novo Lead", "Primeiro Contato", "Qualificação", "Interesse", "Demonstração", "Proposta Enviada", "Negociação", "Fechado-Ganho", "Fechado-Perdido"];
const CRM_STAGE_COLOR = {
  "Novo Lead": "#8B93A7",
  "Primeiro Contato": "#5C7FA6",
  "Qualificação": "#237CC0",
  "Interesse": "#3BA6B8",
  "Demonstração": "#8B5FBF",
  "Proposta Enviada": "#C9A227",
  "Negociação": "#F08516",
  "Fechado-Ganho": "#2F9E5C",
  "Fechado-Perdido": "#D64545",
};
const ORIGINS = [
  "Antigos", "Diretoria", "Indicação (Cliente)", "Indicação (Colaborador)", "Indicação (Parceiro)", "Instagram",
  "Prospecção", "Visita à empresa", "Whatsapp", 
];
const SEGMENTS = [
  "Agronegócio", "Atacado e Varejo", "Eventos / Artistas", "Indústria", "Marmoraria",
  "Serviços",
];
const CLASSIFICATIONS = ["A", "B", "C", "D"];
const CLASSIFICATION_COLOR = { A: "#2F9E5C", B: "#5C7FA6", C: "#D9822B", D: "#D64545" };
// Carteira de clientes (Plano Comercial)
const POTENTIALS = ["Alto", "Médio", "Baixo"];
const POTENTIAL_COLOR = { Alto: "#2F9E5C", "Médio": "#C9A227", Baixo: "#8B93A7" };
const CUSTOMER_STATUSES = ["Ativo", "Em risco", "Oportunidade", "Inativo"];
const CUSTOMER_STATUS_COLOR = { Ativo: "#2F9E5C", "Em risco": "#D64545", Oportunidade: "#F08516", Inativo: "#8B93A7" };
const DATE_KEYS = ["customerSince", "contractEnd"]; // datas lidas das planilhas
// Matriz de oportunidades por segmento (do Plano Comercial). Os demais segmentos ainda não têm matriz definida.
const MODULES_BY_SEGMENT = {
  // Atacado e Varejo reúne o que o plano definia para Mercado e Pet Shop; Serviços, o de Oficina
  "Atacado e Varejo": ["PDV", "Estoque", "Financeiro", "Compras", "Vendas", "Integração", "Relatórios", "Emissão fiscal", "Cadastro de clientes", "Serviços", "Recorrência"],
  "Serviços": ["Ordem de serviço", "Estoque", "Financeiro", "Clientes", "Fornecedores", "Orçamento", "Controle de serviços"],
};
const ALL_MODULES = Array.from(new Set(Object.values(MODULES_BY_SEGMENT).flat()));
const INTERACTION_TYPES = ["WhatsApp", "Ligação", "Reunião", "Visita", "Demonstração", "E-mail", "Proposta", "Follow-up", "Observação"];

const STORAGE_KEY = "brdata-rotina-app-v1";

const NAV = [
  { id: "rotina", label: "Minha Rotina", icon: Home },
  { id: "inbox", label: "Caixa de Entrada", icon: Inbox },
  { id: "tasks", label: "Tarefas", icon: CheckSquare },
  { id: "activities", label: "Atividades", icon: Activity },
  { id: "agenda", label: "Agenda", icon: Calendar },
  { id: "companies", label: "Empresas", icon: Building2 },
  { id: "carteira", label: "Carteira", icon: Wallet },
  { id: "prospeccao", label: "Prospecção", icon: Target },
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

/* ============================================================
   SORT HELPERS (usados pelas listas: tarefas, atividades,
   empresas, pessoas, recorrentes)
   ============================================================ */
function sortTasks(list, sortBy) {
  const arr = [...list];
  if (sortBy === "date") return arr.sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  if (sortBy === "date_desc") return arr.sort((a, b) => (b.dueDate || "0000").localeCompare(a.dueDate || "0000"));
  if (sortBy === "title") return arr.sort((a, b) => (a.title || "").localeCompare(b.title || "", "pt-BR"));
  if (sortBy === "priority") return arr.sort((a, b) => PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority));
  if (sortBy === "created") return arr.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return arr;
}
function sortByName(list) {
  return [...list].sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR"));
}
function sortEntities(list, sortBy) {
  // Empresas e pessoas não têm campo de data de criação — a ordem do array
  // reflete a ordem de cadastro, então usamos isso como proxy de "mais recente".
  if (sortBy === "name") return [...list].sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR"));
  if (sortBy === "recent") return [...list].reverse();
  return list; // "oldest" — ordem de cadastro original
}
function sortActivities(list, sortBy) {
  const arr = [...list];
  if (sortBy === "date") return arr.sort((a, b) => (b.date || b.createdAt || "").localeCompare(a.date || a.createdAt || ""));
  if (sortBy === "date_asc") return arr.sort((a, b) => (a.date || a.createdAt || "").localeCompare(b.date || b.createdAt || ""));
  if (sortBy === "title") return arr.sort((a, b) => (a.title || "").localeCompare(b.title || "", "pt-BR"));
  return arr;
}
function sortRecurring(list, sortBy) {
  const arr = [...list];
  if (sortBy === "next") return arr.sort((a, b) => (a.nextDueDate || "9999").localeCompare(b.nextDueDate || "9999"));
  if (sortBy === "title") return arr.sort((a, b) => (a.title || "").localeCompare(b.title || "", "pt-BR"));
  return arr;
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
   PREFERÊNCIA PERSISTIDA (ordenação, filtros — sobrevive a reload)
   ============================================================ */
const PREF_PREFIX = "rotina-pref-";
const SORT_PREF_PREFIX = "rotina-sort-"; // mantido para não resetar preferências já salvas

function getPersistedPref(key, fallback) {
  try {
    const v = localStorage.getItem(PREF_PREFIX + key);
    return v || fallback;
  } catch (e) { return fallback; }
}
function setPersistedPref(key, value) {
  try { localStorage.setItem(PREF_PREFIX + key, value); } catch (e) {}
}
function usePersistedState(key, fallback) {
  const [value, setValueState] = useState(() => getPersistedPref(key, fallback));
  function setValue(v) {
    setValueState(v);
    setPersistedPref(key, v);
  }
  return [value, setValue];
}
function usePersistedSort(listKey, fallback) {
  const [sortBy, setSortByState] = useState(() => {
    try { return localStorage.getItem(SORT_PREF_PREFIX + listKey) || fallback; } catch (e) { return fallback; }
  });
  function setSortBy(value) {
    setSortByState(value);
    try { localStorage.setItem(SORT_PREF_PREFIX + listKey, value); } catch (e) {}
  }
  return [sortBy, setSortBy];
}

/* ============================================================
   TEMA (claro/escuro) — persistido, aplicado via atributo no <html>
   ============================================================ */
const THEME_KEY = "rotina-theme";
function getThemePref() {
  try { return localStorage.getItem(THEME_KEY) || "light"; } catch (e) { return "light"; }
}
function setThemePref(value) {
  try { localStorage.setItem(THEME_KEY, value); } catch (e) {}
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

const ENTITY_TYPE_COLOR = { "Cliente": "#2F9E5C", "Ex-cliente": "#D64545" };
function EntityTypeBadge({ type }) {
  if (!type) return null;
  const c = ENTITY_TYPE_COLOR[type];
  if (!c) return <Badge>{type}</Badge>;
  return <span className="badge" style={{ color: c, background: c + "22", fontWeight: 700 }}>{type}</span>;
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

function CrmStageBadge({ stage }) {
  if (!stage) return null;
  const c = CRM_STAGE_COLOR[stage] || "#8B93A7";
  return <span className="badge" style={{ color: c, background: c + "18" }}>{stage}</span>;
}

function ClassificationBadge({ classification }) {
  if (!classification) return null;
  const c = CLASSIFICATION_COLOR[classification] || "#8B93A7";
  return <span className="badge classification-badge" style={{ color: c, background: c + "18" }}>Classe {classification}</span>;
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

function TaskRow({ task, companies, people, onOpen, onQuickComplete, bulkMode, selected, onToggleSelect, tag }) {
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
      {tag && <span className="row-tag" style={{ color: tag.color, background: tag.color + "18" }}>{tag.label}</span>}
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
  const [companyFormTab, setCompanyFormTab] = useState("geral"); // guia com que o formulário de empresa abre
  const [recurringModal, setRecurringModal] = useState(null); // null | "new" | recurring object
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [inboxDraft, setInboxDraft] = useState("");
  const [companyFilter, setCompanyFilter] = useState(null);
  const [personFilter, setPersonFilter] = useState(null);
  const [tasksStatusPreset, setTasksStatusPreset] = useState(null); // status inicial ao abrir Tarefas a partir de um perfil
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileTarget, setProfileTarget] = useState(null); // { type: "company"|"person", id }
  const [navStack, setNavStack] = useState([]); // pilha de { view, profileTarget } para o botão "Voltar"
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => getNotificationsEnabledPref());
  const [notificationPermission, setNotificationPermission] = useState(() => (typeof Notification !== "undefined" ? Notification.permission : "unsupported"));
  const [bulkCompleteTarget, setBulkCompleteTarget] = useState(null); // array of task ids
  const [pendingDelete, setPendingDelete] = useState(null); // { kind, id, label }
  const [theme, setTheme] = useState(() => getThemePref());
  const recurringChecked = useRef(false);
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  // aplica o logo da empresa como favicon da aba, com cantos arredondados
  // (com fundo branco por trás para não "sumir" em abas com tema escuro do navegador)
  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const radius = size * 0.22; // cantos arredondados, não circular
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.arcTo(size, 0, size, size, radius);
      ctx.arcTo(size, size, 0, size, radius);
      ctx.arcTo(0, size, 0, 0, radius);
      ctx.arcTo(0, 0, size, 0, radius);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      // cover: preenche o quadrado mantendo a proporção da imagem original
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      link.href = canvas.toDataURL("image/png");
    };
    img.onerror = () => { link.href = "/logo.png"; }; // se falhar, usa o arquivo original
    img.src = "/logo.png";
  }, []);

  // aplica o tema (claro/escuro) no elemento raiz e persiste a escolha
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    setThemePref(theme);
  }, [theme]);
  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

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

  // ao fechar o formulário de empresa, a próxima abertura volta para a guia Geral
  useEffect(() => { if (!companyModal) setCompanyFormTab("geral"); }, [companyModal]);

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

  // Navegação com histórico: empilha a tela atual antes de "entrar" em outra
  // (ex: abrir o perfil de uma empresa, ver todas as tarefas dela), para o
  // botão "Voltar" conseguir desfazer passo a passo.
  function navigateTo(nextView, nextProfileTarget) {
    setNavStack((s) => [...s, { view, profileTarget }]);
    setView(nextView);
    if (nextProfileTarget !== undefined) setProfileTarget(nextProfileTarget);
  }
  function goBack() {
    setNavStack((s) => {
      if (s.length === 0) return s;
      const prev = s[s.length - 1];
      setView(prev.view);
      setProfileTarget(prev.profileTarget);
      return s.slice(0, -1);
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

  function requestDelete(kind, id, label) {
    setPendingDelete({ kind, id, label });
  }

  function executeConfirmedDelete() {
    if (!pendingDelete) return;
    const { kind, id } = pendingDelete;
    if (kind === "task" || kind === "inbox") deleteTask(id);
    else if (kind === "tasks-bulk") bulkDeleteTasks(id);
    else if (kind === "recurring") deleteRecurring(id);
    else if (kind === "category") removeCategory(id);
    setPendingDelete(null);
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
      interactionType: form.interactionType || "",
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
    const current = data.companies.find((c) => c.id === id);
    const patch = {
      name: (form.name || "").trim() || undefined,
      segment: form.segment || "", city: form.city || "",
      address: form.address || "", location: form.location || "", phone: form.phone || "", contactPersonId: form.contactPersonId || null,
      razaoSocial: form.razaoSocial || "", cnpj: form.cnpj || "", cep: form.cep || "", uf: form.uf || "",
      street: form.street || "", addressNumber: form.addressNumber || "", neighborhood: form.neighborhood || "", complement: form.complement || "",
      entityType: form.entityType || "", crmStage: form.crmStage || "", origin: form.origin || "",
      classification: form.classification || "",
      notes: form.notes || "",
      mainActivity: form.mainActivity !== undefined ? form.mainActivity : (current?.mainActivity || ""),
      contractEnd: form.contractEnd !== undefined ? form.contractEnd : (current?.contractEnd || ""),
      contractNumber: form.contractNumber !== undefined ? form.contractNumber : (current?.contractNumber || ""),
      customerSince: form.customerSince !== undefined ? form.customerSince : (current?.customerSince || ""),
      lastPurchase: form.lastPurchase !== undefined ? form.lastPurchase : (current?.lastPurchase || ""),
      plan: form.plan !== undefined ? form.plan : (current?.plan || ""),
      monthlyValue: form.monthlyValue !== undefined ? form.monthlyValue : (current?.monthlyValue ?? null),
      modules: form.modules !== undefined ? form.modules : (current?.modules || []),
      potential: form.potential !== undefined ? form.potential : (current?.potential || ""),
      customerStatus: form.customerStatus !== undefined ? form.customerStatus : (current?.customerStatus || ""),
      commercialSummary: form.commercialSummary !== undefined ? form.commercialSummary : (current?.commercialSummary || ""),
      lostReason: form.lostReason !== undefined ? form.lostReason : (current?.lostReason || ""),
    };
    update((d) => {
      d.companies = d.companies.map((c) => c.id === id ? { ...c, ...patch, name: patch.name || c.name } : c);
    });
    window.db.updateCompany(id, patch).catch(console.error);
  }

  // Atualização parcial e leve (não passa pelo objeto "form" completo do modal) —
  // usada pelo kanban de Prospecção (mudar etapa via drag-and-drop) e pelo
  // Resumo Comercial editável inline no perfil, para não sobrescrever os
  // outros campos da empresa com valores vazios.
  function patchCompanyField(id, fieldPatch) {
    update((d) => {
      d.companies = d.companies.map((c) => c.id === id ? { ...c, ...fieldPatch } : c);
    });
    window.db.updateCompany(id, fieldPatch).catch(console.error);
  }

  async function applyCompaniesImport(plan) {
    if (plan.companyCreates.length) {
      update((d) => { d.companies = [...d.companies, ...plan.companyCreates.map((x) => x.company)]; });
      await Promise.all(plan.companyCreates.map((x) => window.db.insertCompany(x.company).catch(console.error)));
    }
    plan.companyUpdates.forEach(({ id, patch }) => patchCompanyField(id, patch));
    plan.contactUpdates.forEach(({ id, person }) => patchPerson(id, person));
    plan.contactCreates.forEach(({ data }) => addPersonFull(data));
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
    const company = {
      id, name: trimmed, segment: form.segment || "", city: form.city || "",
      address: form.address || "", location: form.location || "", phone: form.phone || "", contactPersonId: form.contactPersonId || null,
      razaoSocial: form.razaoSocial || "", cnpj: form.cnpj || "", cep: form.cep || "", uf: form.uf || "",
      street: form.street || "", addressNumber: form.addressNumber || "", neighborhood: form.neighborhood || "", complement: form.complement || "",
      entityType: form.entityType || "", crmStage: form.crmStage || "", origin: form.origin || "",
      classification: form.classification || "",
      notes: form.notes || "",
      mainActivity: form.mainActivity || "",
      contractEnd: form.contractEnd || "", contractNumber: form.contractNumber || "",
      lostReason: form.lostReason || "",
      customerSince: form.customerSince || "", lastPurchase: form.lastPurchase || "", plan: form.plan || "",
      monthlyValue: form.monthlyValue ?? null, modules: form.modules || [],
      potential: form.potential || "", customerStatus: form.customerStatus || "",
      commercialSummary: "",
    };
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
            <div className="brand-title">BRdata Tecnologia</div>
            <div className="brand-sub">Central de Rotina</div>
          </div>
          <button type="button" className="theme-toggle" onClick={toggleTheme} title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}>
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <X size={18} className="mobile-nav-close" onClick={() => setMobileNavOpen(false)} />
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${view === n.id ? "active" : ""}`}
              onClick={() => { setView(n.id); setCompanyFilter(null); setPersonFilter(null); setTasksStatusPreset(null); setMobileNavOpen(false); setNavStack([]); }}
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
            onOpenCompany={(c) => { navigateTo("profile", { type: "company", id: c.id }); setSearchOpen(false); setSearchQuery(""); }}
            onOpenPerson={(p) => { navigateTo("profile", { type: "person", id: p.id }); setSearchOpen(false); setSearchQuery(""); }}
            onClose={() => setSearchOpen(false)}
          />
        )}

        <div className="content">
          {navStack.length > 0 && (
            <button className="btn btn-ghost btn-sm back-floating" onClick={goBack}><ChevronLeft size={14} /> Voltar</button>
          )}
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
              onDelete={(id) => requestDelete("inbox", id, "Excluir este item da caixa de entrada? Essa ação não pode ser desfeita.")}
            />
          )}

          {view === "tasks" && (
            <TasksView
              tasks={data.tasks.filter((t) => !t.inInbox)}
              categories={data.categories}
              companies={data.companies} people={data.people}
              companyFilter={companyFilter} personFilter={personFilter} statusPreset={tasksStatusPreset}
              onOpen={openTaskDetail} onQuickComplete={requestComplete}
              onNewTask={() => { setTaskFormPrefill(null); setTaskFormOpen(true); }}
              onBulkComplete={(ids) => setBulkCompleteTarget(ids)}
              onBulkSetCategory={bulkSetCategory}
              onBulkSetPriority={bulkSetPriority}
              onBulkDelete={(ids) => requestDelete("tasks-bulk", ids, `Excluir ${ids.length} tarefa(s)? Essa ação não pode ser desfeita.`)}
            />
          )}

          {view === "activities" && (
            <ActivitiesView
              activities={data.activities} companies={data.companies} people={data.people}
              companyFilter={companyFilter} personFilter={personFilter}
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
              onSelect={(c) => navigateTo("profile", { type: "company", id: c.id })}
              onHistory={(c) => navigateTo("history", { type: "company", id: c.id })}
              onImport={applyCompaniesImport}
            />
          )}

          {view === "carteira" && (
            <CarteiraView
              companies={data.companies} activities={data.activities}
              onEditCarteira={(c) => { setCompanyFormTab("carteira"); setCompanyModal(c); }}
              onOpenCompany={(c) => navigateTo("profile", { type: "company", id: c.id })}
              onImport={applyCompaniesImport}
            />
          )}

          {view === "history" && profileTarget && (
            <CompanyHistory
              company={data.companies.find((c) => c.id === profileTarget.id)}
              tasks={data.tasks} activities={data.activities} people={data.people}
              onOpenTask={openTaskDetail}
            />
          )}

          {view === "prospeccao" && (
            <ProspeccaoView
              companies={data.companies}
              onOpenCompany={(c) => navigateTo("profile", { type: "company", id: c.id })}
              onEditCompany={(c) => setCompanyModal(c)}
              onChangeStage={(id, stage, lostReason) => patchCompanyField(id, { crmStage: stage, lostReason: lostReason !== undefined ? lostReason : "" })}
              onLogContact={(c) => { setActivityFormPrefill({ companyId: c.id, fromProfile: true }); setActivityFormOpen(true); }}
              onNewCompany={() => setCompanyModal("new")}
            />
          )}

          {view === "people" && (
            <PeopleView
              people={data.people} companies={data.companies} tasks={data.tasks} activities={data.activities}
              onNew={() => setPersonModal("new")}
              onEdit={(p) => setPersonModal(p)}
              onSelect={(p) => navigateTo("profile", { type: "person", id: p.id })}
            />
          )}

          {view === "profile" && profileTarget && (
            <EntityProfile
              target={profileTarget}
              companies={data.companies} people={data.people} tasks={data.tasks} activities={data.activities}
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
              onOpenRelated={(type, id) => navigateTo("profile", { type, id })}
              onOpenSection={(kind) => {
                if (profileTarget.type === "company") { setCompanyFilter(profileTarget.id); setPersonFilter(null); }
                else { setPersonFilter(profileTarget.id); setCompanyFilter(null); }
                if (kind === "activities") {
                  navigateTo("activities");
                } else {
                  setTasksStatusPreset({ open: "abertas", overdue: "atrasadas", done: "concluidas", all: "todas" }[kind]);
                  navigateTo("tasks");
                }
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
              onUpdateCommercialSummary={(id, text) => patchCompanyField(id, { commercialSummary: text })}
            />
          )}

          {view === "recurring" && (
            <RecurringView
              recurring={data.recurring} tasks={data.tasks}
              categories={data.categories} companies={data.companies} people={data.people}
              onNew={() => setRecurringModal("new")}
              onEdit={(r) => setRecurringModal(r)}
              onToggle={toggleRecurringActive} onDelete={(id) => requestDelete("recurring", id, "Excluir esta tarefa recorrente? Essa ação não pode ser desfeita.")}
            />
          )}

          {view === "overview" && (
            <OverviewView tasks={data.tasks.filter((t) => !t.inInbox)} categories={data.categories} />
          )}

          {view === "settings" && (
            <SettingsView
              categories={data.categories} onAdd={addCategory} onRemove={(name) => requestDelete("category", name, `Excluir a categoria "${name}"? Tarefas que usam essa categoria não serão apagadas.`)}
              notificationsEnabled={notificationsEnabled}
              notificationPermission={notificationPermission}
              onToggleNotifications={toggleNotifications}
              theme={theme}
              onToggleTheme={toggleTheme}
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
          onDelete={(id) => requestDelete("task", id, "Excluir esta tarefa? Essa ação não pode ser desfeita.")}
          onCreateCompany={upsertCompany}
          onCreatePerson={upsertPerson}
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
          onCreateCompany={upsertCompany}
          onCreatePerson={upsertPerson}
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
        <CompanyFormPage
          initialTab={companyFormTab}
          editing={companyModal === "new" ? null : companyModal}
          people={data.people}
          onCreatePerson={upsertPerson}
          onClose={() => setCompanyModal(null)}
          onSubmit={(form, newContacts, changedPeople) => {
            let id;
            if (companyModal === "new") id = upsertCompanyFull(form);
            else { patchCompany(companyModal.id, form); id = companyModal.id; }
            (changedPeople || []).forEach((p) => patchPerson(p.id, p));
            (newContacts || []).forEach((c) => addPersonFull({ ...c, companyId: id }));
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

      {pendingDelete && (
        <AdminPasswordModal
          message={pendingDelete.label}
          onCancel={() => setPendingDelete(null)}
          onConfirm={executeConfirmedDelete}
        />
      )}
    </div>
  );
}

/* ============================================================
   ROTINA VIEW
   ============================================================ */

function Section({ title, icon: Icon, count, tone, children, collapsedHint }) {
  const [open, setOpen] = usePersistedState(`section-open-${title}`, "1");
  const isOpen = open === "1";
  return (
    <div className="section">
      <div className={`section-head tone-${tone}`} onClick={() => setOpen(isOpen ? "0" : "1")}>
        <Icon size={15} />
        <span>{title}</span>
        <span className="section-count">{count}</span>
        <ChevronDown size={14} className={`section-chevron ${isOpen ? "" : "collapsed"}`} />
      </div>
      {isOpen && (count === 0 ? <div className="section-empty">{collapsedHint}</div> : <div className="section-body">{children}</div>)}
    </div>
  );
}

const ROTINA_TAG = {
  overdue: { label: "Atrasada", color: "#D64545" },
  today: { label: "Hoje", color: "#237CC0" },
  tomorrow: { label: "Amanhã", color: "#C9A227" },
  upcoming: { label: "Em breve", color: "#F08516" },
  noDate: { label: "Sem prazo", color: "#8B93A7" },
};

function RotinaView({ overdue, dueToday, dueTomorrow, upcoming, noDate, recurring, recentActivities, companies, people, onOpen, onQuickComplete, onNewTask }) {
  const activeRecurring = recurring.filter((r) => r.active);
  const [filter, setFilter] = useState(null); // null = tudo junto | "overdue" | "today" | "tomorrow" | "upcoming"

  const stats = [
    { key: "overdue", icon: AlertCircle, items: overdue, label: "Atrasadas" },
    { key: "today", icon: Circle, items: dueToday, label: "Hoje" },
    { key: "tomorrow", icon: CircleDot, items: dueTomorrow, label: "Amanhã" },
    { key: "upcoming", icon: ArrowRight, items: upcoming, label: "Próximas" },
  ];

  let combined = [];
  stats.forEach((s) => s.items.forEach((t) => combined.push({ task: t, tagKey: s.key })));
  noDate.forEach((t) => combined.push({ task: t, tagKey: "noDate" }));
  const visible = filter ? combined.filter((x) => x.tagKey === filter) : combined;

  return (
    <div className="view rotina-view">
      <div className="view-header">
        <div>
          <h1>Minha Rotina</h1>
          <p className="view-sub">{formatDateBR(todayStr())} · o que precisa da sua atenção agora</p>
        </div>
        <button className="btn btn-primary" onClick={onNewTask}><Plus size={14} /> Nova tarefa</button>
      </div>

      <div className="rotina-stats">
        {stats.map((s) => (
          <button
            key={s.key}
            className={`rotina-stat ${filter === s.key ? "active" : ""}`}
            style={{ "--sc": ROTINA_TAG[s.key].color }}
            onClick={() => setFilter(filter === s.key ? null : s.key)}
          >
            <s.icon size={16} />
            <span className="rotina-stat-value">{s.items.length}</span>
            <span className="rotina-stat-label">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="rotina-grid">
        <div className="rotina-col">
          <div className="task-list rotina-unified-list">
            {visible.length === 0 && (
              <EmptyState
                icon={CheckSquare}
                title={filter ? "Nada neste grupo" : "Tudo em dia"}
                hint={filter ? "Nenhuma tarefa aqui no momento." : "Nenhuma tarefa pendente com prazo definido."}
              />
            )}
            {visible.map(({ task, tagKey }) => (
              <TaskRow
                key={task.id} task={task} companies={companies} people={people}
                onOpen={onOpen} onQuickComplete={onQuickComplete}
                tag={!filter ? ROTINA_TAG[tagKey] : null}
              />
            ))}
          </div>
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

function TasksView({ tasks, categories, companies, people, companyFilter, personFilter, statusPreset, onOpen, onQuickComplete, onNewTask, onBulkComplete, onBulkSetCategory, onBulkSetPriority, onBulkDelete }) {
  const [savedStatus, setSavedStatus] = usePersistedState("tasks-status", "abertas");
  const [presetStatus, setPresetStatus] = useState(statusPreset || null); // vindo do perfil: vale só nesta visita, não altera a preferência salva
  const status = presetStatus || savedStatus;
  const setStatus = (v) => { setPresetStatus(null); setSavedStatus(v); };
  const [priority, setPriority] = usePersistedState("tasks-priority", "Todas");
  const [category, setCategory] = usePersistedState("tasks-category", "Todas");
  const [q, setQ] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkCategoryPick, setBulkCategoryPick] = useState("");
  const [bulkPriorityPick, setBulkPriorityPick] = useState("");
  const [sortBy, setSortBy] = usePersistedSort("tasks", "date");

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
  filtered = sortTasks(filtered, sortBy);

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
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} title="Ordenar por">
          <option value="date">Prazo (mais próximo)</option>
          <option value="date_desc">Prazo (mais distante)</option>
          <option value="title">Nome (A-Z)</option>
          <option value="priority">Prioridade (maior primeiro)</option>
          <option value="created">Criação (mais recente)</option>
        </select>
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
            onClick={() => { onBulkDelete(Array.from(selectedIds)); exitBulk(); }}
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

function ActivitiesView({ activities, companies, people, tasks, companyFilter, personFilter, onNew, onEdit, onGenerateTask, onOpenTask }) {
  const [sortBy, setSortBy] = usePersistedSort("activities", "date");
  const [interactionFilter, setInteractionFilter] = usePersistedState("activities-interaction-type", "Todos");
  let filtered = activities;
  if (companyFilter) filtered = filtered.filter((a) => a.companyId === companyFilter);
  if (personFilter) filtered = filtered.filter((a) => a.personId === personFilter);
  const companyName = companyFilter ? companies.find((c) => c.id === companyFilter)?.name : null;
  const personName = personFilter ? people.find((p) => p.id === personFilter)?.name : null;
  if (interactionFilter !== "Todos") filtered = filtered.filter((a) => a.interactionType === interactionFilter);
  const sorted = sortActivities(filtered, sortBy);
  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>Atividades</h1>
          <p className="view-sub">
            {companyName && <>Filtrando por empresa: <b>{companyName}</b> · </>}
            {personName && <>Filtrando por pessoa: <b>{personName}</b> · </>}
            {companyName || personName ? `${sorted.length} atividade(s)` : "Registro do que já aconteceu — a base do seu histórico."}
          </p>
        </div>
        <button className="btn btn-primary" onClick={onNew}><Plus size={14} /> Nova atividade</button>
      </div>

      <div className="filters-bar">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} title="Ordenar por">
          <option value="date">Mais recentes primeiro</option>
          <option value="date_asc">Mais antigas primeiro</option>
          <option value="title">Nome (A-Z)</option>
        </select>
        <select value={interactionFilter} onChange={(e) => setInteractionFilter(e.target.value)} title="Filtrar por tipo de interação">
          <option value="Todos">Todos os tipos de interação</option>
          {INTERACTION_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
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
                    {a.interactionType && <span className="meta-chip"><MessageCircle size={11} /> {a.interactionType}</span>}
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

function lastInteraction(companyId, tasks, activities) {
  const today = todayStr();
  const mine = tasks.filter((t) => !t.inInbox && t.companyId === companyId);
  const isOpen = (t) => t.status !== "Concluída" && t.status !== "Cancelada";

  // 1) tarefa em aberto agendada (prazo de hoje em diante): a mais próxima, com a data do prazo
  const upcoming = mine
    .filter((t) => t.dueDate && t.dueDate >= today && isOpen(t))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  if (upcoming) {
    return { shownDate: upcoming.dueDate, kind: "Próxima tarefa", text: upcoming.title, desc: upcoming.description };
  }

  // 2) senão: o mais recente entre atividades e tarefas, pela data informada (o prazo, nas tarefas)
  let best = null;
  const consider = (shownDate, created, kind, text, desc) => {
    const key = `${shownDate} ${created}`;
    if (!best || key > best.key) best = { key, shownDate, kind, text, desc };
  };
  activities.forEach((a) => {
    if (a.companyId === companyId) consider((a.createdAt || "").split(" ")[0], a.createdAt || "", "Atividade", a.title, a.description);
  });
  mine.forEach((t) => consider(t.dueDate || (t.createdAt || "").split(" ")[0], t.createdAt || "", "Tarefa", t.title, t.description));
  return best;
}

/* ============================================================
   EXPORTAÇÃO PARA EXCEL (empresas + contatos)
   ============================================================ */

const COMPANY_SHEET_COLUMNS = [
  { key: "id", header: "ID", width: 24 },
  { key: "name", header: "Nome / Nome Fantasia", width: 32 },
  { key: "razaoSocial", header: "Razão Social", width: 32 },
  { key: "cnpj", header: "CNPJ", width: 20 },
  { key: "entityType", header: "Tipo", width: 14 },
  { key: "crmStage", header: "Etapa do CRM", width: 20 },
  { key: "origin", header: "Origem", width: 24 },
  { key: "segment", header: "Segmento", width: 22 },
  { key: "mainActivity", header: "Atividade Principal", width: 36 },
  { key: "classification", header: "Classificação", width: 14 },
  { key: "cep", header: "CEP", width: 12 },
  { key: "uf", header: "UF", width: 6 },
  { key: "city", header: "Cidade", width: 22 },
  { key: "neighborhood", header: "Bairro", width: 20 },
  { key: "street", header: "Rua", width: 28 },
  { key: "addressNumber", header: "Nº", width: 8 },
  { key: "complement", header: "Complemento", width: 20 },
  { key: "location", header: "Localização", width: 28 },
  { key: "phone", header: "Telefone (cadastro antigo)", width: 24 },
  { key: "notes", header: "Observações", width: 36 },
  { key: "commercialSummary", header: "Resumo Comercial", width: 36 },
  { key: "lostReason", header: "Motivo da perda", width: 28 },
  { key: "customerSince", header: "Início do contrato", width: 18 },
  { key: "contractEnd", header: "Fim do contrato", width: 16 },
  { key: "contractNumber", header: "Número do contrato", width: 18 },
  { key: "monthlyValue", header: "Valor mensal", width: 14 },
  { key: "customerStatus", header: "Status", width: 14 },
];
const COMPANY_SHEET_READONLY_HEADER = "Última tarefa/atividade (só consulta)";

const CONTACT_SHEET_COLUMNS = [
  { key: "id", header: "ID", width: 24 },
  { key: "company", header: "Empresa", width: 32 },
  { key: "name", header: "Nome / Descrição", width: 30 },
  { key: "role", header: "Cargo", width: 22 },
  { key: "phone", header: "Telefone", width: 20 },
  { key: "email", header: "E-mail", width: 30 },
];

async function exportCompaniesToExcel(companies, people, tasks, activities) {
  const XLSX = await import("xlsx");
  const byName = (a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR");
  const text = (v) => (v == null ? "" : String(v));

  // aba Empresas
  const companyRows = [...companies].sort(byName).map((c) => {
    const hasStructured = c.street || c.addressNumber || c.neighborhood || c.complement;
    const last = lastInteraction(c.id, tasks, activities);
    const values = COMPANY_SHEET_COLUMNS.map((col) => {
      if (col.key === "street") return text(hasStructured ? c.street : c.address);
      if (DATE_KEYS.includes(col.key)) return c[col.key] ? formatDateBR(c[col.key]) : "";
      if (col.key === "monthlyValue") return c.monthlyValue == null ? "" : c.monthlyValue;
      return text(c[col.key]);
    });
    values.push(last ? `${formatDateBR(last.shownDate)} (${last.kind}): ${last.text}` : "");
    return values;
  });
  const wsCompanies = XLSX.utils.aoa_to_sheet([
    [...COMPANY_SHEET_COLUMNS.map((col) => col.header), COMPANY_SHEET_READONLY_HEADER],
    ...companyRows,
  ]);
  wsCompanies["!cols"] = [...COMPANY_SHEET_COLUMNS.map((col) => ({ wch: col.width })), { wch: 50 }];

  // aba Contatos (pessoas vinculadas a alguma empresa)
  const companyName = (id) => companies.find((c) => c.id === id)?.name || "";
  const contactRows = people
    .filter((p) => p.companyId && companyName(p.companyId))
    .sort((a, b) => companyName(a.companyId).localeCompare(companyName(b.companyId), "pt-BR") || byName(a, b))
    .map((p) => CONTACT_SHEET_COLUMNS.map((col) => (col.key === "company" ? companyName(p.companyId) : text(p[col.key]))));
  const wsContacts = XLSX.utils.aoa_to_sheet([CONTACT_SHEET_COLUMNS.map((col) => col.header), ...contactRows]);
  wsContacts["!cols"] = CONTACT_SHEET_COLUMNS.map((col) => ({ wch: col.width }));

  // aba Listas (valores aceitos nos campos de escolha)
  const lists = [
    ["Tipo", ENTITY_TYPES], ["Etapa do CRM", CRM_STAGES], ["Origem", ORIGINS],
    ["Segmento", SEGMENTS], ["Classificação", CLASSIFICATIONS], ["Status", CUSTOMER_STATUSES],
  ];
  const maxLen = Math.max(...lists.map(([, vals]) => vals.length));
  const listRows = Array.from({ length: maxLen }, (_, i) => lists.map(([, vals]) => vals[i] || ""));
  const wsLists = XLSX.utils.aoa_to_sheet([lists.map(([title]) => title), ...listRows]);
  wsLists["!cols"] = lists.map(() => ({ wch: 26 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsCompanies, "Empresas");
  XLSX.utils.book_append_sheet(wb, wsContacts, "Contatos");
  XLSX.utils.book_append_sheet(wb, wsLists, "Listas");
  XLSX.writeFileXLSX(wb, `empresas-${todayStr()}.xlsx`);
}

/* ============================================================
   IMPORTAÇÃO DE EXCEL (leitura, conferência e aplicação)
   ============================================================ */

const SCI_RE = /^\d+([.,]\d+)?e[+-]?\d+$/i; // número em notação científica (o Excel estraga CNPJ/CEP/telefone assim)
const ADDRESS_KEYS = ["street", "addressNumber", "neighborhood", "complement"];

function composeAddress(c) {
  return ADDRESS_KEYS.map((k) => (c[k] || "").trim()).filter(Boolean).join(", ");
}
function matchChoice(value, list) {
  const n = normText(value);
  return list.find((x) => normText(x) === n) || null;
}
function blankCompany(id, name) {
  return {
    id, name, segment: "", city: "", address: "", location: "", phone: "", contactPersonId: null,
    razaoSocial: "", cnpj: "", cep: "", uf: "", street: "", addressNumber: "", neighborhood: "", complement: "",
    entityType: "", crmStage: "", origin: "", classification: "", notes: "", commercialSummary: "", lostReason: "",
  };
}

function parseCompaniesWorkbook(XLSX, buffer, companies, people) {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const plan = {
    companyCreates: [], companyUpdates: [], companyUnchanged: 0,
    contactCreates: [], contactUpdates: [], contactUnchanged: 0,
    problems: [],
  };
  const problem = (sheet, row, message) => plan.problems.push({ sheet, row, message });
  const cell = (v) => (v == null ? "" : v instanceof Date ? v : typeof v === "number" ? String(v) : String(v).trim());
  const readSheet = (name) => {
    const real = wb.SheetNames.find((n) => normText(n) === normText(name));
    if (!real) return null;
    return XLSX.utils.sheet_to_json(wb.Sheets[real], { header: 1, defval: "", raw: true });
  };
  const columnIndex = (rows, columns) => {
    const header = rows[0].map((h) => normText(cell(h)));
    const idx = {};
    columns.forEach((col) => { const i = header.indexOf(normText(col.header)); if (i >= 0) idx[col.key] = i; });
    return idx;
  };

  const companyRows = readSheet("Empresas");
  const contactRows = readSheet("Contatos");
  if (!companyRows && !contactRows) {
    problem("Arquivo", 0, 'Não encontrei as abas "Empresas" nem "Contatos". Use o arquivo exportado pelo sistema.');
    return plan;
  }

  const nameToId = new Map(); // nome normalizado -> id (empresas existentes e novas)
  companies.forEach((c) => nameToId.set(normText(c.name), c.id));
  const newByName = new Map(); // nome normalizado -> operação de criação

  // ---------- Empresas ----------
  if (companyRows && companyRows.length) {
    const idx = columnIndex(companyRows, COMPANY_SHEET_COLUMNS);
    if (idx.name === undefined) {
      problem("Empresas", 1, 'Coluna "Nome / Nome Fantasia" não encontrada.');
    } else {
      companyRows.slice(1).forEach((r, i) => {
        const rowNum = i + 2;
        const get = (key) => (idx[key] === undefined ? "" : cell(r[idx[key]]));
        if (!COMPANY_SHEET_COLUMNS.some((col) => get(col.key))) return; // linha vazia

        const id = get("id");
        const cnpjDigits = get("cnpj").replace(/\D/g, "");
        const name = get("name") || (id ? "" : get("razaoSocial")); // sem nome fantasia, usa a razão social
        let existing = null;
        if (id) {
          existing = companies.find((c) => c.id === id);
          if (!existing) return problem("Empresas", rowNum, `ID "${id}" não existe no sistema (não apague nem altere a coluna ID).`);
        } else {
          if (!name) return problem("Empresas", rowNum, "Linha sem ID e sem nome (nem razão social).");
          // sem ID: acha a empresa pelo CNPJ (com ou sem pontuação) e, na falta dele, pelo nome
          existing = (cnpjDigits && companies.find((c) => (c.cnpj || "").replace(/\D/g, "") === cnpjDigits))
            || companies.find((c) => normText(c.name) === normText(name)) || null;
        }

        const patch = {};
        const errors = [];
        COMPANY_SHEET_COLUMNS.forEach((col) => {
          if (col.key === "id") return;
          let v = get(col.key);
          if (!v) return; // célula vazia nunca apaga o que já existe
          if (DATE_KEYS.includes(col.key)) {
            const d = parseDateCell(v);
            if (!d) errors.push(`${col.header}: data inválida "${String(v)}" (use DD/MM/AAAA).`); else patch[col.key] = d;
            return;
          }
          if (col.key === "monthlyValue") {
            const n = parseMoney(v);
            if (n == null || n < 0) errors.push(`${col.header}: não entendi "${String(v)}".`); else patch[col.key] = n;
            return;
          }
          if (col.key === "cnpj" && /^\d{13}$/.test(v)) v = "0" + v; // o Excel come o zero da frente
          if (col.key === "cep" && /^\d{7}$/.test(v)) v = "0" + v;
          if (["cnpj", "cep", "phone"].includes(col.key) && SCI_RE.test(v)) {
            errors.push(`${col.header}: o Excel converteu para número. Formate a coluna como Texto e digite de novo.`);
            return;
          }
          const lists = { entityType: ENTITY_TYPES, crmStage: CRM_STAGES, origin: ORIGINS, classification: CLASSIFICATIONS, customerStatus: CUSTOMER_STATUSES };
          if (lists[col.key]) {
            const m = matchChoice(v, lists[col.key]);
            if (!m) { errors.push(`${col.header} "${v}" não é um valor válido (veja a aba Listas).`); return; }
            v = m;
          }
          if (col.key === "segment") v = matchChoice(v, SEGMENTS) || v;
          if (col.key === "uf") {
            v = v.toUpperCase();
            if (!UFS.includes(v)) { errors.push(`UF "${v}" inválida (use a sigla de um estado, ex: GO).`); return; }
          }
          patch[col.key] = v;
        });
        if (errors.length) return errors.forEach((m) => problem("Empresas", rowNum, m));

        if (existing) {
          const diff = {};
          const onlyDigits = (v) => (v || "").replace(/\D/g, "");
          Object.keys(patch).forEach((k) => {
            if (k === "name" && !id) return; // achada pelo nome: não troca maiúscula/minúscula
            const same = k === "cnpj" ? onlyDigits(existing.cnpj) === onlyDigits(patch.cnpj) : (existing[k] || "") === patch[k];
            if (!same) diff[k] = patch[k];
          });
          if (Object.keys(diff).some((k) => ADDRESS_KEYS.includes(k))) diff.address = composeAddress({ ...existing, ...diff });
          if (Object.keys(diff).length === 0) { plan.companyUnchanged += 1; return; }
          const prev = plan.companyUpdates.find((u) => u.id === existing.id);
          if (prev) Object.assign(prev.patch, diff);
          else plan.companyUpdates.push({ id: existing.id, name: existing.name, patch: diff, row: rowNum });
        } else {
          const norm = normText(name);
          const keys = [cnpjDigits ? `cnpj:${cnpjDigits}` : null, `name:${norm}`].filter(Boolean);
          const op = keys.map((k) => newByName.get(k)).find(Boolean);
          if (op) {
            Object.assign(op.company, patch);
            op.company.address = composeAddress(op.company);
          } else {
            const company = { ...blankCompany(uid("co"), name), ...patch, name };
            company.address = composeAddress(company);
            const created = { company, row: rowNum };
            plan.companyCreates.push(created);
            keys.forEach((k) => newByName.set(k, created));
            nameToId.set(norm, company.id);
          }
        }
      });
    }
  }

  // ---------- Contatos ----------
  if (contactRows && contactRows.length) {
    const idx = columnIndex(contactRows, CONTACT_SHEET_COLUMNS);
    if (idx.name === undefined) {
      problem("Contatos", 1, 'Coluna "Nome / Descrição" não encontrada.');
    } else {
      const newContacts = new Map(); // empresaId|nome -> operação de criação
      contactRows.slice(1).forEach((r, i) => {
        const rowNum = i + 2;
        const get = (key) => (idx[key] === undefined ? "" : cell(r[idx[key]]));
        if (!CONTACT_SHEET_COLUMNS.some((col) => get(col.key))) return;

        const id = get("id");
        const companyName = get("company");
        const name = get("name");
        const fields = { name, role: get("role"), phone: get("phone"), email: get("email") };
        if (fields.phone && SCI_RE.test(fields.phone)) {
          return problem("Contatos", rowNum, "Telefone: o Excel converteu para número. Formate a coluna como Texto e digite de novo.");
        }

        let companyId = companyName ? nameToId.get(normText(companyName)) : null;
        if (companyName && !companyId) return problem("Contatos", rowNum, `Empresa "${companyName}" não encontrada (confira o nome na aba Empresas).`);

        let person = null;
        if (id) {
          person = people.find((p) => p.id === id);
          if (!person) return problem("Contatos", rowNum, `ID "${id}" não existe no sistema (não apague nem altere a coluna ID).`);
          if (!companyId) companyId = person.companyId;
        } else {
          if (!companyId) return problem("Contatos", rowNum, "Contato sem ID precisa informar a Empresa.");
          if (!name) return problem("Contatos", rowNum, "Contato sem ID precisa de Nome / Descrição.");
          person = people.find((p) => p.companyId === companyId && normText(p.name) === normText(name)) || null;
        }

        if (person) {
          const diff = {};
          ["name", "role", "phone", "email"].forEach((k) => {
            if (k === "name" && !id) return; // achado pelo nome: não troca maiúscula/minúscula
            if (fields[k] && fields[k] !== (person[k] || "")) diff[k] = fields[k];
          });
          if (companyId !== person.companyId) diff.companyId = companyId;
          if (Object.keys(diff).length === 0) { plan.contactUnchanged += 1; return; }
          const prev = plan.contactUpdates.find((u) => u.id === person.id);
          if (prev) Object.assign(prev.person, diff);
          else plan.contactUpdates.push({ id: person.id, person: { ...person, ...diff }, row: rowNum });
        } else {
          const key = `${companyId}|${normText(name)}`;
          const op = newContacts.get(key);
          if (op) {
            ["role", "phone", "email"].forEach((k) => { if (fields[k]) op.data[k] = fields[k]; });
          } else {
            const created = { data: { name, role: fields.role, phone: fields.phone, email: fields.email, notes: "", companyId }, row: rowNum };
            plan.contactCreates.push(created);
            newContacts.set(key, created);
          }
        }
      });
    }
  }

  return plan;
}

function ImportPreviewModal({ plan, onCancel, onConfirm }) {
  const [state, setState] = useState("preview"); // preview | applying | done | error
  const total = plan.companyCreates.length + plan.companyUpdates.length + plan.contactCreates.length + plan.contactUpdates.length;
  const shown = plan.problems.slice(0, 100);

  async function confirm() {
    setState("applying");
    try {
      await onConfirm(plan);
      setState("done");
    } catch (e) {
      console.error(e);
      setState("error");
    }
  }

  const Line = ({ label, n }) => <div className="import-line"><span>{label}</span><b>{n}</b></div>;

  return (
    <div className="modal-overlay">
      <div className="modal modal-wide">
        <div className="modal-head">
          <h3>{state === "done" ? "Importação concluída" : "Conferir importação"}</h3>
          {state !== "applying" && <X size={16} onClick={onCancel} />}
        </div>
        <div className="modal-body">
          {state === "done" && <div className="import-ok">Pronto! {total} alteração(ões) gravada(s).</div>}
          {state === "error" && <div className="field-error">Algo deu errado ao gravar. Confira a conexão e tente de novo (veja o console do navegador).</div>}

          {plan.kind === "carteira" ? (
            <div className="import-block">
              <div className="import-title">Carteira de clientes</div>
              <Line label="Atualizados" n={plan.companyUpdates.length} />
              <Line label="Sem mudança" n={plan.companyUnchanged} />
            </div>
          ) : (
            <>
              <div className="import-block">
                <div className="import-title">Empresas</div>
                <Line label="Novas" n={plan.companyCreates.length} />
                <Line label="Atualizadas" n={plan.companyUpdates.length} />
                <Line label="Sem mudança" n={plan.companyUnchanged} />
              </div>
              <div className="import-block">
                <div className="import-title">Contatos</div>
                <Line label="Novos" n={plan.contactCreates.length} />
                <Line label="Atualizados" n={plan.contactUpdates.length} />
                <Line label="Sem mudança" n={plan.contactUnchanged} />
              </div>
            </>
          )}

          {plan.problems.length > 0 && (
            <div className="import-block">
              <div className="import-title import-title-bad">{plan.problems.length} problema(s) — essas linhas NÃO serão importadas</div>
              <div className="import-problems">
                {shown.map((pr, i) => (
                  <div key={i} className="import-problem">{pr.row ? `${pr.sheet}, linha ${pr.row}: ` : `${pr.sheet}: `}{pr.message}</div>
                ))}
                {plan.problems.length > shown.length && <div className="import-problem">… e mais {plan.problems.length - shown.length}.</div>}
              </div>
              <div className="next-step-hint">Corrija na planilha e importe de novo. As linhas sem problema podem ser importadas agora, e reimportar depois não duplica nada.</div>
            </div>
          )}

          <div className="modal-footer">
            {state === "done" ? (
              <button type="button" className="btn btn-primary" onClick={onCancel}>Fechar</button>
            ) : (
              <>
                <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={state === "applying"}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={confirm} disabled={total === 0 || state === "applying"}>
                  {state === "applying" ? "Gravando…" : `Importar ${total} alteração(ões)`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, allValue, format }) {
  const caption = label.replace(/^Filtrar por /, "");
  return (
    <label className="filter-field">
      <span className="filter-field-label">{caption.charAt(0).toUpperCase() + caption.slice(1)}</span>
      <select className={`filter-btn ${value !== allValue ? "active" : ""}`} value={value} onChange={(e) => onChange(e.target.value)} title={label}>
        <option value={allValue}>Todos</option>
        {options.map((o) => <option key={o} value={o}>{format ? format(o) : o}</option>)}
      </select>
    </label>
  );
}

function normText(v) {
  return (v || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function CompaniesView({ companies, tasks, activities, people, onNew, onEdit, onSelect, onHistory, onImport }) {
  const [sortBy, setSortBy] = usePersistedSort("companies", "recent");
  const [entityTypeFilter, setEntityTypeFilter] = usePersistedState("companies-entity-type", "Todos");
  const [crmStageFilter, setCrmStageFilter] = usePersistedState("companies-crm-stage", "Todas");
  const [classificationFilter, setClassificationFilter] = usePersistedState("companies-classification", "Todas");
  const [originFilter, setOriginFilter] = usePersistedState("companies-origin", "Todas");
  const [segmentFilter, setSegmentFilter] = usePersistedState("companies-segment", "Todos");
  const [ufFilter, setUfFilter] = usePersistedState("companies-uf", "Todos");
  const [cityFilter, setCityFilter] = usePersistedState("companies-city", "Todas");
  const [viewMode, setViewMode] = usePersistedState("companies-view-mode", "list");
  const [showClients, setShowClients] = usePersistedState("companies-show-clients", "1");
  const [showExClients, setShowExClients] = usePersistedState("companies-show-ex-clients", "1");
  const [qName, setQName] = useState("");
  const [qCity, setQCity] = useState("");

  const fileRef = useRef(null);
  const [importPlan, setImportPlan] = useState(null);

  async function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      setImportPlan(parseCompaniesWorkbook(XLSX, buffer, companies, people));
    } catch (err) {
      console.error(err);
      alert("Não consegui ler esse arquivo. Use a planilha .xlsx exportada pelo sistema.");
    }
  }

  async function handleExport() {
    try {
      await exportCompaniesToExcel(companies, people, tasks, activities);
    } catch (e) {
      console.error(e);
      alert("Não foi possível gerar o Excel. Confirme que a biblioteca foi instalada (npm install) e reinicie o npm run dev.");
    }
  }

  const uniqueSorted = (vals, current, allValue) =>
    Array.from(new Set([...vals.filter(Boolean), ...(current !== allValue ? [current] : [])])).sort((x, y) => x.localeCompare(y, "pt-BR"));
  const segmentOptions = uniqueSorted([...SEGMENTS, ...companies.map((c) => c.segment)], segmentFilter, "Todos");
  const ufOptions = uniqueSorted(companies.map((c) => c.uf), ufFilter, "Todos");
  const cityOptions = uniqueSorted(companies.map((c) => c.city), cityFilter, "Todas");

  // Clientes / Ex-clientes desmarcados ficam fora da lista (a não ser que o filtro Tipo peça aquele tipo)
  const isHiddenType = (c) =>
    (showClients !== "1" && c.entityType === "Cliente" && entityTypeFilter !== "Cliente") ||
    (showExClients !== "1" && c.entityType === "Ex-cliente" && entityTypeFilter !== "Ex-cliente");
  const hiddenCount = companies.filter(isHiddenType).length;
  let filtered = companies.filter((c) => !isHiddenType(c));
  if (entityTypeFilter !== "Todos") filtered = filtered.filter((c) => c.entityType === entityTypeFilter);
  if (crmStageFilter !== "Todas") filtered = filtered.filter((c) => c.crmStage === crmStageFilter);
  if (classificationFilter !== "Todas") filtered = filtered.filter((c) => c.classification === classificationFilter);
  if (originFilter !== "Todas") filtered = filtered.filter((c) => c.origin === originFilter);
  if (segmentFilter !== "Todos") filtered = filtered.filter((c) => c.segment === segmentFilter);
  if (ufFilter !== "Todos") filtered = filtered.filter((c) => c.uf === ufFilter);
  if (cityFilter !== "Todas") filtered = filtered.filter((c) => c.city === cityFilter);
  if (qName.trim()) {
    const q = normText(qName);
    filtered = filtered.filter((c) => normText(c.name).includes(q) || normText(c.razaoSocial).includes(q) || normText(c.cnpj).includes(q));
  }
  if (qCity.trim()) {
    const q = normText(qCity);
    filtered = filtered.filter((c) => normText(c.city).includes(q));
  }
  const sorted = sortEntities(filtered, sortBy);

  function clearFilters() {
    setEntityTypeFilter("Todos"); setCrmStageFilter("Todas"); setClassificationFilter("Todas");
    setOriginFilter("Todas"); setSegmentFilter("Todos"); setUfFilter("Todos"); setCityFilter("Todas");
    setQName(""); setQCity("");
  }

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>Empresas</h1>
          <p className="view-sub">{sorted.length} de {companies.length} cadastradas{hiddenCount > 0 ? ` · ${hiddenCount} oculta(s) pelo tipo` : ""}</p>
        </div>
        <div className="header-actions">
          <div className="pill-row">
            <button type="button" className={`pill ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>Lista</button>
            <button type="button" className={`pill ${viewMode === "cards" ? "active" : ""}`} onClick={() => setViewMode("cards")}>Cards</button>
          </div>
          <button className="btn btn-ghost" onClick={handleExport}><Download size={14} /> Exportar Excel</button>
          <button className="btn btn-ghost" onClick={() => fileRef.current && fileRef.current.click()}><Upload size={14} /> Importar Excel</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleImportFile} />
          <button className="btn btn-primary" onClick={onNew}><Plus size={14} /> Nova empresa</button>
        </div>
      </div>

      <div className="search-row">
        <div className="search-field"><Search size={16} /><input placeholder="pesquisar por nome, razão social ou CNPJ…" value={qName} onChange={(e) => setQName(e.target.value)} /></div>
        <div className="search-field"><Search size={16} /><input placeholder="pesquisar cidade…" value={qCity} onChange={(e) => setQCity(e.target.value)} /></div>
      </div>

      <div className="type-visibility">
        <span>Exibir na lista:</span>
        <label className="filter-check"><input type="checkbox" checked={showClients === "1"} onChange={(e) => setShowClients(e.target.checked ? "1" : "0")} /> Clientes</label>
        <label className="filter-check"><input type="checkbox" checked={showExClients === "1"} onChange={(e) => setShowExClients(e.target.checked ? "1" : "0")} /> Ex-clientes</label>
      </div>

      <div className="filter-grid">
        <FilterSelect label="Filtrar por tipo" value={entityTypeFilter} onChange={setEntityTypeFilter} options={ENTITY_TYPES} allValue="Todos" />
        <FilterSelect label="Filtrar por etapa do CRM" value={crmStageFilter} onChange={setCrmStageFilter} options={CRM_STAGES} allValue="Todas" />
        <FilterSelect label="Filtrar por classificação" value={classificationFilter} onChange={setClassificationFilter} options={CLASSIFICATIONS} allValue="Todas" format={(c) => `Classe ${c}`} />
        <FilterSelect label="Filtrar por origem do cliente" value={originFilter} onChange={setOriginFilter} options={ORIGINS} allValue="Todas" />
        <FilterSelect label="Filtrar por segmento" value={segmentFilter} onChange={setSegmentFilter} options={segmentOptions} allValue="Todos" />
        <FilterSelect label="Filtrar por estado" value={ufFilter} onChange={setUfFilter} options={ufOptions} allValue="Todos" />
        <FilterSelect label="Filtrar por cidade" value={cityFilter} onChange={setCityFilter} options={cityOptions} allValue="Todas" />
        <label className="filter-field">
          <span className="filter-field-label">Ordenar</span>
          <select className="filter-btn" value={sortBy} onChange={(e) => setSortBy(e.target.value)} title="Ordenar por">
            <option value="recent">Mais recentes</option>
            <option value="name">Nome (A-Z)</option>
          </select>
        </label>
        <button type="button" className="filter-btn" onClick={clearFilters}>Limpar filtros</button>
      </div>

      {viewMode === "list" ? (
        <div className="company-list">
          {companies.length === 0 && <EmptyState icon={Building2} title="Nenhuma empresa cadastrada" hint="Cadastre os clientes, fornecedores e parceiros que aparecem na sua rotina." />}
          {companies.length > 0 && sorted.length === 0 && <EmptyState icon={Building2} title="Nenhuma empresa encontrada" hint="Ajuste os filtros ou a pesquisa." />}
          {sorted.length > 0 && (
            <div className="company-list-head">
              <span>Nome</span><span>Cidade</span><span>Segmento</span><span className="left">Última tarefa/atividade</span><span />
            </div>
          )}
          {sorted.map((c) => {
            const last = lastInteraction(c.id, tasks, activities);
            return (
              <div key={c.id} className="company-row">
                <div className="company-row-name">
                  <div className="company-row-title">{c.name}</div>
                  {c.razaoSocial && c.razaoSocial !== c.name && <div className="company-row-sub">Razão social: {c.razaoSocial}</div>}
                  {(c.entityType || c.crmStage || c.classification) && (
                    <div className="entity-crm-row center">
                      {c.entityType && <EntityTypeBadge type={c.entityType} />}
                      <CrmStageBadge stage={c.crmStage} />
                      <ClassificationBadge classification={c.classification} />
                    </div>
                  )}
                </div>
                <div className="company-row-cell">{c.city ? `${c.city}${c.uf ? " - " + c.uf : ""}` : "—"}</div>
                <div className="company-row-cell">{c.segment || "—"}</div>
                <div className="company-row-last">
                  {last ? (
                    <>
                      <div className="company-row-text"><b>{formatDateBR(last.shownDate)}</b> <span className="company-row-kind">({last.kind})</span>: {last.text}</div>
                      {last.desc && <div className="company-row-desc">{last.desc}</div>}
                    </>
                  ) : <span className="company-row-cell">Sem registros</span>}
                </div>
                <div className="company-row-actions">
                  <button className="row-action edit" onClick={(e) => { e.stopPropagation(); onSelect(c); }} title="Abrir empresa"><Edit2 size={15} /></button>
                  <button className="row-action view" onClick={(e) => { e.stopPropagation(); onHistory(c); }} title="Ver histórico"><Eye size={15} /></button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid-cards">
          {companies.length === 0 && <EmptyState icon={Building2} title="Nenhuma empresa cadastrada" hint="Cadastre os clientes, fornecedores e parceiros que aparecem na sua rotina." />}
          {companies.length > 0 && sorted.length === 0 && <EmptyState icon={Building2} title="Nenhuma empresa encontrada" hint="Ajuste os filtros acima." />}
          {sorted.map((c) => {
            const tCount = tasks.filter((t) => t.companyId === c.id && t.status !== "Concluída" && t.status !== "Cancelada").length;
            const aCount = activities.filter((a) => a.companyId === c.id).length;
            const pCount = people.filter((p) => p.companyId === c.id).length;
            const contact = c.contactPersonId ? people.find((p) => p.id === c.contactPersonId) : null;
            const avatarColor = c.classification ? CLASSIFICATION_COLOR[c.classification] : "#8B93A7";
            return (
              <div key={c.id} className="entity-card" onClick={() => onSelect(c)}>
                <div className="entity-card-head">
                  <div className="entity-avatar" style={{ background: avatarColor + "1F", color: avatarColor }}>
                    {(c.name || "?").trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="entity-card-headtext">
                    <div className="entity-name">{c.name}</div>
                    {(c.segment || c.city) && <div className="entity-role">{[c.segment, c.city].filter(Boolean).join(" · ")}</div>}
                  </div>
                  <button className="icon-btn entity-edit-btn" onClick={(e) => { e.stopPropagation(); onEdit(c); }} title="Editar"><Edit2 size={12} /></button>
                </div>
                {(c.entityType || c.crmStage || c.classification) && (
                  <div className="entity-crm-row">
                    {c.entityType && <EntityTypeBadge type={c.entityType} />}
                    <CrmStageBadge stage={c.crmStage} />
                    <ClassificationBadge classification={c.classification} />
                  </div>
                )}
                <div className="entity-stats">{tCount} tarefa(s) aberta(s) · {aCount} atividade(s) · {pCount} pessoa(s)</div>
                {(contact || c.address || c.phone) && (
                  <div className="entity-contact">
                    {contact && <span><Users size={11} /> {contact.name}{contact.role ? ` — ${contact.role}` : ""}</span>}
                    {c.phone && <span><Phone size={11} /> <PhoneLink phone={c.phone} /></span>}
                    {c.address && <span><MapPin size={11} /> {c.address}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {importPlan && <ImportPreviewModal plan={importPlan} onCancel={() => setImportPlan(null)} onConfirm={onImport} />}
    </div>
  );
}

/* ============================================================
   PROSPECÇÃO (kanban de empresas por etapa do CRM)
   ============================================================ */

const PROSPECCAO_COLUMNS = ["Sem etapa", ...CRM_STAGES];

function KanbanCard({ company, onOpen, onEdit, onLogContact, onDragStart }) {
  return (
    <div
      className="kanban-card"
      draggable
      onDragStart={(e) => onDragStart(e, company.id)}
      onClick={() => onOpen(company)}
    >
      <div className="kanban-card-top">
        <div className="kanban-card-name">{company.name}</div>
        <button className="icon-btn kanban-card-edit" onClick={(e) => { e.stopPropagation(); onEdit(company); }} title="Editar"><Edit2 size={11} /></button>
      </div>
      <div className="kanban-card-badges">
        {company.entityType && <EntityTypeBadge type={company.entityType} />}
        <ClassificationBadge classification={company.classification} />
      </div>
      {(company.segment || company.city) && (
        <div className="kanban-card-sub">{[company.segment, company.city].filter(Boolean).join(" · ")}</div>
      )}
      <button className="btn btn-ghost btn-sm kanban-card-contact" onClick={(e) => { e.stopPropagation(); onLogContact(company); }}>
        <MessageCircle size={12} /> Registrar contato
      </button>
    </div>
  );
}

function LostReasonModal({ company, onCancel, onConfirm }) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  return (
    <div className="modal-overlay">
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Marcar como perdida</h3>
          <X size={16} onClick={onCancel} />
        </div>
        <div className="modal-body">
          <div className="complete-task-title">{company.name}</div>
          <label>
            <span>Motivo <span className="required-mark">(obrigatório)</span></span>
            <textarea
              autoFocus rows={3}
              placeholder="Ex: preço, fechou com concorrente, sem orçamento no momento…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={!trimmed} onClick={() => onConfirm(trimmed)}>Confirmar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProspeccaoView({ companies, onOpenCompany, onEditCompany, onChangeStage, onLogContact, onNewCompany }) {
  const [dragOverCol, setDragOverCol] = useState(null);
  const [lostPending, setLostPending] = useState(null); // { companyId, company }

  const byColumn = {};
  PROSPECCAO_COLUMNS.forEach((col) => { byColumn[col] = []; });
  companies.forEach((c) => {
    const col = CRM_STAGES.includes(c.crmStage) ? c.crmStage : "Sem etapa";
    byColumn[col].push(c);
  });

  function handleDragStart(e, companyId) {
    e.dataTransfer.setData("text/plain", companyId);
  }
  function handleDrop(e, col) {
    e.preventDefault();
    setDragOverCol(null);
    const companyId = e.dataTransfer.getData("text/plain");
    if (!companyId) return;
    const company = companies.find((c) => c.id === companyId);
    if (!company) return;
    const targetStage = col === "Sem etapa" ? "" : col;
    if (targetStage === company.crmStage) return;
    if (targetStage === "Fechado-Perdido") {
      setLostPending({ companyId, company });
    } else {
      onChangeStage(companyId, targetStage);
    }
  }

  return (
    <div className="view prospeccao-view">
      <div className="view-header">
        <div>
          <h1>Prospecção</h1>
          <p className="view-sub">Arraste os cards entre as colunas para mudar a etapa do CRM. {companies.length} empresa(s) no total.</p>
        </div>
        <button className="btn btn-primary" onClick={onNewCompany}><Plus size={14} /> Nova empresa</button>
      </div>

      <div className="kanban-board">
        {PROSPECCAO_COLUMNS.map((col) => (
          <div
            key={col}
            className={`kanban-col ${dragOverCol === col ? "drag-over" : ""} ${col === "Fechado-Perdido" ? "kanban-col-lost" : ""} ${col === "Fechado-Ganho" ? "kanban-col-won" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
            onDragLeave={() => setDragOverCol((c) => (c === col ? null : c))}
            onDrop={(e) => handleDrop(e, col)}
          >
            <div className="kanban-col-head">
              <span>{col}</span>
              <span className="kanban-col-count">{byColumn[col].length}</span>
            </div>
            <div className="kanban-col-body">
              {byColumn[col].length === 0 && <div className="kanban-col-empty">Solte um card aqui</div>}
              {byColumn[col].map((c) => (
                <KanbanCard
                  key={c.id} company={c}
                  onOpen={onOpenCompany} onEdit={onEditCompany} onLogContact={onLogContact}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {lostPending && (
        <LostReasonModal
          company={lostPending.company}
          onCancel={() => setLostPending(null)}
          onConfirm={(reason) => {
            onChangeStage(lostPending.companyId, "Fechado-Perdido", reason);
            setLostPending(null);
          }}
        />
      )}
    </div>
  );
}

function ColorBadge({ label, color }) {
  const c = color || "#8B93A7";
  return <span className="badge" style={{ color: c, background: c + "22", fontWeight: 700 }}>{label}</span>;
}

function parseMoney(v) {
  if (v == null) return null;
  let t = String(v).replace(/[^\d.,-]/g, "").trim();
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
const formatMoney = (n) => (n == null || n === "" ? "—" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

function customerTenure(since) {
  if (!since) return "";
  const a = parseLocalDate(since), b = new Date();
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  if (months < 1) return "menos de 1 mês";
  const y = Math.floor(months / 12), m = months % 12;
  const ys = y ? `${y} ${y === 1 ? "ano" : "anos"}` : "";
  const ms = m ? `${m} ${m === 1 ? "mês" : "meses"}` : "";
  return [ys, ms].filter(Boolean).join(" e ");
}

function daysSince(dateStr) {
  return Math.floor((parseLocalDate(todayStr()) - parseLocalDate(dateStr)) / 86400000);
}

function lastContactDate(companyId, activities) {
  let best = "";
  activities.forEach((a) => { if (a.companyId === companyId && (a.createdAt || "") > best) best = a.createdAt; });
  return best ? best.split(" ")[0] : "";
}

/* ============================================================
   CARTEIRA DE CLIENTES (Plano Comercial: "quanto já compra e quanto ainda poderia comprar")
   ============================================================ */

/* ============================================================
   EXCEL DA CARTEIRA (exportar / importar — todas as colunas da carteira)
   ============================================================ */

const CARTEIRA_SHEET_COLUMNS = [
  { key: "id", header: "ID", width: 24 },
  { key: "name", header: "Cliente", width: 32 },
  { key: "segment", header: "Segmento", width: 24 },
  { key: "customerSince", header: "Início do contrato", aliases: ["Cliente desde"], width: 18 },
  { key: "contractEnd", header: "Fim do contrato", width: 16 },
  { key: "contractNumber", header: "Número do contrato", width: 18 },
  { key: "plan", header: "Plano contratado", width: 26 },
  { key: "monthlyValue", header: "Valor mensal", width: 14 },
  { key: "modules", header: "Módulos contratados", width: 42 },
  { key: "lastPurchase", header: "Última compra", width: 16 },
  { key: "potential", header: "Potencial", width: 12 },
  { key: "customerStatus", header: "Status", width: 14 },
  { key: "lostReason", header: "Motivo da perda", width: 32 },
];
const CARTEIRA_READONLY_HEADERS = ["Tempo de contrato (só consulta)", "Módulos não contratados (só consulta)", "Último contato (só consulta)"];

async function exportCarteiraToExcel(companies, activities, includeClients, includeEx) {
  const XLSX = await import("xlsx");
  const list = companies
    .filter((c) => (includeClients && c.entityType === "Cliente") || (includeEx && c.entityType === "Ex-cliente"))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR"));
  const rows = list.map((c) => {
    const modules = c.modules || [];
    const catalog = MODULES_BY_SEGMENT[c.segment];
    const lc = lastContactDate(c.id, activities);
    return [
      c.id, c.name || "", c.segment || "",
      c.customerSince ? formatDateBR(c.customerSince) : "",
      c.contractEnd ? formatDateBR(c.contractEnd) : "",
      c.contractNumber || "", c.plan || "",
      c.monthlyValue == null ? "" : c.monthlyValue,
      modules.join("; "), c.lastPurchase ? formatDateBR(c.lastPurchase) : "",
      c.potential || "", c.customerStatus || "", c.lostReason || "",
      c.customerSince ? customerTenure(c.customerSince) : "",
      catalog ? catalog.filter((m) => !modules.includes(m)).join("; ") : "",
      lc ? formatDateBR(lc) : "",
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([[...CARTEIRA_SHEET_COLUMNS.map((col) => col.header), ...CARTEIRA_READONLY_HEADERS], ...rows]);
  ws["!cols"] = [...CARTEIRA_SHEET_COLUMNS.map((col) => ({ wch: col.width })), { wch: 26 }, { wch: 40 }, { wch: 18 }];

  const lists = [
    ["Potencial", POTENTIALS], ["Status", CUSTOMER_STATUSES],
    ...Object.entries(MODULES_BY_SEGMENT).map(([seg, mods]) => [`Módulos - ${seg}`, mods]),
    ["Módulos - lista geral", ALL_MODULES],
  ];
  const maxLen = Math.max(...lists.map(([, vals]) => vals.length));
  const wsLists = XLSX.utils.aoa_to_sheet([
    lists.map(([title]) => title),
    ...Array.from({ length: maxLen }, (_, i) => lists.map(([, vals]) => vals[i] || "")),
  ]);
  wsLists["!cols"] = lists.map(() => ({ wch: 26 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Carteira");
  XLSX.utils.book_append_sheet(wb, wsLists, "Listas");
  XLSX.writeFileXLSX(wb, `carteira-${todayStr()}.xlsx`);
}

// converte o que o Excel entrega numa data ISO (AAAA-MM-DD) ou null se não der para entender
function parseDateCell(v) {
  const iso = (y, m, d) => {
    const t = new Date(y, m - 1, d);
    if (t.getFullYear() !== y || t.getMonth() !== m - 1 || t.getDate() !== d) return null;
    return `${y}-${pad(m)}-${pad(d)}`;
  };
  if (v instanceof Date) {
    const x = new Date(v.getTime() + 12 * 3600 * 1000);
    return iso(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate());
  }
  if (typeof v === "number") {
    if (v < 20000 || v > 80000) return null;
    const x = new Date(Math.round((v - 25569) * 86400 * 1000));
    return iso(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate());
  }
  const t = String(v).trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return iso(y, Number(m[2]), Number(m[1]));
  }
  return null;
}

function parseCarteiraWorkbook(XLSX, buffer, companies) {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const plan = {
    kind: "carteira",
    companyCreates: [], companyUpdates: [], companyUnchanged: 0,
    contactCreates: [], contactUpdates: [], contactUnchanged: 0,
    problems: [],
  };
  const problem = (row, message) => plan.problems.push({ sheet: "Carteira", row, message });
  const sheetName = wb.SheetNames.find((n) => normText(n) === "carteira");
  if (!sheetName) {
    problem(0, 'Não encontrei a aba "Carteira". Use o arquivo exportado pela tela Carteira.');
    return plan;
  }
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "", raw: true });
  if (!rows.length) return plan;

  const header = rows[0].map((h) => normText(String(h == null ? "" : h)));
  const idx = {};
  CARTEIRA_SHEET_COLUMNS.forEach((col) => {
    const names = [col.header, ...(col.aliases || [])].map(normText);
    const i = header.findIndex((h) => names.includes(h));
    if (i >= 0) idx[col.key] = i;
  });
  if (idx.id === undefined && idx.name === undefined) {
    problem(1, 'Não encontrei as colunas "ID" nem "Cliente".');
    return plan;
  }
  const isEmpty = (v) => v == null || (typeof v === "string" && !v.trim());
  const raw = (r, key) => (idx[key] === undefined ? "" : r[idx[key]]);
  const text = (r, key) => { const v = raw(r, key); return isEmpty(v) ? "" : String(v).trim(); };

  rows.slice(1).forEach((r, i) => {
    const rowNum = i + 2;
    if (CARTEIRA_SHEET_COLUMNS.every((col) => isEmpty(raw(r, col.key)))) return; // linha vazia

    const id = text(r, "id");
    const name = text(r, "name");
    let existing = null;
    if (id) {
      existing = companies.find((c) => c.id === id);
      if (!existing) return problem(rowNum, `ID "${id}" não existe no sistema (não apague nem altere a coluna ID).`);
    } else {
      if (!name) return problem(rowNum, "Linha sem ID e sem nome do cliente.");
      existing = companies.find((c) => normText(c.name) === normText(name));
      if (!existing) return problem(rowNum, `Cliente "${name}" não encontrado. Esta importação só atualiza empresas já cadastradas.`);
    }

    const patch = {};
    const errors = [];
    const seg = text(r, "segment");
    if (seg) patch.segment = matchChoice(seg, SEGMENTS) || seg;
    ["plan", "contractNumber", "lostReason"].forEach((key) => { if (text(r, key)) patch[key] = text(r, key); });

    [["customerSince", "Início do contrato"], ["contractEnd", "Fim do contrato"], ["lastPurchase", "Última compra"]].forEach(([key, label]) => {
      const v = raw(r, key);
      if (isEmpty(v)) return;
      const d = parseDateCell(v);
      if (!d) errors.push(`${label}: data inválida "${String(v)}" (use DD/MM/AAAA).`);
      else patch[key] = d;
    });

    const mv = raw(r, "monthlyValue");
    if (!isEmpty(mv)) {
      const n = parseMoney(mv);
      if (n == null || n < 0) errors.push(`Valor mensal: não entendi "${String(mv)}".`);
      else patch.monthlyValue = n;
    }

    const pot = text(r, "potential");
    if (pot) {
      const m = matchChoice(pot, POTENTIALS);
      if (!m) errors.push(`Potencial "${pot}" não é válido (Alto, Médio ou Baixo).`); else patch.potential = m;
    }
    const st = text(r, "customerStatus");
    if (st) {
      const m = matchChoice(st, CUSTOMER_STATUSES);
      if (!m) errors.push(`Status "${st}" não é válido (Ativo, Em risco ou Oportunidade).`); else patch.customerStatus = m;
    }

    const modText = text(r, "modules");
    if (modText) {
      const segmentNow = patch.segment || existing.segment;
      const allowed = Array.from(new Set([...(MODULES_BY_SEGMENT[segmentNow] || ALL_MODULES), ...(existing.modules || [])]));
      const names = modText.split(/[;,\n]/).map((x) => x.trim()).filter(Boolean);
      const bad = [];
      const good = [];
      names.forEach((nm) => { const m = matchChoice(nm, allowed); if (m) { if (!good.includes(m)) good.push(m); } else bad.push(nm); });
      if (bad.length) errors.push(`Módulos inválidos para ${segmentNow || "este segmento"}: ${bad.join(", ")} (veja a aba Listas).`);
      else patch.modules = good;
    }
    if (errors.length) return errors.forEach((m) => problem(rowNum, m));

    const same = (k) => {
      if (k === "modules") return JSON.stringify([...(existing.modules || [])].sort()) === JSON.stringify([...patch.modules].sort());
      if (k === "monthlyValue") return Number(existing.monthlyValue) === patch.monthlyValue && existing.monthlyValue != null;
      return (existing[k] || "") === patch[k];
    };
    const diff = {};
    Object.keys(patch).forEach((k) => { if (!same(k)) diff[k] = patch[k]; });
    if (Object.keys(diff).length === 0) { plan.companyUnchanged += 1; return; }
    const prev = plan.companyUpdates.find((u) => u.id === existing.id);
    if (prev) Object.assign(prev.patch, diff);
    else plan.companyUpdates.push({ id: existing.id, name: existing.name, patch: diff, row: rowNum });
  });

  return plan;
}

function CarteiraView({ companies, activities, onEditCarteira, onOpenCompany, onImport }) {
  const [q, setQ] = useState("");
  const fileRef = useRef(null);
  const [importPlan, setImportPlan] = useState(null);
  const [segmentFilter, setSegmentFilter] = usePersistedState("carteira-segment", "Todos");
  const [potentialFilter, setPotentialFilter] = usePersistedState("carteira-potential", "Todos");
  const [statusFilter, setStatusFilter] = usePersistedState("carteira-status", "Todos");
  const [sortBy, setSortBy] = usePersistedState("carteira-sort", "name");
  const [showEx, setShowEx] = usePersistedState("carteira-show-ex", "0");
  const [showCli, setShowCli] = usePersistedState("carteira-show-clients", "1");

  async function handleExport() {
    try {
      await exportCarteiraToExcel(companies, activities, showCli === "1", showEx === "1");
    } catch (e) {
      console.error(e);
      alert("Não foi possível gerar o Excel. Confirme que a biblioteca foi instalada (npm install) e reinicie o npm run dev.");
    }
  }
  async function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      setImportPlan(parseCarteiraWorkbook(XLSX, buffer, companies));
    } catch (err) {
      console.error(err);
      alert("Não consegui ler esse arquivo. Use a planilha .xlsx exportada pela tela Carteira.");
    }
  }

  const base = companies.filter((c) => (showCli === "1" && c.entityType === "Cliente") || (showEx === "1" && c.entityType === "Ex-cliente"));
  const segmentOptions = Array.from(new Set([
    ...SEGMENTS, ...base.map((c) => c.segment).filter(Boolean), ...(segmentFilter !== "Todos" ? [segmentFilter] : []),
  ])).sort((x, y) => x.localeCompare(y, "pt-BR"));

  let rows = base.map((c) => {
    const contracted = c.modules || [];
    const catalog = MODULES_BY_SEGMENT[c.segment];
    return {
      c, contracted,
      opportunities: catalog ? catalog.filter((m) => !contracted.includes(m)) : null,
      lastContact: lastContactDate(c.id, activities),
    };
  });
  if (segmentFilter !== "Todos") rows = rows.filter((r) => r.c.segment === segmentFilter);
  if (potentialFilter !== "Todos") rows = rows.filter((r) => r.c.potential === potentialFilter);
  if (statusFilter !== "Todos") rows = rows.filter((r) => r.c.customerStatus === statusFilter);
  if (q.trim()) rows = rows.filter((r) => normText(r.c.name).includes(normText(q)));

  const sorters = {
    name: (a, b) => (a.c.name || "").localeCompare(b.c.name || "", "pt-BR"),
    value: (a, b) => (b.c.monthlyValue || 0) - (a.c.monthlyValue || 0),
    tenure: (a, b) => (a.c.customerSince || "9999").localeCompare(b.c.customerSince || "9999"),
    contact: (a, b) => (a.lastContact || "").localeCompare(b.lastContact || ""),
  };
  rows = [...rows].sort(sorters[sortBy] || sorters.name);

  const atRisk = rows.filter((r) => r.c.customerStatus === "Em risco").length;
  const withOpp = rows.filter((r) => r.opportunities && r.opportunities.length > 0).length;

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>Carteira de clientes</h1>
          <p className="view-sub">Quanto cada cliente já compra da BRdata e quanto ainda poderia comprar.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={handleExport}><Download size={14} /> Exportar Excel</button>
          <button className="btn btn-ghost" onClick={() => fileRef.current && fileRef.current.click()}><Upload size={14} /> Importar Excel</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleImportFile} />
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="stat-value">{rows.length}</div><div className="stat-label">Clientes</div></div>
        <div className="stat-card tone-danger"><div className="stat-value">{atRisk}</div><div className="stat-label">Em risco</div></div>
        <div className="stat-card tone-next"><div className="stat-value">{withOpp}</div><div className="stat-label">Com oportunidade de venda</div></div>
      </div>

      <div className="search-row">
        <div className="search-field"><Search size={16} /><input placeholder="pesquisar cliente…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="type-visibility">
          <label className="filter-check"><input type="checkbox" checked={showCli === "1"} onChange={(e) => setShowCli(e.target.checked ? "1" : "0")} /> Exibir clientes</label>
          <label className="filter-check"><input type="checkbox" checked={showEx === "1"} onChange={(e) => setShowEx(e.target.checked ? "1" : "0")} /> Exibir ex-clientes</label>
        </div>
      </div>

      <div className="filter-grid">
        <FilterSelect label="Filtrar por segmento" value={segmentFilter} onChange={setSegmentFilter} options={segmentOptions} allValue="Todos" />
        <FilterSelect label="Filtrar por potencial" value={potentialFilter} onChange={setPotentialFilter} options={POTENTIALS} allValue="Todos" />
        <FilterSelect label="Filtrar por status" value={statusFilter} onChange={setStatusFilter} options={CUSTOMER_STATUSES} allValue="Todos" />
        <label className="filter-field">
          <span className="filter-field-label">Ordenar</span>
          <select className="filter-btn" value={sortBy} onChange={(e) => setSortBy(e.target.value)} title="Ordenar por">
            <option value="name">Nome (A-Z)</option>
            <option value="value">Maior valor mensal</option>
            <option value="tenure">Contrato mais antigo</option>
            <option value="contact">Sem contato há mais tempo</option>
          </select>
        </label>
      </div>

      <div className="carteira-wrap">
        <table className="carteira-table">
          <thead>
            <tr>
              <th>Cliente</th><th>Segmento</th><th>Início do contrato</th><th>Último contato</th><th>Status</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, lastContact }) => (
              <tr key={c.id}>
                <td><div className="carteira-name">{c.name}</div><EntityTypeBadge type={c.entityType} /></td>
                <td>{c.segment || "—"}</td>
                <td>
                  {c.customerSince
                    ? <>{formatDateBR(c.customerSince)}<span className="carteira-sub">{c.contractEnd ? `até ${formatDateBR(c.contractEnd)}` : customerTenure(c.customerSince)}</span></>
                    : "—"}
                </td>
                <td>
                  {lastContact
                    ? <>{formatDateBR(lastContact)}<span className="carteira-sub">há {daysSince(lastContact)} dia(s)</span></>
                    : <span className="carteira-muted">sem contato</span>}
                </td>
                <td>{c.customerStatus ? <ColorBadge label={c.customerStatus} color={CUSTOMER_STATUS_COLOR[c.customerStatus]} /> : "—"}</td>
                <td>
                  <div className="company-row-actions">
                    <button className="row-action edit" onClick={() => onEditCarteira(c)} title="Editar carteira"><Edit2 size={15} /></button>
                    <button className="row-action view" onClick={() => onOpenCompany(c)} title="Abrir empresa"><Eye size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyState icon={Wallet} title="Nenhum cliente na carteira" hint="Clientes são as empresas com Tipo = Cliente. Ajuste os filtros ou cadastre os dados na guia Carteira da empresa." />}
      </div>

      {importPlan && <ImportPreviewModal plan={importPlan} onCancel={() => setImportPlan(null)} onConfirm={onImport} />}
    </div>
  );
}

function CompanyHistory({ company, tasks, activities, people, onOpenTask }) {
  const [order, setOrder] = useState("desc");

  if (!company) {
    return (
      <div className="view">
        <EmptyState icon={Building2} title="Empresa não encontrada" hint="Pode ter sido removida." />
      </div>
    );
  }

  const today = todayStr();
  const items = [];
  activities.filter((a) => a.companyId === company.id).forEach((a) => {
    const person = people.find((p) => p.id === a.personId);
    items.push({
      key: "a_" + a.id, kind: "Atividade", task: null,
      date: (a.createdAt || "").split(" ")[0], sort: a.createdAt || "",
      title: a.title, desc: a.description,
      chips: [a.interactionType, person && person.name].filter(Boolean),
    });
  });
  tasks.filter((t) => !t.inInbox && t.companyId === company.id).forEach((t) => {
    const person = people.find((p) => p.id === t.personId);
    const upcoming = t.dueDate && t.dueDate >= today && t.status !== "Concluída" && t.status !== "Cancelada";
    items.push({
      key: "t_" + t.id, kind: upcoming ? "Próxima tarefa" : "Tarefa", task: t,
      date: upcoming ? t.dueDate : (t.createdAt || "").split(" ")[0],
      sort: upcoming ? `${t.dueDate} ${t.dueTime || "00:00"}` : (t.createdAt || ""),
      title: t.title, desc: t.description, exec: t.completionNote, notes: t.notes,
      chips: [t.category, person && person.name].filter(Boolean),
    });
  });
  items.sort((a, b) => (order === "desc" ? b.sort.localeCompare(a.sort) : a.sort.localeCompare(b.sort)));

  const taskCount = items.filter((i) => i.task).length;
  const activityCount = items.length - taskCount;

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>{company.name}</h1>
          <p className="view-sub">Histórico · {taskCount} tarefa(s) e {activityCount} atividade(s)</p>
        </div>
        <select className="pill-select" value={order} onChange={(e) => setOrder(e.target.value)}>
          <option value="desc">Mais recentes primeiro</option>
          <option value="asc">Mais antigas primeiro</option>
        </select>
      </div>

      <div className="history-list">
        {items.length === 0 && <EmptyState icon={Activity} title="Nada registrado ainda" hint="As tarefas e atividades desta empresa aparecem aqui." />}
        {items.map((it) => (
          <div key={it.key} className={`history-item ${it.task ? "clickable" : ""}`} onClick={it.task ? () => onOpenTask(it.task) : undefined}>
            <div className="history-date">{formatDateBR(it.date)}</div>
            <div className="history-body">
              <div className="history-head">
                <span className={`history-kind ${it.task ? "task" : "activity"}`}>{it.kind}</span>
                <span className="history-title">{it.title}</span>
                {it.task && <StatusPill status={it.task.status} />}
              </div>
              {it.desc && <div className="history-desc">{it.desc}</div>}
              {it.exec && <div className="history-desc"><b>Execução:</b> {it.exec}</div>}
              {it.notes && <div className="history-desc"><b>Observações:</b> {it.notes}</div>}
              {it.chips.length > 0 && <div className="task-row-meta">{it.chips.map((c, i) => <span key={i} className="meta-chip">{c}</span>)}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PeopleView({ people, companies, tasks, activities, onNew, onEdit, onSelect }) {
  const [sortBy, setSortBy] = usePersistedSort("people", "recent");
  const sorted = sortEntities(people, sortBy);
  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>Pessoas</h1>
          <p className="view-sub">{people.length} cadastradas</p>
        </div>
        <button className="btn btn-primary" onClick={onNew}><Plus size={14} /> Nova pessoa</button>
      </div>
      <div className="filters-bar">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} title="Ordenar por">
          <option value="recent">Mais recentes primeiro</option>
          <option value="name">Nome (A-Z)</option>
        </select>
      </div>
      <div className="grid-cards">
        {people.length === 0 && <EmptyState icon={Users} title="Nenhuma pessoa cadastrada" hint="Cadastre os contatos que aparecem na sua rotina — clientes, fornecedores, colegas." />}
        {sorted.map((p) => {
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
                  {p.phone && <span><PhoneLink phone={p.phone} /></span>}
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
   RESUMO COMERCIAL (campo inline, editável, sempre visível no
   topo do perfil da empresa)
   ============================================================ */

function CommercialSummaryBox({ companyId, value, onSave }) {
  const [text, setText] = useState(value);
  const [dirty, setDirty] = useState(false);

  function commit() {
    if (!dirty) return;
    onSave(companyId, text);
    setDirty(false);
  }

  return (
    <div className="commercial-summary-box">
      <div className="commercial-summary-head">
        <Sparkles size={13} /> Resumo Comercial
        {dirty && <span className="commercial-summary-dirty">alterações não salvas</span>}
      </div>
      <textarea
        rows={2}
        placeholder="Panorama comercial atual desta conta — status, próximos passos, pontos de atenção…"
        value={text}
        onChange={(e) => { setText(e.target.value); setDirty(true); }}
        onBlur={commit}
        onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.target.blur(); } }}
      />
    </div>
  );
}

/* ============================================================
   ENTITY PROFILE (empresa ou pessoa — resumo + histórico)
   ============================================================ */

function EntityProfile({ target, companies, people, tasks, activities, onEdit, onOpenTask, onOpenRelated, onOpenSection, onNewTask, onNewActivity, onQuickComplete, onUpdateCommercialSummary }) {
  const isCompany = target.type === "company";
  const entity = isCompany ? companies.find((c) => c.id === target.id) : people.find((p) => p.id === target.id);

  if (!entity) {
    return (
      <div className="view">
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

      {isCompany && (entity.entityType || entity.crmStage || entity.classification || entity.origin) && (
        <div className="profile-crm-row">
          {entity.entityType && <EntityTypeBadge type={entity.entityType} />}
          <CrmStageBadge stage={entity.crmStage} />
          <ClassificationBadge classification={entity.classification} />
          {entity.origin && <span className="meta-chip"><Tag size={11} /> {entity.origin}</span>}
        </div>
      )}

      {isCompany && (entity.plan || entity.monthlyValue != null || entity.customerSince || entity.contractEnd || entity.contractNumber || entity.potential || entity.customerStatus || (entity.modules || []).length > 0) && (
        <div className="profile-crm-row">
          {entity.customerStatus && <ColorBadge label={entity.customerStatus} color={CUSTOMER_STATUS_COLOR[entity.customerStatus]} />}
          {entity.potential && <ColorBadge label={`Potencial ${entity.potential}`} color={POTENTIAL_COLOR[entity.potential]} />}
          {entity.plan && <span className="meta-chip">{entity.plan}</span>}
          {entity.monthlyValue != null && <span className="meta-chip">{formatMoney(entity.monthlyValue)}/mês</span>}
          {entity.contractNumber && <span className="meta-chip">Contrato nº {entity.contractNumber}</span>}
          {entity.customerSince && <span className="meta-chip">Início do contrato: {formatDateBR(entity.customerSince)}</span>}
          {entity.contractEnd && <span className="meta-chip">Fim do contrato: {formatDateBR(entity.contractEnd)}</span>}
          {(entity.modules || []).length > 0 && <span className="meta-chip">{entity.modules.length} módulo(s): {entity.modules.join(", ")}</span>}
        </div>
      )}

      {isCompany && entity.lostReason && (
        <div className="notes-box"><b>Motivo da perda:</b>&nbsp;{entity.lostReason}</div>
      )}

      {isCompany && (
        <CommercialSummaryBox
          key={entity.id}
          companyId={entity.id}
          value={entity.commercialSummary || ""}
          onSave={onUpdateCommercialSummary}
        />
      )}

      {!isCompany && relatedCompany && (
        <div className="profile-company-chip" onClick={() => onOpenRelated("company", relatedCompany.id)}>
          <Building2 size={12} /> {relatedCompany.name}
        </div>
      )}
      {!isCompany && (entity.email || entity.phone) && (
        <div className="profile-contact-row">
          {entity.email && <span><Mail size={12} /> {entity.email}</span>}
          {entity.phone && <span><Phone size={12} /> <PhoneLink phone={entity.phone} /></span>}
        </div>
      )}
      {isCompany && (entity.razaoSocial || entity.cnpj || entity.mainActivity) && (
        <div className="profile-contact-row">
          {entity.razaoSocial && <span>{entity.razaoSocial}</span>}
          {entity.cnpj && <span>CNPJ {entity.cnpj}</span>}
          {entity.mainActivity && <span>Atividade: {entity.mainActivity}</span>}
        </div>
      )}
      {isCompany && (entity.phone || entity.address || entity.location) && (
        <div className="profile-contact-row">
          {entity.phone && <span><Phone size={12} /> <PhoneLink phone={entity.phone} /></span>}
          {entity.address && <span><MapPin size={12} /> {entity.address}</span>}
          {entity.location && <span><a href={entity.location} target="_blank" rel="noreferrer">Ver localização</a></span>}
        </div>
      )}
      {isCompany && entity.contactPersonId && people.find((p) => p.id === entity.contactPersonId) && (
        <div className="profile-company-chip" onClick={() => onOpenRelated("person", entity.contactPersonId)}>
          <Users size={12} /> Contato: {people.find((p) => p.id === entity.contactPersonId).name}
        </div>
      )}
      {isCompany && entity.notes && (
        <div className="notes-box">{entity.notes}</div>
      )}

      <div className="profile-quick-actions">
        <button className="btn btn-primary btn-sm" onClick={onNewTask}><Plus size={13} /> Nova tarefa</button>
        <button className="btn btn-ghost btn-sm" onClick={onNewActivity}><Activity size={13} /> Nova atividade</button>
        <button className="btn btn-ghost btn-sm" onClick={() => onOpenSection("all")}>Ver todas as tarefas</button>
        <button className="btn btn-ghost btn-sm" onClick={() => onOpenSection("activities")}>Ver todas as atividades</button>
      </div>

      <div className="stat-grid profile-stats">
        <div className="stat-card stat-card-link" onClick={() => onOpenSection("open")} title="Ver tarefas abertas"><div className="stat-value">{openTasks.length}</div><div className="stat-label">Tarefas abertas</div></div>
        <div className="stat-card stat-card-link tone-danger" onClick={() => onOpenSection("overdue")} title="Ver tarefas atrasadas"><div className="stat-value">{overdueCount}</div><div className="stat-label">Atrasadas</div></div>
        <div className="stat-card stat-card-link tone-success" onClick={() => onOpenSection("done")} title="Ver tarefas concluídas"><div className="stat-value">{doneCount}</div><div className="stat-label">Concluídas</div></div>
        <div className="stat-card stat-card-link" onClick={() => onOpenSection("activities")} title="Ver atividades"><div className="stat-value">{entityActivities.length}</div><div className="stat-label">Atividades</div></div>
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
                <div className="timeline-text">{ev.data.interactionType ? `${ev.data.interactionType}: ` : "Atividade: "}{ev.data.title}</div>
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
  const [sortBy, setSortBy] = usePersistedSort("recurring", "next");
  const sorted = sortRecurring(recurring, sortBy);
  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>Recorrentes</h1>
          <p className="view-sub">Tarefas que se repetem automaticamente ao serem concluídas.</p>
        </div>
        <button className="btn btn-primary" onClick={onNew}><Plus size={14} /> Nova recorrência</button>
      </div>
      <div className="filters-bar">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} title="Ordenar por">
          <option value="next">Próxima ocorrência</option>
          <option value="title">Nome (A-Z)</option>
        </select>
      </div>
      <div className="task-list">
        {recurring.length === 0 && <EmptyState icon={Repeat} title="Nenhuma recorrência cadastrada" hint='Ex: "Enviar relatório semanal", toda sexta-feira.' />}
        {sorted.map((r) => {
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

function SettingsView({ categories, onAdd, onRemove, notificationsEnabled, notificationPermission, onToggleNotifications, theme, onToggleTheme }) {
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

      <div className="settings-section-title">Aparência</div>
      <div className="side-card">
        <div className="settings-notif-row">
          <div>
            <div className="settings-notif-label">Tema do sistema</div>
            <div className="side-row-sub">{theme === "dark" ? "Escuro" : "Claro"}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onToggleTheme}>
            {theme === "dark" ? <><Sun size={13} /> Usar tema claro</> : <><Moon size={13} /> Usar tema escuro</>}
          </button>
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

function SearchResults({ results, companies, people, onOpenTask, onOpenCompany, onOpenPerson, onClose }) {
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
              <div key={c.id} className="search-item" onClick={() => onOpenCompany(c)}><Building2 size={13} /> {c.name}</div>
            ))}
          </div>
        )}
        {results.people.length > 0 && (
          <div className="search-group">
            <div className="search-group-title">Pessoas</div>
            {results.people.map((p) => (
              <div key={p.id} className="search-item" onClick={() => onOpenPerson(p)}><Users size={13} /> {p.name}</div>
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

function TaskDetail({ task, allTasks, activities, companies, people, categories, onClose, onPatch, onComplete, onReschedule, onDelete, onLink, onCreateFollowUp, onOpenTask, onCreateCompany, onCreatePerson }) {
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
    <div className="drawer-overlay">
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div className="drawer-head-top">
            <StatusPill status={task.status} />
            <PriorityBadge priority={task.priority} />
            <div className="spacer" />
            <IconBtn icon={editing ? Check : Edit2} onClick={() => editing ? saveEdit() : setEditing(true)} title={editing ? "Salvar" : "Editar"} />
            <IconBtn icon={Trash2} danger onClick={() => onDelete(task.id)} title="Excluir" />
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
                    {STATUSES.filter((s) => s !== "Concluída" || task.status === "Concluída").map((s) => <option key={s}>{s}</option>)}
                  </select>
                  {task.status !== "Concluída" && (
                    <span className="field-hint">Para concluir, use o botão "Concluir" (pede a descrição da execução).</span>
                  )}
                </label>
                <label>Categoria
                  <select value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="">—</option>
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label>Subcategoria<input value={form.subcategory || ""} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} /></label>
                <EntityPicker label="Empresa" options={companies} value={form.companyId} onChange={(id) => { const keepPerson = people.find((p) => p.id === form.personId)?.companyId === id; setForm({ ...form, companyId: id, personId: keepPerson ? form.personId : null }); }} onCreate={onCreateCompany} />
                <EntityPicker label="Pessoa" options={form.companyId ? people.filter((p) => p.companyId === form.companyId) : people} value={form.personId} onChange={(id) => setForm({ ...form, personId: id })} onCreate={(name) => onCreatePerson(name, form.companyId)} placeholder={form.companyId ? "Selecionar…" : "Selecione uma empresa primeiro (opcional)"} />
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
      <div
        className="entity-picker-box"
        tabIndex={0}
        role="button"
        aria-haspopup="listbox"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); }
        }}
      >
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
   FORMULÁRIO EM PÁGINA CHEIA (casca comum com abas)
   ============================================================ */

function FormPageShell({ title, tabs, tab, setTab, onClose, onSave, children }) {
  return (
    <div className="form-page">
      <div className="form-page-bar">
        <button type="button" className="form-page-back" onClick={onClose} title="Voltar"><ChevronLeft size={22} /></button>
        <div className="form-page-tabs">
          {tabs.length > 1 && tabs.map(([id, label]) => (
            <button key={id} type="button" className={`form-page-tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <button type="button" className="btn btn-primary" onClick={onSave}>Salvar</button>
      </div>
      <div className="form-page-body">
        <div className="form-page-card edit-form">{children}</div>
      </div>
    </div>
  );
}

/* ============================================================
   TASK FORM MODAL
   ============================================================ */

function TaskFormModal({ prefill, companies, people, categories, onClose, onSubmit, onCreateCompany, onCreatePerson }) {
  const [attempted, setAttempted] = useState(false);
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

  const taskTitle = isFromActivity ? "Gerar tarefa a partir da atividade" : prefill && prefill.inInbox ? "Processar item da caixa de entrada" : "Nova tarefa";
  function save(e) {
    setAttempted(true);
    if (!form.title.trim()) return;
    if (wantsNext && !nextForm.title.trim()) return;
    submit(e);
  }

  return (
    <FormPageShell title={taskTitle} tabs={[]} tab="geral" setTab={() => {}} onClose={onClose} onSave={save}>
      <div className="form-page-section">INFORMAÇÕES</div>
      <label>Título<input autoFocus required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") save(e); }} /></label>
      {attempted && !form.title.trim() && <div className="field-error">Informe o título da tarefa.</div>}
      <label>Descrição<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <div className="edit-grid">
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
        <label>Prazo<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
        <label>Horário<input type="time" value={form.dueTime} onChange={(e) => setForm({ ...form, dueTime: e.target.value })} /></label>
      </div>

      <div className="form-page-section">VÍNCULOS</div>
      <div className="edit-grid">
        <EntityPicker label="Empresa" options={companies} value={form.companyId} onChange={(id) => setForm({ ...form, companyId: id, personId: people.find((p) => p.id === form.personId)?.companyId === id ? form.personId : null })} onCreate={onCreateCompany} />
        <EntityPicker label="Pessoa" options={form.companyId ? people.filter((p) => p.companyId === form.companyId) : people} value={form.personId} onChange={(id) => setForm({ ...form, personId: id })} onCreate={(name) => onCreatePerson(name, form.companyId)} placeholder={form.companyId ? "Selecionar…" : "Selecione uma empresa primeiro (opcional)"} />
      </div>

      <div className="form-page-section">OBSERVAÇÕES E ANEXOS</div>
      <label>Observações<textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
      <label>Anexos (link ou referência)<input value={form.attachmentsNote} onChange={(e) => setForm({ ...form, attachmentsNote: e.target.value })} /></label>

      <div className="next-step-toggle" onClick={() => setWantsNext((v) => !v)}>
        <div className={`toggle-box ${wantsNext ? "on" : ""}`}>{wantsNext && <Check size={11} strokeWidth={3} />}</div>
        <span>Já criar o próximo passo, linkado a esta tarefa</span>
      </div>
      {wantsNext && (
        <div className="next-step-form">
          <label>Título do próximo passo
            <input placeholder='Ex: "Fazer follow-up com o cliente"' value={nextForm.title} onChange={(e) => setNextForm({ ...nextForm, title: e.target.value })} />
          </label>
          {attempted && !nextForm.title.trim() && <div className="field-error">Informe o título do próximo passo.</div>}
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
    </FormPageShell>
  );
}

/* ============================================================
   ACTIVITY FORM MODAL
   ============================================================ */

function ActivityFormModal({ prefill, editing, companies, people, categories, onClose, onSubmit, onCreateCompany, onCreatePerson }) {
  const [tab, setTab] = useState("geral");
  const [form, setForm] = useState({
    title: editing?.title || "",
    description: editing?.description || "",
    category: editing?.category || categories[0] || "",
    interactionType: editing?.interactionType || (prefill && prefill.interactionType) || "",
    companyId: editing ? (editing.companyId ?? null) : ((prefill && prefill.companyId) || null),
    personId: editing ? (editing.personId ?? null) : ((prefill && prefill.personId) || null),
  });
  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit(form);
  }
  function save(e) {
    if (!form.title.trim()) { setTab("geral"); return; }
    submit(e);
  }
  return (
    <FormPageShell
      title={editing ? "Editar atividade" : "Nova atividade"}
      tabs={[["geral", "GERAL"], ["vinculos", "VÍNCULOS"]]}
      tab={tab} setTab={setTab} onClose={onClose} onSave={save}
    >
      {tab === "geral" && (
        <>
          <div className="form-page-section">INFORMAÇÕES</div>
          <label>O que aconteceu?<input autoFocus required placeholder='Ex: "Cliente respondeu pedindo para retornar na sexta"' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") save(e); }} /></label>
          <label>Detalhes<textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="edit-grid">
            <label>Categoria
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">—</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>Tipo de interação
              <select value={form.interactionType} onChange={(e) => setForm({ ...form, interactionType: e.target.value })}>
                <option value="">—</option>
                {INTERACTION_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </div>
        </>
      )}
      {tab === "vinculos" && (
        <>
          <div className="form-page-section">VÍNCULOS</div>
          <div className="edit-grid">
            <EntityPicker label="Empresa" options={companies} value={form.companyId} onChange={(id) => setForm({ ...form, companyId: id, personId: people.find((p) => p.id === form.personId)?.companyId === id ? form.personId : null })} onCreate={onCreateCompany} />
            <EntityPicker label="Pessoa" options={form.companyId ? people.filter((p) => p.companyId === form.companyId) : people} value={form.personId} onChange={(id) => setForm({ ...form, personId: id })} onCreate={(name) => onCreatePerson(name, form.companyId)} placeholder={form.companyId ? "Selecionar…" : "Selecione uma empresa primeiro (opcional)"} />
          </div>
        </>
      )}
    </FormPageShell>
  );
}

/* ============================================================
   PERSON FORM MODAL
   ============================================================ */

function PersonFormModal({ companies, editing, onClose, onSubmit, onCreateCompany }) {
  const [tab, setTab] = useState("geral");
  const [form, setForm] = useState({
    name: editing?.name || "", role: editing?.role || "", companyId: editing?.companyId || null,
    email: editing?.email || "", phone: editing?.phone || "", notes: editing?.notes || "",
  });

  function submit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  }

  function save(e) {
    if (!form.name.trim()) { setTab("geral"); return; }
    submit(e);
  }
  return (
    <FormPageShell
      title={editing ? "Editar pessoa" : "Nova pessoa"}
      tabs={[["geral", "GERAL"], ["contato", "CONTATO"]]}
      tab={tab} setTab={setTab} onClose={onClose} onSave={save}
    >
      {tab === "geral" && (
        <>
          <div className="form-page-section">INFORMAÇÕES</div>
          <div className="edit-grid">
            <label>Nome<input autoFocus required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") save(e); }} /></label>
            <label>Cargo / função na instituição<input placeholder="Ex: Gerente Comercial, Sócio, Financeiro…" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></label>
            <EntityPicker label="Empresa" options={companies} value={form.companyId} onChange={(id) => setForm({ ...form, companyId: id })} onCreate={onCreateCompany} />
          </div>
          <label>Observações<textarea rows={6} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        </>
      )}
      {tab === "contato" && (
        <>
          <div className="form-page-section">CONTATO</div>
          <div className="edit-grid">
            <label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label>Telefone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          </div>
        </>
      )}
    </FormPageShell>
  );
}

/* ============================================================
   COMPANY FORM MODAL
   ============================================================ */

/* ============================================================
   CONSULTA DE CNPJ E CEP (BrasilAPI / ViaCEP)
   ============================================================ */

const digitsOf = (v) => (v || "").toString().replace(/\D/g, "");
const formatCnpj = (d) => d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
const formatCep = (d) => d.replace(/^(\d{5})(\d{3})$/, "$1-$2");

function isValidCnpj(d) {
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len) => {
    let sum = 0, pos = len - 7;
    for (let i = len; i >= 1; i--) { sum += Number(d[len - i]) * pos--; if (pos < 2) pos = 9; }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

// telefone com 10 ou 11 dígitos recebe o 55 do Brasil; já com 12 ou 13 segue como está
function whatsappUrl(phone) {
  let d = digitsOf(phone);
  if (d.length < 10) return null;
  if (d.length <= 11) d = "55" + d;
  return `https://wa.me/${d}`;
}
function PhoneLink({ phone }) {
  const url = whatsappUrl(phone);
  if (!url) return <>{phone}</>;
  return <a className="phone-link" href={url} target="_blank" rel="noreferrer" title="Abrir no WhatsApp" onClick={(e) => e.stopPropagation()}>{phone}</a>;
}

const UF_LIST = [["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceará"],
  ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"],
  ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"],
  ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"]];
const UFS = UF_LIST.map(([u]) => u);

// Cidades de cada UF vêm do IBGE (uma vez por estado; depois ficam guardadas no navegador)
const cityCache = {};
async function loadCities(uf) {
  if (!uf) return [];
  if (cityCache[uf]) return cityCache[uf];
  try {
    const saved = localStorage.getItem("rotina-cities-" + uf);
    if (saved) { cityCache[uf] = JSON.parse(saved); return cityCache[uf]; }
  } catch (e) { /* sem armazenamento: segue para a consulta */ }
  const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
  if (!res.ok) throw new Error("Não foi possível carregar as cidades.");
  const list = (await res.json()).map((m) => m.nome);
  cityCache[uf] = list;
  try { localStorage.setItem("rotina-cities-" + uf, JSON.stringify(list)); } catch (e) { /* ignora */ }
  return list;
}
// ajusta "JATAI" (da Receita) para o nome oficial "Jataí" do IBGE; se não achar, mantém como veio
async function canonicalCity(uf, name) {
  if (!uf || !name) return name || "";
  try {
    const list = await loadCities(uf);
    return list.find((c) => normText(c) === normText(name)) || name;
  } catch (e) { return name; }
}

const SMALL_WORDS = new Set(["de", "da", "do", "das", "dos", "e"]);
function titleCaseBR(str) {
  return str.toLowerCase().split(/\s+/).map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
}
// a Receita devolve endereço em MAIÚSCULAS; só ajustamos quando vem tudo em maiúsculas
const niceCase = (str) => (str && str === str.toUpperCase() ? titleCaseBR(str) : (str || ""));

async function fetchCnpjData(d) {
  let res;
  try {
    res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${d}`);
  } catch (e) {
    throw new Error("Sem conexão com o serviço de consulta. Confira a internet.");
  }
  if (res.status === 404) throw new Error("CNPJ não encontrado na Receita.");
  if (!res.ok) throw new Error("O serviço de consulta está indisponível agora. Tente de novo em instantes.");
  const x = await res.json();
  const street = [x.descricao_tipo_de_logradouro, x.logradouro].filter(Boolean).join(" ");
  return {
    razaoSocial: x.razao_social || "", fantasia: x.nome_fantasia || "",
    cep: digitsOf(x.cep), uf: (x.uf || "").toUpperCase(), city: niceCase(x.municipio), neighborhood: niceCase(x.bairro),
    street: niceCase(street), addressNumber: x.numero || "", complement: niceCase(x.complemento),
    situation: x.descricao_situacao_cadastral || "", cnae: x.cnae_fiscal_descricao || "",
  };
}

async function fetchCepData(d) {
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${d}`);
    if (r.ok) {
      const x = await r.json();
      return { uf: (x.state || "").toUpperCase(), city: niceCase(x.city), neighborhood: niceCase(x.neighborhood), street: niceCase(x.street) };
    }
    if (r.status !== 404) throw new Error("brasilapi");
  } catch (e) { /* tenta o ViaCEP */ }
  let r2;
  try {
    r2 = await fetch(`https://viacep.com.br/ws/${d}/json/`);
  } catch (e) {
    throw new Error("Sem conexão com o serviço de consulta. Confira a internet.");
  }
  if (!r2.ok) throw new Error("O serviço de consulta de CEP está indisponível agora.");
  const x2 = await r2.json();
  if (x2.erro) throw new Error("CEP não encontrado.");
  return { uf: (x2.uf || "").toUpperCase(), city: niceCase(x2.localidade), neighborhood: niceCase(x2.bairro), street: niceCase(x2.logradouro) };
}

function CompanyFormPage({ editing, people, onClose, onSubmit, onCreatePerson, initialTab }) {
  const [tab, setTab] = useState(initialTab || "geral");
  const [form, setForm] = useState({
    name: editing?.name || "", razaoSocial: editing?.razaoSocial || "", cnpj: editing?.cnpj || "", mainActivity: editing?.mainActivity || "",
    segment: editing?.segment || "", city: editing?.city || "", uf: editing?.uf || "",
    cep: editing?.cep || "",
    street: editing?.street || (editing && !editing.street ? editing.address || "" : ""),
    addressNumber: editing?.addressNumber || "", neighborhood: editing?.neighborhood || "",
    complement: editing?.complement || "",
    location: editing?.location || "", phone: editing?.phone || "",
    contactPersonId: editing?.contactPersonId || null,
    entityType: editing?.entityType || "", crmStage: editing?.crmStage || "", origin: editing?.origin || "",
    classification: editing?.classification || "",
    notes: editing?.notes || "",
    customerSince: editing?.customerSince || "", lastPurchase: editing?.lastPurchase || "",
    contractEnd: editing?.contractEnd || "", contractNumber: editing?.contractNumber || "", lostReason: editing?.lostReason || "",
    monthlyValue: editing?.monthlyValue != null ? String(editing.monthlyValue).replace(".", ",") : "",
    plan: editing?.plan || "", potential: editing?.potential || "", customerStatus: editing?.customerStatus || "",
    modules: Array.isArray(editing?.modules) ? editing.modules : [],
  });
  const linkedPeople = editing ? people.filter((p) => p.companyId === editing.id) : [];
  const [contactDrafts, setContactDrafts] = useState([]);
  const [contactForm, setContactForm] = useState({ name: "", role: "", phone: "", email: "" });
  const [peopleEdits, setPeopleEdits] = useState({});
  const personValue = (p, field) => (peopleEdits[p.id] && peopleEdits[p.id][field] !== undefined ? peopleEdits[p.id][field] : (p[field] || ""));
  function editPerson(p, field, value) {
    setPeopleEdits((e) => ({ ...e, [p.id]: { ...e[p.id], [field]: value } }));
  }

  const formRef = useRef(form);
  formRef.current = form;
  const [cityList, setCityList] = useState([]);
  const [cityStatus, setCityStatus] = useState("idle"); // idle | loading | ok | error
  useEffect(() => {
    let cancelled = false;
    if (!form.uf) { setCityList([]); setCityStatus("idle"); return undefined; }
    setCityStatus("loading");
    loadCities(form.uf)
      .then((list) => { if (!cancelled) { setCityList(list); setCityStatus("ok"); } })
      .catch(() => { if (!cancelled) { setCityList([]); setCityStatus("error"); } });
    return () => { cancelled = true; };
  }, [form.uf]);
  const lastLookup = useRef({ cnpj: "", cep: "" });
  const [lookup, setLookup] = useState({ cnpj: null, cep: null });
  const setLookupMsg = (key, status, msg) => setLookup((l) => ({ ...l, [key]: msg ? { status, msg } : null }));

  async function lookupCnpj(raw) {
    const d = digitsOf(raw);
    if (d.length !== 14) return setLookupMsg("cnpj", "error", "Digite os 14 números do CNPJ.");
    if (!isValidCnpj(d)) return setLookupMsg("cnpj", "error", "CNPJ inválido. Confira os números.");
    lastLookup.current.cnpj = d;
    setLookupMsg("cnpj", "loading", "Consultando a Receita…");
    try {
      const r = await fetchCnpjData(d);
      r.city = await canonicalCity(r.uf, r.city);
      const prev = formRef.current;
      const patch = { cnpj: formatCnpj(d) };
      const filled = [];
      const fill = (key, value, label) => {
        if (value && !(prev[key] || "").toString().trim()) { patch[key] = value; filled.push(label); }
      };
      fill("razaoSocial", r.razaoSocial, "Razão Social");
      fill("name", r.fantasia || r.razaoSocial, "Nome");
      fill("cep", r.cep ? formatCep(r.cep) : "", "CEP");
      fill("uf", r.uf, "UF");
      fill("city", r.city, "Cidade");
      fill("neighborhood", r.neighborhood, "Bairro");
      fill("street", r.street, "Rua");
      fill("addressNumber", r.addressNumber, "Nº");
      fill("complement", r.complement, "Complemento");
      fill("mainActivity", r.cnae, "Atividade principal");
      setForm((p) => ({ ...p, ...patch }));
      const info = [r.razaoSocial, r.situation && `situação: ${r.situation}`, r.cnae && `atividade: ${r.cnae}`].filter(Boolean).join(" · ");
      setLookupMsg("cnpj", "ok", `✓ ${info}. ${filled.length ? `Preenchido: ${filled.join(", ")}.` : "Os campos já preenchidos foram mantidos."}`);
    } catch (e) {
      setLookupMsg("cnpj", "error", e.message || "Não foi possível consultar o CNPJ.");
    }
  }

  async function lookupCep(raw) {
    const d = digitsOf(raw);
    if (d.length !== 8) return setLookupMsg("cep", "error", "Digite os 8 números do CEP.");
    lastLookup.current.cep = d;
    setLookupMsg("cep", "loading", "Consultando o CEP…");
    try {
      const r = await fetchCepData(d);
      r.city = await canonicalCity(r.uf, r.city);
      const patch = { cep: formatCep(d) };
      ["uf", "city", "neighborhood", "street"].forEach((k) => { if (r[k]) patch[k] = r[k]; });
      setForm((p) => ({ ...p, ...patch }));
      const where = [r.street, r.neighborhood, r.city && `${r.city}${r.uf ? " - " + r.uf : ""}`].filter(Boolean).join(", ");
      setLookupMsg("cep", "ok", `✓ ${where || "CEP encontrado."}`);
    } catch (e) {
      setLookupMsg("cep", "error", e.message || "Não foi possível consultar o CEP.");
    }
  }

  function addContactDraft() {
    if (!contactForm.name.trim()) return;
    setContactDrafts((d) => [...d, contactForm]);
    setContactForm({ name: "", role: "", phone: "", email: "" });
  }

  function submit() {
    if (!form.name.trim()) { setTab("geral"); return; }
    const address = [form.street, form.addressNumber, form.neighborhood, form.complement]
      .map((x) => (x || "").trim()).filter(Boolean).join(", ");
    const changedPeople = linkedPeople.filter((p) => peopleEdits[p.id]).map((p) => {
      const ed = peopleEdits[p.id];
      return { ...p, ...ed, name: ed.name !== undefined && ed.name.trim() ? ed.name : p.name };
    });
    onSubmit({ ...form, address, monthlyValue: parseMoney(form.monthlyValue) }, contactDrafts, changedPeople);
  }

  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const TABS = [["geral", "GERAL"], ["enderecos", "ENDEREÇOS"], ["carteira", "CARTEIRA"], ["contato", "CONTATO"]];
  const segmentCatalog = MODULES_BY_SEGMENT[form.segment];
  const moduleOptions = Array.from(new Set([...(segmentCatalog || ALL_MODULES), ...(form.modules || [])]));
  const opportunities = segmentCatalog ? segmentCatalog.filter((m) => !(form.modules || []).includes(m)) : null;
  const toggleModule = (m) => setForm((p) => ({
    ...p,
    modules: (p.modules || []).includes(m) ? p.modules.filter((x) => x !== m) : [...(p.modules || []), m],
  }));

  return (
    <div className="form-page">
      <div className="form-page-bar">
        <button type="button" className="form-page-back" onClick={onClose} title="Voltar"><ChevronLeft size={22} /></button>
        <div className="form-page-tabs">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" className={`form-page-tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <button type="button" className="btn btn-primary" onClick={submit}>Salvar</button>
      </div>

      <div className="form-page-body">
        <div className="form-page-card edit-form">
          {tab === "geral" && (
            <>
              <div className="form-page-section">INFORMAÇÕES</div>
              <div className="edit-grid">
                <label>Nome / Nome Fantasia *<input autoFocus value={form.name} onChange={f("name")} /></label>
                <label>Razão Social<input value={form.razaoSocial} onChange={f("razaoSocial")} /></label>
                <div className="field-with-lookup">
                  <label>CNPJ
                    <span className="input-with-btn">
                      <input
                        placeholder="00.000.000/0000-00" value={form.cnpj}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm({ ...form, cnpj: v });
                          const d = digitsOf(v);
                          if (d.length === 14 && d !== lastLookup.current.cnpj) lookupCnpj(v);
                          else if (d.length !== 14) setLookupMsg("cnpj", null);
                        }}
                      />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => lookupCnpj(form.cnpj)}>Buscar</button>
                    </span>
                  </label>
                  {lookup.cnpj && <div className={`lookup-msg ${lookup.cnpj.status}`}>{lookup.cnpj.msg}</div>}
                </div>
                <label>O que ele é?
                  <select value={form.entityType} onChange={f("entityType")}>
                    <option value="">—</option>
                    {ENTITY_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
                <label>Etapa do CRM
                  <select value={form.crmStage} onChange={f("crmStage")}>
                    <option value="">—</option>
                    {CRM_STAGES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </label>
                <label>Origem do cliente
                  <select value={form.origin} onChange={f("origin")}>
                    <option value="">—</option>
                    {ORIGINS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </label>
                <label>Segmento<input list="segment-options" placeholder="Ex: Mercado…" value={form.segment} onChange={f("segment")} /></label>
                <datalist id="segment-options">
                  {SEGMENTS.map((s) => <option key={s} value={s} />)}
                </datalist>
                <label>Atividade principal<input placeholder="O que a empresa faz (ex: Comércio varejista de mercadorias em geral)" value={form.mainActivity} onChange={f("mainActivity")} /></label>
                <label>Classificação do cliente
                  <select value={form.classification} onChange={f("classification")}>
                    <option value="">—</option>
                    {CLASSIFICATIONS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              <label>Observações<textarea rows={6} value={form.notes} onChange={f("notes")} /></label>
            </>
          )}

          {tab === "enderecos" && (
            <>
              <div className="form-page-section">ENDEREÇO</div>
              <div className="edit-grid">
                <div className="field-with-lookup">
                  <label>CEP
                    <span className="input-with-btn">
                      <input
                        value={form.cep}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm({ ...form, cep: v });
                          const d = digitsOf(v);
                          if (d.length === 8 && d !== lastLookup.current.cep) lookupCep(v);
                          else if (d.length !== 8) setLookupMsg("cep", null);
                        }}
                      />
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => lookupCep(form.cep)}>Buscar</button>
                    </span>
                  </label>
                  {lookup.cep && <div className={`lookup-msg ${lookup.cep.status}`}>{lookup.cep.msg}</div>}
                </div>
                <label>UF
                  <select value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value, city: "" })}>
                    <option value="">—</option>
                    {UF_LIST.map(([u, n]) => <option key={u} value={u}>{u} - {n}</option>)}
                    {form.uf && !UFS.includes(form.uf) && <option value={form.uf}>{form.uf}</option>}
                  </select>
                </label>
                {cityStatus === "error" ? (
                  <label>Cidade
                    <input value={form.city} onChange={f("city")} placeholder="Digite a cidade" />
                    <span className="field-hint">Não consegui carregar a lista de cidades. Digite o nome.</span>
                  </label>
                ) : (
                  <label>Cidade
                    <select value={form.city} onChange={f("city")} disabled={!form.uf}>
                      <option value="">{!form.uf ? "Escolha a UF primeiro" : cityStatus === "loading" ? "Carregando…" : "—"}</option>
                      {cityList.map((c) => <option key={c} value={c}>{c}</option>)}
                      {form.city && !cityList.includes(form.city) && <option value={form.city}>{form.city}</option>}
                    </select>
                  </label>
                )}
                <label>Bairro<input value={form.neighborhood} onChange={f("neighborhood")} /></label>
                <label>Rua<input value={form.street} onChange={f("street")} /></label>
                <label>Nº<input value={form.addressNumber} onChange={f("addressNumber")} /></label>
              </div>
              <label>Complemento<input value={form.complement} onChange={f("complement")} /></label>
              <label>Localização (link do Google Maps, coordenadas ou referência de acesso)<input placeholder="Cole aqui o link do mapa" value={form.location} onChange={f("location")} /></label>
            </>
          )}

          {tab === "carteira" && (
            <>
              <div className="form-page-section">CONTRATO E CARTEIRA</div>
              <div className="edit-grid">
                <label>Início do contrato<input type="date" value={form.customerSince} onChange={f("customerSince")} /></label>
                <label>Fim do contrato<input type="date" value={form.contractEnd} onChange={f("contractEnd")} /></label>
                <label>Número do contrato<input value={form.contractNumber} onChange={f("contractNumber")} /></label>
                <label>Valor mensal / mensalidade (R$)<input placeholder="Ex: 350,00" value={form.monthlyValue} onChange={f("monthlyValue")} /></label>
                <label>Plano / solução contratada<input value={form.plan} onChange={f("plan")} /></label>
                <label>Última compra<input type="date" value={form.lastPurchase} onChange={f("lastPurchase")} /></label>
                <label>Potencial
                  <select value={form.potential} onChange={f("potential")}>
                    <option value="">—</option>
                    {POTENTIALS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
                <label>Status
                  <select value={form.customerStatus} onChange={f("customerStatus")}>
                    <option value="">—</option>
                    {CUSTOMER_STATUSES.filter((st) => st !== "Inativo" || form.entityType === "Ex-cliente" || form.customerStatus === "Inativo").map((st) => <option key={st}>{st}</option>)}
                  </select>
                </label>
              </div>
              {(form.entityType === "Ex-cliente" || form.lostReason) && (
                <label>Motivo da perda<textarea rows={3} value={form.lostReason} onChange={f("lostReason")} placeholder="Por que o cliente saiu?" /></label>
              )}

              <div className="form-page-section">MÓDULOS CONTRATADOS</div>
              <div className="module-grid">
                {moduleOptions.map((m) => (
                  <label key={m} className="filter-check module-check">
                    <input type="checkbox" checked={(form.modules || []).includes(m)} onChange={() => toggleModule(m)} /> {m}
                  </label>
                ))}
              </div>
              {segmentCatalog ? (
                <div className="next-step-hint">
                  Oportunidades em {form.segment} (módulos ainda não contratados): <b>{opportunities.length ? opportunities.join(", ") : "nenhuma, o cliente já usa todos"}</b>
                </div>
              ) : (
                <div className="next-step-hint">
                  {form.segment ? `A matriz de oportunidades de "${form.segment}" ainda não foi definida.` : "Escolha o segmento na guia Geral para ver as oportunidades."} Os módulos acima são uma lista geral.
                </div>
              )}
            </>
          )}

          {tab === "contato" && (
            <>
              <div className="form-page-section">PESSOAS NESSA EMPRESA</div>

              {editing && form.phone && (
                <div className="legacy-phone-note">
                  <span>Esta empresa tem um telefone no cadastro antigo: <b>{form.phone}</b></span>
                  <button
                    type="button" className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setContactDrafts((d) => [...d, { name: "Telefone da empresa", role: "", phone: form.phone, email: "" }]);
                      setForm({ ...form, phone: "" });
                    }}
                  >Transformar em contato</button>
                </div>
              )}

              {linkedPeople.length === 0 && contactDrafts.length === 0 && <div className="side-empty">Nenhum contato ainda. Adicione abaixo.</div>}
              {linkedPeople.map((p) => (
                <div key={p.id} className="contact-add existing">
                  <input value={personValue(p, "name")} onChange={(e) => editPerson(p, "name", e.target.value)} placeholder="Descrição / nome" />
                  <input value={personValue(p, "role")} onChange={(e) => editPerson(p, "role", e.target.value)} placeholder="Cargo / função" />
                  <input value={personValue(p, "phone")} onChange={(e) => editPerson(p, "phone", e.target.value)} placeholder="Telefone / WhatsApp" />
                  <input value={personValue(p, "email")} onChange={(e) => editPerson(p, "email", e.target.value)} placeholder="E-mail" />
                  <span>
                    {whatsappUrl(personValue(p, "phone")) && (
                      <a className="icon-btn" href={whatsappUrl(personValue(p, "phone"))} target="_blank" rel="noreferrer" title="Abrir no WhatsApp"><MessageCircle size={14} /></a>
                    )}
                  </span>
                </div>
              ))}
              {contactDrafts.map((c, i) => (
                <div key={i} className="contact-row draft">
                  <b>{c.name}</b><span>{c.role}</span><span><PhoneLink phone={c.phone} /></span><span>{c.email}</span>
                  <X size={14} onClick={() => setContactDrafts((d) => d.filter((_, j) => j !== i))} />
                </div>
              ))}

              <div className="contact-add">
                <input placeholder="Descrição / nome (ex: Loja, Financeiro, João)" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
                <input placeholder="Cargo / função" value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })} />
                <input placeholder="Telefone / WhatsApp" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
                <input placeholder="E-mail" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                <button type="button" className="btn btn-primary btn-sm" onClick={addContactDraft}><Plus size={13} /> Adicionar</button>
              </div>
              <div className="next-step-hint">Cada linha é salva na tela Pessoas, vinculada a esta empresa, quando você clicar em Salvar. Pode ser uma pessoa ou só um ponto de contato, como o fixo da loja.</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   RECURRING FORM MODAL
   ============================================================ */

function RecurringFormModal({ editing, companies, people, categories, onClose, onSubmit, onCreateCompany, onCreatePerson }) {
  const [tab, setTab] = useState("geral");
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
  function save(e) {
    if (!form.title.trim()) { setTab("geral"); return; }
    submit(e);
  }
  return (
    <FormPageShell
      title={editing ? "Editar recorrência" : "Nova tarefa recorrente"}
      tabs={[["geral", "GERAL"], ["repeticao", "REPETIÇÃO"]]}
      tab={tab} setTab={setTab} onClose={onClose} onSave={save}
    >
      {tab === "geral" && (
        <>
          <div className="form-page-section">INFORMAÇÕES</div>
          <label>Título<input autoFocus required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") save(e); }} /></label>
          <label>Descrição<textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="edit-grid">
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
          <div className="form-page-section">VÍNCULOS</div>
          <div className="edit-grid">
            <EntityPicker label="Empresa" options={companies} value={form.companyId} onChange={(id) => setForm({ ...form, companyId: id, personId: people.find((p) => p.id === form.personId)?.companyId === id ? form.personId : null })} onCreate={onCreateCompany} />
            <EntityPicker label="Pessoa" options={form.companyId ? people.filter((p) => p.companyId === form.companyId) : people} value={form.personId} onChange={(id) => setForm({ ...form, personId: id })} onCreate={(name) => onCreatePerson(name, form.companyId)} placeholder={form.companyId ? "Selecionar…" : "Selecione uma empresa primeiro (opcional)"} />
          </div>
        </>
      )}
      {tab === "repeticao" && (
        <>
          <div className="form-page-section">REPETIÇÃO</div>
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
          </div>
          {editing && (
            <div className="next-step-hint">Editar aqui muda o modelo da recorrência e a próxima geração — tarefas já geradas anteriormente não são alteradas.</div>
          )}
        </>
      )}
    </FormPageShell>
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
    <div className="modal-overlay">
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
   ADMIN PASSWORD MODAL (exigido para qualquer exclusão)
   ============================================================ */

function AdminPasswordModal({ message, onCancel, onConfirm }) {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (pwd === ADMIN_DELETE_PASSWORD) {
      onConfirm();
    } else {
      setError("Senha incorreta.");
      setPwd("");
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Confirmar exclusão</h3>
          <X size={16} onClick={onCancel} />
        </div>
        <div className="modal-body">
          <div className="complete-task-title">{message}</div>
          <label>
            <span>Senha de administrador</span>
            <input
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => { setPwd(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="Digite a senha para confirmar"
            />
          </label>
          {error && <div className="field-error">{error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={submit}>
              <Trash2 size={13} /> Excluir
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
        color-scheme: light;
        --ink: #1C2230;
        --ink-soft: #545E70;
        --bg: #F5F6F9;
        --panel: #FFFFFF;
        --border: #EDEFF3;
        --accent: #237CC0;
        --accent-soft: #237CC014;
        --brand-blue: #F08516;
        --brand-blue-soft: #F0851614;
        --danger: #D64545;
        --today: #237CC0;
        --tomorrow: #C9A227;
        --next: #F08516;
        --hover: rgba(28,34,48,0.045);
        --input-bg: #FFFFFF;
        --radius: 14px;
        --sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        --mono: var(--sans);
        --display: 'Sora', 'Inter', sans-serif;
        --shadow-card: 0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.07);
        --shadow-card-hover: 0 4px 10px rgba(16,24,40,0.07), 0 10px 22px rgba(16,24,40,0.10);
      }
      [data-theme="dark"] {
        color-scheme: dark;
        --ink: #E7E9EF;
        --ink-soft: #9AA3B5;
        --bg: #12151C;
        --panel: #1B1F29;
        --border: #2A2F3B;
        --accent: #4B9FE0;
        --accent-soft: #4B9FE01F;
        --brand-blue: #F08516;
        --brand-blue-soft: #F0851622;
        --danger: #E36664;
        --today: #4B9FE0;
        --tomorrow: #D8BC53;
        --next: #F08516;
        --hover: rgba(255,255,255,0.05);
        --input-bg: #12151C;
        --shadow-card: 0 1px 2px rgba(0,0,0,0.3), 0 4px 14px rgba(0,0,0,0.35);
        --shadow-card-hover: 0 4px 10px rgba(0,0,0,0.35), 0 10px 24px rgba(0,0,0,0.4);
      }
      [data-theme="dark"] .app-root img { opacity: 0.94; }
      * { box-sizing: border-box; }
      .side-card, .entity-card, .stat-card, .activity-card, .kanban-card, .task-list, .section,
      .inbox-list, .commercial-summary-box {
        box-shadow: var(--shadow-card);
      }
      .kanban-card { transition: transform .15s ease, box-shadow .15s ease; }
      .kanban-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-card-hover); }
      .stat-card, .activity-card { transition: box-shadow .15s ease; }
      .stat-card:hover, .activity-card:hover { box-shadow: var(--shadow-card-hover); }
      input, select, textarea { background: var(--input-bg); color: var(--ink); font-family: inherit; }
      input::placeholder, textarea::placeholder { color: var(--ink-soft); opacity: 0.7; }
      .app-root { display: flex; min-height: 100vh; background: var(--bg); color: var(--ink); font-family: var(--sans); font-size: 14.5px; }
      .loading-root { align-items: center; justify-content: center; }
      .loading-box { color: var(--ink-soft); }

      /* Sidebar */
      .sidebar { width: 220px; flex-shrink: 0; background: var(--panel); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 18px 12px; }
      .brand { display: flex; align-items: center; gap: 10px; padding: 4px 8px 20px; }
      .brand-mark { width: 32px; height: 32px; border-radius: 7px; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .brand-mark img { width: 100%; height: 100%; object-fit: cover; }
      .brand-title { font-family: var(--display); font-weight: 600; font-size: 13.5px; line-height: 1.2; }
      .brand-sub { color: var(--ink-soft); font-size: 11px; }
      .theme-toggle { background: var(--bg); border: 1px solid var(--border); border-radius: 7px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: var(--ink-soft); cursor: pointer; flex-shrink: 0; }
      .theme-toggle:hover { color: var(--accent); border-color: var(--accent); }
      .nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
      .nav-item { position: relative; display: flex; align-items: center; gap: 10px; padding: 9px 10px; border: none; background: transparent; border-radius: 9px; cursor: pointer; color: var(--ink-soft); font-size: 13px; text-align: left; font-family: var(--sans); transition: background .1s ease; }
      .nav-item:hover { background: var(--hover); color: var(--ink); }
      .nav-item.active { background: var(--accent-soft); color: var(--accent); font-weight: 700; }
      .nav-item.active::before { content: ''; position: absolute; left: -12px; top: 50%; transform: translateY(-50%); width: 3px; height: 18px; background: var(--accent); border-radius: 0 3px 3px 0; }
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

      .content { padding: 30px 34px 60px; overflow-y: auto; }
      .view-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 26px; gap: 12px; }
      .view-header h1 { font-family: var(--display); font-size: 25px; margin: 0 0 4px; font-weight: 700; letter-spacing: -0.01em; }
      .view-sub { color: var(--ink-soft); font-size: 12.5px; margin: 0; }

      /* Buttons */
      .btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 10px; padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; font-family: var(--sans); white-space: nowrap; transition: transform .1s ease, box-shadow .15s ease; }
      .btn-primary:hover { transform: translateY(-1px); }
      .btn-primary { background: var(--accent); color: #fff; box-shadow: 0 1px 2px rgba(35,124,192,0.25); }
      .btn-primary:hover { background: #0C5A51; }
      .btn-ghost { background: var(--panel); color: var(--ink); border-color: var(--border); }
      .btn-ghost:hover { background: var(--bg); }
      .btn-danger { background: var(--danger); color: #fff; }
      .btn-danger:hover { background: #C23B3B; }
      .btn-sm { padding: 5px 9px; font-size: 11.5px; }
      .icon-btn { border: 1px solid var(--border); background: var(--panel); border-radius: 6px; padding: 5px 6px; cursor: pointer; color: var(--ink-soft); display: flex; }
      .icon-btn:hover { background: var(--bg); color: var(--ink); }
      .icon-btn.danger:hover { background: #FCE9E9; color: var(--danger); border-color: #F3C6C6; }

      /* Sections (rotina) */
      .rotina-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
      .rotina-stat { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; cursor: pointer; box-shadow: var(--shadow-card); transition: transform .15s ease, box-shadow .15s ease; text-align: left; font-family: var(--sans); color: var(--sc); }
      .rotina-stat:hover { transform: translateY(-2px); box-shadow: var(--shadow-card-hover); }
      .rotina-stat.active { outline: 2px solid var(--sc); outline-offset: -2px; }
      .rotina-stat-value { font-family: var(--display); font-size: 26px; font-weight: 700; color: var(--ink); }
      .rotina-stat-label { font-size: 11.5px; color: var(--sc); font-weight: 700; }
      .rotina-unified-list .task-row:first-child { border-top: none; }
      .row-tag { font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 20px; white-space: nowrap; flex-shrink: 0; }
      .rotina-grid { display: grid; grid-template-columns: 1fr 260px; gap: 24px; align-items: start; }
      .rotina-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
      .section { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
      .section-head { display: flex; align-items: center; gap: 8px; padding: 10px 14px; font-weight: 600; font-size: 12.5px; border-bottom: 1px solid var(--border); cursor: pointer; user-select: none; }
      .section-chevron { transition: transform .15s ease; color: var(--ink-soft); }
      .section-chevron.collapsed { transform: rotate(-90deg); }
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
      .task-row:hover { background: var(--hover); }
      .task-row.done .task-row-title { text-decoration: line-through; color: var(--ink-soft); }
      .check-circle { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid #C7CDD8; background: var(--panel); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; color: #fff; }
      .check-circle.checked { background: var(--accent); border-color: var(--accent); }
      .task-row-main { flex: 1; min-width: 0; }
      .task-row-company { font-weight: 700; font-size: 11.5px; color: var(--accent); text-transform: uppercase; letter-spacing: .02em; margin-bottom: 2px; }
      .task-row-title { font-weight: 550; font-size: 13px; display: flex; align-items: center; gap: 6px; }
      .inline-icon { color: var(--ink-soft); }
      .task-row-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
      .meta-chip { display: inline-flex; align-items: center; gap: 4px; background: var(--bg); color: var(--ink-soft); font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 500; }
      .meta-overdue { background: #FCE9E9; color: var(--danger); }
      .row-chevron { color: #C7CDD8; flex-shrink: 0; }

      .pbadge { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; color: var(--pc); flex-shrink: 0; white-space: nowrap; }
      .pdot { width: 6px; height: 6px; border-radius: 50%; background: var(--pc); }
      .badge { font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
      .classification-badge { font-family: var(--mono); }

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
      .pill-filters { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
      .pill-row { display: flex; gap: 6px; flex-wrap: wrap; }
      .pill { border: 1px solid var(--border); background: var(--panel); color: var(--ink-soft); font-size: 11.5px; font-weight: 600; padding: 6px 13px; border-radius: 20px; cursor: pointer; font-family: var(--sans); transition: all .12s ease; }
      .pill:hover { border-color: var(--accent); color: var(--ink); }
      .pill.active { background: var(--accent); border-color: var(--accent); color: #fff; }
      .pill-dot { padding: 6px 11px; min-width: 32px; text-align: center; background: var(--panel); }
      .pill-select { border: 1px solid var(--border); border-radius: 20px; padding: 7px 14px; font-size: 11.5px; font-weight: 600; background: var(--panel); color: var(--ink-soft); font-family: var(--sans); cursor: pointer; }
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
      .entity-card { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease; }
      .entity-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-card-hover); }
      .entity-name { display: flex; align-items: center; gap: 7px; font-weight: 600; font-size: 13px; margin-bottom: 5px; }
      .entity-stats { font-size: 11px; color: var(--ink-soft); }
      .entity-role { font-size: 11.5px; color: var(--accent); font-weight: 600; margin-bottom: 4px; }
      .entity-crm-row { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
      .entity-contact { display: flex; flex-direction: column; gap: 3px; font-size: 10.5px; color: var(--ink-soft); font-family: var(--mono); margin-top: 6px; }
      .entity-contact span { display: inline-flex; align-items: center; gap: 4px; }
      .entity-card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
      .entity-card-head .entity-name { margin-bottom: 0; }
      .entity-card-headtext { flex: 1; min-width: 0; }
      .entity-avatar { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 700; font-size: 14px; flex-shrink: 0; }
      .entity-edit-btn { opacity: 0; flex-shrink: 0; margin-left: auto; }
      .entity-card:hover .entity-edit-btn { opacity: 1; }

      /* Formulário de empresa em página cheia */
      .form-page { position: fixed; inset: 0; z-index: 55; background: var(--bg); display: flex; flex-direction: column; }
      .form-page-bar { display: flex; align-items: center; gap: 12px; background: var(--panel); border-bottom: 1px solid var(--border); padding: 0 18px; flex-shrink: 0; }
      .form-page-back { background: transparent; border: none; color: var(--ink-soft); cursor: pointer; display: flex; align-items: center; padding: 6px; border-radius: 8px; }
      .form-page-back:hover { background: var(--hover); color: var(--ink); }
      .form-page-tabs { flex: 1; display: flex; justify-content: center; }
      .form-page-tab { flex: 0 1 280px; background: transparent; border: none; border-bottom: 3px solid transparent; padding: 16px 10px; font-size: 12px; font-weight: 700; letter-spacing: .06em; color: var(--ink-soft); cursor: pointer; font-family: var(--sans); }
      .form-page-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
      .form-page-body { flex: 1; overflow-y: auto; padding: 24px; }
      .form-page-card { max-width: 1100px; margin: 0 auto; background: var(--panel); border-radius: var(--radius); box-shadow: var(--shadow-card); padding: 24px 28px 30px; }
      .form-page-section { font-size: 12px; font-weight: 700; letter-spacing: .05em; color: var(--ink-soft); margin: 4px 0 14px; }
      .form-page-card .edit-grid { grid-template-columns: 1fr 1fr 1fr; gap: 0 16px; }
      .contact-row { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.4fr auto; gap: 10px; align-items: center; padding: 9px 12px; background: var(--bg); border-radius: 8px; margin-bottom: 6px; font-size: 12.5px; }
      .contact-row span { color: var(--ink-soft); }
      .contact-row svg { cursor: pointer; color: var(--ink-soft); }
      .contact-add { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.4fr auto; gap: 10px; margin-top: 10px; align-items: center; }
      .contact-add.existing { margin-top: 0; margin-bottom: 8px; }
      .legacy-phone-note { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: var(--brand-blue-soft); border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 12.5px; }
      .contact-add input { border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; font-size: 12.5px; }
      @media (max-width: 860px) {
        .form-page-card .edit-grid { grid-template-columns: 1fr; }
        .contact-row, .contact-add { grid-template-columns: 1fr; }
        .form-page-body { padding: 12px; }
      }

      .header-actions { display: flex; align-items: center; gap: 12px; }
      .company-list { background: var(--panel); border-radius: var(--radius); box-shadow: var(--shadow-card); overflow: hidden; }
      .company-list-head, .company-row { display: grid; grid-template-columns: minmax(220px, 1.6fr) 1fr 1fr 2.2fr auto; gap: 16px; align-items: center; padding: 14px 18px; text-align: center; }
      .company-list-head { background: #3A4152; color: #fff; font-size: 13px; font-weight: 600; padding-top: 11px; padding-bottom: 11px; }
      .company-list-head .left, .company-row-last { text-align: left; }
      .company-row { border-top: 1px solid var(--border); padding-top: 18px; padding-bottom: 18px; }
      .company-list-head + .company-row { border-top: none; }
      .company-row-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
      .company-row-sub { font-size: 11.5px; color: var(--ink-soft); margin-bottom: 4px; }
      .entity-crm-row.center { justify-content: center; }
      .company-row-cell { font-size: 13px; color: var(--ink); }
      .company-row-text { font-size: 13px; line-height: 1.45; }
      .company-row-desc { margin-top: 3px; font-size: 12.5px; line-height: 1.45; color: var(--ink-soft); white-space: pre-line; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      .company-row-kind { color: var(--ink-soft); font-size: 11.5px; }
      .company-row-actions { display: flex; gap: 6px; }
      .row-action { border: none; border-radius: 8px; width: 42px; height: 34px; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; }
      .row-action.edit { background: #2F6FD6; }
      .row-action.view { background: #7CB518; }
      .row-action:hover { filter: brightness(1.08); }
      .search-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
      .search-field { display: flex; align-items: center; gap: 8px; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 10px 14px; box-shadow: var(--shadow-card); color: var(--ink-soft); }
      .search-field input { border: none; outline: none; background: transparent; flex: 1; font-size: 14px; color: var(--ink); }
      .type-visibility { display: flex; align-items: center; gap: 18px; margin-bottom: 10px; font-size: 13px; color: var(--ink-soft); }
      .filter-check { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: var(--ink); cursor: pointer; }
      .filter-check input { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }
      .filter-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px; }
      .filter-btn { appearance: none; -webkit-appearance: none; background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; font-size: 12px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; text-align: center; text-align-last: center; color: var(--ink); box-shadow: var(--shadow-card); cursor: pointer; font-family: var(--sans); }
      .filter-btn:hover { border-color: var(--accent); }
      .filter-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
      .filter-field { position: relative; display: block; }
      .filter-field-label { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--ink-soft); pointer-events: none; z-index: 1; }
      .filter-field::after { content: "▾"; position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font-size: 11px; color: var(--ink-soft); pointer-events: none; }
      .filter-field .filter-btn { width: 100%; padding-left: 150px; padding-right: 32px; text-align: center; text-align-last: center; text-transform: none; letter-spacing: 0; font-size: 13px; }
      @media (max-width: 860px) {
        .search-row, .filter-grid { grid-template-columns: 1fr; }
        .company-list-head { display: none; }
        .company-row { grid-template-columns: 1fr auto; text-align: left; }
        .company-row-cell, .company-row-last { grid-column: 1 / -1; }
      }
      .history-list { background: var(--panel); border-radius: var(--radius); box-shadow: var(--shadow-card); overflow: hidden; }
      .history-item { display: grid; grid-template-columns: 110px 1fr; gap: 16px; padding: 14px 18px; border-top: 1px solid var(--border); }
      .history-item:first-child { border-top: none; }
      .history-item.clickable { cursor: pointer; }
      .history-item.clickable:hover { background: var(--hover); }
      .history-date { font-size: 12.5px; font-weight: 700; color: var(--ink-soft); }
      .history-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .history-title { font-weight: 600; font-size: 14px; }
      .history-kind { font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
      .history-kind.task { background: var(--accent-soft); color: var(--accent); }
      .history-kind.activity { background: var(--brand-blue-soft); color: var(--brand-blue); }
      .history-desc { margin-top: 4px; font-size: 13px; line-height: 1.5; color: var(--ink); white-space: pre-line; }
      @media (max-width: 860px) { .history-item { grid-template-columns: 1fr; gap: 4px; } }
      .input-with-btn { display: flex; gap: 6px; }
      .input-with-btn input { flex: 1; min-width: 0; }
      .lookup-msg { font-size: 11.5px; line-height: 1.4; margin: -4px 0 10px; }
      .lookup-msg.ok { color: #1E6B41; }
      .lookup-msg.error { color: var(--danger); }
      .lookup-msg.loading { color: var(--ink-soft); }
      .module-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px 16px; margin-bottom: 8px; }
      .edit-form .module-check { flex-direction: row; align-items: center; margin-bottom: 0; font-size: 13px; color: var(--ink); font-weight: 600; }
      .carteira-wrap { background: var(--panel); border-radius: var(--radius); box-shadow: var(--shadow-card); overflow-x: auto; }
      .carteira-table { width: 100%; border-collapse: collapse; min-width: 820px; }
      .carteira-table th { background: #3A4152; color: #fff; font-size: 12.5px; font-weight: 600; padding: 11px 12px; text-align: left; white-space: nowrap; }
      .carteira-table td { padding: 14px 12px; border-top: 1px solid var(--border); font-size: 13px; vertical-align: top; }
      .carteira-name { font-weight: 600; margin-bottom: 4px; }
      .carteira-money { font-weight: 700; white-space: nowrap; }
      .carteira-modules { max-width: 230px; line-height: 1.45; }
      .carteira-opp { color: var(--next); font-weight: 600; }
      .carteira-muted { color: var(--ink-soft); font-size: 12px; }
      .carteira-sub { display: block; font-size: 11.5px; color: var(--ink-soft); }
      .phone-link { color: inherit; text-decoration: underline; text-decoration-color: #25D366; text-underline-offset: 2px; }
      .phone-link:hover { color: #1DA851; }
      .modal-wide { width: 640px; }
      .import-block { margin-bottom: 14px; }
      .import-title { font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--ink-soft); margin-bottom: 6px; }
      .import-title-bad { color: var(--danger); }
      .import-line { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13.5px; }
      .import-problems { max-height: 200px; overflow-y: auto; background: var(--bg); border-radius: 8px; padding: 8px 12px; }
      .import-problem { font-size: 12.5px; padding: 3px 0; color: var(--ink); }
      .import-ok { background: #E9F6EF; color: #1E6B41; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-weight: 600; }
      /* Prospecção (kanban) */
      .prospeccao-view { max-width: 100%; }
      .kanban-board { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; align-items: flex-start; }
      .kanban-col { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); width: 240px; flex-shrink: 0; display: flex; flex-direction: column; max-height: calc(100vh - 220px); }
      .kanban-col.drag-over { border-color: var(--accent); background: var(--accent-soft); }
      .kanban-col-lost .kanban-col-head { color: var(--danger); }
      .kanban-col-won .kanban-col-head { color: #2F9E5C; }
      .kanban-col-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; font-weight: 700; font-size: 12px; border-bottom: 1px solid var(--border); }
      .kanban-col-count { font-family: var(--mono); font-size: 11px; color: var(--ink-soft); background: var(--panel); border-radius: 9px; padding: 1px 7px; }
      .kanban-col-body { padding: 8px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
      .kanban-col-empty { font-size: 11px; color: var(--ink-soft); text-align: center; padding: 14px 6px; border: 1px dashed var(--border); border-radius: 6px; }
      .kanban-card { background: var(--panel); border: 1px solid var(--border); border-radius: 7px; padding: 9px 10px; cursor: grab; }
      .kanban-card:hover { border-color: var(--accent); }
      .kanban-card:active { cursor: grabbing; }
      .kanban-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; }
      .kanban-card-name { font-weight: 600; font-size: 12.5px; line-height: 1.3; }
      .kanban-card-edit { opacity: 0; flex-shrink: 0; padding: 3px 4px; }
      .kanban-card:hover .kanban-card-edit { opacity: 1; }
      .kanban-card-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
      .kanban-card-sub { font-size: 11px; color: var(--ink-soft); margin-top: 5px; }
      .kanban-card-contact { width: 100%; justify-content: center; margin-top: 8px; }

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
      .drawer-overlay { position: fixed; inset: 0; background: rgba(20,24,34,0.32); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 20px; }
      .drawer { width: 560px; max-width: 100%; max-height: 88vh; background: var(--panel); border-radius: 10px; overflow-y: auto; box-shadow: 0 20px 60px rgba(20,24,34,0.25); }
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
      .modal-sm { width: 380px; }
      .field-error { color: var(--danger); font-size: 11.5px; margin: -4px 0 6px; }
      .modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
      .modal-head h3 { font-family: var(--display); font-size: 15px; margin: 0; }
      .modal-head svg { cursor: pointer; color: var(--ink-soft); }
      .modal-body { padding: 16px 20px 20px; }
      .modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px; }
      .next-step-toggle { display: flex; align-items: center; gap: 9px; padding: 9px 0 3px; cursor: pointer; user-select: none; }
      .next-step-toggle span { font-size: 12.5px; font-weight: 600; color: var(--ink); }
      .toggle-box { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid #C7CDD8; background: var(--panel); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #fff; }
      .toggle-box.on { background: var(--accent); border-color: var(--accent); }
      .next-step-form { background: var(--accent-soft); border-radius: 8px; padding: 12px; margin: 8px 0 4px; }
      .next-step-hint { font-size: 11px; color: var(--ink-soft); margin-top: 2px; }
      .complete-task-title { font-weight: 600; font-size: 14px; margin-bottom: 10px; }
      .required-mark { font-weight: 400; color: var(--danger); font-size: 10.5px; text-transform: none; letter-spacing: 0; }
      .field-hint { font-weight: 400; color: var(--ink-soft); font-size: 10.5px; text-transform: none; letter-spacing: 0; margin-top: 2px; }
      .btn:disabled { opacity: .45; cursor: not-allowed; }
      .completion-box { background: #E9F6EF; color: #1E6B41; }
      .completion-box b { color: #1E6B41; }

      /* Entity picker */
      .entity-picker { position: relative; display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; color: var(--ink-soft); font-weight: 600; margin-bottom: 10px; }
      .entity-picker-box { border: 1px solid var(--border); border-radius: 6px; padding: 7px 9px; font-size: 12.5px; color: var(--ink); font-weight: 400; cursor: pointer; background: var(--panel); }
      .entity-picker-box:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
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

      .back-floating { margin-bottom: 14px; }
      .profile-heading { display: flex; align-items: center; gap: 9px; color: var(--ink-soft); }
      .profile-heading h1 { color: var(--ink); }
      .profile-actions { display: flex; gap: 6px; }
      .profile-crm-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 10px; }
      .commercial-summary-box { background: var(--brand-blue-soft); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; margin-bottom: 14px; }
      .commercial-summary-head { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--brand-blue); margin-bottom: 6px; }
      .commercial-summary-dirty { margin-left: auto; font-size: 10px; font-weight: 500; text-transform: none; letter-spacing: 0; color: var(--ink-soft); }
      .commercial-summary-box textarea { width: 100%; border: 1px solid var(--border); border-radius: 6px; padding: 7px 9px; font-size: 12.5px; font-family: var(--sans); resize: vertical; }
      .profile-company-chip { display: inline-flex; align-items: center; gap: 5px; background: var(--accent-soft); color: var(--accent); font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 12px; cursor: pointer; margin-bottom: 10px; width: fit-content; }
      .profile-contact-row { display: flex; gap: 14px; font-size: 12px; color: var(--ink-soft); margin-bottom: 14px; flex-wrap: wrap; }
      .profile-contact-row span { display: inline-flex; align-items: center; gap: 5px; font-family: var(--mono); }
      .profile-contact-row a { color: var(--accent); }
      .stat-card-link { cursor: pointer; }
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
        .drawer { width: 100%; max-height: 92vh; }
        .drawer-overlay { padding: 0; }
        .search-panel { left: 14px; right: 14px; width: auto; }
        .edit-grid { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}
