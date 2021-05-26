import * as cdk from '@aws-cdk/core';

// SSP Lib
import * as ssp from '../../lib'

// Team implementations
import * as team from '../teams'

export default class MultiTeamStack {
    constructor(app: cdk.App, id: string) {
        // Setup platform team
        const accountID = cdk.Stack.of(this).account
        const platformTeam = new team.TeamPlatform(accountID)

        // Teams for the cluster.
        const teams: Array<ssp.Team> = [
            platformTeam,
            new team.TeamTroiSetup,
            new team.TeamRikerSetup,
            new team.TeamBurnhamSetup(app)
        ];

        // AddOns for the cluster.
        const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.NginxAddOn,
            new ssp.ArgoCDAddOn,
            new ssp.CalicoAddOn,
            new ssp.MetricsServerAddOn,
            new ssp.ClusterAutoScalerAddOn,
            new ssp.ContainerInsightsAddOn,
        ];

        new ssp.EksBlueprint(app, { id, addOns, teams }, {
            env: {
                region: 'us-east-2',
            },
        });
    }
}


