Error creating project: Request failed with status code 500

client.js:26 Warning: Encountered two children with the same key, `/dashboard/home`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
    at nav
    at Breadcrumbs (webpack-internal:///./components/common/Breadcrumbs.tsx:25:74)
    at main
    at div
    at div
    at SecuredLayoutContent (webpack-internal:///./components/Layout/SecuredLayoutUI.tsx:20:11)
    at SecuredLayout (webpack-internal:///./components/Layout/SecuredLayout.tsx:11:11)
    at AppContent (webpack-internal:///./pages/_app.tsx:44:11)
    at RouteGuard (webpack-internal:///./components/guards/RouteGuard.tsx:281:11)
    at CurrencyProvider (webpack-internal:///./components/context/CurrencyContext.tsx:37:11)
    at BreadcrumbProvider (webpack-internal:///./components/context/BreadcrumbContext.tsx:15:11)
    at AuthProvider (webpack-internal:///./components/context/AuthContext.tsx:130:11)
    at App (webpack-internal:///./pages/_app.tsx:104:53)
    at PathnameContextProviderAdapter (webpack-internal:///../node_modules/next/dist/shared/lib/router/adapters.js:80:11)
    at ErrorBoundary (webpack-internal:///../node_modules/next/dist/compiled/@next/react-dev-overlay/dist/client.js:26:6864)
    at ReactDevOverlay (webpack-internal:///../node_modules/next/dist/compiled/@next/react-dev-overlay/dist/client.js:26:9247)
    at Container (webpack-internal:///../node_modules/next/dist/client/index.js:80:1)
    at AppContainer (webpack-internal:///../node_modules/next/dist/client/index.js:188:11)
    at Root (webpack-internal:///../node_modules/next/dist/client/index.js:412:11)
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
printWarning @ react-dom.development.js:86
error @ react-dom.development.js:60
warnOnInvalidKey @ react-dom.development.js:15293
reconcileChildrenArray @ react-dom.development.js:15330
reconcileChildFibers @ react-dom.development.js:15821
reconcileChildren @ react-dom.development.js:19162
updateHostComponent @ react-dom.development.js:19919
beginWork @ react-dom.development.js:21613
beginWork$1 @ react-dom.development.js:27421
performUnitOfWork @ react-dom.development.js:26552
workLoopSync @ react-dom.development.js:26461
renderRootSync @ react-dom.development.js:26429
performConcurrentWorkOnRoot @ react-dom.development.js:25733
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
CurrencyContext.tsx:77 Failed to fetch currencies from backend. Path: /currency/supported. Error: CanceledError {message: 'canceled', name: 'CanceledError', code: 'ERR_CANCELED', config: {…}, stack: 'CanceledError: canceled\n    at throwIfCancellation…//./components/context/CurrencyContext.tsx:59:34)'}
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
fetchCurrencies @ CurrencyContext.tsx:77
await in fetchCurrencies
eval @ CurrencyContext.tsx:85
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
CurrencyContext.tsx:77 Failed to fetch currencies from backend. Path: /currency/supported. Error: CanceledError {message: 'canceled', name: 'CanceledError', code: 'ERR_CANCELED', config: {…}, stack: 'CanceledError: canceled\n    at throwIfCancellation…//./components/context/CurrencyContext.tsx:59:34)'}
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
fetchCurrencies @ CurrencyContext.tsx:77
await in fetchCurrencies
eval @ CurrencyContext.tsx:85
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
home.tsx:49 Failed to fetch projects: CanceledError {message: 'canceled', name: 'CanceledError', code: 'ERR_CANCELED', config: {…}, stack: 'CanceledError: canceled\n    at throwIfCancellation…///../node_modules/axios/lib/core/Axios.js:54:41)'}
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ home.tsx:49
Promise.catch
eval @ home.tsx:49
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
home.tsx:49 Failed to fetch projects: CanceledError {message: 'canceled', name: 'CanceledError', code: 'ERR_CANCELED', config: {…}, stack: 'CanceledError: canceled\n    at throwIfCancellation…///../node_modules/axios/lib/core/Axios.js:54:41)'}
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ home.tsx:49
Promise.catch
eval @ home.tsx:49
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
client.js:26 Warning: Encountered two children with the same key, `/dashboard/home`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
    at nav
    at Breadcrumbs (webpack-internal:///./components/common/Breadcrumbs.tsx:25:74)
    at main
    at div
    at div
    at SecuredLayoutContent (webpack-internal:///./components/Layout/SecuredLayoutUI.tsx:20:11)
    at SecuredLayout (webpack-internal:///./components/Layout/SecuredLayout.tsx:11:11)
    at AppContent (webpack-internal:///./pages/_app.tsx:44:11)
    at RouteGuard (webpack-internal:///./components/guards/RouteGuard.tsx:281:11)
    at CurrencyProvider (webpack-internal:///./components/context/CurrencyContext.tsx:37:11)
    at BreadcrumbProvider (webpack-internal:///./components/context/BreadcrumbContext.tsx:15:11)
    at AuthProvider (webpack-internal:///./components/context/AuthContext.tsx:130:11)
    at App (webpack-internal:///./pages/_app.tsx:104:53)
    at PathnameContextProviderAdapter (webpack-internal:///../node_modules/next/dist/shared/lib/router/adapters.js:80:11)
    at ErrorBoundary (webpack-internal:///../node_modules/next/dist/compiled/@next/react-dev-overlay/dist/client.js:26:6864)
    at ReactDevOverlay (webpack-internal:///../node_modules/next/dist/compiled/@next/react-dev-overlay/dist/client.js:26:9247)
    at Container (webpack-internal:///../node_modules/next/dist/client/index.js:80:1)
    at AppContainer (webpack-internal:///../node_modules/next/dist/client/index.js:188:11)
    at Root (webpack-internal:///../node_modules/next/dist/client/index.js:412:11)
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
printWarning @ react-dom.development.js:86
error @ react-dom.development.js:60
warnOnInvalidKey @ react-dom.development.js:15293
reconcileChildrenArray @ react-dom.development.js:15330
reconcileChildFibers @ react-dom.development.js:15821
reconcileChildren @ react-dom.development.js:19169
updateHostComponent @ react-dom.development.js:19919
beginWork @ react-dom.development.js:21613
beginWork$1 @ react-dom.development.js:27421
performUnitOfWork @ react-dom.development.js:26552
workLoopConcurrent @ react-dom.development.js:26538
renderRootConcurrent @ react-dom.development.js:26500
performConcurrentWorkOnRoot @ react-dom.development.js:25733
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
client.js:26 Warning: Encountered two children with the same key, `/dashboard/home`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
    at nav
    at Breadcrumbs (webpack-internal:///./components/common/Breadcrumbs.tsx:25:74)
    at main
    at div
    at div
    at SecuredLayoutContent (webpack-internal:///./components/Layout/SecuredLayoutUI.tsx:20:11)
    at SecuredLayout (webpack-internal:///./components/Layout/SecuredLayout.tsx:11:11)
    at AppContent (webpack-internal:///./pages/_app.tsx:44:11)
    at RouteGuard (webpack-internal:///./components/guards/RouteGuard.tsx:281:11)
    at CurrencyProvider (webpack-internal:///./components/context/CurrencyContext.tsx:37:11)
    at BreadcrumbProvider (webpack-internal:///./components/context/BreadcrumbContext.tsx:15:11)
    at AuthProvider (webpack-internal:///./components/context/AuthContext.tsx:130:11)
    at App (webpack-internal:///./pages/_app.tsx:104:53)
    at PathnameContextProviderAdapter (webpack-internal:///../node_modules/next/dist/shared/lib/router/adapters.js:80:11)
    at ErrorBoundary (webpack-internal:///../node_modules/next/dist/compiled/@next/react-dev-overlay/dist/client.js:26:6864)
    at ReactDevOverlay (webpack-internal:///../node_modules/next/dist/compiled/@next/react-dev-overlay/dist/client.js:26:9247)
    at Container (webpack-internal:///../node_modules/next/dist/client/index.js:80:1)
    at AppContainer (webpack-internal:///../node_modules/next/dist/client/index.js:188:11)
    at Root (webpack-internal:///../node_modules/next/dist/client/index.js:412:11)
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
printWarning @ react-dom.development.js:86
error @ react-dom.development.js:60
warnOnInvalidKey @ react-dom.development.js:15293
reconcileChildrenArray @ react-dom.development.js:15330
reconcileChildFibers @ react-dom.development.js:15821
reconcileChildren @ react-dom.development.js:19169
updateHostComponent @ react-dom.development.js:19919
beginWork @ react-dom.development.js:21613
beginWork$1 @ react-dom.development.js:27421
performUnitOfWork @ react-dom.development.js:26552
workLoopSync @ react-dom.development.js:26461
renderRootSync @ react-dom.development.js:26429
performConcurrentWorkOnRoot @ react-dom.development.js:25733
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
api.ts:152  GET http://localhost:3000/api/v1/auth/me 500 (Internal Server Error)
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:152
execute @ resilience.ts:61
apiRequest @ api.ts:152
get @ api.ts:157
eval @ AuthContext.tsx:372
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
api.ts:114 [API] [CID:1770472867582-fj5hur079] ✗ 500 GET /auth/me (30275ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:114
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:152
execute @ resilience.ts:61
apiRequest @ api.ts:152
get @ api.ts:157
eval @ AuthContext.tsx:372
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
client.js:26 Warning: Encountered two children with the same key, `/dashboard/home`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.
    at nav
    at Breadcrumbs (webpack-internal:///./components/common/Breadcrumbs.tsx:25:74)
    at main
    at div
    at div
    at SecuredLayoutContent (webpack-internal:///./components/Layout/SecuredLayoutUI.tsx:20:11)
    at SecuredLayout (webpack-internal:///./components/Layout/SecuredLayout.tsx:11:11)
    at AppContent (webpack-internal:///./pages/_app.tsx:44:11)
    at RouteGuard (webpack-internal:///./components/guards/RouteGuard.tsx:281:11)
    at CurrencyProvider (webpack-internal:///./components/context/CurrencyContext.tsx:37:11)
    at BreadcrumbProvider (webpack-internal:///./components/context/BreadcrumbContext.tsx:15:11)
    at AuthProvider (webpack-internal:///./components/context/AuthContext.tsx:130:11)
    at App (webpack-internal:///./pages/_app.tsx:104:53)
    at PathnameContextProviderAdapter (webpack-internal:///../node_modules/next/dist/shared/lib/router/adapters.js:80:11)
    at ErrorBoundary (webpack-internal:///../node_modules/next/dist/compiled/@next/react-dev-overlay/dist/client.js:26:6864)
    at ReactDevOverlay (webpack-internal:///../node_modules/next/dist/compiled/@next/react-dev-overlay/dist/client.js:26:9247)
    at Container (webpack-internal:///../node_modules/next/dist/client/index.js:80:1)
    at AppContainer (webpack-internal:///../node_modules/next/dist/client/index.js:188:11)
    at Root (webpack-internal:///../node_modules/next/dist/client/index.js:412:11)
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
printWarning @ react-dom.development.js:86
error @ react-dom.development.js:60
warnOnInvalidKey @ react-dom.development.js:15293
reconcileChildrenArray @ react-dom.development.js:15330
reconcileChildFibers @ react-dom.development.js:15821
reconcileChildren @ react-dom.development.js:19169
updateHostComponent @ react-dom.development.js:19919
beginWork @ react-dom.development.js:21613
beginWork$1 @ react-dom.development.js:27421
performUnitOfWork @ react-dom.development.js:26552
workLoopSync @ react-dom.development.js:26461
renderRootSync @ react-dom.development.js:26429
performConcurrentWorkOnRoot @ react-dom.development.js:25733
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
useSecuredApi.ts:66  GET http://localhost:3000/api/v1/dashboard/summary 500 (Internal Server Error)
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
Axios.<computed> @ Axios.js:220
wrap @ bind.js:16
eval @ useSecuredApi.ts:66
fetchDashboardContent @ home.tsx:74
eval @ home.tsx:97
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
api.ts:114 [API] [CID:1770472868245-mubzvxakv] ✗ 500 GET /dashboard/summary (30218ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:114
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
Axios.<computed> @ Axios.js:220
wrap @ bind.js:16
eval @ useSecuredApi.ts:66
fetchDashboardContent @ home.tsx:74
eval @ home.tsx:97
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
home.tsx:88 Failed to load dashboard data: AxiosError {message: 'Request failed with status code 500', name: 'AxiosError', code: 'ERR_BAD_RESPONSE', config: {…}, request: XMLHttpRequest, …}
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
fetchDashboardContent @ home.tsx:88
await in fetchDashboardContent
eval @ home.tsx:97
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
useSecuredApi.ts:66  GET http://localhost:3000/api/v1/admin/audit-logs/tenant?limit=5 500 (Internal Server Error)
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
Axios.<computed> @ Axios.js:220
wrap @ bind.js:16
eval @ useSecuredApi.ts:66
fetchDashboardContent @ home.tsx:75
eval @ home.tsx:97
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
api.ts:114 [API] [CID:1770472868246-yf4huqejb] ✗ 500 GET /admin/audit-logs/tenant?limit=5 (30439ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:114
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
Axios.<computed> @ Axios.js:220
wrap @ bind.js:16
eval @ useSecuredApi.ts:66
fetchDashboardContent @ home.tsx:75
eval @ home.tsx:97
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
useSecuredApi.ts:66  GET http://localhost:3000/api/v1/dashboard/executive 500 (Internal Server Error)
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
Axios.<computed> @ Axios.js:220
wrap @ bind.js:16
eval @ useSecuredApi.ts:66
fetchDashboardContent @ home.tsx:73
eval @ home.tsx:97
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
api.ts:114 [API] [CID:1770472868245-gqibmflhn] ✗ 500 GET /dashboard/executive (30442ms): Request failed with status code 500
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:114
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
Axios.<computed> @ Axios.js:220
wrap @ bind.js:16
eval @ useSecuredApi.ts:66
fetchDashboardContent @ home.tsx:73
eval @ home.tsx:97
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
projects.tsx:95 Failed to fetch clients CanceledError {message: 'canceled', name: 'CanceledError', code: 'ERR_CANCELED', config: {…}, stack: 'CanceledError: canceled\n    at throwIfCancellation… (webpack-internal:///./pages/projects.tsx:90:30)'}
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
fetchClients @ projects.tsx:95
await in fetchClients
eval @ projects.tsx:101
commitHookEffectListMount @ react-dom.development.js:23145
commitPassiveMountOnFiber @ react-dom.development.js:24921
commitPassiveMountEffects_complete @ react-dom.development.js:24886
commitPassiveMountEffects_begin @ react-dom.development.js:24873
commitPassiveMountEffects @ react-dom.development.js:24861
flushPassiveEffectsImpl @ react-dom.development.js:27034
flushPassiveEffects @ react-dom.development.js:26979
performSyncWorkOnRoot @ react-dom.development.js:26071
flushSyncCallbacks @ react-dom.development.js:12042
commitRootImpl @ react-dom.development.js:26954
commitRoot @ react-dom.development.js:26677
finishConcurrentRender @ react-dom.development.js:25976
performConcurrentWorkOnRoot @ react-dom.development.js:25804
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
projects.tsx:95 Failed to fetch clients CanceledError {message: 'canceled', name: 'CanceledError', code: 'ERR_CANCELED', config: {…}, stack: 'CanceledError: canceled\n    at throwIfCancellation… (webpack-internal:///./pages/projects.tsx:90:30)'}
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
fetchClients @ projects.tsx:95
await in fetchClients
eval @ projects.tsx:101
commitHookEffectListMount @ react-dom.development.js:23145
invokePassiveEffectMountInDEV @ react-dom.development.js:25149
invokeEffectsInDev @ react-dom.development.js:27346
commitDoubleInvokeEffectsInDEV @ react-dom.development.js:27325
flushPassiveEffectsImpl @ react-dom.development.js:27051
flushPassiveEffects @ react-dom.development.js:26979
performSyncWorkOnRoot @ react-dom.development.js:26071
flushSyncCallbacks @ react-dom.development.js:12042
commitRootImpl @ react-dom.development.js:26954
commitRoot @ react-dom.development.js:26677
finishConcurrentRender @ react-dom.development.js:25976
performConcurrentWorkOnRoot @ react-dom.development.js:25804
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
api.ts:152  GET http://localhost:3000/api/v1/auth/me 500 (Internal Server Error)
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
Promise.then
_request @ Axios.js:172
request @ Axios.js:49
wrap @ bind.js:16
eval @ api.ts:152
execute @ resilience.ts:61
apiRequest @ api.ts:152
get @ api.ts:157
eval @ AuthContext.tsx:372
commitHookEffectListMount @ react-dom.development.js:23145
commitPassiveMountOnFiber @ react-dom.development.js:24921
commitPassiveMountEffects_complete @ react-dom.development.js:24886
commitPassiveMountEffects_begin @ react-dom.development.js:24873
commitPassiveMountEffects @ react-dom.development.js:24861
flushPassiveEffectsImpl @ react-dom.development.js:27034
flushPassiveEffects @ react-dom.development.js:26979
performSyncWorkOnRoot @ react-dom.development.js:26071
flushSyncCallbacks @ react-dom.development.js:12042
commitRootImpl @ react-dom.development.js:26954
commitRoot @ react-dom.development.js:26677
finishConcurrentRender @ react-dom.development.js:25976
performConcurrentWorkOnRoot @ react-dom.development.js:25804
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
api.ts:114 [API] [CID:1770472902581-m5a21awlf] ✗ 500 GET /auth/me (30671ms): Request failed with status code 500