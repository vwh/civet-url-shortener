import { Database, SQLiteError } from "bun:sqlite";

type URLInfo = {url: string, title?: string, description?: string}

let ref;const database =( (ref = new Database("urls.db")).exec(`
        CREATE TABLE IF NOT EXISTS url (
            id TEXT PRIMARY KEY NOT NULL,
            url TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `),ref)

const db = {
    count() {
        return ((database.query("SELECT COUNT(*) as count FROM url;").get() as {count: number})).count
    },

    insert(url: string, title?: string, description?: string) {
        const uuid = crypto.randomUUID();
        try { 
            database.prepare("INSERT INTO url (id, url, title, description) VALUES (?, ?, ?, ?)").run(
                    uuid, 
                    url, 
                    title ?? null, 
                    description ?? null)
            return uuid
        }
        catch(e1) {if(e1  instanceof SQLiteError) {const e = e1;
            if (e.message.includes("url.title")) {
                return Errors.TitleRequired;
            };return
        }
else  {throw e1}}
    },

    getInfo(id: string) {
        return (database.prepare("SELECT url, title, description FROM url WHERE id = ?").get(id) as URLInfo)
    },

    getURL(id: string) {
        return ((database.prepare("SELECT url FROM url WHERE id = ?").get(id) as {url: string | null})).url
    }}

enum Errors { 
    NotFound = "Not found",
    TitleRequired = "Title is required",
}

Bun.serve({
    routes: {
        // Get info about a URL
        "/info/:id": function (req) {
            const data = db.getInfo(req.params.id);
            return data ? 
                Response.json(data) 
                : Response.json({error: Errors.NotFound});
        },

        // Create a new URL in the database
        "/new":  {
            POST: async function (req) {
                const { url, title, description } = await req.json() as URLInfo;
                const data = db.insert(url, title, description);
                return data !== Errors.TitleRequired ?
                    Response.json({
                        id: data,
                        created: true, 
                        url: url, 
                        title: title, 
                        description: description,
                    })
                    : Response.json({
                        created: false, 
                        error: Errors.TitleRequired,
                })
            },
        },

        // Count the number of URLs
        "/count": function() {
            return new Response(String(db.count()));
        },

        // Redirect to the URL if it exists
        "/:id": function (req) {
            const url = db.getURL(req.params.id);
            return url ? 
                Response.redirect(url, 301) 
                : Response.json({error: Errors.NotFound});
        },
    },
        
    port: 3001,
    fetch: function (req) { 
        return new Response("Not Found", {status: 404});
    },
}
);

console.log("Server started on port 3001");