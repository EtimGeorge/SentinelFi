vendor.js:2513 Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
websocket.js:46 [HMR] connected
AuthContext.tsx:16 [AUTH INFO] AuthProvider mounting... 
AuthContext.tsx:16 [AUTH INFO] Fetching current user session... 
AuthContext.tsx:16 [AUTH INFO] AuthProvider mounting... 
api.ts:82 [API] [CID:1769317023129-jgikdcbxd] → GET /auth/me
2AuthContext.tsx:16 [AUTH INFO] User fetch request aborted (expected during navigation/cleanup). 
2AuthContext.tsx:25 [AUTH SUCCESS] Auth initialization complete. 
login:1 [Intervention] Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: chrome-extension://okfkdaglfjjjfefdcppliegebpoegaii/assets/PublicSans-VariableFont_wght.ttf
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
warn-once.js:16 Image with src "/SentinelFi Logo Concept-bg-remv-logo-only.png" was detected as the Largest Contentful Paint (LCP). Please add the "priority" property if this image is above the fold.
Read more: https://nextjs.org/docs/api-reference/next/image#priority
warnOnce @ warn-once.js:16
eval @ get-img-props.js:343Understand this warning
AuthContext.tsx:16 [AUTH INFO] Attempting super login for: superadmin@sentinelfi.com 
api.ts:82 [API] [CID:1769317029713-1y32sgvtl] → POST /auth/login/super
api.ts:95 [API] [CID:1769317029713-1y32sgvtl] ✓ 200 POST /auth/login/super (7345ms)
AuthContext.tsx:25 [AUTH SUCCESS] Authenticated as superadmin@sentinelfi.com 
AuthContext.tsx:16 [AUTH INFO] Session saved to localStorage 
AuthContext.tsx:25 [AUTH SUCCESS] [Login] Login successful - AuthContext will handle navigation 
index.tsx:151 [Dashboard] Mount effect triggered
index.tsx:107 [Dashboard] Starting data fetch...
index.tsx:112 [Dashboard] Fetching tenants...
index.tsx:151 [Dashboard] Mount effect triggered
index.tsx:107 [Dashboard] Starting data fetch...
index.tsx:112 [Dashboard] Fetching tenants...
api.ts:82 [API] [CID:1769317038027-jxf4p6rqm] → GET /super/tenants
api.ts:82 [API] [CID:1769317038028-yw8ix57x8] → GET /super/tenants
api.ts:95 [API] [CID:1769317038028-yw8ix57x8] ✓ 200 GET /super/tenants (2185ms)
index.tsx:114 [Dashboard] Tenants fetched: 2
index.tsx:118 [Dashboard] Fetching system health...
api.ts:82 [API] [CID:1769317040215-6101na88h] → GET /super/analytics/system-health
api.ts:95 [API] [CID:1769317038027-jxf4p6rqm] ✓ 200 GET /super/tenants (2371ms)
index.tsx:114 [Dashboard] Tenants fetched: 2
index.tsx:118 [Dashboard] Fetching system health...
api.ts:82 [API] [CID:1769317040399-4go31xjfr] → GET /super/analytics/system-health
about:client:1  GET https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap net::ERR_CONNECTION_CLOSEDUnderstand this error
api.ts:95 [API] [CID:1769317040399-4go31xjfr] ✓ 200 GET /super/analytics/system-health (6348ms)
index.tsx:122 [Dashboard] Fetching total users...
api.ts:82 [API] [CID:1769317046748-ct5tnw9zz] → GET /super/analytics/total-users
api.ts:95 [API] [CID:1769317040215-6101na88h] ✓ 200 GET /super/analytics/system-health (6961ms)
index.tsx:122 [Dashboard] Fetching total users...
api.ts:82 [API] [CID:1769317047177-e56ni09id] → GET /super/analytics/total-users
api.ts:95 [API] [CID:1769317047177-e56ni09id] ✓ 200 GET /super/analytics/total-users (1931ms)
index.tsx:124 [Dashboard] Total users fetched: undefined
index.tsx:128 [Dashboard] Fetching MRR...
api.ts:82 [API] [CID:1769317049109-pt1k4zp51] → GET /super/analytics/mrr-estimate
api.ts:95 [API] [CID:1769317046748-ct5tnw9zz] ✓ 200 GET /super/analytics/total-users (3810ms)
index.tsx:124 [Dashboard] Total users fetched: undefined
index.tsx:128 [Dashboard] Fetching MRR...
api.ts:82 [API] [CID:1769317050560-he62udexa] → GET /super/analytics/mrr-estimate
api.ts:95 [API] [CID:1769317049109-pt1k4zp51] ✓ 200 GET /super/analytics/mrr-estimate (2387ms)
index.tsx:133 [Dashboard] Fetching audit logs...
api.ts:82 [API] [CID:1769317051498-ujind8ohj] → GET /admin/audit/logs
inject.js:2  GET http://localhost:3000/api/v1/admin/audit/logs?limit=5 404 (Not Found)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
Axios.<computed> @ Axios.js:220
wrap @ bind.js:16
eval @ index.tsx:134
await in eval
eval @ index.tsx:152
commitHookEffectListMount @ react-dom.development.js:23145
invokePassiveEffectMountInDEV @ react-dom.development.js:25149
invokeEffectsInDev @ react-dom.development.js:27346
commitDoubleInvokeEffectsInDEV @ react-dom.development.js:27325
flushPassiveEffectsImpl @ react-dom.development.js:27051
flushPassiveEffects @ react-dom.development.js:26979
eval @ react-dom.development.js:26764
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
api.ts:110 [API] [CID:1769317051498-ujind8ohj] ✗ 404 GET /admin/audit/logs (85ms): Request failed with status code 404
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
Axios.<computed> @ Axios.js:220
wrap @ bind.js:16
eval @ index.tsx:134
await in eval
eval @ index.tsx:152
commitHookEffectListMount @ react-dom.development.js:23145
invokePassiveEffectMountInDEV @ react-dom.development.js:25149
invokeEffectsInDev @ react-dom.development.js:27346
commitDoubleInvokeEffectsInDEV @ react-dom.development.js:27325
flushPassiveEffectsImpl @ react-dom.development.js:27051
flushPassiveEffects @ react-dom.development.js:26979
eval @ react-dom.development.js:26764
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
index.tsx:140 [Dashboard] Fetch error: AxiosError {message: 'Request failed with status code 404', name: 'AxiosError', code: 'ERR_BAD_REQUEST', config: {…}, request: XMLHttpRequest, …}
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ index.tsx:140
await in eval
eval @ index.tsx:152
commitHookEffectListMount @ react-dom.development.js:23145
invokePassiveEffectMountInDEV @ react-dom.development.js:25149
invokeEffectsInDev @ react-dom.development.js:27346
commitDoubleInvokeEffectsInDEV @ react-dom.development.js:27325
flushPassiveEffectsImpl @ react-dom.development.js:27051
flushPassiveEffects @ react-dom.development.js:26979
eval @ react-dom.development.js:26764
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
index.tsx:145 [Dashboard] Setting loading to false
api.ts:95 [API] [CID:1769317050560-he62udexa] ✓ 200 GET /super/analytics/mrr-estimate (1890ms)
index.tsx:133 [Dashboard] Fetching audit logs...
api.ts:82 [API] [CID:1769317052452-o4582tw28] → GET /admin/audit/logs
inject.js:2  GET http://localhost:3000/api/v1/admin/audit/logs?limit=5 404 (Not Found)
T.d.send @ inject.js:2
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
Axios.<computed> @ Axios.js:220
wrap @ bind.js:16
eval @ index.tsx:134
await in eval
eval @ index.tsx:152
commitHookEffectListMount @ react-dom.development.js:23145
commitPassiveMountOnFiber @ react-dom.development.js:24921
commitPassiveMountEffects_complete @ react-dom.development.js:24886
commitPassiveMountEffects_begin @ react-dom.development.js:24873
commitPassiveMountEffects @ react-dom.development.js:24861
flushPassiveEffectsImpl @ react-dom.development.js:27034
flushPassiveEffects @ react-dom.development.js:26979
eval @ react-dom.development.js:26764
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
api.ts:110 [API] [CID:1769317052452-o4582tw28] ✗ 404 GET /admin/audit/logs (162ms): Request failed with status code 404
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:110
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
Axios.<computed> @ Axios.js:220
wrap @ bind.js:16
eval @ index.tsx:134
await in eval
eval @ index.tsx:152
commitHookEffectListMount @ react-dom.development.js:23145
commitPassiveMountOnFiber @ react-dom.development.js:24921
commitPassiveMountEffects_complete @ react-dom.development.js:24886
commitPassiveMountEffects_begin @ react-dom.development.js:24873
commitPassiveMountEffects @ react-dom.development.js:24861
flushPassiveEffectsImpl @ react-dom.development.js:27034
flushPassiveEffects @ react-dom.development.js:26979
eval @ react-dom.development.js:26764
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
index.tsx:140 [Dashboard] Fetch error: AxiosError {message: 'Request failed with status code 404', name: 'AxiosError', code: 'ERR_BAD_REQUEST', config: {…}, request: XMLHttpRequest, …}
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ index.tsx:140
await in eval
eval @ index.tsx:152
commitHookEffectListMount @ react-dom.development.js:23145
commitPassiveMountOnFiber @ react-dom.development.js:24921
commitPassiveMountEffects_complete @ react-dom.development.js:24886
commitPassiveMountEffects_begin @ react-dom.development.js:24873
commitPassiveMountEffects @ react-dom.development.js:24861
flushPassiveEffectsImpl @ react-dom.development.js:27034
flushPassiveEffects @ react-dom.development.js:26979
eval @ react-dom.development.js:26764
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
index.tsx:145 [Dashboard] Setting loading to false
super:1 Unchecked runtime.lastError: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was receivedUnderstand this error
2super:1 Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received