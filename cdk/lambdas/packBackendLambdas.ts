import type { MonitoringLambdas } from "./MonitoringLambdas.ts";
import { packLambdaFromPath } from "@bifravst/aws-cdk-lambda-helpers";

export const packBackendLambdas = async (): Promise<MonitoringLambdas> => ({
  send: await packLambdaFromPath({
    id: "send",
    sourceFilePath: "lambda/send.ts",
  }),
  receive: await packLambdaFromPath({
    id: "receive",
    sourceFilePath: "lambda/receive.ts",
  }),
});
