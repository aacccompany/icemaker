///
/// Copyright © 2016-2026 The IceMaker Authors
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///     http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

import { BaseData } from '@shared/models/base-data';
import { RuleChainId } from '@shared/models/id/rule-chain-id';
import { RuleNodeId } from '@shared/models/id/rule-node-id';
import { ComponentDescriptor } from '@shared/models/component-descriptor.models';
import { FcEdge, FcNode } from 'ngx-flowchart';
import { Observable } from 'rxjs';
import { PageComponent } from '@shared/components/page.component';
import { AfterViewInit, DestroyRef, Directive, EventEmitter, inject, OnInit } from '@angular/core';
import { AbstractControl, UntypedFormGroup } from '@angular/forms';
import { RuleChainType } from '@shared/models/rule-chain.models';
import { DebugRuleNodeEventBody } from '@shared/models/event.models';
import { EntityTestScriptResult, HasEntityDebugSettings } from '@shared/models/entity.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface RuleNodeConfiguration {
  [key: string]: any;
}

export interface RuleNode extends BaseData<RuleNodeId>, HasEntityDebugSettings {
  ruleChainId?: RuleChainId;
  type: string;
  name: string;
  singletonMode: boolean;
  queueName?: string;
  configurationVersion?: number;
  configuration: RuleNodeConfiguration;
  additionalInfo?: any;
}

export interface LinkLabel {
  name: string;
  value: string;
}

export interface RuleNodeDefinition {
  description: string;
  details: string;
  inEnabled: boolean;
  outEnabled: boolean;
  relationTypes: string[];
  customRelations: boolean;
  ruleChainNode?: boolean;
  defaultConfiguration: RuleNodeConfiguration;
  icon?: string;
  iconUrl?: string;
  docUrl?: string;
  uiResources?: string[];
  uiResourceLoadError?: string;
  configDirective?: string;
}

export interface RuleNodeConfigurationDescriptor {
  nodeDefinition: RuleNodeDefinition;
}

export interface IRuleNodeConfigurationComponent {
  ruleNodeId: string;
  ruleChainId: string;
  hasScript: boolean;
  disabled: boolean;
  testScriptLabel?: string;
  changeScript?: EventEmitter<void>;
  ruleChainType: RuleChainType;
  configuration: RuleNodeConfiguration;
  configurationChanged: Observable<RuleNodeConfiguration>;
  validate();
  testScript? (debugEventBody?: DebugRuleNodeEventBody);
  [key: string]: any;
}

@Directive()
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export abstract class RuleNodeConfigurationComponent extends PageComponent implements
  IRuleNodeConfigurationComponent, OnInit, AfterViewInit {

  ruleNodeId: string;

  ruleChainId: string;

  hasScript: boolean = false;

  ruleChainType: RuleChainType;

  configurationValue: RuleNodeConfiguration;

  private configurationSet = false;
  private disabledValue = false;
  protected destroyRef = inject(DestroyRef);

  set disabled(value: boolean) {
    if (this.disabledValue !== value) {
      this.disabledValue = value;
      if (value) {
        this.configForm().disable({emitEvent: false});
      } else {
        this.configForm().enable({emitEvent: false});
        this.updateValidators(false);
      }
    }
  };

  set configuration(value: RuleNodeConfiguration) {
    this.configurationValue = value;
    if (!this.configurationSet) {
      this.configurationSet = true;
      this.setupConfiguration(value);
    } else {
      this.updateConfiguration(value);
    }
  }

  get configuration(): RuleNodeConfiguration {
    return this.configurationValue;
  }

  configurationChangedEmiter = new EventEmitter<RuleNodeConfiguration>();
  configurationChanged = this.configurationChangedEmiter.asObservable();

  protected constructor(...args: unknown[]) {
    super();
  }

  ngOnInit() {}

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (!this.validateConfig()) {
        this.configurationChangedEmiter.emit(null);
      }
    }, 0);
  }

  validate() {
    this.onValidate();
  }

  protected setupConfiguration(configuration: RuleNodeConfiguration) {
    this.onConfigurationSet(this.prepareInputConfig(configuration));
    this.updateValidators(false);
    for (const trigger of this.validatorTriggers()) {
      const path = trigger.split('.');
      let control: AbstractControl = this.configForm();
      for (const part of path) {
        control = control.get(part);
      }
      control.valueChanges.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(() => {
        this.updateValidators(true, trigger);
      });
    }
    this.configForm().valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((updated: RuleNodeConfiguration) => {
      this.onConfigurationChanged(updated);
    });
  }

  protected updateConfiguration(configuration: RuleNodeConfiguration) {
    this.configForm().reset(this.prepareInputConfig(configuration), {emitEvent: false});
    this.updateValidators(false);
  }

  protected updateValidators(emitEvent: boolean, trigger?: string) {
  }

  protected validatorTriggers(): string[] {
    return [];
  }

  protected onConfigurationChanged(updated: RuleNodeConfiguration) {
    this.configurationValue = updated;
    if (this.validateConfig()) {
      this.configurationChangedEmiter.emit(this.prepareOutputConfig(updated));
    } else {
      this.configurationChangedEmiter.emit(null);
    }
  }

  protected prepareInputConfig(configuration: RuleNodeConfiguration): RuleNodeConfiguration {
    return configuration;
  }

  protected prepareOutputConfig(configuration: RuleNodeConfiguration): RuleNodeConfiguration {
    return configuration;
  }

  protected validateConfig(): boolean {
    return this.configForm().valid;
  }

  protected onValidate() {}

  protected abstract configForm(): UntypedFormGroup;

  protected abstract onConfigurationSet(configuration: RuleNodeConfiguration);

}


