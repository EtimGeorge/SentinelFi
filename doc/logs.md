### browser network tab logs:

614f9df9ac32a724.webpack.hot-update.json	200	fetch	inject.js:2	0.4 kB	862 ms
webpack.614f9df9ac32a724.hot-update.js	200	script	webpack.js:195	1.2 kB	13 ms
super	500	xhr	inject.js:2	0.2 kB	30.36 s
super	401	xhr	inject.js:2	0.5 kB	9.43 s
super	500	xhr	inject.js:2	0.4 kB	27.68 s
(when i use this (password)as password i got the 500 error and when i use (##Ndiong1988##) as password i got the 401 error)

### browser console tab logs:

Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
strictModeDebugger.ts:27 [StrictModeDebugger] Initialized - Tracking component lifecycles
strictModeDebugger.ts:285 💡 Debug Commands Available: 
  window.debugStrictMode.summary() - View lifecycle summary
  window.debugStrictMode.issues() - Detect potential issues
  window.debugStrictMode.reset() - Clear tracking data
websocket.js:46 [HMR] connected
strictModeDebugger.ts:72 [AuthProvider] ✅ FIRST MOUNT
AuthContext.tsx:78 [AUTH] Initializing auth state... 
AuthContext.tsx:78 [AUTH] Fetching current user... 
AuthContext.tsx:78 [AUTH] No token found - skipping API call 
strictModeDebugger.ts:87 [AuthProvider] ❌ UNMOUNT after 35ms Object
AuthContext.tsx:78 [AUTH] Auth initialization cleanup - aborting pending requests 
strictModeDebugger.ts:51 [AuthProvider] 🔄 RE-MOUNT #2 Object
AuthContext.tsx:78 [AUTH] Initializing auth state... 
AuthContext.tsx:78 [AUTH] Using cached auth state 
AuthContext.tsx:78 [AUTH] [RouteGuard] Displaying loading screen. Object
AuthContext.tsx:78 [AUTH] [RouteGuard] Displaying loading screen. Object
AuthContext.tsx:78 [AUTH] [RouteGuard] Waiting for router readiness, or check in progress. Object
AuthContext.tsx:78 [AUTH] [RouteGuard] Waiting for router readiness, or check in progress. Object
AuthContext.tsx:78 [AUTH] [RouteGuard] Displaying loading screen. Object
AuthContext.tsx:78 [AUTH] [RouteGuard] Displaying loading screen. Object
AuthContext.tsx:78 [AUTH] [RouteGuard] Checking authorization for: /
AuthContext.tsx:78 [AUTH] [RouteGuard] Unauthenticated access to protected route - redirecting to login 
AuthContext.tsx:78 [AUTH] [RouteGuard] Displaying loading screen. Object
AuthContext.tsx:78 [AUTH] [RouteGuard] Displaying loading screen. Object
hot-dev-client.js:199 [Fast Refresh] rebuilding
:3000/:1 [Intervention] Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: chrome-extension://okfkdaglfjjjfefdcppliegebpoegaii/assets/PublicSans-VariableFont_wght.ttf
hot-dev-client.js:168 [Fast Refresh] done in 1942ms
AuthContext.tsx:78 [AUTH] [RouteGuard] Displaying loading screen. Object
AuthContext.tsx:78 [AUTH] [RouteGuard] Displaying loading screen. Object
AuthContext.tsx:78 [AUTH] [RouteGuard] Checking authorization for: /login
AuthContext.tsx:78 [AUTH] [RouteGuard] Public route - allowing access 
2AuthContext.tsx:78 [AUTH] [_app] Rendering PublicLayout for: /login
warn-once.js:16 Image with src "/SentinelFi Logo Concept-bg-remv-logo-only.png" has either width or height modified, but not the other. If you use CSS to change the size of your image, also include the styles 'width: "auto"' or 'height: "auto"' to maintain the aspect ratio.
warnOnce @ warn-once.js:16Understand this warning
hot-dev-client.js:199 [Fast Refresh] rebuilding
hot-dev-client.js:168 [Fast Refresh] done in 955ms
AuthContext.tsx:78 [AUTH] Attempting super login for: superadmin@sentinelfi.com 
AuthContext.tsx:78 [AUTH] Login attempt {email: 'superadmin@sentinelfi.com'}
AuthContext.tsx:78 [AUTH] [_app] Rendering PublicLayout for: /login
AuthContext.tsx:78 [AUTH] [_app] Rendering PublicLayout for: /login
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ axios.cjs:2663
xhr @ axios.cjs:2480
dispatchRequest @ axios.cjs:3238
_request @ axios.cjs:3538
request @ axios.cjs:3395
httpMethod @ axios.cjs:3577
wrap @ axios.cjs:15
eval @ AuthContext.tsx:431
handleSubmit @ login.tsx:182
callCallback @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
eval @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26135
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this error
AuthContext.tsx:86 [AUTH] ❌ Login failed AxiosError {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
error @ AuthContext.tsx:86
eval @ AuthContext.tsx:479
await in eval
handleSubmit @ login.tsx:182
callCallback @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
eval @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26135
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this error
AuthContext.tsx:78 [AUTH] [_app] Rendering PublicLayout for: /login
AuthContext.tsx:78 [AUTH] [_app] Rendering PublicLayout for: /login
AuthContext.tsx:78 [AUTH] Attempting super login for: superadmin@sentinelfi.com 
AuthContext.tsx:78 [AUTH] Login attempt {email: 'superadmin@sentinelfi.com'}
AuthContext.tsx:78 [AUTH] [_app] Rendering PublicLayout for: /login
AuthContext.tsx:78 [AUTH] [_app] Rendering PublicLayout for: /login
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 401 (Unauthorized)
T.d.send @ inject.js:2
dispatchXhrRequest @ axios.cjs:2663
xhr @ axios.cjs:2480
dispatchRequest @ axios.cjs:3238
_request @ axios.cjs:3538
request @ axios.cjs:3395
httpMethod @ axios.cjs:3577
wrap @ axios.cjs:15
eval @ AuthContext.tsx:431
handleSubmit @ login.tsx:182
callCallback @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
eval @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26135
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this error
AuthContext.tsx:86 [AUTH] ❌ Login failed AxiosError {message: 'Request failed with status code 401', name: 'AxiosError', code: 'ERR_BAD_REQUEST', config: {…}, request: XMLHttpRequest, …}code: "ERR_BAD_REQUEST"config: adapter: (3) ['xhr', 'http', 'fetch']allowAbsoluteUrls: truebaseURL: "/api/v1"data: "{\"email\":\"superadmin@sentinelfi.com\",\"password\":\"##Ndiong1988##\",\"rememberMe\":false}"env: {FormData: ƒ, Blob: ƒ}headers: AxiosHeaders {Accept: 'application/json, text/plain, */*', Content-Type: 'application/json'}maxBodyLength: -1maxContentLength: -1method: "post"timeout: 0transformRequest: Array(1)0: ƒ transformRequest(data, headers)length: 1[[Prototype]]: Array(0)transformResponse: Array(1)0: ƒ transformResponse(data)length: 1name: "transformResponse"prototype: {}arguments: (...)caller: (...)[[FunctionLocation]]: axios.cjs:1578[[Prototype]]: ƒ ()apply: ƒ apply()arguments: (...)bind: ƒ bind()call: ƒ call()caller: (...)constructor: ƒ Function()length: 0name: ""toString: ƒ toString()length: 0name: "toString"arguments: (...)caller: (...)[[Prototype]]: ƒ ()[[Scopes]]: Scopes[0]Symbol(Symbol.hasInstance): ƒ [Symbol.hasInstance]()length: 1name: "[Symbol.hasInstance]"arguments: (...)caller: (...)[[Prototype]]: ƒ ()[[Scopes]]: Scopes[0]get arguments: ƒ arguments()length: 0name: "get arguments"arguments: (...)caller: (...)[[Prototype]]: ƒ ()[[Scopes]]: Scopes[0]set arguments: ƒ arguments()length: 1name: "set arguments"arguments: (...)caller: (...)[[Prototype]]: ƒ ()[[Scopes]]: Scopes[0]get caller: ƒ caller()set caller: ƒ caller()[[FunctionLocation]]: [[Prototype]]: Object[[Scopes]]: Scopes[0][[Scopes]]: Scopes[4]length: 1[[Prototype]]: Array(0)transitional: clarifyTimeoutError: falseforcedJSONParsing: truesilentJSONParsing: true[[Prototype]]: Objecturl: "/auth/login/super"validateStatus: ƒ validateStatus(status)length: 1name: "validateStatus"prototype: {}arguments: (...)caller: (...)[[FunctionLocation]]: axios.cjs:1623[[Prototype]]: ƒ ()[[Scopes]]: Scopes[4]withCredentials: truexsrfCookieName: "XSRF-TOKEN"xsrfHeaderName: "X-XSRF-TOKEN"[[Prototype]]: Objectmessage: "Request failed with status code 401"name: "AxiosError"request: XMLHttpRequest_method: "POST"_requestHeaders: Accept: "application/json, text/plain, */*"Content-Type: "application/json"[[Prototype]]: Object_startTime: "2026-01-18T17:58:48.856Z"_url: "/api/v1/auth/login/super"onabort: ƒ handleAbort()onerror: ƒ handleError(event)onload: nullonloadend: ƒ onloadend()onloadstart: nullonprogress: nullonreadystatechange: nullontimeout: ƒ handleTimeout()readyState: 4response: "{\"message\":\"Invalid credentials.\",\"error\":\"Unauthorized\",\"statusCode\":401}"responseText: "{\"message\":\"Invalid credentials.\",\"error\":\"Unauthorized\",\"statusCode\":401}"responseType: ""responseURL: "http://localhost:3000/api/v1/auth/login/super"responseXML: nullstatus: 401statusText: "Unauthorized"timeout: 0upload: XMLHttpRequestUpload {onloadstart: null, onprogress: null, onabort: null, onerror: null, onload: null, …}withCredentials: true[[Prototype]]: XMLHttpRequestresponse: {data: {…}, status: 401, statusText: 'Unauthorized', headers: AxiosHeaders, config: {…}, …}status: 401stack: "AxiosError: Request failed with status code 401\n    at settle (webpack-internal:///../node_modules/axios/dist/browser/axios.cjs:2063:12)\n    at XMLHttpRequest.onloadend (webpack-internal:///../node_modules/axios/dist/browser/axios.cjs:2524:7)\n    at Axios.request (webpack-internal:///../node_modules/axios/dist/browser/axios.cjs:3400:41)\n    at async eval (webpack-internal:///./components/context/AuthContext.tsx:390:30)\n    at async handleSubmit (webpack-internal:///./pages/login.tsx:267:28)"[[Prototype]]: Error
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
error @ AuthContext.tsx:86
eval @ AuthContext.tsx:479
await in eval
handleSubmit @ login.tsx:182
callCallback @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
eval @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26135
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this error
AuthContext.tsx:78 [AUTH] [_app] Rendering PublicLayout for: /login
AuthContext.tsx:78 [AUTH] [_app] Rendering PublicLayout for: /login
AuthContext.tsx:78 [AUTH] Attempting super login for: superadmin@sentinelfi.com 
AuthContext.tsx:78 [AUTH] Login attempt {email: 'superadmin@sentinelfi.com'}
AuthContext.tsx:78 [AUTH] [_app] Rendering PublicLayout for: /login
AuthContext.tsx:78 [AUTH] [_app] Rendering PublicLayout for: /login
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ axios.cjs:2663
xhr @ axios.cjs:2480
dispatchRequest @ axios.cjs:3238
_request @ axios.cjs:3538
request @ axios.cjs:3395
httpMethod @ axios.cjs:3577
wrap @ axios.cjs:15
eval @ AuthContext.tsx:431
handleSubmit @ login.tsx:182
callCallback @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
eval @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26135
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this error
AuthContext.tsx:86 [AUTH] ❌ Login failed AxiosError {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}code: "ERR_BAD_RESPONSE"config: adapter: (3) ['xhr', 'http', 'fetch']allowAbsoluteUrls: truebaseURL: "/api/v1"data: "{\"email\":\"superadmin@sentinelfi.com\",\"password\":\"password\",\"rememberMe\":false}"env: {FormData: ƒ, Blob: ƒ}headers: AxiosHeaders {Accept: 'application/json, text/plain, */*', Content-Type: 'application/json'}maxBodyLength: -1maxContentLength: -1method: "post"timeout: 0transformRequest: [ƒ]transformResponse: [ƒ]transitional: {silentJSONParsing: true, forcedJSONParsing: true, clarifyTimeoutError: false}url: "/auth/login/super"validateStatus: ƒ validateStatus(status)withCredentials: truexsrfCookieName: "XSRF-TOKEN"xsrfHeaderName: "X-XSRF-TOKEN"[[Prototype]]: Objectmessage: "Request failed with status code 500"name: "AxiosError"request: XMLHttpRequest_method: "POST"_requestHeaders: {Accept: 'application/json, text/plain, */*', Content-Type: 'application/json'}_startTime: "2026-01-18T17:59:21.608Z"_url: "/api/v1/auth/login/super"onabort: ƒ handleAbort()onerror: ƒ handleError(event)onload: nullonloadend: ƒ onloadend()onloadstart: nullonprogress: nullonreadystatechange: nullontimeout: ƒ handleTimeout()readyState: 4response: "{\"statusCode\":500,\"message\":\"Internal server error\"}"responseText: "{\"statusCode\":500,\"message\":\"Internal server error\"}"responseType: ""responseURL: "http://localhost:3000/api/v1/auth/login/super"responseXML: nullstatus: 500statusText: "Internal Server Error"timeout: 0upload: XMLHttpRequestUpload {onloadstart: null, onprogress: null, onabort: null, onerror: null, onload: null, …}withCredentials: true[[Prototype]]: XMLHttpRequestresponse: config: adapter: (3) ['xhr', 'http', 'fetch']allowAbsoluteUrls: truebaseURL: "/api/v1"data: "{\"email\":\"superadmin@sentinelfi.com\",\"password\":\"password\",\"rememberMe\":false}"env: Blob: ƒ Blob()FormData: ƒ FormData()length: 0name: "FormData"prototype: FormData {append: ƒ, delete: ƒ, get: ƒ, getAll: ƒ, has: ƒ, …}arguments: nullcaller: null[[Prototype]]: ƒ ()[[Scopes]]: Scopes[0][[Prototype]]: Objectheaders: AxiosHeadersAccept: "application/json, text/plain, */*"Content-Type: "application/json"clear: (...)concat: (...)constructor: (...)delete: (...)get: (...)getAccept: (...)getAcceptEncoding: (...)getAuthorization: (...)getContentLength: (...)getContentType: (...)getSetCookie: (...)getUserAgent: (...)has: (...)hasAccept: (...)hasAcceptEncoding: (...)hasAuthorization: (...)hasContentLength: (...)hasContentType: (...)hasUserAgent: (...)normalize: (...)set: (...)setAccept: (...)setAcceptEncoding: (...)setAuthorization: (...)setContentLength: (...)setContentType: (...)setUserAgent: (...)toJSON: (...)toString: (...)Symbol(Symbol.toStringTag): (...)[[Prototype]]: ObjectmaxBodyLength: -1maxContentLength: -1method: "post"timeout: 0transformRequest: [ƒ]transformResponse: [ƒ]transitional: {silentJSONParsing: true, forcedJSONParsing: true, clarifyTimeoutError: false}url: "/auth/login/super"validateStatus: ƒ validateStatus(status)withCredentials: truexsrfCookieName: "XSRF-TOKEN"xsrfHeaderName: "X-XSRF-TOKEN"[[Prototype]]: Objectdata: {statusCode: 500, message: 'Internal server error'}headers: AxiosHeaders {access-control-allow-credentials: 'true', access-control-allow-origin: 'http://localhost:3000', access-control-expose-headers: 'Set-Cookie', connection: 'close', content-length: '52', …}request: XMLHttpRequest {_method: 'POST', _url: '/api/v1/auth/login/super', _requestHeaders: {…}, _startTime: '2026-01-18T17:59:21.608Z', onreadystatechange: null, …}status: 500statusText: "Internal Server Error"[[Prototype]]: Objectstatus: 500stack: "AxiosError: Request failed with status code 500\n    at settle (webpack-internal:///../node_modules/axios/dist/browser/axios.cjs:2063:12)\n    at XMLHttpRequest.onloadend (webpack-internal:///../node_modules/axios/dist/browser/axios.cjs:2524:7)\n    at Axios.request (webpack-internal:///../node_modules/axios/dist/browser/axios.cjs:3400:41)\n    at async eval (webpack-internal:///./components/context/AuthContext.tsx:390:30)\n    at async handleSubmit (webpack-internal:///./pages/login.tsx:267:28)"[[Prototype]]: Error
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
error @ AuthContext.tsx:86
eval @ AuthContext.tsx:479
await in eval
handleSubmit @ login.tsx:182
callCallback @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
eval @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26135
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this error
AuthContext.tsx:78 [AUTH] [_app] Rendering PublicLayout for: /login
AuthContext.tsx:78 [AUTH] [_app] Rendering PublicLayout for: /login


### Frontend console logs:

PS C:\temp\SentinelFi> npm run dev:frontend

> sentinelfi-monorepo@1.0.0 dev:frontend
> npm run dev -w frontend


> frontend@1.0.0 dev
> set NODE_OPTIONS=--max-old-space-size=4096 && next dev

   ▲ Next.js 14.1.4
   - Local:        http://localhost:3000
   - Environments: .env.local

 ✓ Ready in 33s
 ○ Compiling / ...
 ✓ Compiled / in 4.9s (411 modules)
[StrictModeDebugger] Initialized - Tracking component lifecycles
 ○ Compiling /login ...
 ✓ Compiled /login in 2.2s (423 modules)
 ○ Compiling /_error ...
 ✓ Compiled /_error in 930ms (425 modules)
[StrictModeDebugger] Initialized - Tracking component lifecycles
(node:1668) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Failed to proxy http://localhost:3001/api/v1/auth/login/super Error: socket hang up
    at Socket.socketCloseListener (node:_http_client:491:27)
    at Socket.emit (node:events:531:35)
    at TCP.<anonymous> (node:net:346:12) {
  code: 'ECONNRESET'
}
Error: socket hang up
    at Socket.socketCloseListener (node:_http_client:491:27)
    at Socket.emit (node:events:531:35)
    at TCP.<anonymous> (node:net:346:12) {
  code: 'ECONNRESET'
}


### Backend console logs:

[6:51:45 PM] File change detected. Starting incremental compilation...

[6:51:47 PM] Found 0 errors. Watching for file changes.

[Nest] 18712  - 01/18/2026, 6:55:58 PM     LOG [NestFactory] Starting Nest application...
[Nest] 18712  - 01/18/2026, 6:55:58 PM     LOG [InstanceLoader] AppModule dependencies initialized +112ms
[Nest] 18712  - 01/18/2026, 6:55:58 PM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +1ms  
[Nest] 18712  - 01/18/2026, 6:55:58 PM     LOG [InstanceLoader] ClsModule dependencies initialized +1ms      
[Nest] 18712  - 01/18/2026, 6:55:58 PM     LOG [InstanceLoader] ClsCommonModule dependencies initialized +1ms
[Nest] 18712  - 01/18/2026, 6:55:58 PM     LOG [InstanceLoader] NotificationsModule dependencies initialized +6ms
[Nest] 18712  - 01/18/2026, 6:55:58 PM     LOG [InstanceLoader] ConfigHostModule dependencies initialized +0ms
[Nest] 18712  - 01/18/2026, 6:55:58 PM     LOG [InstanceLoader] HttpModule dependencies initialized +1ms
[Nest] 18712  - 01/18/2026, 6:55:58 PM     LOG [InstanceLoader] CommonModule dependencies initialized +0ms
[Nest] 18712  - 01/18/2026, 6:55:58 PM     LOG [InstanceLoader] DiscoveryModule dependencies initialized +1ms
[Nest] 18712  - 01/18/2026, 6:55:58 PM     LOG [TypeOrmModule] Applied encoding/normalization to DATABASE_URL.
[Nest] 18712  - 01/18/2026, 6:55:58 PM     LOG [TypeOrmModule] Connecting to database (len: 125): postgres://neondb_owner:****@ep-spring-feather-ahvamwz8-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
[Nest] 18712  - 01/18/2026, 6:55:58 PM     LOG [InstanceLoader] ConfigModule dependencies initialized +5ms    
[Nest] 18712  - 01/18/2026, 6:55:58 PM     LOG [InstanceLoader] ConfigModule dependencies initialized +1ms    
[Nest] 18712  - 01/18/2026, 6:55:58 PM     LOG [InstanceLoader] ClsRootModule dependencies initialized +0ms   
[Nest] 18712  - 01/18/2026, 6:55:58 PM     LOG [InstanceLoader] ClsPluginsModule dependencies initialized +1ms
[Nest] 18712  - 01/18/2026, 6:56:01 PM     LOG [InstanceLoader] TenantMigrationModule dependencies initialized +3184ms
[Nest] 18712  - 01/18/2026, 6:56:01 PM     LOG [InstanceLoader] EmailModule dependencies initialized +2ms
[Nest] 18712  - 01/18/2026, 6:56:01 PM     LOG [InstanceLoader] JwtModule dependencies initialized +2ms  
[Nest] 18712  - 01/18/2026, 6:56:01 PM     LOG [InstanceLoader] JwtModule dependencies initialized +3ms
[Nest] 18712  - 01/18/2026, 6:56:01 PM     LOG [InstanceLoader] BillingModule dependencies initialized +4ms
(node:18712) Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'. 
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=require'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.
(Use `node --trace-warnings ...` to show where the warning was created)
query: SELECT version()
query: SELECT * FROM current_schema()
query: CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] TenantDatabaseModule dependencies initialized +25506ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] TypeOrmCoreModule dependencies initialized +1ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +2ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +1ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +2ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +1ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +2ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] TypeOrmModule dependencies initialized +2ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] SearchModule dependencies initialized +20ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] DashboardModule dependencies initialized +10ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] SettingsModule dependencies initialized +1ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] AuditModule dependencies initialized +0ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] OperationalBudgetsModule dependencies initialized +1ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] ProjectsModule dependencies initialized +1ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] AuthModule dependencies initialized +1ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] SuperAdminModule dependencies initialized +1ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] WbsModule dependencies initialized +1ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [InstanceLoader] TenantModule dependencies initialized +0ms
[Nest] 18712  - 01/18/2026, 6:56:27 PM     LOG [Bootstrap] Development request logging is enabled.
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [WebSocketsController] NotificationsGateway subscribed to the "message" message +4313ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM   DEBUG [ClsModule] Mounting ClsMiddleware to /
[Nest] 18712  - 01/18/2026, 6:56:31 PM    WARN [LegacyRouteConverter] Unsupported route path: "/api/v1/*". In previous versions, the 
symbols ?, *, and + were used to denote optional or repeating path parameters. The latest version of "path-to-regexp" now requires the use of named parameters. For example, instead of using a route like /users/* to capture all routes starting with "/users", you should use /users/*path. For more details, refer to the migration guide. Attempting to auto-convert...
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RoutesResolver] WbsController {/api/v1/wbs}: +5ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budgets, GET} route +20ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget/rollup, GET} route +2ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budgets/export, GET} route +4ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/expenses, GET} route +3ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/exceptions, GET} route +2ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/expenses/export, GET} route +2ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget-draft/:id, DELETE} route +3ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget-draft, POST} route +3ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget-draft/batch, POST} route +6ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/budget-draft/:id, PATCH} route +2ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/expense/live-entry, POST} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/wbs/expense/live-entry/:id, PATCH} route +1ms        
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RoutesResolver] AiController {/api/v1/ai}: +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/ai/draft-budget, POST} route +9ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RoutesResolver] DcsController {/api/v1/dcs}: +2ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/dcs/schedule-report, POST} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RoutesResolver] ProjectsController {/api/v1/projects}: +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/projects, POST} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/projects/lpo, POST} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/projects, GET} route +0ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id, GET} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id/rollup, GET} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id, PATCH} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id, DELETE} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id/cashflow, GET} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id/inflow, POST} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id/audits, GET} route +0ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id/lpos, GET} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/projects/:id/inflows, GET} route +3ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/projects/export, GET} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RoutesResolver] AuthController {/api/v1/auth}: +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/login/super, POST} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/login/tenant, POST} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/logout, POST} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/register, POST} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/test-secure, GET} route +2ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/validate, GET} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/me, GET} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/users, GET} route +2ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/users, POST} route +0ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/users/:id, PATCH} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/auth/users/:id, DELETE} route +3ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RoutesResolver] AuditController {/api/v1/admin/audit}: +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/admin/audit/logs, GET} route +2ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RoutesResolver] TenantController {/api/v1/admin/tenants}: +0ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants, GET} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:id, GET} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:id, PATCH} route +0ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/admin/tenants/:id, DELETE} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RoutesResolver] SearchController {/api/v1/search}: +0ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/search, GET} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RoutesResolver] OperationalBudgetsController {/api/v1/operational-budgets}: +0ms     
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets, POST} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets/expense, POST} route +1ms        
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets/payroll, POST} route +0ms        
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets, GET} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets/:id, GET} route +0ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets/:id, PATCH} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets/:id, DELETE} route +0ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets/export, GET} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/operational-budgets/run-bot, POST} route +1ms        
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RoutesResolver] SuperAdminController {/api/v1/super}: +0ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/tenants, POST} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/tenants, GET} route +2ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/tenants/:id, PATCH} route +3ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/tenants/:id/plan, GET} route +2ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/tenants/:id/plan, PATCH} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/analytics/tenant-count, GET} route +2ms        
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/analytics/tenant-growth, GET} route +2ms       
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/analytics/user-growth, GET} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/analytics/system-health, GET} route +1ms       
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/analytics/total-users, GET} route +2ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/analytics/mrr-estimate, GET} route +3ms        
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/analytics/wbs-metrics, GET} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/analytics/operational-budget-metrics, GET} route +2ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/tenants/:id/impersonate, POST} route +2ms      
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RoutesResolver] BillingController {/api/v1/super/billing}: +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/billing/overview, GET} route +4ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/billing/invoices, GET} route +2ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/billing/invoices/:id/download, GET} route +2ms 
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RoutesResolver] SettingsController {/api/v1/super/settings}: +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/settings, GET} route +2ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/settings, PUT} route +2ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/super/settings/test-email, POST} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RoutesResolver] DashboardController {/api/v1/dashboard}: +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [RouterExplorer] Mapped {/api/v1/dashboard/summary, GET} route +1ms
[Nest] 18712  - 01/18/2026, 6:56:31 PM     LOG [InitialSuperAdminSeederService] --- Starting SuperAdmin Seeding (NODE_ENV: development) ---
[Nest] 18712  - 01/18/2026, 6:56:31 PM    WARN [InitialSuperAdminSeederService] Using development default SuperAdmin credentials: superadmin@sentinelfi.com / password
query: SELECT DISTINCT "distinctAlias"."RoleEntity_id" AS "ids_RoleEntity_id" FROM (SELECT "RoleEntity"."id" AS "RoleEntity_id", "RoleEntity"."name" AS "RoleEntity_name", "RoleEntity"."description" AS "RoleEntity_description", "RoleEntity__permissions"."id" AS "RoleEntity__permissions_id", "RoleEntity__permissions"."name" AS "RoleEntity__permissions_name", "RoleEntity__permissions"."description" 
AS "RoleEntity__permissions_description" FROM "public"."roles" "RoleEntity" LEFT JOIN "public"."role_permissions" "RoleEntity_RoleEntity__permissions" ON "RoleEntity_RoleEntity__permissions"."role_id"="RoleEntity"."id" LEFT JOIN "public"."permissions" "RoleEntity__permissions" ON "RoleEntity__permissions"."id"="RoleEntity_RoleEntity__permissions"."permission_id" WHERE (("RoleEntity"."name" = $1))) "distinctAlias" ORDER BY "RoleEntity_id" ASC LIMIT 1 -- PARAMETERS: ["SuperAdmin"]
query: SELECT "RoleEntity"."id" AS "RoleEntity_id", "RoleEntity"."name" AS "RoleEntity_name", "RoleEntity"."description" AS "RoleEntity_description", "RoleEntity__permissions"."id" AS "RoleEntity__permissions_id", "RoleEntity__permissions"."name" AS "RoleEntity__permissions_name", "RoleEntity__permissions"."description" AS "RoleEntity__permissions_description" FROM "public"."roles" "RoleEntity" LEFT JOIN "public"."role_permissions" "RoleEntity_RoleEntity__permissions" ON "RoleEntity_RoleEntity__permissions"."role_id"="RoleEntity"."id" LEFT JOIN "public"."permissions" "RoleEntity__permissions" ON "RoleEntity__permissions"."id"="RoleEntity_RoleEntity__permissions"."permission_id" WHERE ( (("RoleEntity"."name" = $1)) ) AND ( "RoleEntity"."id" IN ($2) ) -- PARAMETERS: ["SuperAdmin","c0da617e-3d24-4dd6-bdc4-7a7bef6290e8"]
query: SELECT "user"."id" AS "user_id", "user"."email" AS "user_email", "user"."first_name" AS "user_first_name", "user"."last_name" 
AS "user_last_name", "user"."is_active" AS "user_is_active", "user"."created_at" AS "user_created_at", "user"."updated_at" AS "user_updated_at", "user"."tenant_id" AS "user_tenant_id", "user"."reset_password_token" AS "user_reset_password_token", "user"."reset_password_expires" AS "user_reset_password_expires", "user"."password_hash" AS "user_password_hash", "role"."id" AS "role_id", "role"."name" AS "role_name", "role"."description" AS "role_description" FROM "public"."user" "user" LEFT JOIN "public"."user_roles" "user_role" 
ON "user_role"."user_id"="user"."id" LEFT JOIN "public"."roles" "role" ON "role"."id"="user_role"."role_id" WHERE "user"."email" = $1 -- PARAMETERS: ["superadmin@sentinelfi.com"]
[Nest] 18712  - 01/18/2026, 6:56:39 PM     LOG [InitialSuperAdminSeederService] SuperAdmin user 'superadmin@sentinelfi.com' found. Ensuring correct configuration...
[Nest] 18712  - 01/18/2026, 6:56:39 PM     LOG [InitialSuperAdminSeederService] SuperAdmin user 'superadmin@sentinelfi.com' is already configured correctly. Skipping update.
[Nest] 18712  - 01/18/2026, 6:56:39 PM     LOG [InitialSuperAdminSeederService] SuperAdmin password was not changed.
[Nest] 18712  - 01/18/2026, 6:56:39 PM     LOG [InitialSuperAdminSeederService] --- SuperAdmin Seeding Complete ---
[Nest] 18712  - 01/18/2026, 6:56:39 PM     LOG [NestApplication] Nest application successfully started +1ms
[Nest] 18712  - 01/18/2026, 6:56:39 PM     LOG [Bootstrap] 🚀 SentinelFi API is running on: http://localhost:3001/api/v1
[Nest] 18712  - 01/18/2026, 6:56:39 PM     LOG [Bootstrap] 📡 CORS enabled for: http://localhost:3000
[Nest] 18712  - 01/18/2026, 6:56:39 PM     LOG [Bootstrap] 🍪 Cookie-based authentication active
[Nest] 18712  - 01/18/2026, 6:57:26 PM     LOG [Bootstrap] [2026-01-18T17:57:26.568Z] POST /api/v1/auth/login/super
[Nest] 18712  - 01/18/2026, 6:57:26 PM   DEBUG [Bootstrap] Cookies present: ["access_token"]
[Nest] 18712  - 01/18/2026, 6:57:26 PM   DEBUG [Bootstrap] Authorization header present: false
[Nest] 18712  - 01/18/2026, 6:57:27 PM   DEBUG [TenancyMiddleware] Invalid or expired JWT in TenancyMiddleware. Proceeding without tenant context.
[Nest] 18712  - 01/18/2026, 6:57:44 PM   DEBUG [TenancyMiddleware] [TenancyMiddleware] Context set. Tenant: None, Schema: public
[Nest] 18712  - 01/18/2026, 6:57:44 PM     LOG [AuthService] [LOGIN ATTEMPT] For email: superadmin@sentinelfi.com, expected type: SuperAdmin, tenantId: N/A
query: SELECT DISTINCT "distinctAlias"."UserEntity_id" AS "ids_UserEntity_id" FROM (SELECT "UserEntity"."id" AS "UserEntity_id", "UserEntity"."email" AS "UserEntity_email", "UserEntity"."password_hash" AS "UserEntity_password_hash", "UserEntity"."first_name" AS "UserEntity_first_name", "UserEntity"."last_name" AS "UserEntity_last_name", "UserEntity"."is_active" AS "UserEntity_is_active", "UserEntity"."created_at" AS "UserEntity_created_at", "UserEntity"."updated_at" AS "UserEntity_updated_at", "UserEntity"."tenant_id" AS "UserEntity_tenant_id", "UserEntity"."reset_password_token" AS "UserEntity_reset_password_token", "UserEntity"."reset_password_expires" AS "UserEntity_reset_password_expires", "UserEntity__UserEntity_tenant"."tenant_id" AS "UserEntity__UserEntity_tenant_tenant_id", "UserEntity__UserEntity_tenant"."name" AS "UserEntity__UserEntity_tenant_name", "UserEntity__UserEntity_tenant"."schema_name" AS "UserEntity__UserEntity_tenant_schema_name", "UserEntity__UserEntity_tenant"."is_active" AS "UserEntity__UserEntity_tenant_is_active", "UserEntity__UserEntity_tenant"."plan" AS "UserEntity__UserEntity_tenant_plan", "UserEntity__UserEntity_tenant"."created_at" AS "UserEntity__UserEntity_tenant_created_at", "UserEntity__UserEntity_tenant"."updated_at" AS "UserEntity__UserEntity_tenant_updated_at", "UserEntity__UserEntity_roles"."id" AS "UserEntity__UserEntity_roles_id", "UserEntity__UserEntity_roles"."name" AS "UserEntity__UserEntity_roles_name", "UserEntity__UserEntity_roles"."description" AS "UserEntity__UserEntity_roles_description", "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc"."id" AS "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc_id", "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc"."name" AS "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc_name", "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc"."description" AS "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc_description" FROM "public"."user" "UserEntity" LEFT JOIN "public"."tenants" "UserEntity__UserEntity_tenant" ON "UserEntity__UserEntity_tenant"."tenant_id"="UserEntity"."tenant_id"  LEFT JOIN "public"."user_roles" "UserEntity_UserEntity__UserEntity_roles" ON "UserEntity_UserEntity__UserEntity_roles"."user_id"="UserEntity"."id" LEFT JOIN "public"."roles" "UserEntity__UserEntity_roles" ON "UserEntity__UserEntity_roles"."id"="UserEntity_UserEntity__UserEntity_roles"."role_id"  LEFT JOIN "public"."role_permissions" "fb8c2979c3387ca661fb40e3f0dd9eb98ef638d8" ON "fb8c2979c3387ca661fb40e3f0dd9eb98ef638d8"."role_id"="UserEntity__UserEntity_roles"."id" LEFT JOIN "public"."permissions" "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc" ON "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc"."id"="fb8c2979c3387ca661fb40e3f0dd9eb98ef638d8"."permission_id" WHERE (("UserEntity"."email" = $1))) "distinctAlias" ORDER BY "UserEntity_id" ASC LIMIT 1 -- PARAMETERS: ["superadmin@sentinelfi.com"]
query: SELECT "UserEntity"."id" AS "UserEntity_id", "UserEntity"."email" AS "UserEntity_email", "UserEntity"."password_hash" AS "UserEntity_password_hash", "UserEntity"."first_name" AS "UserEntity_first_name", "UserEntity"."last_name" AS "UserEntity_last_name", "UserEntity"."is_active" AS "UserEntity_is_active", "UserEntity"."created_at" AS "UserEntity_created_at", "UserEntity"."updated_at" AS "UserEntity_updated_at", "UserEntity"."tenant_id" AS "UserEntity_tenant_id", "UserEntity"."reset_password_token" AS "UserEntity_reset_password_token", "UserEntity"."reset_password_expires" AS "UserEntity_reset_password_expires", "UserEntity__UserEntity_tenant"."tenant_id" AS "UserEntity__UserEntity_tenant_tenant_id", "UserEntity__UserEntity_tenant"."name" AS "UserEntity__UserEntity_tenant_name", "UserEntity__UserEntity_tenant"."schema_name" AS "UserEntity__UserEntity_tenant_schema_name", "UserEntity__UserEntity_tenant"."is_active" AS "UserEntity__UserEntity_tenant_is_active", "UserEntity__UserEntity_tenant"."plan" AS "UserEntity__UserEntity_tenant_plan", "UserEntity__UserEntity_tenant"."created_at" AS "UserEntity__UserEntity_tenant_created_at", "UserEntity__UserEntity_tenant"."updated_at" 
AS "UserEntity__UserEntity_tenant_updated_at", "UserEntity__UserEntity_roles"."id" AS "UserEntity__UserEntity_roles_id", "UserEntity__UserEntity_roles"."name" AS "UserEntity__UserEntity_roles_name", "UserEntity__UserEntity_roles"."description" AS "UserEntity__UserEntity_roles_description", "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc"."id" AS "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc_id", "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc"."name" AS "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc_name", "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc"."description" AS "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc_description" FROM "public"."user" "UserEntity" LEFT JOIN "public"."tenants" "UserEntity__UserEntity_tenant" ON "UserEntity__UserEntity_tenant"."tenant_id"="UserEntity"."tenant_id"  LEFT JOIN "public"."user_roles" "UserEntity_UserEntity__UserEntity_roles" ON "UserEntity_UserEntity__UserEntity_roles"."user_id"="UserEntity"."id" LEFT JOIN 
"public"."roles" "UserEntity__UserEntity_roles" ON "UserEntity__UserEntity_roles"."id"="UserEntity_UserEntity__UserEntity_roles"."role_id"  LEFT JOIN "public"."role_permissions" "fb8c2979c3387ca661fb40e3f0dd9eb98ef638d8" ON "fb8c2979c3387ca661fb40e3f0dd9eb98ef638d8"."role_id"="UserEntity__UserEntity_roles"."id" LEFT JOIN "public"."permissions" "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc" ON "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc"."id"="fb8c2979c3387ca661fb40e3f0dd9eb98ef638d8"."permission_id" WHERE ( (("UserEntity"."email" = 
$1)) ) AND ( "UserEntity"."id" IN ($2) ) -- PARAMETERS: ["superadmin@sentinelfi.com","4c833574-5042-4da1-b8a4-61b5517f958d"]
[Nest] 18712  - 01/18/2026, 6:58:00 PM     LOG [AuthService] [LOGIN] User found: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 18712  - 01/18/2026, 6:58:00 PM     LOG [AuthService] [LOGIN] User password_hash presence: true
[Nest] 18712  - 01/18/2026, 6:58:00 PM     LOG [AuthService] [LOGIN SUCCESS] Password validation passed for superadmin@sentinelfi.com.
[Nest] 18712  - 01/18/2026, 6:58:00 PM     LOG [AuthService] [AuthService:Login] JWT Payload generated: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null}
query: START TRANSACTION
query: INSERT INTO "public"."audit_log"("id", "timestamp", "userId", "userEmail", "action", "targetType", "targetId", "details", "ipAddress", "tenantId", "actionType") VALUES (DEFAULT, DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING "id", "timestamp" -- PARAMETERS: ["4c833574-5042-4da1-b8a4-61b5517f958d","superadmin@sentinelfi.com","LOGIN_SUCCESS",null,null,null,null,null,"LOGIN_SUCCESS"] 
query: COMMIT
[Nest] 18712  - 01/18/2026, 6:58:04 PM     LOG [AuthController] [Login] Setting cookie with options: {"httpOnly":true,"secure":false,"sameSite":"lax","path":"/","maxAge":3600000}
[Nest] 18712  - 01/18/2026, 6:58:48 PM     LOG [Bootstrap] [2026-01-18T17:58:48.891Z] POST /api/v1/auth/login/super
[Nest] 18712  - 01/18/2026, 6:58:48 PM   DEBUG [Bootstrap] Cookies present: ["access_token"]
[Nest] 18712  - 01/18/2026, 6:58:48 PM   DEBUG [Bootstrap] Authorization header present: false
[Nest] 18712  - 01/18/2026, 6:58:48 PM   DEBUG [TenancyMiddleware] Invalid or expired JWT in TenancyMiddleware. Proceeding without tenant context.
[Nest] 18712  - 01/18/2026, 6:58:53 PM   DEBUG [TenancyMiddleware] [TenancyMiddleware] Context set. Tenant: None, Schema: public
[Nest] 18712  - 01/18/2026, 6:58:53 PM     LOG [AuthService] [LOGIN ATTEMPT] For email: superadmin@sentinelfi.com, expected type: SuperAdmin, tenantId: N/A
query: SELECT DISTINCT "distinctAlias"."UserEntity_id" AS "ids_UserEntity_id" FROM (SELECT "UserEntity"."id" AS "UserEntity_id", "UserEntity"."email" AS "UserEntity_email", "UserEntity"."password_hash" AS "UserEntity_password_hash", "UserEntity"."first_name" AS "UserEntity_first_name", "UserEntity"."last_name" AS "UserEntity_last_name", "UserEntity"."is_active" AS "UserEntity_is_active", "UserEntity"."created_at" AS "UserEntity_created_at", "UserEntity"."updated_at" AS "UserEntity_updated_at", "UserEntity"."tenant_id" AS "UserEntity_tenant_id", "UserEntity"."reset_password_token" AS "UserEntity_reset_password_token", "UserEntity"."reset_password_expires" AS "UserEntity_reset_password_expires", "UserEntity__UserEntity_tenant"."tenant_id" AS "UserEntity__UserEntity_tenant_tenant_id", "UserEntity__UserEntity_tenant"."name" AS "UserEntity__UserEntity_tenant_name", "UserEntity__UserEntity_tenant"."schema_name" AS "UserEntity__UserEntity_tenant_schema_name", "UserEntity__UserEntity_tenant"."is_active" AS "UserEntity__UserEntity_tenant_is_active", "UserEntity__UserEntity_tenant"."plan" AS "UserEntity__UserEntity_tenant_plan", "UserEntity__UserEntity_tenant"."created_at" AS "UserEntity__UserEntity_tenant_created_at", "UserEntity__UserEntity_tenant"."updated_at" AS "UserEntity__UserEntity_tenant_updated_at", "UserEntity__UserEntity_roles"."id" AS "UserEntity__UserEntity_roles_id", "UserEntity__UserEntity_roles"."name" AS "UserEntity__UserEntity_roles_name", "UserEntity__UserEntity_roles"."description" AS "UserEntity__UserEntity_roles_description", "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc"."id" AS "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc_id", "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc"."name" AS "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc_name", "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc"."description" AS "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc_description" FROM "public"."user" "UserEntity" LEFT JOIN "public"."tenants" "UserEntity__UserEntity_tenant" ON "UserEntity__UserEntity_tenant"."tenant_id"="UserEntity"."tenant_id"  LEFT JOIN "public"."user_roles" "UserEntity_UserEntity__UserEntity_roles" ON "UserEntity_UserEntity__UserEntity_roles"."user_id"="UserEntity"."id" LEFT JOIN "public"."roles" "UserEntity__UserEntity_roles" ON "UserEntity__UserEntity_roles"."id"="UserEntity_UserEntity__UserEntity_roles"."role_id"  LEFT JOIN "public"."role_permissions" "fb8c2979c3387ca661fb40e3f0dd9eb98ef638d8" ON "fb8c2979c3387ca661fb40e3f0dd9eb98ef638d8"."role_id"="UserEntity__UserEntity_roles"."id" LEFT JOIN "public"."permissions" "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc" ON "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc"."id"="fb8c2979c3387ca661fb40e3f0dd9eb98ef638d8"."permission_id" WHERE (("UserEntity"."email" = $1))) "distinctAlias" ORDER BY "UserEntity_id" ASC LIMIT 1 -- PARAMETERS: ["superadmin@sentinelfi.com"]
query: SELECT "UserEntity"."id" AS "UserEntity_id", "UserEntity"."email" AS "UserEntity_email", "UserEntity"."password_hash" AS "UserEntity_password_hash", "UserEntity"."first_name" AS "UserEntity_first_name", "UserEntity"."last_name" AS "UserEntity_last_name", "UserEntity"."is_active" AS "UserEntity_is_active", "UserEntity"."created_at" AS "UserEntity_created_at", "UserEntity"."updated_at" AS "UserEntity_updated_at", "UserEntity"."tenant_id" AS "UserEntity_tenant_id", "UserEntity"."reset_password_token" AS "UserEntity_reset_password_token", "UserEntity"."reset_password_expires" AS "UserEntity_reset_password_expires", "UserEntity__UserEntity_tenant"."tenant_id" AS "UserEntity__UserEntity_tenant_tenant_id", "UserEntity__UserEntity_tenant"."name" AS "UserEntity__UserEntity_tenant_name", "UserEntity__UserEntity_tenant"."schema_name" AS "UserEntity__UserEntity_tenant_schema_name", "UserEntity__UserEntity_tenant"."is_active" AS "UserEntity__UserEntity_tenant_is_active", "UserEntity__UserEntity_tenant"."plan" AS "UserEntity__UserEntity_tenant_plan", "UserEntity__UserEntity_tenant"."created_at" AS "UserEntity__UserEntity_tenant_created_at", "UserEntity__UserEntity_tenant"."updated_at" 
AS "UserEntity__UserEntity_tenant_updated_at", "UserEntity__UserEntity_roles"."id" AS "UserEntity__UserEntity_roles_id", "UserEntity__UserEntity_roles"."name" AS "UserEntity__UserEntity_roles_name", "UserEntity__UserEntity_roles"."description" AS "UserEntity__UserEntity_roles_description", "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc"."id" AS "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc_id", "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc"."name" AS "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc_name", "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc"."description" AS "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc_description" FROM "public"."user" "UserEntity" LEFT JOIN "public"."tenants" "UserEntity__UserEntity_tenant" ON "UserEntity__UserEntity_tenant"."tenant_id"="UserEntity"."tenant_id"  LEFT JOIN "public"."user_roles" "UserEntity_UserEntity__UserEntity_roles" ON "UserEntity_UserEntity__UserEntity_roles"."user_id"="UserEntity"."id" LEFT JOIN 
"public"."roles" "UserEntity__UserEntity_roles" ON "UserEntity__UserEntity_roles"."id"="UserEntity_UserEntity__UserEntity_roles"."role_id"  LEFT JOIN "public"."role_permissions" "fb8c2979c3387ca661fb40e3f0dd9eb98ef638d8" ON "fb8c2979c3387ca661fb40e3f0dd9eb98ef638d8"."role_id"="UserEntity__UserEntity_roles"."id" LEFT JOIN "public"."permissions" "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc" ON "3569b22d41e808a03c4d75a85cfc39c69a1e1bcc"."id"="fb8c2979c3387ca661fb40e3f0dd9eb98ef638d8"."permission_id" WHERE ( (("UserEntity"."email" = 
$1)) ) AND ( "UserEntity"."id" IN ($2) ) -- PARAMETERS: ["superadmin@sentinelfi.com","4c833574-5042-4da1-b8a4-61b5517f958d"]
[Nest] 18712  - 01/18/2026, 6:58:55 PM     LOG [AuthService] [LOGIN] User found: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 18712  - 01/18/2026, 6:58:55 PM     LOG [AuthService] [LOGIN] User password_hash presence: true
[Nest] 18712  - 01/18/2026, 6:58:56 PM    WARN [AuthService] [LOGIN FAILED] Invalid password for user: superadmin@sentinelfi.com
query: START TRANSACTION
query: INSERT INTO "public"."audit_log"("id", "timestamp", "userId", "userEmail", "action", "targetType", "targetId", "details", "ipAddress", "tenantId", "actionType") VALUES (DEFAULT, DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING "id", "timestamp" -- PARAMETERS: [null,"superadmin@sentinelfi.com","LOGIN_FAILURE",null,null,"{\"reason\":\"Invalid password\"}",null,null,"LOGIN_FAILURE"]    
query: COMMIT
[Nest] 18712  - 01/18/2026, 6:58:58 PM   ERROR [AuthController] SuperAdmin login controller error:
[Nest] 18712  - 01/18/2026, 6:58:58 PM   ERROR [AuthController] UnauthorizedException: Invalid credentials.
    at AuthService.login (C:\temp\SentinelFi\backend\src\auth\auth.service.ts:144:13)
    at processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async AuthController.loginSuperAdmin (C:\temp\SentinelFi\backend\src\auth\auth.controller.ts:74:22) {
  response: {
    message: 'Invalid credentials.',
    error: 'Unauthorized',
    statusCode: 401
  },
  status: 401,
  options: {}
}
[Nest] 18712  - 01/18/2026, 6:59:21 PM     LOG [Bootstrap] [2026-01-18T17:59:21.631Z] POST /api/v1/auth/login/super
[Nest] 18712  - 01/18/2026, 6:59:21 PM   DEBUG [Bootstrap] Cookies present: ["access_token"]
[Nest] 18712  - 01/18/2026, 6:59:21 PM   DEBUG [Bootstrap] Authorization header present: false
[Nest] 18712  - 01/18/2026, 6:59:21 PM   DEBUG [TenancyMiddleware] Invalid or expired JWT in TenancyMiddleware. Proceeding without tenant context.
[Nest] 18712  - 01/18/2026, 6:59:49 PM   ERROR [ExceptionsHandler] error: Authentication timed out
    at parseErrorMessage (C:\temp\SentinelFi\node_modules\pg-protocol\src\parser.ts:394:9)
    at Parser.handlePacket (C:\temp\SentinelFi\node_modules\pg-protocol\src\parser.ts:212:19)
    at Parser.parse (C:\temp\SentinelFi\node_modules\pg-protocol\src\parser.ts:105:30)
    at TLSSocket.<anonymous> (C:\temp\SentinelFi\node_modules\pg-protocol\src\index.ts:7:48)
    at TLSSocket.emit (node:events:519:28)
    at TLSSocket.emit (node:domain:489:12)
    at addChunk (node:internal/streams/readable:561:12)
    at readableAddChunkPushByteMode (node:internal/streams/readable:512:3)
    at TLSSocket.Readable.push (node:internal/streams/readable:392:5)
    at TLSWrap.onStreamRead (node:internal/stream_base_commons:189:23)
    at TLSWrap.callbackTrampoline (node:internal/async_hooks:130:17) {
  length: 45,
  severity: 'ERROR',
  code: '08P01',
  detail: undefined,
  hint: undefined,
  position: undefined,
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: undefined,
  line: undefined,
  routine: undefined
}

