# TodoAjax — AJAX + ASP.NET Core Minimal API

Учебный проект для демонстрации технологии **AJAX**: асинхронное взаимодействие клиента и сервера без полной перезагрузки страницы.

## 🎯 Что демонстрирует проект

- **REST API** на ASP.NET Core Minimal API
- **fetch()** + **async/await** + **Promise** на клиенте
- HTTP-методы: **GET / POST / PATCH / DELETE**
- Корректные **HTTP-статусы**: 200, 201, 204, 400, 404
- **Обработка ошибок**: `response.ok`, `try/catch/finally`
- **AbortController** — отмена устаревших запросов поиска
- **Debounce** — задержка перед отправкой запроса поиска (300 мс)
- **FormData** + `multipart/form-data` — загрузка аватарок
- **Promise.all** — параллельные запросы
- Безопасный рендер DOM через `textContent` (защита от XSS)

## 🛠 Технологии

- **.NET 9 SDK** (обратно совместимо с .NET 8)
- ASP.NET Core **Minimal API**
- Vanilla **JavaScript** (без фреймворков)
- **HTML5 / CSS3**

## 📁 Структура проекта