export enum RuleNodeType {
  FILTER = 'FILTER',
  ENRICHMENT = 'ENRICHMENT',
  TRANSFORMATION = 'TRANSFORMATION',
  ACTION = 'ACTION',
  EXTERNAL = 'EXTERNAL',
  FLOW = 'FLOW',
  UNKNOWN = 'UNKNOWN',
  INPUT = 'INPUT'
}

export const ruleNodeTypesLibrary = [
  RuleNodeType.FILTER,
  RuleNodeType.ENRICHMENT,
  RuleNodeType.TRANSFORMATION,
  RuleNodeType.ACTION,
  RuleNodeType.EXTERNAL,
  RuleNodeType.FLOW,
];

export interface RuleNodeTypeDescriptor {
  value: RuleNodeType;
  name: string;
  details: string;
  nodeClass: string;
  icon: string;
  special?: boolean;
}

export const ruleNodeTypeDescriptors = new Map<RuleNodeType, RuleNodeTypeDescriptor>(
  [
    [
      RuleNodeType.FILTER,
      {
        value: RuleNodeType.FILTER,
        name: 'rulenode.type-filter',
        details: 'rulenode.type-filter-details',
        nodeClass: 'tb-filter-type',
        icon: 'filter_list'
      }
    ],
    [
      RuleNodeType.ENRICHMENT,
      {
        value: RuleNodeType.ENRICHMENT,
        name: 'rulenode.type-enrichment',
        details: 'rulenode.type-enrichment-details',
        nodeClass: 'tb-enrichment-type',
        icon: 'playlist_add'
      }
    ],
    [
      RuleNodeType.TRANSFORMATION,
      {
        value: RuleNodeType.TRANSFORMATION,
        name: 'rulenode.type-transformation',
        details: 'rulenode.type-transformation-details',
        nodeClass: 'tb-transformation-type',
        icon: 'transform'
      }
    ],
    [
      RuleNodeType.ACTION,
      {
        value: RuleNodeType.ACTION,
        name: 'rulenode.type-action',
        details: 'rulenode.type-action-details',
        nodeClass: 'tb-action-type',
        icon: 'flash_on'
      }
    ],
    [
      RuleNodeType.EXTERNAL,
      {
        value: RuleNodeType.EXTERNAL,
        name: 'rulenode.type-external',
        details: 'rulenode.type-external-details',
        nodeClass: 'tb-external-type',
        icon: 'cloud_upload'
      }
    ],
    [
      RuleNodeType.FLOW,
      {
        value: RuleNodeType.FLOW,
        name: 'rulenode.type-flow',
        details: 'rulenode.type-flow-details',
        nodeClass: 'tb-flow-type',
        icon: 'settings_ethernet'
      }
    ],
    [
      RuleNodeType.INPUT,
      {
        value: RuleNodeType.INPUT,
        name: 'rulenode.type-input',
        details: 'rulenode.type-input-details',
        nodeClass: 'tb-input-type',
        icon: 'input',
        special: true
      }
    ],
    [
      RuleNodeType.UNKNOWN,
      {
        value: RuleNodeType.UNKNOWN,
        name: 'rulenode.type-unknown',
        details: 'rulenode.type-unknown-details',
        nodeClass: 'tb-unknown-type',
        icon: 'help_outline'
      }
    ]
  ]
);

