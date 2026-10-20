import { EncryptionCipher, EntityType, PaginationResults, PolicyType } from "./explorer.ts";
import { Capacity } from "./user.ts";
import { TaskStatus, TaskSummary, TaskType } from "./workflow.ts";

export interface MetricsSummary {
  dates: string[];
  files: number[];
  users: number[];
  shares: number[];
  file_total: number;
  user_total: number;
  share_total: number;
  entities_total: number;
  generated_at: string;
}

export interface Version {
  version: string;
  pro: boolean;
  commit: string;
}

export interface HomepageSummary {
  metrics_summary?: MetricsSummary;
  site_urls: string[];
  version: Version;
}

export interface ManualRefreshLicenseService {
  license: string;
}

export interface GetSettingService {
  keys: string[];
}

export interface SetSettingService {
  settings: {
    [key: string]: string;
  };
}

export interface GroupEnt extends CommonMixin {
  name: string;
  max_storage?: number;
  speed_limit?: number;
  permissions?: string;
  edges: {
    storage_policies?: StoragePolicy;
  };
  total_users?: number;
  settings?: GroupSetting;
}

export interface GroupSetting {
  compress_size?: number;
  decompress_size?: number;
  remote_download_options?: Record<string, any>;
  source_batch?: number;
  aria2_batch?: number;
  max_walked_files?: number;
  trash_retention?: number;
  redirected_source?: boolean;
  // available_policies 用户组可用的存储策略 ID 列表（Pro: 可用存储策略多选）。
  available_policies?: number[];
  // default_pinned_shares 用户组默认置顶的分享数字 ID 列表（Pro: 默认固定分享）。
  default_pinned_shares?: number[];
  // folder_direct_link 允许组内用户为目录生成直链（Pro: 目录直链）。
  folder_direct_link?: boolean;
  /** 用户组可用的任务处理节点 ID 列表（Pro: 可用节点） */
  allowed_nodes?: number[];
  /** 允许组内用户创建任务前自行选择节点（Pro: 允许选择节点） */
  allow_select_node?: boolean;
}

export interface AdminListGroupResponse {
  groups: GroupEnt[];
  pagination: PaginationResults;
}

export interface QQConnectConfig {
  app_id?: string;
  app_secret?: string;
  direct_sign_in?: boolean;
}

export interface LogtoConfig {
  endpoint?: string;
  app_id?: string;
  app_secret?: string;
  direct_sign_in?: boolean;
  display_name?: string;
  direct_sso?: string;
}

export interface FetchWOPIDiscoveryService {
  endpoint: string;
}

export interface ThumbGeneratorTestService {
  name: string;
  executable: string;
}

export interface TestSMTPService {
  to: string;
  settings: {
    [key: string]: string;
  };
}

export enum QueueType {
  IO_INTENSE = "io_intense",
  MEDIA_META = "media_meta",
  RECYCLE = "recycle",
  THUMB = "thumb",
  REMOTE_DOWNLOAD = "remote_download",
}

export interface QueueMetric {
  name: QueueType;
  busy_workers: number;
  success_tasks: number;
  failure_tasks: number;
  submitted_tasks: number;
  suspending_tasks: number;
}

