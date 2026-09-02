/**
 * Camada de persistência da Central de Rotina.
 *
 * O App.jsx foi escrito originalmente esperando um `window.storage`
 * (get/set/delete/list) — a mesma interface que o Claude Artifacts
 * expõe. Esta versão implementa essa interface falando com o
 * Supabase, na tabela `rotina_app_storage` (ver README para o SQL
 * de criação da tabela).
 *
 * Se quiser voltar a rodar só localmente sem Supabase, basta trocar
 * este arquivo pela versão anterior baseada em localStorage.
 */

import { supabase } from "./lib/supabaseClient.js";

const TABLE = "rotina_app_storage";

async function get(key, shared = false) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("value")
      .eq("key", key)
      .eq("shared", shared)
      .maybeSingle();

    if (error) {
      console.error("storage.get falhou", error);
      return null;
    }
    if (!data) return null;
    return { key, value: data.value, shared };
  } catch (e) {
    console.error("storage.get falhou", e);
    return null;
  }
}

async function set(key, value, shared = false) {
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(
        { key, shared, value, updated_at: new Date().toISOString() },
        { onConflict: "key,shared" }
      );

    if (error) {
      console.error("storage.set falhou", error);
      return null;
    }
    return { key, value, shared };
  } catch (e) {
    console.error("storage.set falhou", e);
    return null;
  }
}

async function del(key, shared = false) {
  try {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("key", key)
      .eq("shared", shared);

    if (error) {
      console.error("storage.delete falhou", error);
      return null;
    }
    return { key, deleted: true, shared };
  } catch (e) {
    console.error("storage.delete falhou", e);
    return null;
  }
}

async function list(prefix = "", shared = false) {
  try {
    let query = supabase.from(TABLE).select("key").eq("shared", shared);
    if (prefix) query = query.like("key", `${prefix}%`);
    const { data, error } = await query;

    if (error) {
      console.error("storage.list falhou", error);
      return null;
    }
    return { keys: (data || []).map((r) => r.key), prefix, shared };
  } catch (e) {
    console.error("storage.list falhou", e);
    return null;
  }
}

if (typeof window !== "undefined" && !window.storage) {
  window.storage = { get, set, delete: del, list };
}