import { AxiosError, AxiosRequestConfig } from "axios";
import i18n from "../i18n.ts";
import { AppError, Code, defaultOpts, Response, send, ThunkResponse } from "./request.ts";

/**
 * 网盘小店（shop）接口层。
 *
 * 约定：
 * - 所有金额字段都是整数「分」，展示时请使用 `formatMoney` / `parseMoney`。
 * - 所有时间字段都是 Unix 秒。
 * - 契约文档：docs/shop/frontend-api.md
 */

// ─── 数据模型 ────────────────────────────────────────────────────────────────

export const ShopProductStatus = {
  draft: "draft",
  onsale: "onsale",
  offsale: "offsale",
  removed: "removed",
} as const;

export const ShopOrderStatus = {
  pending: "pending",
  paid: "paid",
  closed: "closed",
  refunded: "refunded",
} as const;

export const ShopEntitlementStatus = {
  pending: "pending",
  granted: "granted",
  revoked: "revoked",
} as const;

export const ShopWithdrawStatus = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  paid: "paid",
} as const;

export const ShopPayChannels = ["alipay", "wxpay", "qqpay"] as const;
export type ShopPayChannel = (typeof ShopPayChannels)[number];

/** 店铺支付方式：平台聚合支付 / 商家自配支付渠道。 */
export const ShopPayModes = ["platform", "custom"] as const;
export type ShopPayMode = (typeof ShopPayModes)[number];

/**
 * 店铺支付方式配置（GET/PATCH /shop/payment）。
 *
 * - `platform`：平台聚合支付，货款由平台代收，订单完成 + `settle_delay_hours`
 *   小时后解冻才能提现，且需达到管理员设定的最低提现金额；
 * - `custom`：商家自配支付渠道（易支付），买家直接付给商家，平台只负责记录订单
 *   并交付内容：不计余额、不收手续费、不发放返利，退款由商家线下处理、平台核验凭证。
 */
export interface ShopPaymentSetting {
  pay_mode: ShopPayMode;
  epay_api_url?: string;
  epay_pid?: string;
  /** 是否已保存商户密钥（密钥本身不会下发）。 */
  epay_key_set: boolean;
  /** 自配渠道的配置是否完整（地址 + 商户 ID + 密钥）。 */
  custom_ready: boolean;
  /** 平台聚合支付是否已由管理员配置。 */
  platform_ready: boolean;
  channels: string[];
  deposit_amount: number;
  deposit_paid: number;
  deposit_due: number;
  settle_delay_hours: number;
}

export const ShopLayoutSections = ["banner", "products", "about", "notice", "links", "contact"] as const;
export type ShopLayoutSection = (typeof ShopLayoutSections)[number];

export interface ShopThemeLink {
  label: string;
  url: string;
}

export interface ShopTheme {
  template?: string;
  primary_color?: string;
  background_color?: string;
  background_image?: string;
  banner?: string;
  logo?: string;
  slogan?: string;
  notice?: string;
  layout?: string[];
  links?: ShopThemeLink[];
  footer?: string;
}

export interface ShopProductProps {
  summary?: string;
  tags?: string[];
  transfer_name?: string;
  allow_preview?: boolean;
  preview_limit?: number;
  update_notice?: string;
  sort?: number;
  revision?: number;
  /** 商品介绍里嵌的素材（图片/视频）谁能加载：public / login / purchased。 */
  description_visibility?: ShopDescriptionVisibility;
}

/** 商品介绍素材的可见范围。 */
export type ShopDescriptionVisibility = "public" | "login" | "purchased";

export interface ShopProductSummary {
  id: string;
  name: string;
  summary?: string;
  tags?: string[];
  cover?: string;
  price: number;
  final_price: number;
  discount?: number;
  discount_end?: number;
  sales: number;
  views: number;
  status: string;
  created_at: number;
  shop?: string;
  shop_name?: string;
  previewable: boolean;
  owned: boolean;
  url?: string;
}

export interface ShopProductDetail extends ShopProductSummary {
  /** Markdown 商品页：教程、截图、演示视频。 */
  description: string;
  /** 介绍里嵌的素材可见范围，用于给访客提示。 */
  description_visibility: ShopDescriptionVisibility;
  can_preview: boolean;
}

