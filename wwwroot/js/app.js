// =====================================================================
// Обёртка над fetch() — проверяет response.ok, достаёт ошибку
// =====================================================================
async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const ct = response.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const body = await response.json();
        if (body?.message) message = body.message;
      }
    } catch { /* ignore */ }
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  if (response.status === 204) return null;

  const ct = response.headers.get("content-type") || "";
  return ct.includes("application/json") ? response.json() : response.text();
}

// =====================================================================
// DOM-ссылки
// =====================================================================
const listEl         = document.querySelector("#list");
const statusEl       = document.querySelector("#status");
const addForm        = document.querySelector("#addForm");
const titleEl        = document.querySelector("#title");
const searchEl       = document.querySelector("#search");
const searchStatusEl = document.querySelector("#searchStatus");
const spinnerEl      = document.querySelector("#spinner");

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}
function showSpinner(show) {
  spinnerEl.classList.toggle("hidden", !show);
}

// =====================================================================
// Рендер списка задач (безопасно, через textContent)
// =====================================================================
function renderTodos(todos) {
  listEl.innerHTML = "";
  for (const todo of todos) {
    const li = document.createElement("li");
    li.dataset.id = todo.id;
    if (todo.done) li.classList.add("done");

    // Аватарка
    if (todo.avatarUrl) {
      const img = document.createElement("img");
      img.className = "avatar";
      img.src = todo.avatarUrl;
      img.alt = "avatar";
      li.appendChild(img);
    }

    // Чекбокс
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = todo.done;
    cb.addEventListener("change", () => toggleDone(todo.id, cb.checked));
    li.appendChild(cb);

    // Название
    const span = document.createElement("span");
    span.className = "title";
    span.textContent = todo.title;
    li.appendChild(span);

    // Скрытый input для файла + кнопка
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    fileInput.addEventListener("change", () => uploadAvatar(todo.id, fileInput.files[0]));
    li.appendChild(fileInput);

    const uploadBtn = document.createElement("button");
    uploadBtn.className = "upload";
    uploadBtn.textContent = "📎";
    uploadBtn.title = "Загрузить аватар";
    uploadBtn.addEventListener("click", () => fileInput.click());
    li.appendChild(uploadBtn);

    // Удаление
    const delBtn = document.createElement("button");
    delBtn.className = "del";
    delBtn.textContent = "×";
    delBtn.addEventListener("click", () => removeTodo(todo.id, li));
    li.appendChild(delBtn);

    listEl.appendChild(li);
  }
}

// =====================================================================
// GET — загрузка списка
// =====================================================================
async function loadTodos(query = "") {
  showSpinner(true);
  try {
    const url = query
      ? `/api/todos?q=${encodeURIComponent(query)}`
      : "/api/todos";
    const todos = await request(url);
    renderTodos(todos);
    setStatus(query ? `Найдено: ${todos.length}` : `Всего задач: ${todos.length}`);
  } catch (err) {
    setStatus("Ошибка загрузки: " + err.message, true);
  } finally {
    showSpinner(false);
  }
}

// =====================================================================
// POST — создание
// =====================================================================
addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = titleEl.value.trim();
  if (!title) return;

  const btn = addForm.querySelector("button");
  btn.disabled = true;
  btn.textContent = "Отправка...";

  try {
    await request("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    titleEl.value = "";
    await loadTodos(searchEl.value.trim());
  } catch (err) {
    setStatus("Не удалось создать: " + err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Добавить";
  }
});

// =====================================================================
// PATCH — переключение done
// =====================================================================
async function toggleDone(id, done) {
  try {
    await request(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    await loadTodos(searchEl.value.trim());
  } catch (err) {
    setStatus("Ошибка обновления: " + err.message, true);
  }
}

// =====================================================================
// DELETE — удаление с анимацией
// =====================================================================
async function removeTodo(id, li) {
  li.classList.add("removing");
  await new Promise((r) => setTimeout(r, 200));

  try {
    await request(`/api/todos/${id}`, { method: "DELETE" });
    await loadTodos(searchEl.value.trim());
  } catch (err) {
    setStatus("Ошибка удаления: " + err.message, true);
    li.classList.remove("removing");
  }
}

// =====================================================================
// FormData — загрузка аватарки
// =====================================================================
async function uploadAvatar(id, file) {
  if (!file) return;
  const fd = new FormData();
  fd.append("file", file);

  showSpinner(true);
  try {
    await request(`/api/todos/${id}/avatar`, { method: "POST", body: fd });
    await loadTodos(searchEl.value.trim());
  } catch (err) {
    setStatus("Ошибка загрузки файла: " + err.message, true);
  } finally {
    showSpinner(false);
  }
}

// =====================================================================
// Debounce + AbortController — живой поиск
// =====================================================================
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

let searchController = null;

async function searchTodos(query) {
  if (searchController) searchController.abort();
  searchController = new AbortController();

  searchStatusEl.textContent = "…";
  showSpinner(true);

  try {
    const url = query
      ? `/api/todos?q=${encodeURIComponent(query)}`
      : "/api/todos";
    const todos = await request(url, { signal: searchController.signal });
    renderTodos(todos);
    setStatus(query ? `Найдено: ${todos.length}` : `Всего задач: ${todos.length}`);
    searchStatusEl.textContent = "";
  } catch (err) {
    if (err.name === "AbortError") {
      console.log("Поиск отменён (предыдущий запрос)");
    } else {
      setStatus("Ошибка поиска: " + err.message, true);
      searchStatusEl.textContent = "";
    }
  } finally {
    showSpinner(false);
  }
}

searchEl.addEventListener("input", debounce((e) => {
  searchTodos(e.target.value.trim());
}, 300));

// =====================================================================
// Старт
// =====================================================================
async function init() {
  showSpinner(true);
  try {
    const [todos] = await Promise.all([
      request("/api/todos"),
    ]);
    renderTodos(todos);
    setStatus(`Всего задач: ${todos.length}`);
  } catch (err) {
    setStatus("Ошибка старта: " + err.message, true);
  } finally {
    showSpinner(false);
  }
}

init();