import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

/** @typedef {{ id: string; user_id: string; text: string; completed: boolean }} TodoRow */

function isPlaceholderConfig() {
  return (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    SUPABASE_URL.includes("YOUR_PROJECT") ||
    SUPABASE_ANON_KEY.includes("YOUR_ANON")
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function init() {
  const configBanner = document.getElementById("config-banner");
  const authSection = document.getElementById("auth-section");
  const appSection = document.getElementById("app-section");
  const authTitle = document.getElementById("auth-title");
  const authHint = document.getElementById("auth-hint");
  const authForm = document.getElementById("auth-form");
  const authEmail = document.getElementById("auth-email");
  const authPassword = document.getElementById("auth-password");
  const authError = document.getElementById("auth-error");
  const authSubmit = document.getElementById("auth-submit");
  const authToggleMode = document.getElementById("auth-toggle-mode");
  const userEmail = document.getElementById("user-email");
  const signOutBtn = document.getElementById("sign-out");
  const addForm = document.getElementById("add-form");
  const taskInput = document.getElementById("task-input");
  const addSubmit = document.getElementById("add-submit");
  const taskList = document.getElementById("task-list");
  const emptyState = document.getElementById("empty-state");
  const toolbar = document.getElementById("toolbar");
  const clearCompleted = document.getElementById("clear-completed");

  if (
    !(configBanner instanceof HTMLElement) ||
    !(authSection instanceof HTMLElement) ||
    !(appSection instanceof HTMLElement) ||
    !(authTitle instanceof HTMLElement) ||
    !(authHint instanceof HTMLElement) ||
    !(authForm instanceof HTMLFormElement) ||
    !(authEmail instanceof HTMLInputElement) ||
    !(authPassword instanceof HTMLInputElement) ||
    !(authError instanceof HTMLElement) ||
    !(authSubmit instanceof HTMLButtonElement) ||
    !(authToggleMode instanceof HTMLButtonElement) ||
    !(userEmail instanceof HTMLElement) ||
    !(signOutBtn instanceof HTMLButtonElement) ||
    !(addForm instanceof HTMLFormElement) ||
    !(taskInput instanceof HTMLInputElement) ||
    !(addSubmit instanceof HTMLButtonElement) ||
    !(taskList instanceof HTMLUListElement) ||
    !(emptyState instanceof HTMLElement) ||
    !(toolbar instanceof HTMLElement) ||
    !(clearCompleted instanceof HTMLButtonElement)
  ) {
    return;
  }

  configBanner.hidden = !isPlaceholderConfig();

  /** @type {'signin' | 'signup'} */
  let authMode = "signin";

  /** @type {TodoRow[]} */
  let todos = [];

  /** @type {string | null} */
  let editingId = null;

  let busy = false;

  function setAuthError(message) {
    if (message) {
      authError.textContent = message;
      authError.hidden = false;
    } else {
      authError.textContent = "";
      authError.hidden = true;
    }
  }

  function applyAuthModeUi() {
    if (authMode === "signup") {
      authTitle.textContent = "Create account";
      authSubmit.textContent = "Sign up";
      authToggleMode.textContent = "Already have an account? Sign in";
      authHint.hidden = false;
      authPassword.autocomplete = "new-password";
    } else {
      authTitle.textContent = "Sign in";
      authSubmit.textContent = "Sign in";
      authToggleMode.textContent = "Need an account? Sign up";
      authHint.hidden = false;
      authPassword.autocomplete = "current-password";
    }
  }

  function setBusy(next) {
    busy = next;
    authSubmit.disabled = busy;
    signOutBtn.disabled = busy;
    addSubmit.disabled = busy;
    taskInput.disabled = busy;
    clearCompleted.disabled = busy;
  }

  function showAuth() {
    authSection.hidden = false;
    appSection.hidden = true;
    todos = [];
    editingId = null;
    taskList.replaceChildren();
  }

  function showApp(email) {
    authSection.hidden = true;
    appSection.hidden = false;
    userEmail.textContent = email ?? "";
  }

  async function loadTodos() {
    setBusy(true);
    const { data, error } = await supabase
      .from("todos")
      .select("id, user_id, text, completed")
      .order("created_at", { ascending: true });

    setBusy(false);

    if (error) {
      console.error(error);
      return;
    }

    todos = data ?? [];
    editingId = null;
    renderTodos();
  }

  function renderTodos() {
    taskList.replaceChildren();

    const hasItems = todos.length > 0;
    emptyState.hidden = hasItems;
    toolbar.hidden = !todos.some((t) => t.completed);

    for (const todo of todos) {
      const li = document.createElement("li");
      li.className =
        "task-item" + (todo.completed ? " task-item--completed" : "");
      li.dataset.id = todo.id;

      const main = document.createElement("div");
      main.className = "task-item__main";

      if (editingId === todo.id) {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "task-item__edit-input";
        input.value = todo.text;
        input.maxLength = 500;
        input.setAttribute("aria-label", "Edit task text");

        const actions = document.createElement("div");
        actions.className = "task-item__edit-actions";

        const save = document.createElement("button");
        save.type = "button";
        save.className = "task-item__save";
        save.textContent = "Save";

        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "task-item__cancel";
        cancel.textContent = "Cancel";

        save.addEventListener("click", async () => {
          const text = input.value.trim();
          if (!text) {
            input.focus();
            return;
          }
          setBusy(true);
          const { error } = await supabase
            .from("todos")
            .update({ text })
            .eq("id", todo.id);
          setBusy(false);
          if (error) {
            console.error(error);
            return;
          }
          const t = todos.find((x) => x.id === todo.id);
          if (t) t.text = text;
          editingId = null;
          renderTodos();
        });

        cancel.addEventListener("click", () => {
          editingId = null;
          renderTodos();
        });

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save.click();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancel.click();
          }
        });

        actions.append(save, cancel);
        main.append(input, actions);
        li.append(main);
        taskList.append(li);
        input.focus();
        input.select();
        continue;
      }

      const row = document.createElement("div");
      row.className = "task-item__row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-item__checkbox";
      checkbox.checked = todo.completed;
      checkbox.id = `task-${todo.id}`;
      checkbox.disabled = busy;
      checkbox.setAttribute("aria-label", "Mark complete");

      const label = document.createElement("label");
      label.className = "task-item__label";
      label.htmlFor = checkbox.id;
      label.textContent = todo.text;

      checkbox.addEventListener("change", async () => {
        const checked = checkbox.checked;
        setBusy(true);
        const { error } = await supabase
          .from("todos")
          .update({ completed: checked })
          .eq("id", todo.id);
        setBusy(false);
        if (error) {
          console.error(error);
          checkbox.checked = !checked;
          return;
        }
        const t = todos.find((x) => x.id === todo.id);
        if (t) t.completed = checked;
        renderTodos();
      });

      row.append(checkbox, label);

      const actions = document.createElement("div");
      actions.className = "task-item__actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "task-item__edit";
      editBtn.textContent = "Edit";
      editBtn.disabled = busy || todo.completed;
      editBtn.setAttribute("aria-label", `Edit: ${todo.text}`);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "task-item__delete";
      del.textContent = "Delete";
      del.disabled = busy;
      del.setAttribute("aria-label", `Delete: ${todo.text}`);

      editBtn.addEventListener("click", () => {
        editingId = todo.id;
        renderTodos();
      });

      del.addEventListener("click", async () => {
        setBusy(true);
        const { error } = await supabase.from("todos").delete().eq("id", todo.id);
        setBusy(false);
        if (error) {
          console.error(error);
          return;
        }
        todos = todos.filter((x) => x.id !== todo.id);
        if (editingId === todo.id) editingId = null;
        renderTodos();
      });

      actions.append(editBtn, del);
      main.append(row, actions);
      li.append(main);
      taskList.append(li);
    }
  }

  authToggleMode.addEventListener("click", () => {
    authMode = authMode === "signin" ? "signup" : "signin";
    setAuthError("");
    applyAuthModeUi();
  });

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy || isPlaceholderConfig()) return;

    const email = authEmail.value.trim();
    const password = authPassword.value;
    setAuthError("");

    if (!email || !password) {
      setAuthError("Enter email and password.");
      return;
    }

    setBusy(true);

    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      setBusy(false);
      if (error) {
        setAuthError(error.message);
        return;
      }
      setAuthError("");
      authPassword.value = "";
      authHint.textContent =
        "Check your email to confirm your account if required by your project, then sign in.";
      authHint.hidden = false;
      authMode = "signin";
      applyAuthModeUi();
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
  });

  signOutBtn.addEventListener("click", async () => {
    if (busy) return;
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
  });

  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    if (!text || busy) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    setBusy(true);
    const { data, error } = await supabase
      .from("todos")
      .insert({
        user_id: session.user.id,
        text,
        completed: false,
      })
      .select("id, user_id, text, completed")
      .single();

    setBusy(false);

    if (error) {
      console.error(error);
      return;
    }

    if (data) todos.push(data);
    taskInput.value = "";
    taskInput.focus();
    renderTodos();
  });

  clearCompleted.addEventListener("click", async () => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.from("todos").delete().eq("completed", true);
    setBusy(false);
    if (error) {
      console.error(error);
      return;
    }
    todos = todos.filter((t) => !t.completed);
    editingId = null;
    renderTodos();
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION") return;
    if (session?.user) {
      showApp(session.user.email ?? "");
      loadTodos();
    } else {
      showAuth();
      setAuthError("");
      authPassword.value = "";
    }
  });

  applyAuthModeUi();

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      showApp(session.user.email ?? "");
      loadTodos();
    } else {
      authSection.hidden = false;
      appSection.hidden = true;
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
