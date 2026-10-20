import { VASSKU } from "./dashboard.ts";
import { defaultOpts, send, ThunkResponse } from "./request.ts";

/**
 * 增值服务（VAS）用户侧接口层：商店商品、支付、积分与兑换码。
 *
 * 约定：
 * - 金额字段都是整数「分」，展示时用 `formatMoney` / `parseMoney`；
 * - 积分字段为整数，1 积分 = 1 个计价单位；
 * - 时间字段是后端格式化好的字符串（`2006-01-02 15:04:05`）。
 *
 * 契约文档：docs/vas（管理端配置在「参数设置 → 增值服务」）。
 */

/** 支付渠道的用户侧视图：只含展示所需字段，不含网关密钥。 */
export interface VASShopProvider {
  id: string;
  type: "epay" | "custom" | "stripe";
  name: string;
}

/** 订单状态：未支付 / 已支付待履约 / 已履约 / 履约失败。 */
export const VASPaymentStatus = {
  unpaid: "unpaid",
  paid: "paid",
  fulfilled: "fulfilled",
  fulfillFailed: "fulfill_failed",
} as const;

/** 积分账本条目。 */
export interface VASPointsLedger {
  id: number;
  delta: number;
  balance_after: number;
  reason: string;
  note?: string;
  created_at: string;
}

/** 积分概览：余额 + 最近明细。 */
export interface VASPointsSummary {
  balance: number;
  history?: VASPointsLedger[];
}

/** 用户侧订单（`GET /user/payments`）。 */
export interface VASPayment {
  id: number;
  order_no: string;
  product_type: "points" | "storage" | "group";
  sku_name: string;
  num: number;
  quantity: number;
  amount: number;
  currency: string;
  points_used: number;
  channel: string;
  status: string;
  email?: string;
  created_at: string;
}

/** 下单参数：`sku_id` 与「积分充值」二选一；`use_points` 表示用积分支付。 */
export interface CreateVASPaymentService {
  sku_id?: string;
  type?: "points";
  num?: number;
  qyt?: number;
  provider_id?: string;
  use_points?: boolean;
  email?: string;
}

/** 下单 / 查询订单状态返回。 */
export interface VASPaymentResponse {
  order_no: string;
  status: string;
  pay_url?: string;
  amount: number;
  currency?: string;
}

/** 兑换码兑换结果。 */
export interface VASGiftCodeReward {
  product_type: "points" | "storage" | "group";
  num: number;
  name?: string;
}

/** 会员商品对应的用户组权益摘要（用户侧只读）。 */
export interface VASShopGroup {
  name: string;
  max_storage: number;
  speed_limit: number;
  /** 用户组权限位集（base64），用 `new Boolset(...)` 解析。 */
  permission?: string;
  trash_retention?: number;
}

/** 商店在售商品：会员类商品附带目标用户组权益，便于展示「买了能得到什么」。 */
export interface VASShopSKU extends VASSKU {
  group?: VASShopGroup;
}

/** 商店在售商品（`GET /vas/skus`）。 */
export function getVASShopSKUs(): ThunkResponse<VASShopSKU[]> {
  return async (dispatch) => {
    return await dispatch(send("/vas/skus", { method: "GET" }, defaultOpts));
  };
}

/** 可用支付渠道（`GET /vas/providers`）。 */
export function getVASShopProviders(): ThunkResponse<VASShopProvider[]> {
  return async (dispatch) => {
    return await dispatch(send("/vas/providers", { method: "GET" }, defaultOpts));
  };
}

/** 我的积分余额与明细（`GET /vas/points`）。 */
export function getMyPoints(): ThunkResponse<VASPointsSummary> {
  return async (dispatch) => {
    return await dispatch(send("/vas/points", { method: "GET" }, defaultOpts));
  };
}

/** 下单（`PUT /vas/payment`）：现金走支付渠道，积分支付立即履约。 */
export function createVASPayment(req: CreateVASPaymentService): ThunkResponse<VASPaymentResponse> {
  return async (dispatch) => {
    return await dispatch(send("/vas/payment", { data: req, method: "PUT" }, defaultOpts));
  };
}

/** 轮询订单状态（`GET /vas/payment/status/:order/:channel`）。 */
export function getVASPaymentStatus(
  orderNo: string,
  channel: string,
  ticket?: string,
): ThunkResponse<VASPaymentResponse> {
  return async (dispatch) => {
    return await dispatch(
      send(
        `/vas/payment/status/${encodeURIComponent(orderNo)}/${encodeURIComponent(channel)}`,
        {
          method: "GET",
          // 匿名下单（未登录）时收银台回跳会带上 resume ticket。
          params: ticket ? { ticket } : undefined,
        },
        defaultOpts,
      ),
    );
  };
}

/** 兑换码兑换（`POST /vas/giftcode/redeem`）。 */
export function redeemGiftCode(code: string): ThunkResponse<VASGiftCodeReward> {
  return async (dispatch) => {
    return await dispatch(send("/vas/giftcode/redeem", { data: { code }, method: "POST" }, defaultOpts));
  };
}

/** 我的订单（`GET /user/payments`）。 */
export function listMyPayments(page = 1, pageSize = 20): ThunkResponse<VASPayment[]> {
  return async (dispatch) => {
    return await dispatch(
      send(
        "/user/payments",
        {
          method: "GET",
          params: { page, page_size: pageSize },
        },
        defaultOpts,
      ),
    );
  };
}

/**
 * 积分变动事件：商店页面在购买 / 兑换成功后广播，
 * 侧边栏「存储空间」卡片据此刷新积分余额，避免同屏两处数字不一致。
 */
export const VASPointsUpdatedEvent = "storflow:vas-points-updated";

/** 广播一次积分变动。 */
export const notifyVASPointsUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(VASPointsUpdatedEvent));
  }
};
