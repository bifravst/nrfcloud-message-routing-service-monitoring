import type { MonitoringLambdas } from "./MonitoringLambdas.ts";
import { packLambdaFromPath } from "@bifravst/aws-cdk-lambda-helpers";
import { packGo } from "./packGo.ts";

export const packBackendLambdas = async (): Promise<MonitoringLambdas> => ({
  send: await packLambdaFromPath({
    id: "send",
    sourceFilePath: "lambda/send.ts",
  }),
  sendCoAP: await packLambdaFromPath({
    id: "sendCoAP",
    sourceFilePath: "lambda/sendCoAP.ts",
  }),
  coapClient: await packGo("coapClient", "lambda/coap/client"),
  receive: await packLambdaFromPath({
    id: "receive",
    sourceFilePath: "lambda/receive.ts",
  }),
});
