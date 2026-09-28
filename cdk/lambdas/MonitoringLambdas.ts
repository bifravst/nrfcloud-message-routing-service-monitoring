import { type PackedLambda } from "@bifravst/aws-cdk-lambda-helpers";
export type MonitoringLambdas = {
  send: PackedLambda;
  sendCoAP: PackedLambda;
  coapClient: PackedLambda;
  receive: PackedLambda;
};
