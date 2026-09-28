import { App } from "aws-cdk-lib";
import { MonitoringStack } from "./MonitoringStack.ts";

export class MonitoringApp extends App {
  public constructor(args: ConstructorParameters<typeof MonitoringStack>[2]) {
    super({
      context: {
        isTest: false,
      },
    });

    new MonitoringStack(
      this,
      "nrfcloud-message-routing-service-monitoring",
      args,
    );
  }
}
