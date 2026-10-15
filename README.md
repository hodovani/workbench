# Workbench

A React and TypeScript engineering workbench for building and explaining product features. The current application is a **streaming AI chat prototype**, built with Next.js and the Google Gen AI SDK.

**Status: work in progress.** The implementation is available to inspect and run; the live prototype requires your own Gemini API key.

[Open the prototype](https://hodovani.github.io/workbench/) · [More projects & case studies](https://hodovani.github.io/projects/) · [LinkedIn / contact](https://www.linkedin.com/in/matvii-hodovaniuk/)

## Current features

- Streamed assistant responses with loading, streaming, completion, and error states.
- Conversation history sent with follow-up messages during the current session.
- Retry of the last request after an error.
- API-key entry and a Change API Key control.
- Separate React UI, conversation state, storage, and model integration modules.

## Architecture

The chat implementation is in [src/ai-chat](./src/ai-chat):

| Module | Responsibility |
| --- | --- |
| [ChatMediator](./src/ai-chat/ChatMediator.ts) | Coordinates application state, sending, streaming, and retry. Uses constructor-injected dependencies. |
| [ObservableThreadStore](./src/ai-chat/ThreadStore.ts) | Holds conversation state and notifies subscribers using the Observer pattern. |
| [GeminiStreamStrategy](./src/ai-chat/GeminiStreamStrategy.ts) | Implements the model-streaming contract using the Strategy pattern. |
| [BrowserStorageAdapter](./src/ai-chat/BrowserStorageAdapter.ts) | Wraps browser storage behind a small adapter interface. |
| [React components](./src/ai-chat/components) | API-key entry, message input, and message rendering. |

The [Next.js page](./src/app/page.tsx) connects these modules to the interface. The app is statically exported to GitHub Pages; it does not require a hosted application server for the current chat flow.

## Run locally

The deployment workflow uses Node.js 20. The project pins pnpm 10.18.1 in package.json.

~~~bash
git clone https://github.com/hodovani/workbench.git
cd workbench
pnpm install --frozen-lockfile
pnpm dev
~~~

Open the local address printed by the development server. Enter a Gemini API key to use live chat; no key is needed to read the implementation.

~~~bash
pnpm lint    # Biome checks
pnpm build   # Next.js static export to out/
~~~

The [GitHub Actions workflow](./.github/workflows/deploy.yml) runs lint and build before deploying to Pages. The production workflow sets the /workbench base path.

## Prototype boundaries

- Gemini requests are made directly from the browser. Prompts and conversation context are sent to Google's Gemini service.
- The supplied API key is stored in localStorage, so it persists across browser sessions until removed with Change API Key or by clearing the site's storage. This is a prototype choice, not server-side secret management.
- Messages are currently held in memory and reset on reload. Authentication and durable conversation history are not implemented.
- The interface is still being developed; this repository does not yet represent a finished production chat product.

This is an independent project. It does not contain an implementation or data from a previous employer.