export interface CommonMixin {
  id: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface StoragePolicy extends CommonMixin {
  name: string;
  type: PolicyType;
  server?: string;
  bucket_name?: string;
  is_private?: boolean;
  access_key?: string;
  secret_key?: string;
  max_size?: number;
  auto_rename?: boolean;
  dir_name_rule?: string;
  file_name_rule?: string;
  settings?: PolicySetting;
  node_id?: number;
  edges: {
    users?: User[];
    groups?: GroupEnt[];
    node?: Node;
  };
  entities_count?: number;
  entities_size?: number;
  hash_id?: string;
}

export enum NodeType {
  master = "master",
  slave = "slave",
}

export interface ListNodeResponse {
  nodes: Node[];
  pagination: PaginationResults;
}

export interface Node extends CommonMixin {
  name?: string;
  status?: NodeStatus;
  type?: NodeType;
  server?: string;
  slave_key?: string;
  capabilities?: string;
  weight?: number;
  settings?: NodeSetting;
  edges: {
    storage_policy?: StoragePolicy[];
  };
}

export enum DownloaderProvider {
  qbittorrent = "qbittorrent",
  aria2 = "aria2",
}

export interface QBittorrentSetting {
  server?: string;
  user?: string;
  password?: string;
  options?: Record<string, string>;
  temp_path?: string;
}

export interface Aria2Setting {
  server?: string;
  token?: string;
  options?: Record<string, string>;
  temp_path?: string;
}

export interface URLValidationSetting {
  disabled?: boolean;
  allowed_hosts?: string[];
  allowed_cidrs?: string[];
}

export interface NodeSetting {
  provider?: DownloaderProvider;
  qbittorrent?: QBittorrentSetting;
  aria2?: Aria2Setting;
  interval?: number;
  wait_for_seeding?: boolean;
  url_validation?: URLValidationSetting;
}

export enum NodeStatus {
  active = "active",
  suspended = "suspended",
}

/** 负载均衡策略的子策略条目：文件会落在 policy_id 上，weight 为相对权重。 */
export interface LoadBalanceSubPolicy {
  policy_id: number;
  weight: number;
}

export interface PolicySetting {
  token?: string;
  file_type?: string[];
  is_file_type_deny_list?: boolean;
  file_regexp?: string;
  is_name_regexp_deny_list?: boolean;
  od_redirect?: string;
  custom_proxy?: boolean;
  proxy_server?: string;
  internal_proxy?: boolean;
  od_driver?: string;
  region?: string;
  server_side_endpoint?: string;
  chunk_size?: number;
  tps_limit?: number;
  tps_limit_burst?: number;
  s3_path_style?: boolean;
  thumb_exts?: string[];
  thumb_support_all_exts?: boolean;
  thumb_max_size?: number;
  relay?: boolean;
  pre_allocate?: boolean;
  media_meta_exts?: string[];
  media_meta_generator_proxy?: boolean;
  thumb_generator_proxy?: boolean;
  native_media_processing?: boolean;
  s3_delete_batch_size?: number;
  stream_saver?: boolean;
  use_cname?: boolean;
  source_auth?: boolean;
  qiniu_upload_cdn?: boolean;
  chunk_concurrency?: number;
  encryption?: boolean;
  // 移动云盘（yun139）
  yun139_token?: string;
  yun139_username?: string;
  yun139_password?: string;
  yun139_mail_cookies?: string;
  yun139_root_folder_id?: string;
  /** 负载均衡策略的子策略与权重（Pro: 负载均衡存储策略） */
  load_balance_sub_policies?: LoadBalanceSubPolicy[];
}

export interface User extends CommonMixin {
  email: string;
  nick: string;
  password?: string;
  settings?: UserSetting;
  status?: UserStatus;
  storage?: number;
  avatar?: string;
  credit?: number;
  // points 为积分余额（服务端由积分账本实时计算）。
  points?: number;
  group_expires?: string;
  notify_date?: string;
  group_users?: number;
  previous_group?: number;
  unmanaged_email?: boolean;
  edges: {
    group?: GroupEnt;
    storage_policy?: StoragePolicy;
    openid?: OpenID[];
    passkey?: Passkey[];
  };

  hash_id?: string;
  two_fa_enabled?: boolean;
  capacity?: Capacity;
}

export interface OpenID extends CommonMixin {
  provider?: number;
}

export interface Passkey extends CommonMixin {
  name?: string;
}

export enum UserStatus {
  active = "active",
  inactive = "inactive",
  manual_banned = "manual_banned",
  sys_banned = "sys_banned",
}

export interface UserSetting {
  profile_off?: boolean;
  preferred_policy?: number;
  preferred_theme?: string;
  version_retention?: boolean;
  version_retention_ext?: string[];
  version_retention_max?: number;
  pined?: PinedFile[];
  language?: string;
}

export interface PinedFile {
  uri: string;
  name?: string;
  // locked 为 true 表示该置顶项来自用户组默认置顶（Pro: 默认固定分享），用户无法取消。
  locked?: boolean;
}

export interface ListStoragePolicyResponse {
  policies: StoragePolicy[];
  pagination: PaginationResults;
}

export interface AdminListService {
  page: number;
  page_size: number;
  order_by: string;
  order_direction: string;
  conditions?: Record<string, string>;
  searches?: Record<string, string>;
}

export interface UpsertStoragePolicyService {
  policy: StoragePolicy;
}

export interface CreateStoragePolicyCorsService {
  policy: StoragePolicy;
}

export interface OauthCredentialStatus {
  last_refresh_time: string;
  valid: boolean;
}

export interface GetOauthRedirectService {
  id: number;
  secret: string;
  app_id: string;
}

export interface FinishOauthCallbackService {
  code: string;
  state: string;
}

export interface UpsertGroupService {
  group: GroupEnt;
}

export interface TestNodeService {
  node: Node;
}

export interface TestNodeDownloaderService extends TestNodeService {}

export interface UpsertNodeService extends TestNodeService {}

export interface ListUserResponse {
  users: User[];
  pagination: PaginationResults;
}

export interface UpsertUserService {
  user: User;
  password?: string;
  two_fa?: string;
}

export interface BatchIDService {
  ids: number[];
  force?: boolean;
}

/*
FilePermissions struct {
		Groups map[int]*boolset.BooleanSet `json:"groups,omitempty"`
		Users  map[int]*boolset.BooleanSet `json:"users,omitempty"`
	}

*/

export interface File extends CommonMixin {
  type?: number;
  name?: string;
  owner_id?: number;
  size?: number;
  primary_entity?: number;
  file_children?: number;
  is_symbolic?: boolean;
  storage_policy_files?: number;
  edges: {
    owner?: User;
    storage_policies?: StoragePolicy;
    metadata?: Metadata[];
    entities?: Entity[];
    direct_links?: DirectLink[];
    shares?: Share[];
  };