/** 从网盘文件签发出来的素材引用，直接写进 Markdown。 */
export interface ShopProductAsset {
  url: string;
  name: string;
  mime: string;
  kind: "image" | "video" | "audio" | "file";
  size: number;
}

export interface ShopPreviewEntry {
  name: string;
  type: "folder" | "file";
  size: number;
  updated_at: number;
  path?: string;
  children?: number;
  ext?: string;
}

export interface ShopStorefrontOwner {
  id: string;
  nickname: string;
  avatar: string;
}

export interface Shop {
  id: string;
  uid: number;
  slug: string;
  name: string;
  description: string;
  avatar: string;
  cover: string;
  theme: ShopTheme;
  status: string;
  referrer_rate: number;
  created_at: number;
  updated_at: number;
}

export interface ShopView extends Shop {
  url: string;
  product_count: number;
  sales: number;
  referral_code: string;
  /** 当前支付方式。 */
  pay_mode: ShopPayMode;
  /** 还差多少保证金（分）：大于 0 时控制台提示补交。 */
  deposit_due: number;
}

export interface ShopStorefront {
  slug: string;
  name: string;
  description: string;
  avatar: string;
  cover: string;
  theme: ShopTheme;
  url: string;
  owner: ShopStorefrontOwner;
  products: ShopProductSummary[];
}

export interface ShopOrder {
  order_no: string;
  /** deposit 是店主缴纳保证金的订单。 */
  kind: "product" | "share" | "deposit";
  shop_id?: string;
  object_id: string;
  buyer_uid: number;
  title: string;
  amount: number;
  discount: number;
  payable: number;
  paid: number;
  status: string;
  channel: string;
  /** 下单时快照的支付方式，决定这笔钱进了谁的口袋。 */
  pay_mode?: ShopPayMode;
  /** 平台渠道收入解冻时间；0 表示没有冻结。 */
  settle_at?: number;
  settle_state?: string;
  coupon_id?: string;
  referrer_uid?: number;
  transfer_state?: string;
  trade_no?: string;
  client_ip?: string;
  created_at: number;
  updated_at: number;
  paid_at?: number;
  expire_at: number;
  pay_url?: string;
  entitlement_id?: string;
}

export interface ShopEntitlement {
  id: string;
  uid: number;
  kind: "product" | "share";
  object_id: string;
  order_no: string;
  shop_id?: string;
  title: string;
  status: string;
  folder_id?: number;
  created_at: number;
  updated_at: number;
}

export interface ShopLedger {
  id: string;
  shop_id: string;
  kind: string;
  amount: number;
  balance: number;
  ref_id?: string;
  remark?: string;
  created_at: number;
}

export interface ShopBalance {
  shop_id: string;
  available: number;
  /** 提现冻结：已审批通过但尚未打款的金额。 */
  frozen: number;
  /** 待解冻：平台渠道订单的收入，订单完成 + `settle_delay_hours` 小时后可提现。 */
  pending: number;
  total_income: number;
  total_withdraw: number;
  updated_at: number;
  ledger: ShopLedger[];
  /** 平台要求缴纳的保证金（分）。 */
  deposit_amount: number;
  deposit_paid: number;
  /** 还差多少保证金：大于 0 时不能提现，控制台提示补交。 */
  deposit_due: number;
  /** 平台渠道收入的解冻时长（小时），0 表示立即到账。 */
  settle_delay_hours: number;
}

export interface ShopWithdrawAccount {
  channel: string;
  name: string;
  account: string;
  bank?: string;
  remark?: string;
}

export interface ShopWithdrawal {
  id: string;
  shop_id: string;
  amount: number;
  fee: number;
  actual: number;
  account: ShopWithdrawAccount;
  status: string;
  remark?: string;
  operator?: number;
  created_at: number;
  updated_at: number;
}

export interface ShopCoupon {
  id: string;
  shop_id: string;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  min_amount: number;
  product_id?: string;
  max_uses: number;
  used: number;
  per_user: number;
  status: string;
  start_at?: number;
  end_at?: number;
  created_at: number;
}

export interface ShopReferral {
  invitee_uid: string;
  nickname: string;
  source?: string;
  rate: number;
  total_rebate: number;
  created_at: number;
}

