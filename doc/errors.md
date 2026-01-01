Unhandled Runtime Error
ReferenceError: useState is not defined

Source
components\Layout\Sidebar.tsx (14:39) @ useState

  12 |   const router = useRouter();
  13 |   const isActive = item.exactMatch ? router.asPath === item.path : router.asPath.startsWith(item.path);
> 14 |   const [isExpanded, setIsExpanded] = useState(false); // State to manage expansion of children
     |                                       ^
  15 |
  16 |   useEffect(() => {
  17 |     // Expand parent if one of its children is active


  ### browser dev tool console log

  Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
websocket.js:39 [HMR] connected
AuthContext.tsx:105  GET http://localhost:3000/api/v1/auth/test-secure 401 (Unauthorized)
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
_request @ Axios.js:194
request @ Axios.js:49
Axios.<computed> @ Axios.js:220
wrap @ bind.js:16
checkAuthStatus @ AuthContext.tsx:105
eval @ AuthContext.tsx:123
commitHookEffectListMount @ react-dom.development.js:23184
commitPassiveMountOnFiber @ react-dom.development.js:24960
commitPassiveMountEffects_complete @ react-dom.development.js:24925
commitPassiveMountEffects_begin @ react-dom.development.js:24912
commitPassiveMountEffects @ react-dom.development.js:24900
flushPassiveEffectsImpl @ react-dom.development.js:27073
flushPassiveEffects @ react-dom.development.js:27018
eval @ react-dom.development.js:26803
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
AuthContext.tsx:116 checkAuthStatus: API call failed AxiosError {message: 'Request failed with status code 401', name: 'AxiosError', code: 'ERR_BAD_REQUEST', config: {…}, request: XMLHttpRequest, …}
console.error @ hydration-error-info.js:63
window.console.error @ setup-hydration-warning.js:18
checkAuthStatus @ AuthContext.tsx:116
await in checkAuthStatus
eval @ AuthContext.tsx:123
commitHookEffectListMount @ react-dom.development.js:23184
commitPassiveMountOnFiber @ react-dom.development.js:24960
commitPassiveMountEffects_complete @ react-dom.development.js:24925
commitPassiveMountEffects_begin @ react-dom.development.js:24912
commitPassiveMountEffects @ react-dom.development.js:24900
flushPassiveEffectsImpl @ react-dom.development.js:27073
flushPassiveEffects @ react-dom.development.js:27018
eval @ react-dom.development.js:26803
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
AuthContext.tsx:105  GET http://localhost:3000/api/v1/auth/test-secure 401 (Unauthorized)
dispatchXhrRequest @ xhr.js:209
xhr @ xhr.js:26
dispatchRequest @ dispatchRequest.js:61
_request @ Axios.js:194
request @ Axios.js:49
Axios.<computed> @ Axios.js:220
wrap @ bind.js:16
checkAuthStatus @ AuthContext.tsx:105
eval @ AuthContext.tsx:123
commitHookEffectListMount @ react-dom.development.js:23184
invokePassiveEffectMountInDEV @ react-dom.development.js:25188
invokeEffectsInDev @ react-dom.development.js:27385
commitDoubleInvokeEffectsInDEV @ react-dom.development.js:27364
flushPassiveEffectsImpl @ react-dom.development.js:27090
flushPassiveEffects @ react-dom.development.js:27018
eval @ react-dom.development.js:26803
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
AuthContext.tsx:116 checkAuthStatus: API call failed AxiosError {message: 'Request failed with status code 401', name: 'AxiosError', code: 'ERR_BAD_REQUEST', config: {…}, request: XMLHttpRequest, …}
console.error @ hydration-error-info.js:63
window.console.error @ setup-hydration-warning.js:18
checkAuthStatus @ AuthContext.tsx:116
await in checkAuthStatus
eval @ AuthContext.tsx:123
commitHookEffectListMount @ react-dom.development.js:23184
invokePassiveEffectMountInDEV @ react-dom.development.js:25188
invokeEffectsInDev @ react-dom.development.js:27385
commitDoubleInvokeEffectsInDEV @ react-dom.development.js:27364
flushPassiveEffectsImpl @ react-dom.development.js:27090
flushPassiveEffects @ react-dom.development.js:27018
eval @ react-dom.development.js:26803
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
warn-once.js:16 Image with src "/SentinelFi Logo Concept-bg-remv-logo-only.png" has either width or height modified, but not the other. If you use CSS to change the size of your image, also include the styles 'width: "auto"' or 'height: "auto"' to maintain the aspect ratio.
warnOnce @ warn-once.js:16
eval @ image-component.js:110
Promise.then
handleLoading @ image-component.js:35
onLoad @ image-component.js:196
callCallback @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
eval @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26174
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457Understand this warning
warn-once.js:16 Image with src "/SentinelFi Logo Concept-bg-remv-logo-only.png" was detected as the Largest Contentful Paint (LCP). Please add the "priority" property if this image is above the fold.
Read more: https://nextjs.org/docs/api-reference/next/image#priority
warnOnce @ warn-once.js:16
eval @ get-img-props.js:349Understand this warning
login:1 [Intervention] Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: chrome-extension://okfkdaglfjjjfefdcppliegebpoegaii/assets/PublicSans-VariableFont_wght.ttf
hot-reloader-client.js:222 [Fast Refresh] rebuilding
16Sidebar.tsx:14 Uncaught ReferenceError: useState is not defined
    at NavItemLink (Sidebar.tsx:14:39)
    at renderWithHooks (react-dom.development.js:15486:18)
    at mountIndeterminateComponent (react-dom.development.js:20098:13)
    at beginWork (react-dom.development.js:21621:16)
    at HTMLUnknownElement.callCallback (react-dom.development.js:4164:14)
    at Object.invokeGuardedCallbackDev (react-dom.development.js:4213:16)
    at invokeGuardedCallback (react-dom.development.js:4277:31)
    at beginWork$1 (react-dom.development.js:27485:7)
    at performUnitOfWork (react-dom.development.js:26591:12)
    at workLoopConcurrent (react-dom.development.js:26577:5)
    at renderRootConcurrent (react-dom.development.js:26539:7)
    at performConcurrentWorkOnRoot (react-dom.development.js:25772:38)
    at workLoop (scheduler.development.js:266:34)
    at flushWork (scheduler.development.js:239:14)
    at MessagePort.performWorkUntilDeadline (scheduler.development.js:533:21)
NavItemLink @ Sidebar.tsx:14
renderWithHooks @ react-dom.development.js:15486
mountIndeterminateComponent @ react-dom.development.js:20098
beginWork @ react-dom.development.js:21621
callCallback @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
beginWork$1 @ react-dom.development.js:27485
performUnitOfWork @ react-dom.development.js:26591
workLoopConcurrent @ react-dom.development.js:26577
renderRootConcurrent @ react-dom.development.js:26539
performConcurrentWorkOnRoot @ react-dom.development.js:25772
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
Header.tsx:22 Warning: The result of getSnapshot should be cached to avoid an infinite loop
    at Header (webpack-internal:///./components/Layout/Header.tsx:32:102)
    at div
    at div
    at SecuredLayoutContent (webpack-internal:///./components/Layout/SecuredLayoutContent.tsx:16:11)
    at Layout (webpack-internal:///./components/Layout/Layout.tsx:20:11)
    at AuthProvider (webpack-internal:///./components/context/AuthContext.tsx:39:11)
    at SentinelFiApp (webpack-internal:///./pages/_app.tsx:16:11)
    at PathnameContextProviderAdapter (webpack-internal:///../node_modules/next/dist/shared/lib/router/adapters.js:81:11)
    at ErrorBoundary (webpack-internal:///../node_modules/next/dist/client/components/react-dev-overlay/pages/ErrorBoundary.js:41:9)
    at ReactDevOverlay (webpack-internal:///../node_modules/next/dist/client/components/react-dev-overlay/pages/ReactDevOverlay.js:33:11)
    at Container (webpack-internal:///../node_modules/next/dist/client/index.js:81:1)
    at AppContainer (webpack-internal:///../node_modules/next/dist/client/index.js:189:11)
    at Root (webpack-internal:///../node_modules/next/dist/client/index.js:413:11)
console.error @ hydration-error-info.js:63
window.console.error @ setup-hydration-warning.js:18
printWarning @ react-dom.development.js:86
error @ react-dom.development.js:60
mountSyncExternalStore @ react-dom.development.js:15987
useSyncExternalStore @ react-dom.development.js:16908
useSyncExternalStore @ react.development.js:1677
useStore @ react.mjs:13
useBoundStore @ react.mjs:23
Header @ Header.tsx:22
renderWithHooks @ react-dom.development.js:15486
mountIndeterminateComponent @ react-dom.development.js:20098
beginWork @ react-dom.development.js:21621
beginWork$1 @ react-dom.development.js:27460
performUnitOfWork @ react-dom.development.js:26591
workLoopConcurrent @ react-dom.development.js:26577
renderRootConcurrent @ react-dom.development.js:26539
performConcurrentWorkOnRoot @ react-dom.development.js:25772
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
16Sidebar.tsx:14 Uncaught ReferenceError: useState is not defined
    at NavItemLink (Sidebar.tsx:14:39)
    at renderWithHooks (react-dom.development.js:15486:18)
    at mountIndeterminateComponent (react-dom.development.js:20098:13)
    at beginWork (react-dom.development.js:21621:16)
    at HTMLUnknownElement.callCallback (react-dom.development.js:4164:14)
    at Object.invokeGuardedCallbackDev (react-dom.development.js:4213:16)
    at invokeGuardedCallback (react-dom.development.js:4277:31)
    at beginWork$1 (react-dom.development.js:27485:7)
    at performUnitOfWork (react-dom.development.js:26591:12)
    at workLoopSync (react-dom.development.js:26500:5)
    at renderRootSync (react-dom.development.js:26468:7)
    at recoverFromConcurrentError (react-dom.development.js:25884:20)
    at performConcurrentWorkOnRoot (react-dom.development.js:25784:22)
    at workLoop (scheduler.development.js:266:34)
    at flushWork (scheduler.development.js:239:14)
    at MessagePort.performWorkUntilDeadline (scheduler.development.js:533:21)
NavItemLink @ Sidebar.tsx:14
renderWithHooks @ react-dom.development.js:15486
mountIndeterminateComponent @ react-dom.development.js:20098
beginWork @ react-dom.development.js:21621
callCallback @ react-dom.development.js:4164
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
beginWork$1 @ react-dom.development.js:27485
performUnitOfWork @ react-dom.development.js:26591
workLoopSync @ react-dom.development.js:26500
renderRootSync @ react-dom.development.js:26468
recoverFromConcurrentError @ react-dom.development.js:25884
performConcurrentWorkOnRoot @ react-dom.development.js:25784
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error
16hydration-error-info.js:63 The above error occurred in the <NavItemLink> component:

    at NavItemLink (webpack-internal:///./components/Layout/Sidebar.tsx:28:11)
    at ul
    at nav
    at div
    at aside
    at Sidebar (webpack-internal:///./components/Layout/Sidebar.tsx:170:94)
    at div
    at SecuredLayoutContent (webpack-internal:///./components/Layout/SecuredLayoutContent.tsx:16:11)
    at Layout (webpack-internal:///./components/Layout/Layout.tsx:20:11)
    at AuthProvider (webpack-internal:///./components/context/AuthContext.tsx:39:11)
    at SentinelFiApp (webpack-internal:///./pages/_app.tsx:16:11)
    at PathnameContextProviderAdapter (webpack-internal:///../node_modules/next/dist/shared/lib/router/adapters.js:81:11)
    at ErrorBoundary (webpack-internal:///../node_modules/next/dist/client/components/react-dev-overlay/pages/ErrorBoundary.js:41:9)
    at ReactDevOverlay (webpack-internal:///../node_modules/next/dist/client/components/react-dev-overlay/pages/ReactDevOverlay.js:33:11)
    at Container (webpack-internal:///../node_modules/next/dist/client/index.js:81:1)
    at AppContainer (webpack-internal:///../node_modules/next/dist/client/index.js:189:11)
    at Root (webpack-internal:///../node_modules/next/dist/client/index.js:413:11)

React will try to recreate this component tree from scratch using the error boundary you provided, ErrorBoundary.
console.error @ hydration-error-info.js:63
window.console.error @ setup-hydration-warning.js:18
logCapturedError @ react-dom.development.js:18704
callback @ react-dom.development.js:18767
callCallback @ react-dom.development.js:15036
commitUpdateQueue @ react-dom.development.js:15057
commitLayoutEffectOnFiber @ react-dom.development.js:23398
commitLayoutMountEffects_complete @ react-dom.development.js:24722
commitLayoutEffects_begin @ react-dom.development.js:24708
commitLayoutEffects @ react-dom.development.js:24646
commitRootImpl @ react-dom.development.js:26857
commitRoot @ react-dom.development.js:26716
finishConcurrentRender @ react-dom.development.js:25926
performConcurrentWorkOnRoot @ react-dom.development.js:25843
workLoop @ scheduler.development.js:266
flushWork @ scheduler.development.js:239
performWorkUntilDeadline @ scheduler.development.js:533Understand this error