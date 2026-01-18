Console was cleared
client.js:26 ./components/context/AuthContext.tsx:160:0
Module not found: Can't resolve '../utils/strictModeDebugger'
  158 |
  159 | import AppLoadingFallback from '../common/AppLoadingFallback'; // Use the project's enhanced AppLoadingFallback
> 160 | import { useStrictModeDebug } from '../utils/strictModeDebugger'; // Import the Strict Mode Debugger
  161 |
  162 | // ============================================================================
  163 | // ADAPTER: Backend UserPayload to Frontend AppUser (Using project's adapter)

https://nextjs.org/docs/messages/module-not-found

Import trace for requested module:
./pages/_app.tsx
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
handleErrors @ hot-dev-client.js:142
processMessage @ hot-dev-client.js:216
eval @ hot-dev-client.js:55
handleMessage @ websocket.js:52Understand this error