export interface RuleNodeComponentDescriptor extends ComponentDescriptor {
  type: RuleNodeType;
  configurationVersion: number,
  configurationDescriptor?: RuleNodeConfigurationDescriptor;
}

export interface FcRuleNodeType extends FcNode, HasEntityDebugSettings {
  component?: RuleNodeComponentDescriptor;
  singletonMode?: boolean;
  queueName?: string;
  nodeClass?: string;
  icon?: string;
  iconUrl?: string;
}

export interface FcRuleNode extends FcRuleNodeType {
  ruleNodeId?: RuleNodeId;
  additionalInfo?: any;
  configuration?: RuleNodeConfiguration;
  error?: string;
  highlighted?: boolean;
  componentClazz?: string;
  ruleChainType?: RuleChainType;
}

export interface FcRuleEdge extends FcEdge {
  labels?: string[];
}

export enum ScriptLanguage {
  JS = 'JS',
  TBEL = 'TBEL'
}

export interface TestScriptInputParams {
  script: string;
  scriptType: string;
  argNames: string[];
  msg: string;
  metadata: {[key: string]: string};
  msgType: string;
}

export type TestScriptResult = EntityTestScriptResult;

export enum MessageType {
  POST_ATTRIBUTES_REQUEST = 'POST_ATTRIBUTES_REQUEST',
  POST_TELEMETRY_REQUEST = 'POST_TELEMETRY_REQUEST',
  TO_SERVER_RPC_REQUEST = 'TO_SERVER_RPC_REQUEST',
  RPC_CALL_FROM_SERVER_TO_DEVICE = 'RPC_CALL_FROM_SERVER_TO_DEVICE',
  RPC_QUEUED = 'RPC_QUEUED',
  RPC_SENT = 'RPC_SENT',
  RPC_DELIVERED = 'RPC_DELIVERED',
  RPC_SUCCESSFUL = 'RPC_SUCCESSFUL',
  RPC_TIMEOUT = 'RPC_TIMEOUT',
  RPC_EXPIRED = 'RPC_EXPIRED',
  RPC_FAILED = 'RPC_FAILED',
  RPC_DELETED = 'RPC_DELETED',
  ACTIVITY_EVENT = 'ACTIVITY_EVENT',
  INACTIVITY_EVENT = 'INACTIVITY_EVENT',
  CONNECT_EVENT = 'CONNECT_EVENT',
  DISCONNECT_EVENT = 'DISCONNECT_EVENT',
  ENTITY_CREATED = 'ENTITY_CREATED',
  ENTITY_UPDATED = 'ENTITY_UPDATED',
  ENTITY_DELETED = 'ENTITY_DELETED',
  ENTITY_ASSIGNED = 'ENTITY_ASSIGNED',
  ENTITY_UNASSIGNED = 'ENTITY_UNASSIGNED',
  ATTRIBUTES_UPDATED = 'ATTRIBUTES_UPDATED',
  ATTRIBUTES_DELETED = 'ATTRIBUTES_DELETED',
  ALARM_ACKNOWLEDGED = 'ALARM_ACKNOWLEDGED',
  ALARM_CLEARED = 'ALARM_CLEARED',
  ALARM_ASSIGNED = 'ALARM_ASSIGNED',
  ALARM_UNASSIGNED = 'ALARM_UNASSIGNED',
  COMMENT_CREATED = 'COMMENT_CREATED',
  COMMENT_UPDATED = 'COMMENT_UPDATED',
  ENTITY_ASSIGNED_FROM_TENANT = 'ENTITY_ASSIGNED_FROM_TENANT',
  ENTITY_ASSIGNED_TO_TENANT = 'ENTITY_ASSIGNED_TO_TENANT',
  TIMESERIES_UPDATED = 'TIMESERIES_UPDATED',
  TIMESERIES_DELETED = 'TIMESERIES_DELETED'
}