export const ShopRefundStatus = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  /** 商家已线下退款并提交凭证，等待平台核验。 */
  refunded: "refunded",
  /** 平台已核验通过。 */
  confirmed: "confirmed",
} as const;

/** 买家发起的退款申请（GET /shop/refund）。 */
export interface ShopRefund {
  id: string;
  entitlement_id: string;
  order_no: string;
  uid: number;
  shop_id?: string;
  amount: number;
  reason?: string;
  status: string;
  operator?: number;
  remark?: string;
  /** 商家提交的退款凭证（自配渠道退款）。 */
  evidence?: string;
  evidence_at?: number;
  /** 平台核验人与其核验时间。 */
  verifier?: number;
  verified_at?: number;
  created_at: number;
  updated_at: number;
}

/** 卖家 / 管理员视角的退款申请，附带审阅需要的上下文。 */
export interface ShopRefundView extends ShopRefund {
  buyer_nickname?: string;
  title?: string;
  order_status?: string;
  /** 底层订单的支付方式：custom 的退款由商家线下完成、平台核验凭证。 */
  pay_mode?: ShopPayMode;
}

// ─── 请求体 ─────────────────────────────────────────────────────────────────

export interface CreateShopService {
  name: string;
  slug?: string;
  description?: string;
  avatar?: string;
  cover?: string;
}

export interface UpdateShopService {
  name?: string;
  slug?: string;
  description?: string;
  avatar?: string;
  cover?: string;
  theme?: ShopTheme;
  referrer_rate?: number;
}

export interface CreateShopProductService {
  uri: string;
  name?: string;
  description?: string;
  cover?: string;
  price: number;
  status?: string;
  props?: ShopProductProps;
}

export interface UpdateShopProductService {
  name?: string;
  description?: string;
  cover?: string;
  price?: number;
  discount?: number;
  discount_end?: number;
  status?: string;
  props?: ShopProductProps;
}

export interface CreateShopOrderService {
  kind: "product" | "share";
  object_id: string;
  channel?: string;
  coupon?: string;
  share_password?: string;
  ref?: string;
}

export interface RequestWithdrawService {
  amount: number;
  account: ShopWithdrawAccount;
}

export interface ShopCouponService {
  code?: string;
  kind: "percent" | "fixed";
  value: number;
  min_amount?: number;
  product_id?: string;
  max_uses?: number;
  per_user?: number;
  status?: string;
  start_at?: number;
  end_at?: number;
}

export interface ShopListService {
  limit?: number;
  offset?: number;
}

export interface ShopAdminSettingService {
  values: Record<string, string>;
}

/** 修改店铺支付方式（PATCH /shop/payment）。 */
export interface ShopPaymentSettingService {
  pay_mode?: ShopPayMode;
  epay_api_url?: string;
  epay_pid?: string;
  /** 留空表示清除已保存的密钥，`********` 表示保持不变。 */
  epay_key?: string;
}

export interface ShopAdminWithdrawReviewService {
  action: "approve" | "reject" | "paid";
  remark?: string;
}

export interface ShopRefundRequestService {
  reason?: string;
}

/**
 * 退款审批动作：
 * - `approve` / `reject`：审批买家的退款申请（卖家或管理员）；
 * - `evidence`：商家自配渠道退款后提交退款凭证（卖家）；
 * - `confirm` / `return`：平台核验凭证通过 / 退回重交（仅管理员）。
 */
export interface ShopRefundReviewService {
  action: "approve" | "reject" | "evidence" | "confirm" | "return";
  remark?: string;
  evidence?: string;
}
// ─── 金额工具（全部以「分」为单位，禁止浮点运算） ────────────────────────────