  user_hash_id?: string;
  file_hash_id?: string;
  direct_link_map?: Record<number, string>;
}

export interface DirectLink extends CommonMixin {
  name?: string;
  downloads?: number;
  speed?: number;
}

export interface Entity extends CommonMixin {
  type?: EntityType;
  source?: string;
  size?: number;
  reference_count?: number;
  storage_policy_entities?: number;
  upload_session_id?: string;
  edges: {
    user?: User;
    storage_policy?: StoragePolicy;
    file?: File[];
  };
  props?: EntityProps;

  user_hash_id?: string;
  user_hash_id_map?: Record<number, string>;
}

export interface EntityProps {
  encrypt_metadata?: EncryptMetadata;
}

export interface EncryptMetadata {
  algorithm: EncryptionCipher;
}

export interface Metadata extends CommonMixin {
  name?: string;
  value?: string;
  is_public?: boolean;
}

export interface ListFileResponse {
  files: File[];
  pagination: PaginationResults;
}

export interface UpsertFileService {
  file: File;
}

export interface ListEntityResponse {
  entities: Entity[];
  pagination: PaginationResults;
}

export interface LogEntry {
  category: number;
  failed?: boolean;
  error?: string;
  user_agent?: string;
  is_system?: boolean;
  reason?: string;
  email_to?: string;
  email_title?: string;
  original_name?: string;
  new_name?: string;
  from?: string;
  to?: string;
  entity_create_time?: string;
  storage_policy_id?: string;
  storage_policy_name?: string;
  account_id?: number;
  account?: string;
  account_uri?: string;
  payment_id?: number;
  points_change?: number;
  sku?: string;
  storage_size?: number;
  expire?: string;
  group_id?: number;
  group_id_from?: number;
  direct_link_id?: string;
  openid_provider?: number;
  sub?: string;
  name?: string;
  passkey_id?: number;
  exts?: Record<string, string>;
}

export interface TaskPublicState {
  error?: string;
  error_history?: string[];
  executed_duration?: number;
  retry_count?: number;
  resume_time?: number;
  slave_task_props?: SlaveTaskProps;
}

export interface SlaveTaskProps {
  node_id?: number;
  master_site_url?: string;
  master_site_id?: string;
  master_site_version?: string;
}

export interface Task extends CommonMixin {
  type?: string;
  status?: TaskStatus;
  public_state?: TaskPublicState;
  private_state?: string;
  correlation_id?: string;
  user_tasks?: number;
  edges: {
    user?: User;
  };

  user_hash_id?: string;
  task_hash_id?: string;
  summary?: TaskSummary;
  node?: Node;
}

export interface ListTaskResponse {
  tasks: Task[];
  pagination: PaginationResults;
}

export interface Share extends CommonMixin {
  password?: string;
  views?: number;
  downloads?: number;
  expires?: string;
  remain_downloads?: number;
  edges: {
    user?: User;
    file?: File;
  };

