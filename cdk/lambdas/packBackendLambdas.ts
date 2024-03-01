import type { MonitoringLambdas } from "./MonitoringLambdas.js";
import { packLambdaFromPath } from "./packLambdaFromPath.js";

export const packBackendLambdas = async (): Promise<MonitoringLambdas> => ({
  send: await packLambdaFromPath("send", "lambda/send.ts"),
  receive: await packLambdaFromPath("receive", "lambda/receive.ts"),
});
