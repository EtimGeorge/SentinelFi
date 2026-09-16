/**
 * ZAP authentication script for SentinelFi (script-based authentication).
 *
 * Authenticates as a tenant admin against POST /api/v1/auth/login/tenant and
 * returns the response message. ZAP captures the Set-Cookie (httpOnly
 * `access_token`) and replays it on every request in the context, keeping the
 * active scan authenticated.
 *
 * Required context params:
 *   - "Target URL"        e.g. http://localhost:3001/api/v1/auth/login/tenant
 *
 * Required user credentials (zap.yaml -> contexts -> users -> credentials):
 *   - email, password, tenantId
 */
function authenticate(helper, paramsValues, credentials) {
  const HttpMessage = Java.type("org.parosproxy.paros.network.HttpMessage");

  const loginUrl = paramsValues.get("Target URL");

  var request = new HttpMessage(loginUrl, null);
  request.getRequestHeader().setMethod("POST");

  var body = JSON.stringify({
    email: credentials.email,
    password: credentials.password,
    tenantId: credentials.tenantId,
  });
  request.setRequestBody(body);
  request.getRequestHeader().setHeader("Content-Type", "application/json");

  // Second arg = follow redirects. The login redirects to nothing but a 200 JSON
  // response; following is harmless and keeps us consistent across flows.
  helper.sendAndReceive(request, true);

  return request;
}