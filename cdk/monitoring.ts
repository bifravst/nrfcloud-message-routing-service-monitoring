import { MonitoringApp } from "./MonitoringApp.js";
import { packBackendLambdas } from "./lambdas/packBackendLambdas.js";
import { packLayer } from "./lambdas/packLayer.js";

new MonitoringApp({
  lambdaSources: await packBackendLambdas(),
  layer: await packLayer({
    id: "baseLayer",
    dependencies: [
      "@nordicsemiconductor/from-env",
      "@aws-lambda-powertools/metrics",
      "@middy/core",
      "mqtt",
    ],
  }),
});