export const messageTypeNames = new Map<MessageType, string>(
  [
    [MessageType.POST_ATTRIBUTES_REQUEST, 'Post attributes'],
    [MessageType.POST_TELEMETRY_REQUEST, 'Post telemetry'],
    [MessageType.TO_SERVER_RPC_REQUEST, 'RPC Request from Device'],
    [MessageType.RPC_CALL_FROM_SERVER_TO_DEVICE, 'RPC Request to Device'],
    [MessageType.RPC_QUEUED, 'RPC Queued'],
    [MessageType.RPC_SENT, 'RPC Sent'],
    [MessageType.RPC_DELIVERED, 'RPC Delivered'],
    [MessageType.RPC_SUCCESSFUL, 'RPC Successful'],
    [MessageType.RPC_TIMEOUT, 'RPC Timeout'],
    [MessageType.RPC_EXPIRED, 'RPC Expired'],
    [MessageType.RPC_FAILED, 'RPC Failed'],
    [MessageType.RPC_DELETED, 'RPC Deleted'],
    [MessageType.ACTIVITY_EVENT, 'Activity Event'],
    [MessageType.INACTIVITY_EVENT, 'Inactivity Event'],
    [MessageType.CONNECT_EVENT, 'Connect Event'],
    [MessageType.DISCONNECT_EVENT, 'Disconnect Event'],
    [MessageType.ENTITY_CREATED, 'Entity Created'],
    [MessageType.ENTITY_UPDATED, 'Entity Updated'],
    [MessageType.ENTITY_DELETED, 'Entity Deleted'],
    [MessageType.ENTITY_ASSIGNED, 'Entity Assigned'],
    [MessageType.ENTITY_UNASSIGNED, 'Entity Unassigned'],
    [MessageType.ATTRIBUTES_UPDATED, 'Attributes Updated'],
    [MessageType.ATTRIBUTES_DELETED, 'Attributes Deleted'],
    [MessageType.ALARM_ACKNOWLEDGED, 'Alarm Acknowledged'],
    [MessageType.ALARM_CLEARED, 'Alarm Cleared'],
    [MessageType.ALARM_ASSIGNED, 'Alarm Assigned'],
    [MessageType.ALARM_UNASSIGNED, 'Alarm Unassigned'],
    [MessageType.COMMENT_CREATED, 'Comment Created'],
    [MessageType.COMMENT_UPDATED, 'Comment Updated'],
    [MessageType.ENTITY_ASSIGNED_FROM_TENANT, 'Entity Assigned From Tenant'],
    [MessageType.ENTITY_ASSIGNED_TO_TENANT, 'Entity Assigned To Tenant'],
    [MessageType.TIMESERIES_UPDATED, 'Timeseries Updated'],
    [MessageType.TIMESERIES_DELETED, 'Timeseries Deleted']
  ]
);

export const ruleChainNodeClazz = 'org.icemaker.rule.engine.flow.TbRuleChainInputNode';
export const outputNodeClazz = 'org.icemaker.rule.engine.flow.TbRuleChainOutputNode';

