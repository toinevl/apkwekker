// APKwekker infrastructure — dedicated resource group rg-apkwekker, no shared resources.
// Deploy: az deployment group create -g rg-apkwekker -f infra/main.bicep
targetScope = 'resourceGroup'

@description('Base name for all resources')
param baseName string = 'apkwekker'

@description('Location for compute/storage')
param location string = 'westeurope'

@description('Allowed CORS origins for the Function App platform CORS (lesson: persist platform CORS in Bicep)')
param corsAllowedOrigins array = []

@description('Origins allowed by the APP-level CORS layer (api/src/lib/cors.ts). Distinct from corsAllowedOrigins above, which is Azure platform CORS. Must list every hostname the frontend is served from, including SWA custom domains.')
param allowedOrigins array = [
  'https://victorious-pebble-0f3357803.7.azurestaticapps.net'
  'https://apkwekker.autos'
  'https://apkwekker.stoncoo.com'
]

var storageName = 'st${baseName}${uniqueString(resourceGroup().id)}'
var functionAppName = 'func-${baseName}'
var planName = 'plan-${baseName}'
var swaName = 'swa-${baseName}'
var logsName = 'log-${baseName}'
var aiName = 'appi-${baseName}'

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource subscriptionsTable 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = {
  parent: tableService
  name: 'subscriptions'
}

resource deployContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  name: '${storage.name}/default/function-releases'
}

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logsName
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: aiName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  kind: 'functionapp'
  properties: {
    reserved: true
  }
}

var storageConnection = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=core.windows.net'

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: plan.id
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storage.properties.primaryEndpoints.blob}function-releases'
          authentication: {
            type: 'StorageAccountConnectionString'
            storageAccountConnectionStringName: 'DEPLOYMENT_STORAGE_CONNECTION_STRING'
          }
        }
      }
      scaleAndConcurrency: {
        maximumInstanceCount: 40
        instanceMemoryMB: 2048
      }
      runtime: {
        name: 'node'
        version: '20'
      }
    }
    siteConfig: {
      cors: {
        allowedOrigins: corsAllowedOrigins
      }
      // NOTE: siteConfig.appSettings REPLACES the entire app-settings collection on
      // every deploy. Any setting missing here is deleted from the live app, even if
      // it was added by hand with `az functionapp config appsettings set`.
      // Before 2026-08-19 this list held only the four storage/telemetry entries,
      // so a deploy would have wiped ALLOWED_ORIGINS, BASE_URL, FRONTEND_URL,
      // MAIL_FROM and ACS_CONNECTION — breaking CORS, confirm links and all email.
      appSettings: [
        { name: 'AzureWebJobsStorage', value: storageConnection }
        { name: 'DEPLOYMENT_STORAGE_CONNECTION_STRING', value: storageConnection }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        { name: 'STORAGE_CONNECTION', value: storageConnection }
        // App-level CORS allowlist, read by api/src/lib/cors.ts and split on ','.
        // A missing origin makes the API answer 200 while the browser discards the
        // response for a missing ACAO header — looks healthy server-side (bug #070).
        { name: 'ALLOWED_ORIGINS', value: join(allowedOrigins, ',') }
        { name: 'BASE_URL', value: 'https://${functionAppName}.azurewebsites.net' }
        { name: 'FRONTEND_URL', value: 'https://${swa.properties.defaultHostname}' }
        { name: 'MAIL_FROM', value: 'DoNotReply@${managedDomain.properties.mailFromSenderDomain}' }
        // Secret resolved at deploy time from the ACS resource — never stored in source.
        { name: 'ACS_CONNECTION', value: acs.listKeys().primaryConnectionString }
      ]
    }
    httpsOnly: true
  }
}

// SCM basic auth ON: required for publish-profile deployments (lesson: azure-deployment-lessons)
resource scmBasicAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2023-12-01' = {
  parent: functionApp
  name: 'scm'
  properties: {
    allow: true
  }
}

resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: swaName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    allowConfigFileUpdates: true
    stagingEnvironmentPolicy: 'Enabled'
  }
}

// Azure Communication Services for email (managed domain: instant, no DNS needed)
resource emailService 'Microsoft.Communication/emailServices@2023-04-01' = {
  name: 'email-${baseName}'
  location: 'global'
  properties: {
    dataLocation: 'Europe'
  }
}

resource managedDomain 'Microsoft.Communication/emailServices/domains@2023-04-01' = {
  parent: emailService
  name: 'AzureManagedDomain'
  location: 'global'
  properties: {
    domainManagement: 'AzureManaged'
  }
}

resource acs 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: 'acs-${baseName}'
  location: 'global'
  properties: {
    dataLocation: 'Europe'
    linkedDomains: [
      managedDomain.id
    ]
  }
}

output functionAppName string = functionApp.name
output functionAppHostname string = functionApp.properties.defaultHostName
output swaName string = swa.name
output swaHostname string = swa.properties.defaultHostname
output storageAccountName string = storage.name
output acsName string = acs.name
output mailFromDomain string = managedDomain.properties.mailFromSenderDomain
