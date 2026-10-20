import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getUserMe } from "../../../api/api.ts";
import { GroupPermission } from "../../../api/user.ts";
import { AppError } from "../../../api/request.ts";
import { displayMoney } from "../../../api/shop.ts";
import {
  createVASPayment,
  getVASPaymentStatus,
  notifyVASPointsUpdated,
  VASPaymentResponse,
  VASShopGroup,
  VASShopProvider,
  VASShopSKU,
} from "../../../api/vas.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import { updateUserCapacity } from "../../../redux/thunks/filemanager.ts";
import SessionManager from "../../../session";
import { sizeToString } from "../../../util";
import Boolset from "../../../util/boolset";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar.tsx";
import { describeSKU, productTypeColor, productTypeLabel, productTypeOrder } from "./utils.ts";
import { defaultShopBanner, defaultShopLogo } from "../Shop/shopAssets.ts";

interface StoreProductsProps {
  skus: VASShopSKU[];
  providers: VASShopProvider[];
  points: number;
  onPurchased: () => void;
}

interface PayOption {
  key: string;
  usePoints: boolean;
  providerId?: string;
  channel: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

/** 会员权益中需要展示的权限位：只在用户组开启时展示。 */
const benefitPermissions: { bit: number; label: string }[] = [
  { bit: GroupPermission.share, label: "store.benefit.share" },
  { bit: GroupPermission.share_download, label: "store.benefit.shareDownload" },
  { bit: GroupPermission.share_free, label: "store.benefit.shareFree" },
  { bit: GroupPermission.webdav, label: "store.benefit.webdav" },
  { bit: GroupPermission.archive_task, label: "store.benefit.archive" },
  { bit: GroupPermission.remote_download, label: "store.benefit.remoteDownload" },
  { bit: GroupPermission.migrate_policy, label: "store.benefit.migratePolicy" },
  { bit: GroupPermission.advance_delete, label: "store.benefit.advanceDelete" },
  { bit: GroupPermission.unique_direct_link, label: "store.benefit.uniqueDirectLink" },
];

/** 会员权益：容量 / 速度 / 回收站保留 / 已开启的功能权限。 */
const GroupBenefits = ({
  group,
  sku,
  t,
}: {
  group: VASShopGroup;
  sku: VASShopSKU;
  t: (key: string, options?: Record<string, unknown>) => string;
}) => {
  const permissions = useMemo(() => new Boolset(group.permission ?? ""), [group.permission]);
  const enabled = benefitPermissions.filter((item) => permissions.enabled(item.bit));

  return (
    <Stack spacing={1}>
      <Typography variant={"body2"} sx={{ fontWeight: 600 }}>
        {t("store.benefit.title")}
      </Typography>
      <Typography variant={"body2"} color={"text.secondary"}>
        {`• ${t("store.benefit.upgradeTo", { group: group.name })}`}
      </Typography>
      <Typography variant={"body2"} color={"text.secondary"}>
        {`• ${
          (sku.duration_days ?? 0) > 0
            ? t("store.benefit.duration", { days: sku.duration_days })
            : t("store.benefit.forever")
        }`}
      </Typography>
      <Stack spacing={0.5}>
        <Typography variant={"body2"} color={"text.secondary"}>
          {`• ${t("store.benefit.capacity", {
            size: group.max_storage > 0 ? sizeToString(group.max_storage) : t("store.benefit.unlimited"),
          })}`}
        </Typography>
        <Typography variant={"body2"} color={"text.secondary"}>
          {`• ${t("store.benefit.speed", {
            speed: group.speed_limit > 0 ? `${sizeToString(group.speed_limit)}/s` : t("store.benefit.unlimited"),
          })}`}
        </Typography>
        {(group.trash_retention ?? 0) > 0 && (
          <Typography variant={"body2"} color={"text.secondary"}>
            {`• ${t("store.benefit.trash", { days: Math.round((group.trash_retention ?? 0) / 86400) })}`}
          </Typography>
        )}
      </Stack>
      {enabled.length > 0 && (
        <Stack direction={"row"} spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
          {enabled.map((item) => (
            <Chip key={item.label} size={"small"} variant={"outlined"} label={t(item.label)} />
          ))}
        </Stack>
      )}
    </Stack>
  );
};

const StoreProducts = ({ skus, providers, points, onPurchased }: StoreProductsProps) => {
  const { t } = useTranslation();
  const [target, setTarget] = useState<VASShopSKU | undefined>();

  // 按商品类型排序后统一平铺：卡片自带类型标签，避免某一类型只剩一张卡片时整行空着。
  const ordered = useMemo(() => {
    const rank = (type: string) => {
      const index = (productTypeOrder as string[]).indexOf(type);
      return index === -1 ? productTypeOrder.length : index;
    };
    return [...skus].sort((a, b) => rank(a.type) - rank(b.type));
  }, [skus]);

  return (
    <>
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 3,
          p: { xs: 2.5, sm: 3 },
          mb: 4,
          minHeight: 148,
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          color: "#fff",
          backgroundImage: `url(${defaultShopBanner})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* 暗色遮罩：横幅本身偏深，这里保证白色标题在任意裁切下都有足够对比度。 */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(100deg, rgba(6,12,38,0.86) 0%, rgba(6,12,38,0.62) 55%, rgba(6,12,38,0.38) 100%)",
          }}
        />
        <Box
          component={"img"}
          src={defaultShopLogo}
          alt={""}
          sx={{
            position: "relative",
            width: 52,
            height: 52,
            borderRadius: "14px",
            flexShrink: 0,
            display: { xs: "none", sm: "block" },
            boxShadow: "0 6px 18px rgba(0,0,0,0.28)",
          }}
        />
        <Box sx={{ position: "relative", minWidth: 0, flexGrow: 1 }}>
          <Typography variant={"h6"} sx={{ fontWeight: 600, mb: 0.5 }}>
            {t("store.hero.title")}
          </Typography>
          <Typography variant={"body2"} sx={{ color: "rgba(255,255,255,0.86)" }}>
            {t("store.hero.description")}
          </Typography>
        </Box>
        <Stack spacing={0.5} alignItems={"flex-end"} sx={{ position: "relative" }}>
          <Typography variant={"caption"} sx={{ color: "rgba(255,255,255,0.82)" }}>
            {t("store.pointsBalance")}
          </Typography>
          <Chip color={"info"} label={points} sx={{ fontWeight: 600 }} />
        </Stack>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
        {ordered.map((sku) => (
          <Box
            key={sku.id}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              bgcolor: "background.paper",
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            <Stack direction={"row"} spacing={1} alignItems={"center"} sx={{ minWidth: 0 }}>
              <Typography variant={"subtitle1"} sx={{ fontWeight: 600, minWidth: 0 }} noWrap>
                {sku.name}
              </Typography>
              <Chip
                size={"small"}
                variant={"outlined"}
                color={productTypeColor(sku.type)}
                label={productTypeLabel(sku.type, t)}
              />
            </Stack>

            {sku.description && (
              <Typography variant={"body2"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
                {sku.description}
              </Typography>
            )}

            {sku.type === "group" && sku.group ? (
              <GroupBenefits group={sku.group} sku={sku} t={t} />
            ) : (
              <Typography variant={"body2"} color={"text.secondary"}>
                {describeSKU(sku, t)}
              </Typography>
            )}

            <Box sx={{ flexGrow: 1 }} />
            <Divider />
            <Stack direction={"row"} spacing={1} alignItems={"baseline"} sx={{ flexWrap: "wrap" }}>
              {sku.price > 0 ? (
                <Typography variant={"h6"} sx={{ fontWeight: 600 }}>
                  {displayMoney(sku.price)}
                </Typography>
              ) : (
                <Typography variant={"body2"} color={"text.secondary"}>
                  {t("store.pricePointsOnly")}
                </Typography>
              )}
              {(sku.points_price ?? 0) > 0 && (
                <Typography variant={"body2"} color={"info.main"}>
                  {t("store.pricePoints", { points: sku.points_price })}
                </Typography>
              )}
            </Stack>
            <Button variant={"contained"} onClick={() => setTarget(sku)}>
              {t("store.buy")}
            </Button>
          </Box>
        ))}
      </Box>

      {target && (
        <PurchaseDialog
          sku={target}
          providers={providers}
          points={points}
          onClose={() => setTarget(undefined)}
          onPurchased={onPurchased}
        />
      )}
    </>
  );
};

interface PurchaseDialogProps {
  sku: VASShopSKU;
  providers: VASShopProvider[];
  points: number;
  onClose: () => void;
  onPurchased: () => void;
}

/**
 * 下单弹窗：现金支付跳转收银台并轮询订单状态，积分支付由后端立即履约。
 */
const PurchaseDialog = ({ sku, providers, points, onClose, onPurchased }: PurchaseDialogProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const options = useMemo<PayOption[]>(() => {
    const list: PayOption[] = [];
    if (sku.price > 0) {
      providers.forEach((provider) => {
        list.push({
          key: `cash:${provider.id}`,
          usePoints: false,
          providerId: provider.id,
          channel: provider.type,
          label: t("store.pay.online", { name: provider.name }),
        });
      });
    }
    if ((sku.points_price ?? 0) > 0) {
      list.push({
        key: "points",
        usePoints: true,
        channel: "points",
        label: t("store.pay.points", { points: sku.points_price }),
        hint: t("store.pay.pointsBalance", { balance: points }),
        disabled: points < (sku.points_price ?? 0),
      });
    }
    return list;
  }, [points, providers, sku, t]);

  const [selected, setSelected] = useState<string>(options.find((o) => !o.disabled)?.key ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [order, setOrder] = useState<VASPaymentResponse | undefined>();
  const [settled, setSettled] = useState(false);

  const settle = useCallback(
    (status: string) => {
      setSettled(true);
      enqueueSnackbar({
        message: status === "fulfilled" ? t("store.pay.success") : t("store.pay.paidPending"),
        variant: "success",
        action: DefaultCloseAction,
      });
      // 容量包 / 会员会改变用户总容量与用户组，购买后立即刷新。
      dispatch(getUserMe())
        .then((user) => {
          if (user) {
            SessionManager.updateUserIfExist(user);
          }
        })
        .catch(() => undefined)
        .finally(() => dispatch(updateUserCapacity(0)));
      notifyVASPointsUpdated();
      onPurchased();
      onClose();
    },
    [dispatch, enqueueSnackbar, onClose, onPurchased, t],
  );

  const poll = useCallback(
    (orderNo: string, channel: string) => {
      dispatch(getVASPaymentStatus(orderNo, channel))
        .then((res) => {
          if (res && (res.status === "fulfilled" || res.status === "paid")) {
            settle(res.status);
          }
        })
        .catch(() => undefined);
    },
    [dispatch, settle],
  );

  useEffect(() => {
    if (!order || settled) {
      return;
    }
    const channel = options.find((o) => o.key === selected)?.channel ?? "";
    const timer = setInterval(() => poll(order.order_no, channel), 3000);
    return () => clearInterval(timer);
  }, [order, options, poll, selected, settled]);

  const submit = () => {
    const option = options.find((o) => o.key === selected);
    if (!option) {
      return;
    }
    setSubmitting(true);
    setError(undefined);
    dispatch(
      createVASPayment({
        sku_id: sku.id,
        qyt: 1,
        provider_id: option.providerId,
        use_points: option.usePoints,
      }),
    )
      .then((res) => {
        if (!res) {
          return;
        }
        if (res.status === "fulfilled" || res.status === "paid") {
          settle(res.status);
          return;
        }
        setOrder(res);
        if (res.pay_url) {
          window.open(res.pay_url, "_blank", "noopener,noreferrer");
        }
      })
      .catch((e) => setError(e instanceof AppError ? e.message : t("store.pay.failed")))
      .finally(() => setSubmitting(false));
  };

  return (
    <Dialog open onClose={() => !submitting && onClose()} fullWidth maxWidth={"xs"}>
      <DialogTitle>{t("store.buy")}</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Typography variant={"subtitle1"} sx={{ fontWeight: 600 }}>
            {sku.name}
          </Typography>
          <Typography variant={"body2"} color={"text.secondary"}>
            {describeSKU(sku, t)}
          </Typography>
          {sku.description && (
            <Typography variant={"caption"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
              {sku.description}
            </Typography>
          )}
        </Stack>

        {!order && (
          <>
            {options.length === 0 && (
              <Alert severity={"info"} sx={{ borderRadius: 3 }}>
                {t("store.pay.noChannel")}
              </Alert>
            )}
            <RadioGroup value={selected} onChange={(_e, value) => setSelected(value)}>
              {options.map((option) => (
                <FormControlLabel
                  key={option.key}
                  value={option.key}
                  disabled={option.disabled}
                  control={<Radio size={"small"} />}
                  label={
                    <Box>
                      <Typography variant={"body2"}>{option.label}</Typography>
                      {option.hint && (
                        <Typography variant={"caption"} color={"text.secondary"}>
                          {option.hint}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              ))}
            </RadioGroup>
          </>
        )}

        {order && (
          <Stack spacing={1}>
            <Alert severity={"info"} sx={{ borderRadius: 3 }}>
              {t("store.pay.pending")}
            </Alert>
            <Typography variant={"body2"} color={"text.secondary"}>
              {t("store.pay.orderNo", { order: order.order_no })}
            </Typography>
            {order.amount > 0 && (
              <Typography variant={"body2"} color={"text.secondary"}>
                {t("store.pay.amount", { amount: displayMoney(order.amount) })}
              </Typography>
            )}
            <Button
              variant={"outlined"}
              onClick={() => poll(order.order_no, options.find((o) => o.key === selected)?.channel ?? "")}
            >
              {t("store.pay.checkStatus")}
            </Button>
          </Stack>
        )}

        {error && (
          <Alert severity={"error"} sx={{ mt: 2, borderRadius: 3 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          {t("store.close")}
        </Button>
        {!order && (
          <Button variant={"contained"} onClick={submit} disabled={submitting || !selected}>
            {t("store.pay.confirm")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default StoreProducts;
