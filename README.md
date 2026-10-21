# Workbench

A portfolio of small, working examples for deliberate TypeScript, systems, and product practice.

[Open the prototype](https://hodovani.github.io/workbench/) · [More projects & case studies](https://hodovani.github.io/projects/) · [LinkedIn / contact](https://www.linkedin.com/in/matvii-hodovaniuk/)

The first interactive project is a guest-first AI chat. Visitors can try it
without creating an account; Google sign-in saves separate conversations to
Firestore. The static frontend calls a small Cloudflare Worker so a Gemini key
does not ship to browsers. The chat UI uses semantic HTML and browser defaults;
there is no authored CSS.

The [`meta/`](./meta) folder is a learning inventory and service blueprint
collection. It may include overlapping topics and is intentionally kept
separate from the implemented product scope.

## Run locally

```bash
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` starts both the frontend and local Worker. See [the Worker setup](./worker/README.md)
for a local-only Gemini key. Run the checks in [TESTING.md](./TESTING.md).

For GitHub Pages, configure repository variables `NEXT_PUBLIC_FIREBASE_API_KEY`,
`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`,
`NEXT_PUBLIC_FIREBASE_APP_ID`, and `NEXT_PUBLIC_CHAT_API_URL`. Configure the
Worker's `GEMINI_API_KEY` secret and `ALLOWED_ORIGIN` separately in Cloudflare.
The deploy workflow builds the static app from those public Firebase and Worker
URLs; it never receives the Gemini secret.

See [the architecture notes](./src/ARCHITECTURE_REVIEW.md) for why each pattern
is used. This is an independent project. It does not contain an implementation
or data from a previous employer.
