# Forum Frontend (Day2-YL-1)

## Run locally
```bash
npm install
npm run dev

// test code
(() => {
  // ===== base: install mock framework =====
  if (!window.__mock) {
    const realFetch = window.fetch.bind(window);
    window.__realFetch = realFetch;

    const b64url = (obj) => {
      const json = JSON.stringify(obj);
      const b64 = btoa(unescape(encodeURIComponent(json)));
      return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    };

    const makeJwt = (payload) => {
      const header = { alg: "none", typ: "JWT" };
      return `${b64url(header)}.${b64url(payload)}.`;
    };

    const jsonResponse = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      });

    const readJsonBody = async (init) => {
      try {
        if (!init?.body) return null;
        return JSON.parse(init.body);
      } catch {
        return null;
      }
    };

    // store handlers by "METHOD path"
    window.__mock = {
      handlers: new Map(),
      makeJwt,
      jsonResponse,
      readJsonBody,
      restore() {
        window.fetch = window.__realFetch;
        console.log("fetch restored");
      },
      clearHandlers() {
        window.__mock.handlers.clear();
        console.log("mock handlers cleared");
      },
      setLocalToken(payload) {
        localStorage.setItem("forum_token", makeJwt(payload));
        console.log("forum_token set", payload);
        location.reload();
      },
      clearLocalToken() {
        localStorage.removeItem("forum_token");
        console.log("forum_token cleared");
        location.reload();
      },
    };

    window.fetch = async (input, init = {}) => {
      const url = typeof input === "string" ? input : input?.url;
      const method = (init.method || "GET").toUpperCase();
      const u = new URL(url, window.location.origin);
      const path = u.pathname;

      if (path.startsWith("/users/")) {
        console.log("[MOCK fetch]", method, path, { headers: init.headers, body: init.body });
      }

      const key = `${method} ${path}`;
      const handler = window.__mock.handlers.get(key);
      if (handler) return handler({ input, init, url, method, path });

      return window.__realFetch(input, init);
    };

    console.log("Mock framework installed.");
  }

  // ===== D2-YL-1: register/login handlers =====
  const { handlers, jsonResponse, readJsonBody, makeJwt } = window.__mock;

  const pickClaimsByEmail = (email) => {
    // D2-YL-1 normal user
    return { userId: 1001, type: "user", verified: true, email };
  };

  handlers.set("POST /users/register", async ({ init }) => {
    const body = await readJsonBody(init);
    return jsonResponse({ ok: true, user: { email: body?.email } }, 201);
  });

  handlers.set("POST /users/login", async ({ init }) => {
    const body = await readJsonBody(init);
    const { email, password } = body || {};
    if (!email || !password) return jsonResponse({ error: { message: "Missing email/password" } }, 400);
    if (password !== "pass1234") return jsonResponse({ error: { message: "Invalid credentials" } }, 401);

    const token = makeJwt(pickClaimsByEmail(email));
    return jsonResponse({ token }, 200);
  });

  console.log("D2-YL-1 mock enabled (register/login).");
  console.log("Use: user@demo.com + pass1234");
})();
