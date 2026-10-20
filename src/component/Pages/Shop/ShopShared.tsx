import { Box, Chip, SxProps, Theme, Tooltip, Typography, useTheme } from "@mui/material";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  displayMoney,
  formatMoney,
  ShopCoupon,
  ShopEntitlement,
  ShopOrder,
  ShopProductSummary,
  ShopRefund,
  ShopWithdrawal,
} from "../../../api/shop.ts";
import { sizeToString } from "../../../util";
import BuildingShop from "../../Icons/BuildingShop.tsx";
import { defaultShopProduct } from "./shopAssets.ts";

/**
 * 小店 UI 设计契约（design contract）
 * ─────────────────────────────────────────────────────────────────────────────
 * 使命：把「网盘小店」做成可以商业运行的店铺前台 + 卖家控制台，而不是示例页。
 * 复用既有设计系统（MUI 主题 + `src/component/Common/StyledComponents.tsx`），
 * 仅在小店内部追加一层语义 token：
 *
 *  · 颜色：`--shop-primary`（来自 theme.primary_color，缺省回落主题 primary.main）
 *    只用于主行动点、价格强调与选中态；正文一律使用主题 text.*，不硬编码灰色。
 *  · 排版：价格用 `tabular-nums` + 600 字重；标题 h5/h6；辅助信息 caption/body2。
 *  · 间距：4px 栅格（MUI spacing 1 = 8px，只使用 0.5/1/1.5/2/3/4 等倍数）。
 *  · 圆角：卡片 12px（主题 shape.borderRadius）、胶囊标签 999px、输入 12px。
 *  · 动效：仅承载状态变化。hover/press 120–160ms，入场 220ms + 每项 40ms 阶梯；
 *    `prefers-reduced-motion: reduce` 时全部退化为无动画。
 *
 * Do：语义化控件（button/a/input）、可见键盘焦点、稳定的网格轨道（长标题换行不重叠）。
 * Don't：`transition: all`、泛化的 `0.3s ease`、匀速 linear 位移、用 overflow 裁剪掩盖布局问题。
 */

/** 货币符号：后端所有金额都是「分」，站点未提供货币配置，统一使用人民币符号。 */
export const SHOP_CURRENCY_SYMBOL = "¥";

export const shopPrimary = (theme: Theme, override?: string) => override || theme.palette.primary.main;

/** 金额展示：5000 → ¥50.00，等宽数字避免表格抖动。 */
export const Money = ({
  cents,
  bold,
  color,
  sx,
  variant = "body2",
}: {
  cents: number | undefined | null;
  bold?: boolean;
  color?: string;
  sx?: SxProps<Theme>;
  variant?: "body2" | "body1" | "h6" | "h5" | "caption" | "subtitle1";
}) => (
  <Typography
    component={"span"}
    variant={variant}
    sx={{
      fontVariantNumeric: "tabular-nums",
      fontWeight: bold ? 600 : undefined,
      color,
      ...sx,
    }}
  >
    {displayMoney(cents, SHOP_CURRENCY_SYMBOL)}
  </Typography>
);

export const shopCardHoverSx: SxProps<Theme> = {
  transition: "transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 160ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-3px)",
    boxShadow: 4,
  },
  "&:active": {
    transform: "translateY(-1px)",
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
    "&:hover": { transform: "none" },
    "&:active": { transform: "none" },
  },
};

/**
 * 商品卡片的封面：卖家没设置封面时使用内置默认商品图（浅色文件夹插画），
 * 再叠一层店铺主色淡染，让「默认图」也带店铺调性；网格轨道始终稳定。
 */
