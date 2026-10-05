var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

// Раздача статики из wwwroot (index.html, css, js)
app.UseDefaultFiles();
app.UseStaticFiles();

// ---------- "База данных" в памяти ----------
var todos = new List<Todo>
{
    new(1, "Изучить fetch()",    false, null),
    new(2, "Понять Promise",     true,  null),
    new(3, "Разобраться с CORS", false, null),
};
int nextId = 4;

// ---------- REST-эндпоинты ----------

// GET /api/todos?q=...
app.MapGet("/api/todos", (string? q) =>
{
    var query = todos.AsEnumerable();
    if (!string.IsNullOrWhiteSpace(q))
        query = query.Where(t => t.Title.Contains(q, StringComparison.OrdinalIgnoreCase));
    return Results.Ok(query.ToList());
});

// GET /api/todos/{id}
app.MapGet("/api/todos/{id:int}", (int id) =>
{
    var todo = todos.FirstOrDefault(t => t.Id == id);
    return todo is null ? Results.NotFound(new { message = "Не найдено" }) : Results.Ok(todo);
});

// POST /api/todos
app.MapPost("/api/todos", (CreateTodoDto dto) =>
{
    if (string.IsNullOrWhiteSpace(dto.Title))
        return Results.BadRequest(new { message = "Title обязателен" });

    var todo = new Todo(nextId++, dto.Title.Trim(), false, null);
    todos.Add(todo);
    return Results.Created($"/api/todos/{todo.Id}", todo);
});

// PATCH /api/todos/{id}
app.MapPatch("/api/todos/{id:int}", (int id, PatchTodoDto dto) =>
{
    var todo = todos.FirstOrDefault(t => t.Id == id);
    if (todo is null) return Results.NotFound(new { message = "Не найдено" });

    if (dto.Done is not null) todo.Done = dto.Done.Value;
    if (!string.IsNullOrWhiteSpace(dto.Title)) todo.Title = dto.Title!;

    return Results.Ok(todo);
});

// DELETE /api/todos/{id}
app.MapDelete("/api/todos/{id:int}", (int id) =>
{
    var todo = todos.FirstOrDefault(t => t.Id == id);
    if (todo is null) return Results.NotFound(new { message = "Не найдено" });

    todos.Remove(todo);
    return Results.NoContent();
});

app.Run();

class Todo
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public bool Done { get; set; }
    public string? AvatarUrl { get; set; }

    public Todo(int id, string title, bool done, string? avatarUrl)
    {
        Id = id;
        Title = title;
        Done = done;
        AvatarUrl = avatarUrl;
    }
}

record CreateTodoDto(string Title);
record PatchTodoDto(string? Title, bool? Done);