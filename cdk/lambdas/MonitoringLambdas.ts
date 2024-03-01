import type { PackedLambda } from "./packLambda.js";

export type MonitoringLambdas = {
  send: PackedLambda;
  receive: PackedLambda;
};