/** 把「分」格式化成两位小数的展示字符串，例如 5000 → "50.00"。 */
export const formatMoney = (cents: number | undefined | null): string => {
  const value = Math.trunc(cents ?? 0);
  const negative = value < 0;
  const abs = Math.abs(value);
  const unit = Math.floor(abs / 100);
  const fraction = (abs % 100).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${unit}.${fraction}`;
};

/**
 * 把用户输入的金额字符串解析成「分」。非法输入返回 NaN，由调用方校验。
 * 使用字符串运算避免浮点误差。
 */
export const parseMoney = (input: string): number => {
  const trimmed = (input ?? "").trim();
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) {
    return NaN;
  }
  const [unit, fraction = ""] = trimmed.split(".");
  return Number(unit) * 100 + Number(fraction.padEnd(2, "0"));
};

/** 带货币符号的展示，符号来自站点货币配置。 */
export const displayMoney = (cents: number | undefined | null, symbol = "¥"): string =>
  `${symbol}${formatMoney(cents)}`;
// ─── 公开接口（无需登录） ───────────────────────────────────────────────────

/**
 * 公开小店接口由后端按 IP 在进程内限流（默认 240 次/分钟），超限返回 HTTP 429，
 * 响应体仍是统一的错误信封。
 *
 * - `quietRequestOpts()`：不让请求层再弹一次 snackbar，页面自己渲染错误状态；
 * - `normalizePublicError`：把 axios 的「Request failed with status code 429」
 *   归一化成带本地化文案的 AppError，页面可以据此显示「稍后重试」而不会白屏。
 */
// 注意：`request.ts` 与 `router`/页面之间存在环形依赖，模块初始化时 `defaultOpts`
// 可能尚未就绪，因此这里延迟到调用时再展开，避免 "Cannot access before initialization"。
const quietRequestOpts = () => ({ ...defaultOpts, bypassSnackbar: () => true });

/**
 * 预期内的 404（未开通店铺 / 订单不存在）由页面自行渲染提示，
 * 这里只屏蔽这一类错误，其它错误仍然照常弹 snackbar。
 */
const expectedMissingOpts = () => ({
  ...defaultOpts,
  bypassSnackbar: (e: Error) => e instanceof AppError && e.code === Code.NodeFound,
});

/** 40001：参数或业务校验失败（例如超出退款窗口） */
export const ShopInvalidParam = 40001;
/** 409：冲突（重复申请退款、退款已被处理、订单无法退款） */
export const ShopConflict = 409;

/** HTTP 429：公开小店接口限流。 */
export const ShopRateLimited = 429;

export const isRateLimitedError = (e: unknown): boolean => e instanceof AppError && e.code === ShopRateLimited;

const normalizePublicError = (e: unknown): unknown => {
  if (e instanceof AxiosError && e.response?.status === ShopRateLimited) {
    return new AppError({
      code: ShopRateLimited,
      msg: i18n.t("shop.store.rateLimited", { ns: "application" }),
      data: (e.response.data as Response<unknown> | undefined)?.data ?? null,
    });
  }
  return e;
};

export function getStorefront(slug: string): ThunkResponse<ShopStorefront> {
  return async (dispatch) => {
    try {
      return await dispatch(send(`/shop/store/${encodeURIComponent(slug)}`, { method: "GET" }, quietRequestOpts()));
    } catch (e) {
      throw normalizePublicError(e);
    }
  };
}

export function getStorefrontProduct(slug: string, id: string): ThunkResponse<ShopProductDetail> {
  return async (dispatch) => {
    try {
      return await dispatch(
        send(
          `/shop/store/${encodeURIComponent(slug)}/product/${encodeURIComponent(id)}`,
          { method: "GET" },
          quietRequestOpts(),
        ),
      );
    } catch (e) {
      throw normalizePublicError(e);
    }
  };
}

export function getProductPreview(slug: string, id: string, path?: string): ThunkResponse<ShopPreviewEntry[]> {
  return async (dispatch) => {
    const query = new URLSearchParams();
    if (path) {
      query.set("path", path);
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    try {
      return await dispatch(
        send(
          `/shop/store/${encodeURIComponent(slug)}/product/${encodeURIComponent(id)}/preview${suffix}`,
          { method: "GET" },
          quietRequestOpts(),
        ),
      );
    } catch (e) {
      throw normalizePublicError(e);
    }
  };
}

// ─── 店主 / 买家 ────────────────────────────────────────────────────────────

export function createShop(req: CreateShopService): ThunkResponse<ShopView> {
  return async (dispatch) => {
    return await dispatch(send("/shop", { data: req, method: "POST" }, defaultOpts));
  };
}
/**
 * 当前用户的店铺。未开通店铺时后端返回 404（页面据此渲染「开通小店」表单），
 * 属于预期结果，屏蔽请求层的错误提示，避免每次进入页面都弹「资源不存在」。
 */
export function getMyShop(): ThunkResponse<ShopView> {
  return async (dispatch) => {
    return await dispatch(send("/shop/mine", { method: "GET" }, expectedMissingOpts()));
  };
}

export function updateShop(req: UpdateShopService): ThunkResponse<ShopView> {
  return async (dispatch) => {
    return await dispatch(send("/shop", { data: req, method: "PATCH" }, defaultOpts));
  };
}

export function setShopStatus(enabled: boolean): ThunkResponse<ShopView> {
  return async (dispatch) => {
    return await dispatch(send("/shop/status", { data: { enabled }, method: "POST" }, defaultOpts));
  };
}

export function listShopProducts(req: ShopListService = {}): ThunkResponse<ShopProductSummary[]> {
  return async (dispatch) => {
    return await dispatch(send(`/shop/product${listQuery(req)}`, { method: "GET" }, defaultOpts));
  };
}

export function createShopProduct(req: CreateShopProductService): ThunkResponse<ShopProductSummary> {
  return async (dispatch) => {
    return await dispatch(send("/shop/product", { data: req, method: "POST" }, defaultOpts));
  };
}

export function updateShopProduct(id: string, req: UpdateShopProductService): ThunkResponse<ShopProductSummary> {
  return async (dispatch) => {
    return await dispatch(send(`/shop/product/${encodeURIComponent(id)}`, { data: req, method: "PATCH" }, defaultOpts));
  };
}

/**
 * 把一个网盘文件签成可以写进商品介绍的长期 URL（直连，不复制文件）。
 */
export function signShopProductAsset(productId: string, uri: string): ThunkResponse<ShopProductAsset> {
  return async (dispatch) => {
    return await dispatch(
      send(`/shop/product/${encodeURIComponent(productId)}/asset`, { data: { uri }, method: "POST" }, defaultOpts),
    );
  };
}

export function setShopProductStatus(id: string, status: string): ThunkResponse<ShopProductSummary> {
  return async (dispatch) => {
    return await dispatch(
      send(`/shop/product/${encodeURIComponent(id)}/status`, { data: { status }, method: "POST" }, defaultOpts),
    );
  };
}

export function createShopOrder(req: CreateShopOrderService): ThunkResponse<ShopOrder> {
  return async (dispatch) => {
    return await dispatch(send("/shop/order", { data: req, method: "POST" }, defaultOpts));
  };
}

export function getShopOrder(orderNo: string): ThunkResponse<ShopOrder> {
  return async (dispatch) => {
    return await dispatch(send(`/shop/order/${encodeURIComponent(orderNo)}`, { method: "GET" }, expectedMissingOpts()));
  };
}

export function listShopOrders(req: ShopListService = {}): ThunkResponse<ShopOrder[]> {
  return async (dispatch) => {
    return await dispatch(send(`/shop/order${listQuery(req)}`, { method: "GET" }, defaultOpts));
  };
}

export function listShopSold(req: ShopListService = {}): ThunkResponse<ShopOrder[]> {
  return async (dispatch) => {
    return await dispatch(send(`/shop/sold${listQuery(req)}`, { method: "GET" }, defaultOpts));
  };
}

export function listShopPurchases(req: ShopListService = {}): ThunkResponse<ShopEntitlement[]> {
  return async (dispatch) => {
    return await dispatch(send(`/shop/purchase${listQuery(req)}`, { method: "GET" }, defaultOpts));
  };
}

export function retryShopDelivery(id: string): ThunkResponse<ShopEntitlement> {
  return async (dispatch) => {
    return await dispatch(send(`/shop/purchase/${encodeURIComponent(id)}/transfer`, { method: "POST" }, defaultOpts));
  };
}

// ─── 店铺图片素材（头像 / 封面 / 装修图 / 商品封面） ─────────────────────────

/**
 * 图片字段的两种来源最终都落到同一个「素材」上：
 * - 上传：`POST /shop/asset`（multipart，字段名 `file`，≤4MB）；
 * - 从网盘选择：`POST /shop/asset/adopt`（`{uri}`，后端校验属主 + 图片类型后快照一份）。
 * 两者都返回 `{ id, url, ... }`，`url` 是 `/api/v4/shop/asset/<id>`，匿名可读、
 * 长缓存，所以店铺前台可以直接把它写进 `img` / `background-image`。
 */
export interface ShopAsset {
  id: string;
  name?: string;
  mime: string;
  size: number;
  url: string;
  created_at: number;
}

/** 单张图片的大小上限，与后端 `MaxAssetSize` 保持一致。 */
export const ShopAssetMaxSize = 4 * 1024 * 1024;

/** 上传一张图片，返回可直接落库的素材 URL。 */
export function uploadShopAsset(file: File): ThunkResponse<ShopAsset> {
  return async (dispatch) => {
    const form = new FormData();
    form.append("file", file);
    return await dispatch(
      send(
        "/shop/asset",
        { data: form, method: "POST", headers: { "Content-Type": "multipart/form-data" } },
        quietRequestOpts(),
      ),
    );
  };
}

/** 把网盘里的某个文件快照成素材，`uri` 例如 `storflow://my/cover.png`。 */
export function adoptShopAsset(uri: string): ThunkResponse<ShopAsset> {
  return async (dispatch) => {
    return await dispatch(send("/shop/asset/adopt", { data: { uri }, method: "POST" }, quietRequestOpts()));
  };
}

/** 我上传过的素材（详情页/图片选择器的「我的素材」页签）。 */
export function listShopAssets(): ThunkResponse<ShopAsset[]> {
  return async (dispatch) => {
    return await dispatch(send("/shop/asset", { method: "GET" }, quietRequestOpts()));
  };
}

// ─── 退款（买家申请 → 卖家 / 管理员审批） ────────────────────────────────────

/**
 * 退款相关的写操作由调用方在对话框里展示错误（后端 `msg` 已包含具体原因，
 * 例如「超出退款窗口」「已申请过」），所以这里静默 snackbar，避免重复提示。
 */

export function requestShopRefund(entitlementId: string, reason?: string): ThunkResponse<ShopRefund> {
  return async (dispatch) => {
    return await dispatch(
      send(
        `/shop/purchase/${encodeURIComponent(entitlementId)}/refund`,
        { data: { reason: reason?.trim() || undefined }, method: "POST" },
        quietRequestOpts(),
      ),
    );
  };
}

export function listMyRefunds(req: ShopListService = {}): ThunkResponse<ShopRefund[]> {
  return async (dispatch) => {
    return await dispatch(send(`/shop/refund${listQuery(req)}`, { method: "GET" }, defaultOpts));
  };
}

export function listShopRefunds(req: ShopListService = {}): ThunkResponse<ShopRefundView[]> {
  return async (dispatch) => {
    return await dispatch(send(`/shop/refund/received${listQuery(req)}`, { method: "GET" }, defaultOpts));
  };
}

/** 卖家审批自己店铺的退款申请。 */
export function reviewShopRefund(id: string, req: ShopRefundReviewService): ThunkResponse<ShopRefund> {
  return async (dispatch) => {
    return await dispatch(
      send(`/shop/refund/${encodeURIComponent(id)}`, { data: req, method: "POST" }, quietRequestOpts()),
    );
  };
}

export function getShopBalance(): ThunkResponse<ShopBalance> {
  return async (dispatch) => {
    return await dispatch(send("/shop/balance", { method: "GET" }, defaultOpts));
  };
}

/** 店铺支付方式配置（GET /shop/payment）。 */
export function getShopPaymentSetting(): ThunkResponse<ShopPaymentSetting> {
  return async (dispatch) => {
    return await dispatch(send("/shop/payment", { method: "GET" }, defaultOpts));
  };
}

/** 修改店铺支付方式（PATCH /shop/payment）。 */
export function saveShopPaymentSetting(req: ShopPaymentSettingService): ThunkResponse<ShopPaymentSetting> {
  return async (dispatch) => {
    return await dispatch(send("/shop/payment", { data: req, method: "PATCH" }, defaultOpts));
  };
}

/** 缴纳 / 补交保证金：创建一笔平台支付订单（POST /shop/deposit）。 */
export function createShopDepositOrder(): ThunkResponse<ShopOrder> {
  return async (dispatch) => {
    return await dispatch(send("/shop/deposit", { method: "POST" }, defaultOpts));
  };
}

export function requestWithdraw(req: RequestWithdrawService): ThunkResponse<ShopWithdrawal> {
  return async (dispatch) => {
    return await dispatch(send("/shop/withdraw", { data: req, method: "POST" }, defaultOpts));
  };
}

export function listWithdrawals(req: ShopListService = {}): ThunkResponse<ShopWithdrawal[]> {
  return async (dispatch) => {
    return await dispatch(send(`/shop/withdraw${listQuery(req)}`, { method: "GET" }, defaultOpts));
  };
}

export function listCoupons(req: ShopListService = {}): ThunkResponse<ShopCoupon[]> {
  return async (dispatch) => {
    return await dispatch(send(`/shop/coupon${listQuery(req)}`, { method: "GET" }, defaultOpts));
  };
}

export function createCoupon(req: ShopCouponService): ThunkResponse<ShopCoupon> {
  return async (dispatch) => {
    return await dispatch(send("/shop/coupon", { data: req, method: "POST" }, defaultOpts));
  };
}

export function updateCoupon(id: string, req: ShopCouponService): ThunkResponse<ShopCoupon> {
  return async (dispatch) => {
    return await dispatch(send(`/shop/coupon/${encodeURIComponent(id)}`, { data: req, method: "PATCH" }, defaultOpts));
  };
}

export function listReferrals(): ThunkResponse<ShopReferral[]> {
  return async (dispatch) => {
    return await dispatch(send("/shop/referral", { method: "GET" }, defaultOpts));
  };
}

export function getReferralLink(): ThunkResponse<string> {
  return async (dispatch) => {
    return await dispatch(send("/shop/referral/link", { method: "GET" }, defaultOpts));
  };
}

// ─── 管理员 ─────────────────────────────────────────────────────────────────

export function getShopAdminSetting(): ThunkResponse<Record<string, string>> {
  return async (dispatch) => {
    return await dispatch(send("/shop/admin/setting", { method: "GET" }, defaultOpts));
  };
}

export function saveShopAdminSetting(values: Record<string, string>): ThunkResponse<Record<string, string>> {
  return async (dispatch) => {
    return await dispatch(send("/shop/admin/setting", { data: { values }, method: "PATCH" }, defaultOpts));
  };
}

export function adminListWithdrawals(req: ShopListService = {}): ThunkResponse<ShopWithdrawal[]> {
  return async (dispatch) => {
    return await dispatch(send(`/shop/admin/withdraw${listQuery(req)}`, { method: "GET" }, defaultOpts));
  };
}

export function adminReviewWithdrawal(id: string, req: ShopAdminWithdrawReviewService): ThunkResponse<ShopWithdrawal> {
  return async (dispatch) => {
    return await dispatch(
      send(`/shop/admin/withdraw/${encodeURIComponent(id)}`, { data: req, method: "POST" }, defaultOpts),
    );
  };
}

export function adminListRefunds(req: ShopListService = {}): ThunkResponse<ShopRefundView[]> {
  return async (dispatch) => {
    return await dispatch(send(`/shop/admin/refund${listQuery(req)}`, { method: "GET" }, defaultOpts));
  };
}

/** 管理员审批全站退款申请（可审任意店铺）。 */
export function adminReviewShopRefund(id: string, req: ShopRefundReviewService): ThunkResponse<ShopRefund> {
  return async (dispatch) => {
    return await dispatch(
      send(`/shop/admin/refund/${encodeURIComponent(id)}`, { data: req, method: "POST" }, quietRequestOpts()),
    );
  };
}

// ─── 内部工具 ───────────────────────────────────────────────────────────────

function listQuery(req: ShopListService): string {
  const query = new URLSearchParams();
  if (req.limit !== undefined) {
    query.set("limit", req.limit.toString());
  }
  if (req.offset !== undefined) {
    query.set("offset", req.offset.toString());
  }
  const str = query.toString();
  return str ? `?${str}` : "";
}

/** 便捷封装：把 `send` 的配置暴露给需要自定义 header 的场景。 */
export type ShopRequestConfig = AxiosRequestConfig;
export type ShopResponse<T> = Response<T>;
