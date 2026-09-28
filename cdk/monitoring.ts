import { MonitoringApp } from "./MonitoringApp.ts";
import { packBackendLambdas } from "./lambdas/packBackendLambdas.ts";
import { packLayer } from "@bifravst/aws-cdk-lambda-helpers/layer";
import pJson from "../package.json" with { type: "json" };

const dependencies: Array<keyof (typeof pJson)["dependencies"]> = [
  "@nordicsemiconductor/from-env",
  "@aws-lambda-powertools/metrics",
  "@middy/core",
  "mqtt",
];

new MonitoringApp({
  lambdaSources: await packBackendLambdas(),
  layer: await packLayer({
    id: "baseLayer",
    dependencies,
  }),
});