const ruleNodeClazzHelpLinkMap = {
  'org.icemaker.rule.engine.filter.TbCheckRelationNode': 'ruleNodeCheckRelation',
  'org.icemaker.rule.engine.filter.TbCheckMessageNode': 'ruleNodeCheckExistenceFields',
  'org.icemaker.rule.engine.geo.TbGpsGeofencingFilterNode': 'ruleNodeGpsGeofencingFilter',
  'org.icemaker.rule.engine.filter.TbJsFilterNode': 'ruleNodeJsFilter',
  'org.icemaker.rule.engine.filter.TbJsSwitchNode': 'ruleNodeJsSwitch',
  'org.icemaker.rule.engine.filter.TbAssetTypeSwitchNode': 'ruleNodeAssetProfileSwitch',
  'org.icemaker.rule.engine.filter.TbDeviceTypeSwitchNode': 'ruleNodeDeviceProfileSwitch',
  'org.icemaker.rule.engine.filter.TbCheckAlarmStatusNode': 'ruleNodeCheckAlarmStatus',
  'org.icemaker.rule.engine.filter.TbMsgTypeFilterNode': 'ruleNodeMessageTypeFilter',
  'org.icemaker.rule.engine.filter.TbMsgTypeSwitchNode': 'ruleNodeMessageTypeSwitch',
  'org.icemaker.rule.engine.filter.TbOriginatorTypeFilterNode': 'ruleNodeOriginatorTypeFilter',
  'org.icemaker.rule.engine.filter.TbOriginatorTypeSwitchNode': 'ruleNodeOriginatorTypeSwitch',
  'org.icemaker.rule.engine.metadata.TbGetAttributesNode': 'ruleNodeOriginatorAttributes',
  'org.icemaker.rule.engine.metadata.TbGetOriginatorFieldsNode': 'ruleNodeOriginatorFields',
  'org.icemaker.rule.engine.metadata.TbGetTelemetryNode': 'ruleNodeOriginatorTelemetry',
  'org.icemaker.rule.engine.metadata.TbGetCustomerAttributeNode': 'ruleNodeCustomerAttributes',
  'org.icemaker.rule.engine.metadata.TbGetCustomerDetailsNode': 'ruleNodeCustomerDetails',
  'org.icemaker.rule.engine.metadata.TbFetchDeviceCredentialsNode': 'ruleNodeFetchDeviceCredentials',
  'org.icemaker.rule.engine.metadata.TbGetDeviceAttrNode': 'ruleNodeDeviceAttributes',
  'org.icemaker.rule.engine.metadata.TbGetRelatedAttributeNode': 'ruleNodeRelatedAttributes',
  'org.icemaker.rule.engine.metadata.TbGetTenantAttributeNode': 'ruleNodeTenantAttributes',
  'org.icemaker.rule.engine.metadata.TbGetTenantDetailsNode': 'ruleNodeTenantDetails',
  'org.icemaker.rule.engine.metadata.CalculateDeltaNode': 'ruleNodeCalculateDelta',
  'org.icemaker.rule.engine.transform.TbChangeOriginatorNode': 'ruleNodeChangeOriginator',
  'org.icemaker.rule.engine.transform.TbCopyKeysNode': 'ruleNodeCopyKeyValuePairs',
  'org.icemaker.rule.engine.deduplication.TbMsgDeduplicationNode': 'ruleNodeDeduplication',
  'org.icemaker.rule.engine.transform.TbDeleteKeysNode': 'ruleNodeDeleteKeyValuePairs',
  'org.icemaker.rule.engine.transform.TbJsonPathNode': 'ruleNodeJsonPath',
  'org.icemaker.rule.engine.transform.TbRenameKeysNode': 'ruleNodeRenameKeys',
  'org.icemaker.rule.engine.transform.TbTransformMsgNode': 'ruleNodeTransformMsg',
  'org.icemaker.rule.engine.transform.TbSplitArrayMsgNode': 'ruleNodeSplitArrayMsg',
  'org.icemaker.rule.engine.mail.TbMsgToEmailNode': 'ruleNodeMsgToEmail',
  'org.icemaker.rule.engine.action.TbAssignToCustomerNode': 'ruleNodeAssignToCustomer',
  'org.icemaker.rule.engine.action.TbUnassignFromCustomerNode': 'ruleNodeUnassignFromCustomer',
  'org.icemaker.rule.engine.telemetry.TbCalculatedFieldsNode': 'ruleNodeCalculatedFields',
  'org.icemaker.rule.engine.action.TbClearAlarmNode': 'ruleNodeClearAlarm',
  'org.icemaker.rule.engine.action.TbCreateAlarmNode': 'ruleNodeCreateAlarm',
  'org.icemaker.rule.engine.action.TbCopyAttributesToEntityViewNode': 'ruleNodeCopyToView',
  'org.icemaker.rule.engine.action.TbCreateRelationNode': 'ruleNodeCreateRelation',
  'org.icemaker.rule.engine.action.TbDeleteRelationNode': 'ruleNodeDeleteRelation',
  'org.icemaker.rule.engine.action.TbDeviceStateNode': 'ruleNodeDeviceState',
  'org.icemaker.rule.engine.action.TbMsgCountNode': 'ruleNodeMessageCount',
  'org.icemaker.rule.engine.delay.TbMsgDelayNode': 'ruleNodeMsgDelay',
  'org.icemaker.rule.engine.debug.TbMsgGeneratorNode': 'ruleNodeMsgGenerator',
  'org.icemaker.rule.engine.geo.TbGpsGeofencingActionNode': 'ruleNodeGpsGeofencingEvents',
  'org.icemaker.rule.engine.action.TbLogNode': 'ruleNodeLog',
  'org.icemaker.rule.engine.rpc.TbSendRPCReplyNode': 'ruleNodeRpcCallReply',
  'org.icemaker.rule.engine.rpc.TbSendRPCRequestNode': 'ruleNodeRpcCallRequest',
  'org.icemaker.rule.engine.telemetry.TbMsgAttributesNode': 'ruleNodeSaveAttributes',
  'org.icemaker.rule.engine.telemetry.TbMsgDeleteAttributesNode': 'ruleNodeDeleteAttributes',
  'org.icemaker.rule.engine.telemetry.TbMsgTimeseriesNode': 'ruleNodeSaveTimeseries',
  'org.icemaker.rule.engine.action.TbSaveToCustomCassandraTableNode': 'ruleNodeSaveToCustomTable',
  'org.icemaker.rule.engine.aws.lambda.TbAwsLambdaNode': 'ruleNodeAwsLambda',
  'org.icemaker.rule.engine.ai.TbAiNode': 'ruleNodeAiRequest',
  'org.icemaker.rule.engine.aws.sns.TbSnsNode': 'ruleNodeAwsSns',
  'org.icemaker.rule.engine.aws.sqs.TbSqsNode': 'ruleNodeAwsSqs',
  'org.icemaker.rule.engine.kafka.TbKafkaNode': 'ruleNodeKafka',
  'org.icemaker.rule.engine.mqtt.TbMqttNode': 'ruleNodeMqtt',
  'org.icemaker.rule.engine.mqtt.azure.TbAzureIotHubNode': 'ruleNodeAzureIotHub',
  'org.icemaker.rule.engine.gcp.pubsub.TbPubSubNode': 'ruleNodeGcpPubSub',
  'org.icemaker.rule.engine.rabbitmq.TbRabbitMqNode': 'ruleNodeRabbitMq',
  'org.icemaker.rule.engine.rest.TbRestApiCallNode': 'ruleNodeRestApiCall',
  'org.icemaker.rule.engine.mail.TbSendEmailNode': 'ruleNodeSendEmail',
  'org.icemaker.rule.engine.sms.TbSendSmsNode': 'ruleNodeSendSms',
  'org.icemaker.rule.engine.edge.TbMsgPushToCloudNode': 'ruleNodePushToCloud',
  'org.icemaker.rule.engine.edge.TbMsgPushToEdgeNode': 'ruleNodePushToEdge',
  'org.icemaker.rule.engine.profile.TbDeviceProfileNode': 'ruleNodeDeviceProfile',
  'org.icemaker.rule.engine.flow.TbRuleChainInputNode': 'ruleNodeRuleChain',
  'org.icemaker.rule.engine.flow.TbRuleChainOutputNode': 'ruleNodeOutputNode',
  'org.icemaker.rule.engine.flow.TbAckNode': 'ruleNodeAcknowledge',
  'org.icemaker.rule.engine.flow.TbCheckpointNode': 'ruleNodeCheckpoint',
  'org.icemaker.rule.engine.math.TbMathNode': 'ruleNodeMath',
  'org.icemaker.rule.engine.rest.TbSendRestApiCallReplyNode': 'ruleNodeRestCallReply',
  'org.icemaker.rule.engine.notification.TbNotificationNode': 'ruleNodeSendNotification',
  'org.icemaker.rule.engine.notification.TbSlackNode': 'ruleNodeSendSlack',
};

export function getRuleNodeHelpLink(component: RuleNodeComponentDescriptor): string {
  if (component) {
    if (component.configurationDescriptor &&
      component.configurationDescriptor.nodeDefinition &&
      component.configurationDescriptor.nodeDefinition.docUrl) {
      return component.configurationDescriptor.nodeDefinition.docUrl;
    } else if (component.clazz) {
      if (ruleNodeClazzHelpLinkMap[component.clazz]) {
        return ruleNodeClazzHelpLinkMap[component.clazz];
      }
    }
  }
  return 'ruleEngine';
}

