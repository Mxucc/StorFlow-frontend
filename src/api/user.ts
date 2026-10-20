/**
 * UserLoginService 管理用户登录的服务
 */
export interface UserLoginService {
  email: string;
  password: string;
  otp?: string;
}

/**
 * User 用户序列化器
 */
export interface User {
  id: string;
  email?: string;
  nickname: string;
  status?: any /* user.Status */;
  avatar?: string;
  created_at: any /* time.Time */;
  preferred_theme?: string;
  anonymous?: boolean;
  group?: Group;
  pined?: PinedFile[];
  language?: string;
  disable_view_sync?: boolean;
  share_links_in_profile?: ShareLinksInProfileLevel;
}
export interface Group {
  id: string;
  name: string;
  permission?: string;
  direct_link_batch_size?: number;
  trash_retention?: number;
  /** 用户组是否允许为目录生成直链（Pro: 目录直链） */
  folder_direct_link?: boolean;
  /** 允许组内用户创建任务时自行选择节点（Pro: 允许选择节点） */
  allow_select_node?: boolean;
  /** 用户组可用的任务处理节点 ID 列表（Pro: 可用节点） */
  allowed_nodes?: number[];
}

export interface PinedFile {
  uri: string;
  name?: string;
  // locked 为 true 表示该置顶项来自用户组默认置顶（Pro: 默认固定分享），用户无法取消。
  locked?: boolean;
}

export interface PrepareLoginResponse {
  webauthn_enabled: boolean;
  sso_enabled: boolean;
  password_enabled: boolean;
  qq_enabled: boolean;
}

/**
 * QQSSOConfig 是 QQ 互联登录的公开配置（不含 app_secret），来自 GET /session/sso
 */
export interface QQSSOConfig {
  enabled: boolean;
  display_name: string;
  auto_redirect: boolean;
  authorize_url: string;
}

/**
 * SSOConfig 站点 SSO 配置，来自 GET /session/sso
 */
export interface SSOConfig {
  enabled: boolean;
  display_name: string;
  auto_redirect: boolean;
  password_login_disabled: boolean;
  authorize_url: string;
  // qq 为 QQ 互联登录配置，未启用或旧版后端可能不返回。
  qq?: QQSSOConfig;
}

export interface CaptchaRequest {
  [key: string]: any;
}

export interface PasswordLoginRequest extends CaptchaRequest {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  access_expires: string;
  refresh_expires: string;
}

export interface LoginResponse {
  user: User;
  token: Token;
}

export interface TwoFALoginRequest {
  otp: string;
  session_id: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface Capacity {
  total: number;
  used: number;
}

export const GroupPermission = {
  is_admin: 0,
  is_anonymous: 1,
  share: 2,
  webdav: 3,
  archive_download: 4,
  archive_task: 5,
  webdav_proxy: 6,
  share_download: 7,
  /** 无需购买分享链接（Pro）：可直接打开付费分享 */
  share_free: 8,
  remote_download: 9,
  /** 存储策略转移（Pro）：可为自己创建迁移任务 */
  migrate_policy: 10,
  redirected_source: 11,
  advance_delete: 12,
  /** 提升匿名用户权限（Pro）：可为匿名访客赋予读写权限 */
  escalate_anonymity: 13,
  unique_direct_link: 17,
};

export interface UserSettings {
  version_retention_enabled: boolean;
  version_retention_ext?: string[];
  version_retention_max?: number;
  passwordless: boolean;
  two_fa_enabled: boolean;
  passkeys?: Passkey[];
  disable_view_sync: boolean;
  share_links_in_profile: ShareLinksInProfileLevel;
  oauth_grants?: OAuthGrant[];
}

export interface OAuthGrant {
  client_id: string;
  client_name: string;
  client_logo: string;
  scopes?: string[];
  last_used_at?: string;
}

export interface PatchUserSetting {
  nick?: string;
  language?: string;
  preferred_theme?: string;
  version_retention_enabled?: boolean;
  version_retention_ext?: string[];
  version_retention_max?: number;
  current_password?: string;
  new_password?: string;
  two_fa_enabled?: boolean;
  two_fa_code?: string;
  disable_view_sync?: boolean;
  share_links_in_profile?: ShareLinksInProfileLevel;
}

export interface PasskeyCredentialOption {
  publicKey: {
    rp: {
      name: string;
      id: string;
    };
    user: {
      name: string;
      displayName: string;
      id: string;
    };
    challenge: string;
    pubKeyCredParams: {
      type: "public-key";
      alg: number;
    }[];
    timeout: number;
    excludeCredentials: {
      type: "public-key";
      id: string;
    }[];
    authenticatorSelection: {
      requireResidentKey: boolean;
      userVerification: UserVerificationRequirement;
    };
  };
}

export interface PasskeyCredentialLoginOption {
  publicKey: {
    challenge: string;
    timeout: number;
    rpId: string;
  };
}

export interface PreparePasskeyLoginResponse {
  options: PasskeyCredentialLoginOption;
  session_id: string;
}

export interface FinishPasskeyRegistrationService {
  response: string;
  name: string;
  ua: string;
}

export interface Passkey {
  id: string;
  name: string;
  created_at: string;
  used_at: string;
}

export interface FinishPasskeyLoginService {
  response: string;
  session_id: string;
}

export interface SignUpService extends CaptchaRequest {
  email: string;
  password: string;
  language: string;
  /** 邀请码：来自 /shop/<slug>?ref=<code> 或分享链接，注册时透传以绑定返利关系 */
  ref?: string;
}

export interface SendResetEmailService extends CaptchaRequest {
  email: string;
}

export interface ResetPasswordService {
  password: string;
  secret: string;
}

export enum ShareLinksInProfileLevel {
  public_share_only = "",
  all_share = "all_share",
  hide_share = "hide_share",
}

export interface AppRegistration {
  id: string;
  name: string;
  homepage_url?: string;
  description?: string;
  consented_scopes?: string[];
  icon?: string;
}

export interface GrantService {
  client_id: string;
  response_type: string;
  redirect_uri: string;
  state: string;
  scope: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

export interface GrantResponse {
  code?: string;
  error?: string;
  state: string;
}
