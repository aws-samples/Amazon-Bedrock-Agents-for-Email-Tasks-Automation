import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { Construct } from "constructs";
import { lambda_layer_version_name } from '../name_constants';


export class NodejsLambdaLayerConstruct extends Construct {

  public lambdaLayer:lambda.LayerVersion;
    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.lambdaLayer = new lambda.LayerVersion(this, 'NodeJsLayer', {
          layerVersionName:lambda_layer_version_name,
          code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/lambda-layer/nodejs')),
          compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
          description: 'A layer with some packages installed',
        });
    }
}


