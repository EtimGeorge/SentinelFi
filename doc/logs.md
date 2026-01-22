1 of 1 unhandled error

Unhandled Runtime Error
TypeError: (0 , uuid__WEBPACK_IMPORTED_MODULE_1__.v4) is not a function

Source
store\toastStore.ts (23:21) @ uuidv4

  21 |
  22 | addToast: (message, type, duration = 5000) => {
> 23 |   const id = uuidv4();
     |                   ^
  24 |   set((state) => ({
  25 |     toasts: [...state.toasts, { id, message, type, duration }],
  26 |   }));


### Browser console:
Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
websocket.js:46 [HMR] connected
AuthContext.tsx:16 [AUTH INFO] AuthProvider mounting... 
AuthContext.tsx:16 [AUTH INFO] Fetching current user session... 
AuthContext.tsx:16 [AUTH INFO] AuthProvider mounting... 
api.ts:72 [API] → GET /auth/me
2AuthContext.tsx:16 [AUTH INFO] User fetch request aborted (expected during navigation/cleanup). 
2AuthContext.tsx:25 [AUTH SUCCESS] Auth initialization complete. 
hot-dev-client.js:199 [Fast Refresh] rebuilding
:3000/:1 [Intervention] Slow network is detected. See https://www.chromestatus.com/feature/5636954674692096 for more details. Fallback font will be used while loading: chrome-extension://okfkdaglfjjjfefdcppliegebpoegaii/assets/PublicSans-VariableFont_wght.ttf
hot-dev-client.js:168 [Fast Refresh] done in 1052ms
warn-once.js:16 Image with src "/SentinelFi Logo Concept-bg-remv-logo-only.png" has either width or height modified, but not the other. If you use CSS to change the size of your image, also include the styles 'width: "auto"' or 'height: "auto"' to maintain the aspect ratio.
warnOnce @ warn-once.js:16Understand this warning
warn-once.js:16 Image with src "/SentinelFi Logo Concept-bg-remv-logo-only.png" was detected as the Largest Contentful Paint (LCP). Please add the "priority" property if this image is above the fold.
Read more: https://nextjs.org/docs/api-reference/next/image#priority
warnOnce @ warn-once.js:16Understand this warning
hot-dev-client.js:199 [Fast Refresh] rebuilding
hot-dev-client.js:168 [Fast Refresh] done in 216ms
AuthContext.tsx:16 [AUTH INFO] Attempting super login for: superadmin@sentinelfi.com 
api.ts:72 [API] → POST /auth/login/super
api.ts:84 [API] ✓ 200 POST /auth/login/super (8741ms)
AuthContext.tsx:25 [AUTH SUCCESS] Authenticated as superadmin@sentinelfi.com 
AuthContext.tsx:25 [AUTH SUCCESS] [Login] Login successful - AuthContext will handle navigation 
hot-dev-client.js:199 [Fast Refresh] rebuilding
webpack.js:825 [HMR] unexpected require(../node_modules/uuid/dist/index.js) to disposed module
warnUnexpectedRequire @ webpack.js:825
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM416 toastStore.ts:3
./store/toastStore.ts @ super.js:61
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM413 index.tsx:11
./pages/super/index.tsx @ super.js:50
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:5
eval @ route-loader.js:211
Promise.then
onEntrypoint @ route-loader.js:211
register @ index.js:163
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:2
../node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper! @ super.js:17
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
__webpack_exec__ @ super.js:89
(anonymous) @ super.js:90
__webpack_require__.O @ webpack.js:86
(anonymous) @ super.js:91
webpackJsonpCallback @ webpack.js:1203
(anonymous) @ super.js:9Understand this warning
webpack.js:825 [HMR] unexpected require(../node_modules/lucide-react/dist/esm/icons/activity.js) to disposed module
warnUnexpectedRequire @ webpack.js:825
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM417 lucide-react.js:14
__barrel_optimize__?names=Activity,AlertTriangle,ArrowRight,Building,Clock,Loader2,Plus,Server,TrendingUp,Users!=!../node_modules/lucide-react/dist/esm/lucide-react.js @ super.js:72
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM413 index.tsx:12
./pages/super/index.tsx @ super.js:50
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:5
eval @ route-loader.js:211
Promise.then
onEntrypoint @ route-loader.js:211
register @ index.js:163
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:2
../node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper! @ super.js:17
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
__webpack_exec__ @ super.js:89
(anonymous) @ super.js:90
__webpack_require__.O @ webpack.js:86
(anonymous) @ super.js:91
webpackJsonpCallback @ webpack.js:1203
(anonymous) @ super.js:9Understand this warning
webpack.js:825 [HMR] unexpected require(../node_modules/lucide-react/dist/esm/icons/triangle-alert.js) to disposed module
warnUnexpectedRequire @ webpack.js:825
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM417 lucide-react.js:15
__barrel_optimize__?names=Activity,AlertTriangle,ArrowRight,Building,Clock,Loader2,Plus,Server,TrendingUp,Users!=!../node_modules/lucide-react/dist/esm/lucide-react.js @ super.js:72
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM413 index.tsx:12
./pages/super/index.tsx @ super.js:50
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:5
eval @ route-loader.js:211
Promise.then
onEntrypoint @ route-loader.js:211
register @ index.js:163
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:2
../node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper! @ super.js:17
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
__webpack_exec__ @ super.js:89
(anonymous) @ super.js:90
__webpack_require__.O @ webpack.js:86
(anonymous) @ super.js:91
webpackJsonpCallback @ webpack.js:1203
(anonymous) @ super.js:9Understand this warning
webpack.js:825 [HMR] unexpected require(../node_modules/lucide-react/dist/esm/icons/arrow-right.js) to disposed module
warnUnexpectedRequire @ webpack.js:825
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM417 lucide-react.js:16
__barrel_optimize__?names=Activity,AlertTriangle,ArrowRight,Building,Clock,Loader2,Plus,Server,TrendingUp,Users!=!../node_modules/lucide-react/dist/esm/lucide-react.js @ super.js:72
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM413 index.tsx:12
./pages/super/index.tsx @ super.js:50
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:5
eval @ route-loader.js:211
Promise.then
onEntrypoint @ route-loader.js:211
register @ index.js:163
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:2
../node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper! @ super.js:17
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
__webpack_exec__ @ super.js:89
(anonymous) @ super.js:90
__webpack_require__.O @ webpack.js:86
(anonymous) @ super.js:91
webpackJsonpCallback @ webpack.js:1203
(anonymous) @ super.js:9Understand this warning
webpack.js:825 [HMR] unexpected require(../node_modules/lucide-react/dist/esm/icons/clock.js) to disposed module
warnUnexpectedRequire @ webpack.js:825
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM417 lucide-react.js:18
__barrel_optimize__?names=Activity,AlertTriangle,ArrowRight,Building,Clock,Loader2,Plus,Server,TrendingUp,Users!=!../node_modules/lucide-react/dist/esm/lucide-react.js @ super.js:72
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM413 index.tsx:12
./pages/super/index.tsx @ super.js:50
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:5
eval @ route-loader.js:211
Promise.then
onEntrypoint @ route-loader.js:211
register @ index.js:163
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:2
../node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper! @ super.js:17
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
__webpack_exec__ @ super.js:89
(anonymous) @ super.js:90
__webpack_require__.O @ webpack.js:86
(anonymous) @ super.js:91
webpackJsonpCallback @ webpack.js:1203
(anonymous) @ super.js:9Understand this warning
webpack.js:825 [HMR] unexpected require(../node_modules/lucide-react/dist/esm/icons/plus.js) to disposed module
warnUnexpectedRequire @ webpack.js:825
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM417 lucide-react.js:20
__barrel_optimize__?names=Activity,AlertTriangle,ArrowRight,Building,Clock,Loader2,Plus,Server,TrendingUp,Users!=!../node_modules/lucide-react/dist/esm/lucide-react.js @ super.js:72
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM413 index.tsx:12
./pages/super/index.tsx @ super.js:50
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:5
eval @ route-loader.js:211
Promise.then
onEntrypoint @ route-loader.js:211
register @ index.js:163
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:2
../node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper! @ super.js:17
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
__webpack_exec__ @ super.js:89
(anonymous) @ super.js:90
__webpack_require__.O @ webpack.js:86
(anonymous) @ super.js:91
webpackJsonpCallback @ webpack.js:1203
(anonymous) @ super.js:9Understand this warning
webpack.js:825 [HMR] unexpected require(../node_modules/lucide-react/dist/esm/icons/server.js) to disposed module
warnUnexpectedRequire @ webpack.js:825
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM417 lucide-react.js:21
__barrel_optimize__?names=Activity,AlertTriangle,ArrowRight,Building,Clock,Loader2,Plus,Server,TrendingUp,Users!=!../node_modules/lucide-react/dist/esm/lucide-react.js @ super.js:72
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM413 index.tsx:12
./pages/super/index.tsx @ super.js:50
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:5
eval @ route-loader.js:211
Promise.then
onEntrypoint @ route-loader.js:211
register @ index.js:163
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:2
../node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper! @ super.js:17
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
__webpack_exec__ @ super.js:89
(anonymous) @ super.js:90
__webpack_require__.O @ webpack.js:86
(anonymous) @ super.js:91
webpackJsonpCallback @ webpack.js:1203
(anonymous) @ super.js:9Understand this warning
webpack.js:825 [HMR] unexpected require(../node_modules/lucide-react/dist/esm/icons/trending-up.js) to disposed module
warnUnexpectedRequire @ webpack.js:825
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM417 lucide-react.js:22
__barrel_optimize__?names=Activity,AlertTriangle,ArrowRight,Building,Clock,Loader2,Plus,Server,TrendingUp,Users!=!../node_modules/lucide-react/dist/esm/lucide-react.js @ super.js:72
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM413 index.tsx:12
./pages/super/index.tsx @ super.js:50
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:5
eval @ route-loader.js:211
Promise.then
onEntrypoint @ route-loader.js:211
register @ index.js:163
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:2
../node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper! @ super.js:17
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
__webpack_exec__ @ super.js:89
(anonymous) @ super.js:90
__webpack_require__.O @ webpack.js:86
(anonymous) @ super.js:91
webpackJsonpCallback @ webpack.js:1203
(anonymous) @ super.js:9Understand this warning
webpack.js:825 [HMR] unexpected require(../node_modules/recharts/es6/cartesian/Area.js) to disposed module
warnUnexpectedRequire @ webpack.js:825
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM418 index.js:11
__barrel_optimize__?names=Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis!=!../node_modules/recharts/es6/index.js @ super.js:83
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM413 index.tsx:15
./pages/super/index.tsx @ super.js:50
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:5
eval @ route-loader.js:211
Promise.then
onEntrypoint @ route-loader.js:211
register @ index.js:163
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:2
../node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper! @ super.js:17
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
__webpack_exec__ @ super.js:89
(anonymous) @ super.js:90
__webpack_require__.O @ webpack.js:86
(anonymous) @ super.js:91
webpackJsonpCallback @ webpack.js:1203
(anonymous) @ super.js:9Understand this warning
webpack.js:825 [HMR] unexpected require(../node_modules/recharts/es6/chart/AreaChart.js) to disposed module
warnUnexpectedRequire @ webpack.js:825
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM418 index.js:12
__barrel_optimize__?names=Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis!=!../node_modules/recharts/es6/index.js @ super.js:83
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM413 index.tsx:15
./pages/super/index.tsx @ super.js:50
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:5
eval @ route-loader.js:211
Promise.then
onEntrypoint @ route-loader.js:211
register @ index.js:163
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:2
../node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper! @ super.js:17
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
__webpack_exec__ @ super.js:89
(anonymous) @ super.js:90
__webpack_require__.O @ webpack.js:86
(anonymous) @ super.js:91
webpackJsonpCallback @ webpack.js:1203
(anonymous) @ super.js:9Understand this warning
webpack.js:825 [HMR] unexpected require(../node_modules/recharts/es6/cartesian/CartesianGrid.js) to disposed module
warnUnexpectedRequire @ webpack.js:825
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM418 index.js:13
__barrel_optimize__?names=Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis!=!../node_modules/recharts/es6/index.js @ super.js:83
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM413 index.tsx:15
./pages/super/index.tsx @ super.js:50
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:5
eval @ route-loader.js:211
Promise.then
onEntrypoint @ route-loader.js:211
register @ index.js:163
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:2
../node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper! @ super.js:17
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
__webpack_exec__ @ super.js:89
(anonymous) @ super.js:90
__webpack_require__.O @ webpack.js:86
(anonymous) @ super.js:91
webpackJsonpCallback @ webpack.js:1203
(anonymous) @ super.js:9Understand this warning
webpack.js:825 [HMR] unexpected require(../node_modules/recharts/es6/component/ResponsiveContainer.js) to disposed module
warnUnexpectedRequire @ webpack.js:825
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM418 index.js:14
__barrel_optimize__?names=Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis!=!../node_modules/recharts/es6/index.js @ super.js:83
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM413 index.tsx:15
./pages/super/index.tsx @ super.js:50
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:5
eval @ route-loader.js:211
Promise.then
onEntrypoint @ route-loader.js:211
register @ index.js:163
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:2
../node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper! @ super.js:17
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
__webpack_exec__ @ super.js:89
(anonymous) @ super.js:90
__webpack_require__.O @ webpack.js:86
(anonymous) @ super.js:91
webpackJsonpCallback @ webpack.js:1203
(anonymous) @ super.js:9Understand this warning
webpack.js:825 [HMR] unexpected require(../node_modules/recharts/es6/component/Tooltip.js) to disposed module
warnUnexpectedRequire @ webpack.js:825
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM418 index.js:15
__barrel_optimize__?names=Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis!=!../node_modules/recharts/es6/index.js @ super.js:83
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM413 index.tsx:15
./pages/super/index.tsx @ super.js:50
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:5
eval @ route-loader.js:211
Promise.then
onEntrypoint @ route-loader.js:211
register @ index.js:163
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:2
../node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper! @ super.js:17
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
__webpack_exec__ @ super.js:89
(anonymous) @ super.js:90
__webpack_require__.O @ webpack.js:86
(anonymous) @ super.js:91
webpackJsonpCallback @ webpack.js:1203
(anonymous) @ super.js:9Understand this warning
webpack.js:825 [HMR] unexpected require(../node_modules/recharts/es6/cartesian/XAxis.js) to disposed module
warnUnexpectedRequire @ webpack.js:825
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM418 index.js:16
__barrel_optimize__?names=Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis!=!../node_modules/recharts/es6/index.js @ super.js:83
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM413 index.tsx:15
./pages/super/index.tsx @ super.js:50
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:5
eval @ route-loader.js:211
Promise.then
onEntrypoint @ route-loader.js:211
register @ index.js:163
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:2
../node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper! @ super.js:17
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
__webpack_exec__ @ super.js:89
(anonymous) @ super.js:90
__webpack_require__.O @ webpack.js:86
(anonymous) @ super.js:91
webpackJsonpCallback @ webpack.js:1203
(anonymous) @ super.js:9Understand this warning
webpack.js:825 [HMR] unexpected require(../node_modules/recharts/es6/cartesian/YAxis.js) to disposed module
warnUnexpectedRequire @ webpack.js:825
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM418 index.js:17
__barrel_optimize__?names=Area,AreaChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis!=!../node_modules/recharts/es6/index.js @ super.js:83
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ VM413 index.tsx:15
./pages/super/index.tsx @ super.js:50
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
fn @ webpack.js:310
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:5
eval @ route-loader.js:211
Promise.then
onEntrypoint @ route-loader.js:211
register @ index.js:163
eval @ next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper!:2
../node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=C%3A%5Ctemp%5CSentinelFi%5Cfrontend%5Cpages%5Csuper%5Cindex.tsx&page=%2Fsuper! @ super.js:17
options.factory @ webpack.js:655
__webpack_require__ @ webpack.js:37
__webpack_exec__ @ super.js:89
(anonymous) @ super.js:90
__webpack_require__.O @ webpack.js:86
(anonymous) @ super.js:91
webpackJsonpCallback @ webpack.js:1203
(anonymous) @ super.js:9Understand this warning
index.tsx:151 [Dashboard] Mount effect triggered
index.tsx:107 [Dashboard] Starting data fetch...
index.tsx:112 [Dashboard] Fetching tenants...
index.tsx:151 [Dashboard] Mount effect triggered
index.tsx:107 [Dashboard] Starting data fetch...
index.tsx:112 [Dashboard] Fetching tenants...
2api.ts:72 [API] → GET /super/tenants
api.ts:84 [API] ✓ 200 GET /super/tenants (8341ms)
index.tsx:114 [Dashboard] Tenants fetched: 0
index.tsx:118 [Dashboard] Fetching system health...
api.ts:72 [API] → GET /super/analytics/system-health
api.ts:84 [API] ✓ 200 GET /super/analytics/system-health (6116ms)
index.tsx:122 [Dashboard] Fetching total users...
api.ts:72 [API] → GET /super/analytics/total-users
api.ts:84 [API] ✓ 200 GET /super/tenants (14600ms)
index.tsx:114 [Dashboard] Tenants fetched: 0
index.tsx:118 [Dashboard] Fetching system health...
api.ts:72 [API] → GET /super/analytics/system-health
api.ts:84 [API] ✓ 200 GET /super/analytics/system-health (4130ms)
index.tsx:122 [Dashboard] Fetching total users...
api.ts:72 [API] → GET /super/analytics/total-users
api.ts:84 [API] ✓ 200 GET /super/analytics/total-users (4886ms)
index.tsx:124 [Dashboard] Total users fetched: undefined
index.tsx:128 [Dashboard] Fetching MRR...
api.ts:72 [API] → GET /super/analytics/mrr-estimate
api.ts:84 [API] ✓ 200 GET /super/analytics/total-users (5499ms)
index.tsx:124 [Dashboard] Total users fetched: undefined
index.tsx:128 [Dashboard] Fetching MRR...
api.ts:72 [API] → GET /super/analytics/mrr-estimate
api.ts:84 [API] ✓ 200 GET /super/analytics/mrr-estimate (8122ms)
index.tsx:133 [Dashboard] Fetching audit logs...
api.ts:72 [API] → GET /admin/audit/logs
inject.js:2  GET http://localhost:3000/api/v1/admin/audit/logs?limit=5 404 (Not Found)
(anonymous) @ inject.js:2
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
index.tsx:151 [Dashboard] Mount effect triggered
index.tsx:107 [Dashboard] Starting data fetch...
index.tsx:112 [Dashboard] Fetching tenants...
api.ts:72 [API] → GET /super/tenants
hot-dev-client.js:168 [Fast Refresh] done in 29956ms
api.ts:98 [API] ✗ 404 GET /admin/audit/logs (949ms): Request failed with status code 404
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:98
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
toastStore.ts:23 Uncaught (in promise) TypeError: (0 , uuid__WEBPACK_IMPORTED_MODULE_1__.v4) is not a function
    at addToast (toastStore.ts:23:22)
    at eval (index.tsx:143:7)
addToast @ toastStore.ts:23
eval @ index.tsx:143
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
api.ts:84 [API] ✓ 200 GET /super/analytics/mrr-estimate (7634ms)
index.tsx:133 [Dashboard] Fetching audit logs...
api.ts:72 [API] → GET /admin/audit/logs
inject.js:2  GET http://localhost:3000/api/v1/admin/audit/logs?limit=5 404 (Not Found)
(anonymous) @ inject.js:2
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
api.ts:98 [API] ✗ 404 GET /admin/audit/logs (27ms): Request failed with status code 404
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:98
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
toastStore.ts:23 Uncaught (in promise) TypeError: (0 , uuid__WEBPACK_IMPORTED_MODULE_1__.v4) is not a function
    at addToast (toastStore.ts:23:22)
    at eval (index.tsx:143:7)
addToast @ toastStore.ts:23
eval @ index.tsx:143
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
api.ts:84 [API] ✓ 200 GET /super/tenants (6672ms)
index.tsx:114 [Dashboard] Tenants fetched: 0
index.tsx:118 [Dashboard] Fetching system health...
api.ts:72 [API] → GET /super/analytics/system-health
api.ts:84 [API] ✓ 200 GET /super/analytics/system-health (8881ms)
index.tsx:122 [Dashboard] Fetching total users...
api.ts:72 [API] → GET /super/analytics/total-users
api.ts:84 [API] ✓ 200 GET /super/analytics/total-users (6193ms)
index.tsx:124 [Dashboard] Total users fetched: undefined
index.tsx:128 [Dashboard] Fetching MRR...
api.ts:72 [API] → GET /super/analytics/mrr-estimate
api.ts:84 [API] ✓ 200 GET /super/analytics/mrr-estimate (6083ms)
index.tsx:133 [Dashboard] Fetching audit logs...
api.ts:72 [API] → GET /admin/audit/logs
inject.js:2  GET http://localhost:3000/api/v1/admin/audit/logs?limit=5 404 (Not Found)
(anonymous) @ inject.js:2
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
commitRootImpl @ react-dom.development.js:26930
commitRoot @ react-dom.development.js:26677
performSyncWorkOnRoot @ react-dom.development.js:26112
flushSyncCallbacks @ react-dom.development.js:12042
flushSync @ react-dom.development.js:26196
scheduleRefresh @ react-dom.development.js:27790
eval @ react-refresh-runtime.development.js:265
performReactRefresh @ react-refresh-runtime.development.js:254
applyUpdate @ helpers.js:139
statusHandler @ helpers.js:156
setStatus @ webpack.js:447
(anonymous) @ webpack.js:618
Promise.then
internalApply @ webpack.js:601
hotApply @ webpack.js:549
eval @ hot-dev-client.js:328
Promise.then
tryApplyUpdates @ hot-dev-client.js:320
handleSuccess @ hot-dev-client.js:91
processMessage @ hot-dev-client.js:231
eval @ hot-dev-client.js:55
handleMessage @ websocket.js:52Understand this error
api.ts:98 [API] ✗ 404 GET /admin/audit/logs (46ms): Request failed with status code 404
console.error @ client.js:26
window.console.error @ setup-hydration-warning.js:18
eval @ api.ts:98
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
commitRootImpl @ react-dom.development.js:26930
commitRoot @ react-dom.development.js:26677
performSyncWorkOnRoot @ react-dom.development.js:26112
flushSyncCallbacks @ react-dom.development.js:12042
flushSync @ react-dom.development.js:26196
scheduleRefresh @ react-dom.development.js:27790
eval @ react-refresh-runtime.development.js:265
performReactRefresh @ react-refresh-runtime.development.js:254
applyUpdate @ helpers.js:139
statusHandler @ helpers.js:156
setStatus @ webpack.js:447
(anonymous) @ webpack.js:618
Promise.then
internalApply @ webpack.js:601
hotApply @ webpack.js:549
eval @ hot-dev-client.js:328
Promise.then
tryApplyUpdates @ hot-dev-client.js:320
handleSuccess @ hot-dev-client.js:91
processMessage @ hot-dev-client.js:231
eval @ hot-dev-client.js:55
handleMessage @ websocket.js:52Understand this error
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
commitRootImpl @ react-dom.development.js:26930
commitRoot @ react-dom.development.js:26677
performSyncWorkOnRoot @ react-dom.development.js:26112
flushSyncCallbacks @ react-dom.development.js:12042
flushSync @ react-dom.development.js:26196
scheduleRefresh @ react-dom.development.js:27790
eval @ react-refresh-runtime.development.js:265
performReactRefresh @ react-refresh-runtime.development.js:254
applyUpdate @ helpers.js:139
statusHandler @ helpers.js:156
setStatus @ webpack.js:447
(anonymous) @ webpack.js:618
Promise.then
internalApply @ webpack.js:601
hotApply @ webpack.js:549
eval @ hot-dev-client.js:328
Promise.then
tryApplyUpdates @ hot-dev-client.js:320
handleSuccess @ hot-dev-client.js:91
processMessage @ hot-dev-client.js:231
eval @ hot-dev-client.js:55
handleMessage @ websocket.js:52Understand this error
index.tsx:145 [Dashboard] Setting loading to false
api.ts:72 [API] → GET /super/analytics/system-health
api.ts:84 [API] ✓ 200 GET /super/analytics/system-health (12224ms)
api.ts:72 [API] → GET /super/analytics/system-health
api.ts:84 [API] ✓ 200 GET /super/analytics/system-health (9100ms)
api.ts:72 [API] → GET /super/analytics/system-health
api.ts:84 [API] ✓ 200 GET /super/analytics/system-health (8241ms)
api.ts:72 [API] → GET /super/analytics/system-health
api.ts:84 [API] ✓ 200 GET /super/analytics/system-health (14950ms)
api.ts:72 [API] → GET /super/analytics/system-health
api.ts:84 [API] ✓ 200 GET /super/analytics/system-health (10893ms)
api.ts:72 [API] → GET /super/analytics/system-health
api.ts:84 [API] ✓ 200 GET /super/analytics/system-health (6102ms)
api.ts:72 [API] → GET /super/analytics/system-health
api.ts:84 [API] ✓ 200 GET /super/analytics/system-health (6123ms)

### Browser Network Tab:

3ef5afdc77a86698.webpack.hot-update.json	200	fetch	inject.js:2	4.2 kB	58 ms
webpack.3ef5afdc77a86698.hot-update.js	200	script	webpack.js:195	1.3 kB	52 ms
super	200	xhr	inject.js:2	2.0 kB	8.69 s
super.js	200	script	RouteGuard.tsx:158	36.2 kB	1.35 s
e40f29961c034ef9.webpack.hot-update.json	200	fetch	inject.js:2	0.9 kB	80 ms
webpack.e40f29961c034ef9.hot-update.js	200	script	webpack.js:195	1.3 kB	253 ms
vendor.e40f29961c034ef9.hot-update.js	200	script	webpack.js:195	922 kB	28.25 s
tenants	200	xhr	inject.js:2	0.4 kB	14.54 s
tenants	200	xhr	inject.js:2	0.4 kB	8.28 s
system-health	200	xhr	inject.js:2	0.4 kB	6.09 s
total-users	200	xhr	inject.js:2	0.4 kB	4.88 s
system-health	200	xhr	inject.js:2	0.4 kB	4.13 s
total-users	200	xhr	inject.js:2	0.4 kB	5.49 s
mrr-estimate	200	xhr	inject.js:2	0.4 kB	8.12 s




### frontend log:

PS C:\temp\SentinelFi> npm run dev:frontend

> sentinelfi-monorepo@1.0.0 dev:frontend
> npm run dev -w frontend


> frontend@1.0.0 dev
> set NODE_OPTIONS=--max-old-space-size=4096 && next dev

   ▲ Next.js 14.1.4
   - Local:        http://localhost:3000
   - Environments: .env.local

[Next.js Config] Proxying /api/v1 to http://localhost:3001/api/v1
 ✓ Ready in 17s
 ○ Compiling / ...
 ✓ Compiled / in 17.9s (460 modules)
 ○ Compiling /login ...
 ✓ Compiled /login in 12.6s (472 modules)
 ○ Compiling /_error ...
 ✓ Compiled /_error in 1940ms (472 modules)
(node:21168) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
 ○ Compiling /super ...
 ✓ Compiled /super in 8s (1158 modules)
 ⚠ Fast Refresh had to perform a full reload due to a runtime error.
 ○ Compiling / ...
 ✓ Compiled / in 3.9s (1153 modules)
 ○ Compiling /login ...
 ✓ Compiled /login in 1205ms (1158 modules)
 ○ Compiling /_error ...
 ✓ Compiled /_error in 781ms (671 modules)
 ○ Compiling /super ...
 ✓ Compiled /super in 1234ms (1154 modules)



### Backend logs:

[Nest] 10852  - 01/22/2026, 3:54:29 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:54:29 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:54:29 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:54:35 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:54:35 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:54:35 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:54:35 PM VERBOSE [TenantAccessGuard] [TenantAccessGuard] SuperAdmin 'superadmin@sentinelfi.com' granted full access to: /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:54:35 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:54:35 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:54:35 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:54:37 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:54:37 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:54:37 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:54:37 PM   DEBUG [RolesGuard] Required roles: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:54:37 PM   DEBUG [RolesGuard] Processing user role: {"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"} -> Name: SuperAdmin
[Nest] 10852  - 01/22/2026, 3:54:37 PM   DEBUG [RolesGuard] User roles from JWT/DB: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:54:37 PM   DEBUG [RolesGuard] Checking if user has required role "SuperAdmin". Found: true
[Nest] 10852  - 01/22/2026, 3:54:37 PM     LOG [RolesGuard] Access granted for user superadmin@sentinelfi.com. Has required role.    
[Nest] 10852  - 01/22/2026, 3:54:37 PM     LOG [Bootstrap] [2026-01-22T14:54:37.930Z] GET /api/v1/super/analytics/total-users
[Nest] 10852  - 01/22/2026, 3:54:37 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:54:37 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:54:37 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:54:40 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:54:40 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:54:40 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:54:40 PM VERBOSE [TenantAccessGuard] [TenantAccessGuard] SuperAdmin 'superadmin@sentinelfi.com' granted full access to: /api/v1/super/analytics/total-users
[Nest] 10852  - 01/22/2026, 3:54:40 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:54:40 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:54:40 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:54:43 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:54:43 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:54:43 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:54:43 PM   DEBUG [RolesGuard] Required roles: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:54:43 PM   DEBUG [RolesGuard] Processing user role: {"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"} -> Name: SuperAdmin
[Nest] 10852  - 01/22/2026, 3:54:43 PM   DEBUG [RolesGuard] User roles from JWT/DB: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:54:43 PM   DEBUG [RolesGuard] Checking if user has required role "SuperAdmin". Found: true
[Nest] 10852  - 01/22/2026, 3:54:43 PM     LOG [RolesGuard] Access granted for user superadmin@sentinelfi.com. Has required role.    
[Nest] 10852  - 01/22/2026, 3:54:44 PM     LOG [Bootstrap] [2026-01-22T14:54:44.103Z] GET /api/v1/super/analytics/mrr-estimate
[Nest] 10852  - 01/22/2026, 3:54:44 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:54:44 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:54:44 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:54:46 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:54:46 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:54:46 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:54:47 PM VERBOSE [TenantAccessGuard] [TenantAccessGuard] SuperAdmin 'superadmin@sentinelfi.com' granted full access to: /api/v1/super/analytics/mrr-estimate
[Nest] 10852  - 01/22/2026, 3:54:47 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:54:47 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:54:47 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:54:49 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:54:49 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:54:49 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:54:49 PM   DEBUG [RolesGuard] Required roles: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:54:49 PM   DEBUG [RolesGuard] Processing user role: {"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"} -> Name: SuperAdmin
[Nest] 10852  - 01/22/2026, 3:54:49 PM   DEBUG [RolesGuard] User roles from JWT/DB: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:54:49 PM   DEBUG [RolesGuard] Checking if user has required role "SuperAdmin". Found: true
[Nest] 10852  - 01/22/2026, 3:54:49 PM     LOG [RolesGuard] Access granted for user superadmin@sentinelfi.com. Has required role.
[Nest] 10852  - 01/22/2026, 3:54:50 PM     LOG [Bootstrap] [2026-01-22T14:54:50.197Z] GET /api/v1/admin/audit/logs?limit=5
[Nest] 10852  - 01/22/2026, 3:54:52 PM     LOG [Bootstrap] [2026-01-22T14:54:52.351Z] GET /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:54:52 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:54:52 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:54:52 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:54:57 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:54:57 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:54:57 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:54:57 PM VERBOSE [TenantAccessGuard] [TenantAccessGuard] SuperAdmin 'superadmin@sentinelfi.com' granted full access to: /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:54:57 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:54:57 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:54:57 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:54:58 PM     LOG [DatabaseConfig] Pool Health - Total: 3, Idle: 2, Waiting: 0 | Valid: true | Circuit: 
CLOSED
[Nest] 10852  - 01/22/2026, 3:55:04 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:55:04 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:55:04 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:55:04 PM   DEBUG [RolesGuard] Required roles: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:55:04 PM   DEBUG [RolesGuard] Processing user role: {"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"} -> Name: SuperAdmin
[Nest] 10852  - 01/22/2026, 3:55:04 PM   DEBUG [RolesGuard] User roles from JWT/DB: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:55:04 PM   DEBUG [RolesGuard] Checking if user has required role "SuperAdmin". Found: true
[Nest] 10852  - 01/22/2026, 3:55:04 PM     LOG [RolesGuard] Access granted for user superadmin@sentinelfi.com. Has required role.    
[Nest] 10852  - 01/22/2026, 3:55:23 PM     LOG [Bootstrap] [2026-01-22T14:55:23.136Z] GET /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:55:23 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:55:23 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:55:23 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:55:27 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:55:27 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:55:27 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:55:27 PM VERBOSE [TenantAccessGuard] [TenantAccessGuard] SuperAdmin 'superadmin@sentinelfi.com' granted full access to: /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:55:27 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:55:27 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:55:27 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:55:28 PM     LOG [DatabaseConfig] Pool Health - Total: 3, Idle: 2, Waiting: 0 | Valid: true | Circuit: 
CLOSED
[Nest] 10852  - 01/22/2026, 3:55:32 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:55:32 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:55:32 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:55:32 PM   DEBUG [RolesGuard] Required roles: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:55:32 PM   DEBUG [RolesGuard] Processing user role: {"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"} -> Name: SuperAdmin
[Nest] 10852  - 01/22/2026, 3:55:32 PM   DEBUG [RolesGuard] User roles from JWT/DB: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:55:32 PM   DEBUG [RolesGuard] Checking if user has required role "SuperAdmin". Found: true
[Nest] 10852  - 01/22/2026, 3:55:32 PM     LOG [RolesGuard] Access granted for user superadmin@sentinelfi.com. Has required role.    
[Nest] 10852  - 01/22/2026, 3:55:53 PM     LOG [Bootstrap] [2026-01-22T14:55:53.296Z] GET /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:55:53 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:55:53 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:55:53 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:55:57 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:55:57 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:55:57 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:55:57 PM VERBOSE [TenantAccessGuard] [TenantAccessGuard] SuperAdmin 'superadmin@sentinelfi.com' granted full access to: /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:55:57 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:55:57 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:55:57 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:55:58 PM     LOG [DatabaseConfig] Pool Health - Total: 3, Idle: 2, Waiting: 0 | Valid: true | Circuit: 
CLOSED
[Nest] 10852  - 01/22/2026, 3:56:01 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:56:01 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:56:01 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:56:01 PM   DEBUG [RolesGuard] Required roles: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:56:01 PM   DEBUG [RolesGuard] Processing user role: {"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"} -> Name: SuperAdmin
[Nest] 10852  - 01/22/2026, 3:56:01 PM   DEBUG [RolesGuard] User roles from JWT/DB: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:56:01 PM   DEBUG [RolesGuard] Checking if user has required role "SuperAdmin". Found: true
[Nest] 10852  - 01/22/2026, 3:56:01 PM     LOG [RolesGuard] Access granted for user superadmin@sentinelfi.com. Has required role.
[Nest] 10852  - 01/22/2026, 3:56:22 PM     LOG [Bootstrap] [2026-01-22T14:56:22.345Z] GET /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:56:22 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:56:22 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:56:22 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:56:26 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:56:26 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:56:26 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:56:26 PM VERBOSE [TenantAccessGuard] [TenantAccessGuard] SuperAdmin 'superadmin@sentinelfi.com' granted full access to: /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:56:26 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:56:26 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:56:26 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:56:28 PM   DEBUG [DatabaseConfig] Keep-alive query executed successfully (797ms)
[Nest] 10852  - 01/22/2026, 3:56:28 PM     LOG [DatabaseConfig] Pool Health - Total: 3, Idle: 1, Waiting: 0 | Valid: true | Circuit: 
CLOSED
[Nest] 10852  - 01/22/2026, 3:56:37 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:56:37 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:56:37 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:56:37 PM   DEBUG [RolesGuard] Required roles: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:56:37 PM   DEBUG [RolesGuard] Processing user role: {"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"} -> Name: SuperAdmin
[Nest] 10852  - 01/22/2026, 3:56:37 PM   DEBUG [RolesGuard] User roles from JWT/DB: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:56:37 PM   DEBUG [RolesGuard] Checking if user has required role "SuperAdmin". Found: true
[Nest] 10852  - 01/22/2026, 3:56:37 PM     LOG [RolesGuard] Access granted for user superadmin@sentinelfi.com. Has required role.
[Nest] 10852  - 01/22/2026, 3:56:52 PM     LOG [Bootstrap] [2026-01-22T14:56:52.349Z] GET /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:56:52 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:56:52 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:56:52 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:56:57 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:56:57 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:56:57 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:56:57 PM VERBOSE [TenantAccessGuard] [TenantAccessGuard] SuperAdmin 'superadmin@sentinelfi.com' granted full access to: /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:56:57 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:56:57 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:56:57 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:56:58 PM     LOG [DatabaseConfig] Pool Health - Total: 3, Idle: 2, Waiting: 0 | Valid: true | Circuit: 
CLOSED
[Nest] 10852  - 01/22/2026, 3:57:03 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:57:03 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:57:03 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:57:03 PM   DEBUG [RolesGuard] Required roles: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:57:03 PM   DEBUG [RolesGuard] Processing user role: {"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"} -> Name: SuperAdmin
[Nest] 10852  - 01/22/2026, 3:57:03 PM   DEBUG [RolesGuard] User roles from JWT/DB: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:57:03 PM   DEBUG [RolesGuard] Checking if user has required role "SuperAdmin". Found: true
[Nest] 10852  - 01/22/2026, 3:57:03 PM     LOG [RolesGuard] Access granted for user superadmin@sentinelfi.com. Has required role.    
[Nest] 10852  - 01/22/2026, 3:57:22 PM     LOG [Bootstrap] [2026-01-22T14:57:22.452Z] GET /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:57:22 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:57:22 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:57:22 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:57:25 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:57:25 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:57:25 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:57:25 PM VERBOSE [TenantAccessGuard] [TenantAccessGuard] SuperAdmin 'superadmin@sentinelfi.com' granted full access to: /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:57:25 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:57:25 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:57:25 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:57:28 PM     LOG [DatabaseConfig] Pool Health - Total: 3, Idle: 2, Waiting: 0 | Valid: true | Circuit: 
CLOSED
[Nest] 10852  - 01/22/2026, 3:57:28 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:57:28 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:57:28 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:57:28 PM   DEBUG [RolesGuard] Required roles: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:57:28 PM   DEBUG [RolesGuard] Processing user role: {"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"} -> Name: SuperAdmin
[Nest] 10852  - 01/22/2026, 3:57:28 PM   DEBUG [RolesGuard] User roles from JWT/DB: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:57:28 PM   DEBUG [RolesGuard] Checking if user has required role "SuperAdmin". Found: true
[Nest] 10852  - 01/22/2026, 3:57:28 PM     LOG [RolesGuard] Access granted for user superadmin@sentinelfi.com. Has required role.
[Nest] 10852  - 01/22/2026, 3:57:52 PM     LOG [Bootstrap] [2026-01-22T14:57:52.348Z] GET /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:57:52 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:57:52 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:57:52 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:57:54 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:57:54 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:57:54 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:57:54 PM VERBOSE [TenantAccessGuard] [TenantAccessGuard] SuperAdmin 'superadmin@sentinelfi.com' granted full access to: /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:57:54 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:57:54 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:57:54 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:57:58 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:57:58 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:57:58 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:57:58 PM   DEBUG [RolesGuard] Required roles: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:57:58 PM   DEBUG [RolesGuard] Processing user role: {"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"} -> Name: SuperAdmin
[Nest] 10852  - 01/22/2026, 3:57:58 PM   DEBUG [RolesGuard] User roles from JWT/DB: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:57:58 PM   DEBUG [RolesGuard] Checking if user has required role "SuperAdmin". Found: true
[Nest] 10852  - 01/22/2026, 3:57:58 PM     LOG [RolesGuard] Access granted for user superadmin@sentinelfi.com. Has required role.
[Nest] 10852  - 01/22/2026, 3:57:58 PM     LOG [DatabaseConfig] Pool Health - Total: 3, Idle: 2, Waiting: 0 | Valid: true | Circuit: 
CLOSED
[Nest] 10852  - 01/22/2026, 3:58:23 PM     LOG [Bootstrap] [2026-01-22T14:58:23.228Z] GET /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:58:23 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:58:23 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:58:23 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:58:26 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:58:26 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:58:26 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:58:26 PM VERBOSE [TenantAccessGuard] [TenantAccessGuard] SuperAdmin 'superadmin@sentinelfi.com' granted full access to: /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:58:26 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:58:26 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:58:26 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:58:28 PM     LOG [DatabaseConfig] Pool Health - Total: 3, Idle: 2, Waiting: 0 | Valid: true | Circuit: 
CLOSED
[Nest] 10852  - 01/22/2026, 3:58:31 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:58:31 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:58:31 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:58:31 PM   DEBUG [RolesGuard] Required roles: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:58:31 PM   DEBUG [RolesGuard] Processing user role: {"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"} -> Name: SuperAdmin
[Nest] 10852  - 01/22/2026, 3:58:31 PM   DEBUG [RolesGuard] User roles from JWT/DB: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:58:31 PM   DEBUG [RolesGuard] Checking if user has required role "SuperAdmin". Found: true
[Nest] 10852  - 01/22/2026, 3:58:31 PM     LOG [RolesGuard] Access granted for user superadmin@sentinelfi.com. Has required role.    
[Nest] 10852  - 01/22/2026, 3:58:52 PM     LOG [Bootstrap] [2026-01-22T14:58:52.396Z] GET /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:58:52 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:58:52 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:58:52 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:58:53 PM     LOG [Bootstrap] [2026-01-22T14:58:53.745Z] GET /api/v1/auth/me
[Nest] 10852  - 01/22/2026, 3:58:53 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:58:53 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:58:53 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:58:58 PM     LOG [DatabaseConfig] Pool Health - Total: 3, Idle: 1, Waiting: 0 | Valid: true | Circuit: 
CLOSED
[Nest] 10852  - 01/22/2026, 3:59:00 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:59:00 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:59:00 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:59:00 PM VERBOSE [TenantAccessGuard] [TenantAccessGuard] SuperAdmin 'superadmin@sentinelfi.com' granted full access to: /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:59:00 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:59:00 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:59:00 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:59:01 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:59:01 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:59:01 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:59:01 PM VERBOSE [TenantAccessGuard] [TenantAccessGuard] SuperAdmin 'superadmin@sentinelfi.com' granted full access to: /api/v1/auth/me
[Nest] 10852  - 01/22/2026, 3:59:01 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:59:01 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:59:01 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:59:05 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:59:05 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:59:05 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:59:05 PM   DEBUG [RolesGuard] Required roles: undefined
[Nest] 10852  - 01/22/2026, 3:59:05 PM   DEBUG [RolesGuard] No roles required for this route, allowing access.
[Nest] 10852  - 01/22/2026, 3:59:06 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:59:06 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:59:06 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:59:06 PM   DEBUG [RolesGuard] Required roles: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:59:06 PM   DEBUG [RolesGuard] Processing user role: {"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"} -> Name: SuperAdmin
[Nest] 10852  - 01/22/2026, 3:59:06 PM   DEBUG [RolesGuard] User roles from JWT/DB: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:59:06 PM   DEBUG [RolesGuard] Checking if user has required role "SuperAdmin". Found: true
[Nest] 10852  - 01/22/2026, 3:59:06 PM     LOG [RolesGuard] Access granted for user superadmin@sentinelfi.com. Has required role.    
[Nest] 10852  - 01/22/2026, 3:59:23 PM     LOG [Bootstrap] [2026-01-22T14:59:23.120Z] GET /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:59:23 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:59:23 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:59:23 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:59:26 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:59:26 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:59:26 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:59:26 PM VERBOSE [TenantAccessGuard] [TenantAccessGuard] SuperAdmin 'superadmin@sentinelfi.com' granted full access to: /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:59:26 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:59:26 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:59:26 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:59:28 PM     LOG [DatabaseConfig] Pool Health - Total: 3, Idle: 2, Waiting: 0 | Valid: true | Circuit: 
CLOSED
[Nest] 10852  - 01/22/2026, 3:59:32 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 3:59:32 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 3:59:32 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 3:59:32 PM   DEBUG [RolesGuard] Required roles: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:59:32 PM   DEBUG [RolesGuard] Processing user role: {"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"} -> Name: SuperAdmin
[Nest] 10852  - 01/22/2026, 3:59:32 PM   DEBUG [RolesGuard] User roles from JWT/DB: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 3:59:32 PM   DEBUG [RolesGuard] Checking if user has required role "SuperAdmin". Found: true
[Nest] 10852  - 01/22/2026, 3:59:32 PM     LOG [RolesGuard] Access granted for user superadmin@sentinelfi.com. Has required role.    
[Nest] 10852  - 01/22/2026, 3:59:53 PM     LOG [Bootstrap] [2026-01-22T14:59:53.124Z] GET /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 3:59:53 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 3:59:53 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 3:59:53 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 3:59:58 PM     LOG [DatabaseConfig] Pool Health - Total: 3, Idle: 2, Waiting: 0 | Valid: true | Circuit: 
CLOSED
[Nest] 10852  - 01/22/2026, 4:00:00 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 4:00:00 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 4:00:00 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 4:00:00 PM VERBOSE [TenantAccessGuard] [TenantAccessGuard] SuperAdmin 'superadmin@sentinelfi.com' granted full access to: /api/v1/super/analytics/system-health
[Nest] 10852  - 01/22/2026, 4:00:00 PM   DEBUG [CookieExtractor] [Extract] Request cookies: {"access_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InN1cGVyYWRtaW5Ac2VudGluZWxmaS5jb20iLCJzdWIiOiI0YzgzMzU3NC01MDQyLTRkYTEtYjhhNC02MWI1NTE3Zjk1OGQiLCJpZCI6IjRjODMzNTc0LTUwNDItNGRhMS1iOGE0LTYxYjU1MTdmOTU4ZCIsInJvbGVzIjpbIlN1cGVyQWRtaW4iXSwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlIiwidXNlcnM6cmVhZCIsInVzZXJzOnVwZGF0ZSIsInVzZXJzOmRlbGV0ZSIsInVzZXJzOmFzc2lnbl9yb2xlcyIsInJvbGVzOmNyZWF0ZSIsInJvbGVzOnJlYWQiLCJyb2xlczp1cGRhdGUiLCJyb2xlczpkZWxldGUiLCJwcm9qZWN0czpjcmVhdGUiLCJwcm9qZWN0czpyZWFkIiwicHJvamVjdHM6dXBkYXRlIiwicHJvamVjdHM6ZGVsZXRlIiwid2JzOmNyZWF0ZSIsIndiczpyZWFkIiwid2JzOnVwZGF0ZSIsIndiczpkZWxldGUiLCJleHBlbnNlczpjcmVhdGUiLCJleHBlbnNlczpyZWFkIiwiZXhwZW5zZXM6dXBkYXRlIiwiZXhwZW5zZXM6YXBwcm92ZSIsImV4cGVuc2VzOmRlbGV0ZSIsIm9wZXJhdGlvbmFsX2J1ZGdldHM6Y3JlYXRlIiwib3BlcmF0aW9uYWxfYnVkZ2V0czpyZWFkIiwib3BlcmF0aW9uYWxfYnVkZ2V0czp1cGRhdGUiLCJvcGVyYXRpb25hbF9idWRnZXRzOmRlbGV0ZSIsInJlcG9ydHM6cmVhZCIsInJlcG9ydHM6ZXhwb3J0IiwidGVuYW50X3NldHRpbmdzOnJlYWQiLCJ0ZW5hbnRfc2V0dGluZ3M6dXBkYXRlIiwic3VwZXJhZG1pbjptYW5hZ2VfdGVuYW50cyIsInN1cGVyYWRtaW46aW1wZXJzb25hdGUiLCJzdXBlcmFkbWluOnZpZXdfYWxsX2RhdGEiXSwidGVuYW50X2lkIjpudWxsLCJpYXQiOjE3NjkwOTM2MzIsImV4cCI6MTc2OTA5NzIzMn0.t-gxd3gz8OzdbdyM0jrpU3OwRayW5NaVBb3Tc8IWBZo"}
[Nest] 10852  - 01/22/2026, 4:00:00 PM     LOG [CookieExtractor] [Extract] ✅ JWT token found in `access_token` cookie.
[Nest] 10852  - 01/22/2026, 4:00:00 PM   DEBUG [JwtStrategy] [Validate] Received payload: {"email":"superadmin@sentinelfi.com","sub":"4c833574-5042-4da1-b8a4-61b5517f958d","id":"4c833574-5042-4da1-b8a4-61b5517f958d","roles":["SuperAdmin"],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"iat":1769093632,"exp":1769097232}     
[Nest] 10852  - 01/22/2026, 4:00:04 PM     LOG [JwtStrategy] [Validate] User found in DB: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":["SuperAdmin"],"tenant_id":null}
[Nest] 10852  - 01/22/2026, 4:00:04 PM   DEBUG [JwtStrategy] [Validate] UserPayload returned: {"id":"4c833574-5042-4da1-b8a4-61b5517f958d","email":"superadmin@sentinelfi.com","roles":[{"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"}],"permissions":["users:create","users:read","users:update","users:delete","users:assign_roles","roles:create","roles:read","roles:update","roles:delete","projects:create","projects:read","projects:update","projects:delete","wbs:create","wbs:read","wbs:update","wbs:delete","expenses:create","expenses:read","expenses:update","expenses:approve","expenses:delete","operational_budgets:create","operational_budgets:read","operational_budgets:update","operational_budgets:delete","reports:read","reports:export","tenant_settings:read","tenant_settings:update","superadmin:manage_tenants","superadmin:impersonate","superadmin:view_all_data"],"tenant_id":null,"first_name":"Super","last_name":"Admin","is_active":true,"tenant_name":null}
[Nest] 10852  - 01/22/2026, 4:00:04 PM     LOG [JwtStrategy] [Validate] Returning user payload with tenant_id: null
[Nest] 10852  - 01/22/2026, 4:00:04 PM   DEBUG [RolesGuard] Required roles: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 4:00:04 PM   DEBUG [RolesGuard] Processing user role: {"id":"c0da617e-3d24-4dd6-bdc4-7a7bef6290e8","name":"SuperAdmin","description":"Global administrator with full platform access"} -> Name: SuperAdmin
[Nest] 10852  - 01/22/2026, 4:00:04 PM   DEBUG [RolesGuard] User roles from JWT/DB: ["SuperAdmin"]
[Nest] 10852  - 01/22/2026, 4:00:04 PM   DEBUG [RolesGuard] Checking if user has required role "SuperAdmin". Found: true
[Nest] 10852  - 01/22/2026, 4:00:04 PM     LOG [RolesGuard] Access granted for user superadmin@sentinelfi.com. Has required role.    