export const ProductCover = ({ src, primary, ratio = "4 / 3" }: { src?: string; primary: string; ratio?: string }) => (
  <Box
    sx={{
      position: "relative",
      width: "100%",
      aspectRatio: ratio,
      bgcolor: "action.hover",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}
  >
    <Box
      component={"img"}
      src={src || defaultShopProduct}
      alt={""}
      loading={"lazy"}
      sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
    {!src && (
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, ${primary}0d 0%, ${primary}26 100%)`,
          pointerEvents: "none",
        }}
      />
    )}
  </Box>
);

export const TagRow = ({ tags }: { tags?: string[] }) => {
  if (!tags || tags.length === 0) {
    return null;
  }
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
      {tags.map((tag) => (
        <Chip
          key={tag}
          size={"small"}
          label={tag}
          sx={{ height: 20, fontSize: "0.7rem", borderRadius: "999px", bgcolor: "action.hover" }}
        />
      ))}
    </Box>
  );
};

export const DiscountBadge = ({ discount }: { discount?: number }) => {
  const { t } = useTranslation();
  if (!discount || discount <= 0) {
    return null;
  }
  return (
    <Chip
      size={"small"}
      color={"error"}
      label={t("shop.product.discountBadge", { percent: discount })}
      sx={{ height: 20, fontSize: "0.7rem", borderRadius: "999px", fontWeight: 600 }}
    />
  );
};

/** 价格行：促销价 + 划线原价 + 促销标签，宽度稳定（等宽数字 + 换行不挤压）。 */
export const PriceRow = ({
  price,
  finalPrice,
  discount,
  primary,
  size = "h6",
}: {
  price: number;
  finalPrice: number;
  discount?: number;
  primary: string;
  size?: "h6" | "h5" | "subtitle1";
}) => (
  <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, flexWrap: "wrap" }}>
    <Money cents={finalPrice} bold variant={size} color={primary} />
    {finalPrice < price && (
      <Typography
        component={"span"}
        variant={"body2"}
        sx={{ textDecoration: "line-through", color: "text.disabled", fontVariantNumeric: "tabular-nums" }}
      >
        {displayMoney(price, SHOP_CURRENCY_SYMBOL)}
      </Typography>
    )}
    <DiscountBadge discount={discount} />
  </Box>
);

/** 扁平商品卡（minimal 模版）：无阴影、无圆角、1px 边框，hover 只改边框色。 */
export const shopFlatCardSx: SxProps<Theme> = {
  transition: "border-color 140ms cubic-bezier(0.2, 0.8, 0.2, 1)",
  "&:hover": { borderColor: "primary.main" },
  "&:active": { borderColor: "primary.main" },
  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
};

/**
 * 商品卡片（公开店铺网格 + 卖家商品列表共用）。
 *
 * `variant` 只改「卡片外观」：
 *  · card（默认）—— 白底 + 12px 圆角 + hover 抬起；
 *  · flat         —— 去阴影去圆角，1px 边框，hover 仅边框变色（极简模版用）。
 *
 * `featured` 是「头条大卡」：更高的封面（21/9）、更大的标题与价格。
 * 跨列交给商品网格的轨道（见 ShopStorefront 的 ProductGrid），卡片本身不再是网格项。
 */
export const ProductCard = ({
  product,
  slug,
  primary,
  featured,
  variant = "card",
  showStatus,
  secondaryAction,
}: {
  product: ShopProductSummary;
  slug?: string;
  primary: string;
  featured?: boolean;
  variant?: "card" | "flat";
  showStatus?: boolean;
  secondaryAction?: React.ReactNode;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const href = slug ? `/shop/${slug}/product/${product.id}` : undefined;

  return (
    <Box
      sx={{
        position: "relative",
        bgcolor: "background.paper",
        borderRadius: variant === "flat" ? 0 : 3,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...(variant === "flat" ? shopFlatCardSx : shopCardHoverSx),
      }}
    >
      <Box
        component={href ? "a" : "div"}
        {...(href ? { href } : {})}
        onClick={
          href
            ? (e: React.MouseEvent) => {
                e.preventDefault();
                navigate(href);
              }
            : undefined
        }
        sx={{
          display: "block",
          color: "inherit",
          textDecoration: "none",
          cursor: href ? "pointer" : "default",
          "&:focus-visible": { outline: "2px solid", outlineColor: primary, outlineOffset: -2 },
        }}
      >
        <ProductCover src={product.cover} primary={primary} ratio={featured ? "21 / 9" : "4 / 3"} />
      </Box>
      <Box sx={{ p: featured ? 3 : 2, display: "flex", flexDirection: "column", gap: 1, flexGrow: 1 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          <Typography
            component={"a"}
            href={href}
            onClick={
              href
                ? (e: React.MouseEvent) => {
                    e.preventDefault();
                    navigate(href);
                  }
                : undefined
            }
            variant={featured ? "h5" : "subtitle1"}
            sx={{
              fontWeight: featured ? 700 : 600,
              color: "text.primary",
              textDecoration: "none",
              flexGrow: 1,
              minWidth: 0,
              overflowWrap: "anywhere",
              "&:hover": { color: primary },
              "&:focus-visible": { outline: "2px solid", outlineColor: primary, outlineOffset: 2 },
            }}
          >
            {product.name}
          </Typography>
          {product.owned && (
            <Chip
              size={"small"}
              color={"success"}
              variant={"outlined"}
              label={t("shop.product.owned")}
              sx={{ height: 20, fontSize: "0.7rem", borderRadius: "999px" }}
            />
          )}
          {showStatus && <ProductStatusChip status={product.status} />}
        </Box>
        {product.summary && (
          <Typography
            variant={"body2"}
            color={"text.secondary"}
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.summary}
          </Typography>
        )}
        <TagRow tags={product.tags} />
        <Box sx={{ flexGrow: 1 }} />
        <PriceRow
          price={product.price}
          finalPrice={product.final_price}
          discount={product.discount}
          primary={primary}
          size={featured ? "h5" : "h6"}
        />
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography variant={"caption"} color={"text.secondary"}>
            {t("shop.product.sales", { count: product.sales })}
            {product.previewable ? ` · ${t("shop.product.previewable")}` : ""}
          </Typography>
          {secondaryAction}
        </Box>
      </Box>
    </Box>
  );
};

export const ProductStatusChip = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const map: Record<string, "default" | "success" | "warning" | "error"> = {
    onsale: "success",
    offsale: "warning",
    draft: "default",
    removed: "error",
  };
  return (
    <Chip
      size={"small"}
      color={map[status] ?? "default"}
      variant={status === "onsale" ? "filled" : "outlined"}
      label={t(`shop.product.status.${status}`, { defaultValue: status })}
      sx={{ height: 20, fontSize: "0.7rem", borderRadius: "999px" }}
    />
  );
};

export const OrderStatusChip = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const map: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
    pending: "warning",
    paid: "success",
    closed: "default",
    refunded: "info",
  };
  return (
    <Chip
      size={"small"}
      color={map[status] ?? "default"}
      label={t(`shop.order.status.${status}`, { defaultValue: status })}
      sx={{ height: 22, borderRadius: "999px", fontWeight: 600 }}
    />
  );
};

export const EntitlementStatusChip = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const map: Record<string, "default" | "success" | "warning" | "error"> = {
    granted: "success",
    pending: "warning",
    revoked: "error",
  };
  return (
    <Chip
      size={"small"}
      color={map[status] ?? "default"}
      label={t(`shop.purchase.status.${status}`, { defaultValue: status })}
      sx={{ height: 22, borderRadius: "999px", fontWeight: 600 }}
    />
  );
};

/**
 * 退款申请状态：
 * pending → 审核中，approved → 已退款，rejected → 被驳回，
 * refunded → 商家已线下退款、待平台核验凭证，confirmed → 平台已核验。
 */
export const RefundStatusChip = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const map: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
    pending: "warning",
    approved: "info",
    rejected: "error",
    refunded: "warning",
    confirmed: "success",
  };
  return (
    <Chip
      size={"small"}
      color={map[status] ?? "default"}
      variant={status === "pending" || status === "refunded" ? "filled" : "outlined"}
      label={t(`shop.refund.status.${status}`, { defaultValue: status })}
      sx={{ height: 22, borderRadius: "999px", fontWeight: 600 }}
    />
  );
};

/**
 * 「我的购买」里的退款摘要：把买家自己填的原因与卖家的备注都展示出来，
 * 避免用户只看到状态而不知道为什么被驳回。
 */
export const RefundNote = ({ refund }: { refund: ShopRefund }) => {
  const { t } = useTranslation();
  if (!refund.reason && !refund.remark) {
    return null;
  }
  return (
    <Box sx={{ mt: 0.5, display: "flex", flexDirection: "column", gap: 0.25 }}>
      {refund.reason && (
        <Typography variant={"caption"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
          {t("shop.refund.reasonLabel")}: {refund.reason}
        </Typography>
      )}
      {refund.remark && (
        <Typography
          variant={"caption"}
          color={refund.status === "rejected" ? "error.main" : "text.secondary"}
          sx={{ overflowWrap: "anywhere" }}
        >
          {t("shop.refund.remarkLabel")}: {refund.remark}
        </Typography>
      )}
    </Box>
  );
};

export const WithdrawStatusChip = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const map: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
    pending: "warning",
    approved: "info",
    rejected: "error",
    paid: "success",
  };
  return (
    <Chip
      size={"small"}
      color={map[status] ?? "default"}
      label={t(`shop.withdraw.status.${status}`, { defaultValue: status })}
      sx={{ height: 22, borderRadius: "999px", fontWeight: 600 }}
    />
  );
};

export const CouponStatusChip = ({ coupon }: { coupon: ShopCoupon }) => {
  const { t } = useTranslation();
  const active = coupon.status === "active";
  return (
    <Chip
      size={"small"}
      color={active ? "success" : "default"}
      variant={active ? "filled" : "outlined"}
      label={t(`shop.coupon.status.${coupon.status}`, { defaultValue: coupon.status })}
      sx={{ height: 22, borderRadius: "999px" }}
    />
  );
};

export const LedgerKindChip = ({ kind }: { kind: string }) => {
  const { t } = useTranslation();
  const negative = kind === "withdraw_freeze" || kind === "withdraw_settle";
  return (
    <Chip
      size={"small"}
      variant={"outlined"}
      color={negative ? "warning" : "success"}
      label={t(`shop.balance.ledgerKind.${kind}`, { defaultValue: kind })}
      sx={{ height: 20, fontSize: "0.7rem", borderRadius: "999px" }}
    />
  );
};

/** 小店的空状态：与主题一致，不引入新的插图依赖。 */
export const ShopEmpty = ({ title, description }: { title: string; description?: string }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 1,
      py: 6,
      px: 2,
      color: "text.secondary",
      border: "1px dashed",
      borderColor: "divider",
      borderRadius: 3,
      textAlign: "center",
    }}
  >
    <BuildingShop sx={{ fontSize: 48, opacity: 0.4 }} />
    <Typography variant={"subtitle1"} color={"text.primary"}>
      {title}
    </Typography>
    {description && <Typography variant={"body2"}>{description}</Typography>}
  </Box>
);

/** 时间格式化（Unix 秒 → 本地时间），i18n 感知。 */
export const useUnixTime = () => {
  const { i18n } = useTranslation();
  return useMemo(() => {
    const locale = i18n.language;
    return (unix?: number) => {
      if (!unix) {
        return "—";
      }
      return new Date(unix * 1000).toLocaleString(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    };
  }, [i18n.language]);
};

export const FileSizeText = ({ size }: { size: number }) => {
  const theme = useTheme();
  return (
    <Typography component={"span"} variant={"caption"} sx={{ color: theme.palette.text.secondary }}>
      {size > 0 ? sizeToString(size) : "—"}
    </Typography>
  );
};

export const OrderTitle = ({ order }: { order: ShopOrder }) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant={"body2"} sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
        {order.title}
      </Typography>
      <Typography variant={"caption"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
        {order.order_no} · {t(`shop.order.kind.${order.kind}`, { defaultValue: order.kind })}
      </Typography>
    </Box>
  );
};

export const EntitlementTitle = ({ entitlement }: { entitlement: ShopEntitlement }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant={"body2"} sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
      {entitlement.title}
    </Typography>
    <Typography variant={"caption"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
      {entitlement.order_no}
    </Typography>
  </Box>
);

export const WithdrawAccountText = ({ withdrawal }: { withdrawal: ShopWithdrawal }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant={"body2"} sx={{ overflowWrap: "anywhere" }}>
      {withdrawal.account.name} · {withdrawal.account.account}
    </Typography>
    <Typography variant={"caption"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
      {withdrawal.account.channel}
      {withdrawal.account.bank ? ` · ${withdrawal.account.bank}` : ""}
    </Typography>
  </Box>
);

/** 只读的键值对行，用于详情页/控制台的信息块。 */
export const InfoRow = ({ label, children }: { label: React.ReactNode; children: React.ReactNode }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "minmax(88px, 34%) 1fr", sm: "minmax(120px, 160px) 1fr" },
      columnGap: 2,
      rowGap: 0.5,
      alignItems: "baseline",
      py: 0.5,
    }}
  >
    <Typography variant={"body2"} color={"text.secondary"}>
      {label}
    </Typography>
    <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>{children}</Box>
  </Box>
);

/** 复制到剪贴板的小按钮包装，保证键盘可达。 */
export const CopyableText = ({
  text,
  onCopy,
  copiedLabel,
  copyLabel,
}: {
  text: string;
  onCopy: () => void;
  copiedLabel: string;
  copyLabel: string;
}) => {
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <Tooltip title={copied ? copiedLabel : copyLabel}>
      <Box
        component={"button"}
        type={"button"}
        onClick={() => {
          onCopy();
          setCopied(true);
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          width: "100%",
          textAlign: "left",
          p: 1,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "action.hover",
          color: "text.secondary",
          cursor: "pointer",
          font: "inherit",
          overflowWrap: "anywhere",
          "&:hover": { bgcolor: "action.selected" },
          "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
        }}
      >
        <Typography variant={"body2"} sx={{ flexGrow: 1, minWidth: 0, overflowWrap: "anywhere" }}>
          {text}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export const shopMoney = formatMoney;
