import { App } from "aws-cdk-lib";
import { MonitoringStack } from "./MonitoringStack.js";

export class MonitoringApp extends App {
  public constructor(args: ConstructorParameters<typeof MonitoringStack>[2]) {
    super();

    new MonitoringStack(
      this,
      "nrfcloud-message-routing-service-monitoring",
      args
    );
  }
}
