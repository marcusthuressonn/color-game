import { Layer } from 'effect'
import { HttpRouter, HttpServerResponse } from 'effect/unstable/http'

/**
 * Registers the `GET /health` route on the ambient {@link HttpRouter}.
 *
 * The tracer-bullet health check is intentionally cheap: 200 with body `OK`,
 * no database round-trip. A future readiness probe that pings Postgres should
 * live behind a separate path (`/health/ready`) so liveness and readiness
 * stay distinct.
 */
export const HealthRouteLayer = HttpRouter.add(
  'GET',
  '/health',
  HttpServerResponse.text('OK'),
)

/**
 * CORS middleware so a browser-hosted client can reach the backend across
 * origins. Locally the Vite dev server proxies `/health` instead, so CORS
 * matters only once the client and server are deployed to different hosts.
 */
export const CorsLayer = HttpRouter.cors()

/**
 * Composed application layer: every route the server exposes. Exposed as a
 * single value so {@link HttpRouter.serve} and {@link HttpRouter.toWebHandler}
 * can share the same wiring (production vs. tests).
 */
export const AppLayer = Layer.mergeAll(HealthRouteLayer, CorsLayer)
