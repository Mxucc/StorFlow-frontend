import { VASSKU, VASProductType } from "../../../api/dashboard.ts";
import { sizeToString } from "../../../util";

/** 商品分组顺序：容量包 → 会员 → 积分包。 */
export const productTypeOrder: VASProductType[] = ["storage", "group", "points"];

/** 商品类型标签（用户侧文案）。 */
export const productTypeLabel = (type: string, t: (key: string) => string): string => {
  switch (type) {
    case "storage":
      return t("store.type.storage");
    case "group":
      return t("store.type.group");
    case "points":
      return t("store.type.points");
    default:
      return type;
  }
};

/** 商品类型标签色，与后台「增值服务 → 商品」保持一致。 */
export const productTypeColor = (type: VASProductType): "primary" | "secondary" | "info" => {
  switch (type) {
    case "storage":
      return "primary";
    case "group":
      return "secondary";
    default:
      return "info";
  }
};

/**
 * 商品内容描述：容量包展示容量，会员展示有效期，积分包展示积分数量。
 * 会员的用户组名只对后台可见，用户侧展示卖家填写的商品名即可。
 */
export const describeSKU = (sku: VASSKU, t: (key: string, options?: Record<string, unknown>) => string): string => {
  switch (sku.type) {
    case "storage":
      return t("store.detail.storage", { size: sizeToString(sku.num) });
    case "group":
      return (sku.duration_days ?? 0) > 0
        ? t("store.detail.groupDays", { days: sku.duration_days })
        : t("store.detail.groupForever");
    default:
      return t("store.detail.points", { num: sku.num });
  }
};

/** 订单状态标签色。 */
export const paymentStatusColor = (status: string): "default" | "warning" | "info" | "success" | "error" => {
  switch (status) {
    case "unpaid":
      return "warning";
    case "paid":
      return "info";
    case "fulfilled":
      return "success";
    case "fulfill_failed":
      return "error";
    default:
      return "default";
  }
};

/** 订单状态文案。 */
export const paymentStatusLabel = (status: string, t: (key: string) => string): string => {
  switch (status) {
    case "unpaid":
      return t("store.order.status.unpaid");
    case "paid":
      return t("store.order.status.paid");
    case "fulfilled":
      return t("store.order.status.fulfilled");
    case "fulfill_failed":
      return t("store.order.status.fail");
    default:
      return status;
  }
};
