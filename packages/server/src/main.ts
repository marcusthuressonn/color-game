import { createServer } from 'node:http'

import { Config, Layer } from 'effect'
import { NodeHttpServer, NodeRuntime, NodeServices } from '@effect/platform-node'
import { HttpRouter } from 'effect/unstable/http'

import { PgClientLayer } from './database.ts'
import { AppLayer } from './http.ts'
import { MigratorLayer } from './migrate.ts'

const ServeLayer = HttpRouter.serve(AppLayer)

const HttpServerLayer = NodeHttpServer.layerConfig(() => createServer(), {
  port: Config.port('PORT').pipe(Config.withDefault(3000)),
})

const MainLayer = Layer.mergeAll(ServeLayer, MigratorLayer).pipe(
  Layer.provide(HttpServerLayer),
  Layer.provide(PgClientLayer),
  Layer.provide(NodeServices.layer),
)

Layer.launch(MainLayer).pipe(NodeRuntime.runMain)
