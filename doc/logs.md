Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
websocket.js:46 [HMR] connected
AuthContext.tsx:16 [AUTH INFO] AuthProvider mounting... 
AuthContext.tsx:16 [AUTH INFO] Fetching current user session... 
AuthContext.tsx:16 [AUTH INFO] AuthProvider mounting... 
api.ts:82 [API] [CID:1769315951087-tbv6a99yi] → GET /auth/me
2AuthContext.tsx:16 [AUTH INFO] User fetch request aborted (expected during navigation/cleanup). 
2AuthContext.tsx:25 [AUTH SUCCESS] Auth initialization complete. 
warn-once.js:16 Image with src "/SentinelFi Logo Concept-bg-remv-logo-only.png" has either width or height modified, but not the other. If you use CSS to change the size of your image, also include the styles 'width: "auto"' or 'height: "auto"' to maintain the aspect ratio.
warnOnce @ warn-once.js:16
eval @ image-component.js:106
Promise.then
handleLoading @ image-component.js:35
onLoad @ image-component.js:194
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
dispatchEvent @ react-dom.development.js:6457Understand this warning
AuthContext.tsx:16 [AUTH INFO] Attempting super login for: superadmin@sentinelfi.com 
api.ts:82 [API] [CID:1769315956810-6q0ctuvpn] → POST /auth/login/super
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:110 [API] [CID:1769315956810-6q0ctuvpn] ✗ 500 POST /auth/login/super (73ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:123 [API] Retrying request (1/3) in 606ms...
eval @ api.ts:123
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this warning
api.ts:82 [API] [CID:1769315957492-js51e8uvc] → POST /auth/login/super
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:110 [API] [CID:1769315957492-js51e8uvc] ✗ 500 POST /auth/login/super (30ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:123 [API] Retrying request (2/3) in 1249ms...
eval @ api.ts:123
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this warning
api.ts:82 [API] [CID:1769315958773-8o3m5a5vc] → POST /auth/login/super
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:110 [API] [CID:1769315958773-8o3m5a5vc] ✗ 500 POST /auth/login/super (27ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:123 [API] Retrying request (3/3) in 2422ms...
eval @ api.ts:123
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this warning
api.ts:82 [API] [CID:1769315961224-ockr2wne1] → POST /auth/login/super
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:110 [API] [CID:1769315961224-ockr2wne1] ✗ 500 POST /auth/login/super (19ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
AuthContext.tsx:22 [AUTH ERROR] [Login] Unexpected error during login: Error: Request failed with status code 500
    at eval (AuthContext.tsx:357:13)
    at async handleSubmit (login.tsx:181:7)
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
error @ AuthContext.tsx:22
handleSubmit @ login.tsx:188
await in handleSubmit
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
AuthContext.tsx:16 [AUTH INFO] Attempting super login for: superadmin@sentinelfi.com 
api.ts:82 [API] [CID:1769315963493-66z5vy72v] → POST /auth/login/super
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:110 [API] [CID:1769315963493-66z5vy72v] ✗ 500 POST /auth/login/super (82ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:123 [API] Retrying request (1/3) in 695ms...
eval @ api.ts:123
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this warning
api.ts:82 [API] [CID:1769315964274-5nunhzqgv] → POST /auth/login/super
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:110 [API] [CID:1769315964274-5nunhzqgv] ✗ 500 POST /auth/login/super (16ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:123 [API] Retrying request (2/3) in 1262ms...
eval @ api.ts:123
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this warning
api.ts:82 [API] [CID:1769315965553-6mwykp3ju] → POST /auth/login/super
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:110 [API] [CID:1769315965553-6mwykp3ju] ✗ 500 POST /auth/login/super (20ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:123 [API] Retrying request (3/3) in 2425ms...
eval @ api.ts:123
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this warning
api.ts:82 [API] [CID:1769315968000-31ahck7i5] → POST /auth/login/super
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:110 [API] [CID:1769315968000-31ahck7i5] ✗ 500 POST /auth/login/super (65ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
AuthContext.tsx:22 [AUTH ERROR] [Login] Unexpected error during login: Error: Request failed with status code 500
    at eval (AuthContext.tsx:357:13)
    at async handleSubmit (login.tsx:181:7)
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
error @ AuthContext.tsx:22
handleSubmit @ login.tsx:188
await in handleSubmit
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
about:client:1  GET https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap net::ERR_CONNECTION_CLOSEDUnderstand this error
AuthContext.tsx:16 [AUTH INFO] Attempting super login for: superadmin@sentinelfi.com 
api.ts:82 [API] [CID:1769315975112-9ijfdvflw] → POST /auth/login/super
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:110 [API] [CID:1769315975112-9ijfdvflw] ✗ 500 POST /auth/login/super (57ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:123 [API] Retrying request (1/3) in 648ms...
eval @ api.ts:123
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this warning
api.ts:82 [API] [CID:1769315975821-28pumqh11] → POST /auth/login/super
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:110 [API] [CID:1769315975821-28pumqh11] ✗ 500 POST /auth/login/super (50ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:123 [API] Retrying request (2/3) in 1238ms...
eval @ api.ts:123
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this warning
api.ts:82 [API] [CID:1769315977110-wm1rhde27] → POST /auth/login/super
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:110 [API] [CID:1769315977110-wm1rhde27] ✗ 500 POST /auth/login/super (22ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:123 [API] Retrying request (3/3) in 2485ms...
eval @ api.ts:123
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this warning
api.ts:82 [API] [CID:1769315979619-kiqacijh6] → POST /auth/login/super
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:110 [API] [CID:1769315979619-kiqacijh6] ✗ 500 POST /auth/login/super (18ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
AuthContext.tsx:22 [AUTH ERROR] [Login] Unexpected error during login: Error: Request failed with status code 500
    at eval (AuthContext.tsx:357:13)
    at async handleSubmit (login.tsx:181:7)
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
error @ AuthContext.tsx:22
handleSubmit @ login.tsx:188
await in handleSubmit
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
AuthContext.tsx:16 [AUTH INFO] Attempting super login for: superadmin@sentinelfi.com 
api.ts:82 [API] [CID:1769315988316-5yo02mehg] → POST /auth/login/super
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:110 [API] [CID:1769315988316-5yo02mehg] ✗ 500 POST /auth/login/super (29ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:123 [API] Retrying request (1/3) in 646ms...
eval @ api.ts:123
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this warning
api.ts:82 [API] [CID:1769315988992-86ey60g67] → POST /auth/login/super
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:110 [API] [CID:1769315988992-86ey60g67] ✗ 500 POST /auth/login/super (30ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:123 [API] Retrying request (2/3) in 1261ms...
eval @ api.ts:123
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this warning
api.ts:82 [API] [CID:1769315990285-mjyr4lf6h] → POST /auth/login/super
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:110 [API] [CID:1769315990285-mjyr4lf6h] ✗ 500 POST /auth/login/super (34ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:123 [API] Retrying request (3/3) in 2483ms...
eval @ api.ts:123
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
dispatchDiscreteEvent @ react-dom.development.js:6430Understand this warning
api.ts:82 [API] [CID:1769315992804-2g9xlvefj] → POST /auth/login/super
inject.js:2  POST http://localhost:3000/api/v1/auth/login/super 500 (Internal Server Error)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
api.ts:110 [API] [CID:1769315992804-2g9xlvefj] ✗ 500 POST /auth/login/super (29ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:125
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
apiRequest @ api.ts:144
post @ api.ts:157
eval @ AuthContext.tsx:346
handleSubmit @ login.tsx:181
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
AuthContext.tsx:22 [AUTH ERROR] [Login] Unexpected error during login: Error: Request failed with status code 500
    at eval (AuthContext.tsx:357:13)
    at async handleSubmit (login.tsx:181:7)
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
error @ AuthContext.tsx:22
handleSubmit @ login.tsx:188
await in handleSubmit
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