  user_hash_id?: string;
  share_link?: string;
}

export interface ListShareResponse {
  shares: Share[];
  pagination: PaginationResults;
}

export interface CleanupTaskService {
  not_after: string;
  types?: TaskType[];
  status?: TaskStatus[];
}

export interface OAuthClientProps {
  icon?: string;
  refresh_token_ttl?: number;
}

export interface OAuthClient extends CommonMixin {
  guid?: string;
  secret?: string;
  name?: string;
  homepage_url?: string; // Not used
  redirect_uris?: string[];
  scopes?: string[];
  props?: OAuthClientProps;
  is_enabled?: boolean;
}

export interface GetOAuthClientResponse extends OAuthClient {
  is_system?: boolean;
  total_grants?: number;
}

export interface ListOAuthClientResponse {
  clients: GetOAuthClientResponse[];
  pagination: PaginationResults;
}

export interface UpsertOAuthClientService {
  client: OAuthClient;
}

// ─── Pro 能力：事件（审计日志） / 滥用举报 / 增值服务订单 ──────────────────────

/**
 * 事件（审计日志）。
 *
 * 与 Pro 的记录结构保持一致：`type` 是数字事件类型（见 `AuditLogType`），
 * `action` 是同一事件的可读名称，`content` 是事件载荷，`edges.user` 是触发者。
 * 详情弹窗直接使用行内数据，不需要额外请求。
 */
export interface AuditLogItem extends CommonMixin {
  type: number;
  action?: string;
  correlation_id?: string;
  ip?: string;
  content?: LogEntry;
  edges?: {
    user?: User;
  };
  user_hash_id?: string;
  user_id?: number;
  user_email?: string;
  object_type?: string;
  object_name?: string;
  detail?: string;
}

export interface ListAuditLogResponse {
  logs: AuditLogItem[];
  pagination: PaginationResults;
}

/** 清理事件：删除 `before_days` 天前、且属于给定类型的事件。 */
export interface AuditCleanupService {
  types?: string[];
  before_days: number;
}

/** 滥用举报。`status`：pending / resolved / dismissed。 */
export interface AbuseReport {
  id: number;
  share_id: number;
  share_hash: string;
  share_url: string;
  /** 被举报分享对应的文件名；分享已被删除时为空。 */
  file_name?: string;
  reporter_email: string;
  ip: string;
  reason: string;
  status: string;
  note: string;
  created_at: string;
}

export interface ListAbuseReportResponse {
  reports: AbuseReport[];
  pagination: PaginationResults;
}

export interface AbuseHandleService {
  status?: "pending" | "resolved" | "dismissed";
  note?: string;
}

/** 增值服务订单（Pro 的「订单」页）。金额单位为「分」。 */
export interface Payment {
  id: number;
  order_no: string;
  product_type: string;
  sku_name: string;
  num: number;
  quantity: number;
  amount: number;
  currency: string;
  points_used: number;
  channel: string;
  status: string;
  email: string;
  created_at: string;
  user?: User;
}

export interface ListPaymentResponse {
  payments: Payment[];
  pagination: PaginationResults;
}

/** 增值服务商品类型：积分包 / 容量包 / 会员（用户组）。 */
export type VASProductType = "points" | "storage" | "group";

/** 支付渠道类型。 */
export type VASProviderType = "epay" | "custom" | "stripe";

/** 增值服务商品（SKU）。`price` 单位为「分」，0 表示仅支持积分购买。 */
export interface VASSKU {
  id: string;
  type: VASProductType;
  name: string;
  price: number;
  currency?: string;
  points_price?: number;
  num: number;
  duration_days?: number;
  /** 卖家填写的卖点介绍，展示在商店商品卡片上。 */
  description?: string;
  on_sale: boolean;
}

export interface SaveVASSKUsService {
  skus: VASSKU[];
}

/** 支付渠道配置。`config` 为渠道网关所需的键值对。 */
export interface VASProvider {
  id: string;
  type: VASProviderType;
  name: string;
  on_sale: boolean;
  config: Record<string, string>;
}

export interface SaveVASProvidersService {
  providers: VASProvider[];
}

/** 兑换码。 */
export interface GiftCode extends CommonMixin {
  code: string;
  product_type: VASProductType;
  num: number;
  name?: string;
  used: boolean;
  used_by?: number;
  used_by_email?: string;
  created_by_email?: string;
}

export interface ListGiftCodeResponse {
  gift_codes: GiftCode[];
  pagination: PaginationResults;
}

export interface CreateGiftCodeService {
  count: number;
  product_type: VASProductType;
  num: number;
  name: string;
  prefix: string;
}

export interface CreateGiftCodeResponse {
  codes: string[];
  count: number;
}
