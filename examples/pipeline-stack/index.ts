import * as cdk from '@aws-cdk/core';
import * as pipelines from '@aws-cdk/pipelines';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as actions from '@aws-cdk/aws-codepipeline-actions';

// SSP Lib
import * as ssp from '../../lib'

// Team implementations
import * as team from '../teams'

export default class PipelineStack extends cdk.Stack {
    constructor(app: cdk.App, id: string, props?: cdk.StackProps) {
        super(app, id, props);

        const pipeline = this.buildPipeline()

        // Dev cluster.
        pipeline.addApplicationStage(new ClusterStage(this, 'dev', {
            env: {
                region: 'us-east-2'
            }
        }));

        // Staging cluster
        pipeline.addApplicationStage(new ClusterStage(this, 'staging', {
            env: {
                region: 'us-east-2'
            }
        }));

        // Production cluster
        pipeline.addApplicationStage(new ClusterStage(this, 'production', {
            env: {
                region: 'us-east-2'
            },
        }), { manualApprovals: true });
    }

    private buildPipeline = () => {
        const sourceArtifact = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();

        const sourceAction = new actions.GitHubSourceAction({
            actionName: 'GitHub',
            owner: 'aws-quickstart',
            repo: 'quickstart-ssp-amazon-eks',
            branch: 'main',
            output: sourceArtifact,
            oauthToken: cdk.SecretValue.secretsManager('github-token'),
        })

        // Use this if you need a build step (if you're not using ts-node
        // or if you have TypeScript Lambdas that need to be compiled).
        const synthAction = pipelines.SimpleSynthAction.standardNpmSynth({
            sourceArtifact,
            cloudAssemblyArtifact,
            buildCommand: 'npm run build',
        })

        return new pipelines.CdkPipeline(this, 'FactoryPipeline', {
            pipelineName: 'FactoryPipeline',
            cloudAssemblyArtifact,
            sourceAction,
            synthAction
        });
    }
}

export class ClusterStage extends cdk.Stage {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StageProps) {
        super(scope, id, props);
        // Setup platform team
        const accountID = cdk.Stack.of(this).account
        const platformTeam = new team.TeamPlatform(accountID)
        const teams: Array<ssp.Team> = [platformTeam];

        // AddOns for the cluster.
        const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.NginxAddOn,
            new ssp.ArgoCDAddOn,
            new ssp.CalicoAddOn,
            new ssp.MetricsServerAddOn,
            new ssp.ClusterAutoScalerAddOn,
            new ssp.ContainerInsightsAddOn,
        ];
        new ssp.EksBlueprint(this, { id: 'eks', addOns, teams }, props);
    }
}