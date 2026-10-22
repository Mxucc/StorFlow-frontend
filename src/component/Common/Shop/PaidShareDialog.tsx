import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getShareInfo } from "../../../api/api.ts";
import { Share } from "../../../api/explorer.ts";
import { AppError } from "../../../api/request.ts";
import {
  createShopOrder,
  displayMoney,
  getShopOrder,
  ShopOrder,
  ShopPayChannel,
  ShopPayChannels,
} from "../../../api/shop.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import CheckmarkCircle from "../../Icons/CheckmarkCircle.tsx";
import CoinStack from "../../Icons/CoinStack.tsx";
import LockClosedKey from "../../Icons/LockClosedKey.tsx";
import { Money, OrderStatusChip, useUnixTime } from "../../Pages/Shop/ShopShared.tsx";
import { DenseFilledTextField } from "../StyledComponents.tsx";
import { DefaultCloseAction } from "../Snackbar/snackbar.tsx";

const POLL_INTERVAL = 2000;

export interface PaidShareDialogProps {
  open: boolean;
  shareId?: string;
  password?: string;
  onClose: () => void;
  /** 支付完成（或已购买）后调用，用于刷新当前分享页面。 */
  onPurchased: () => void;
}

/**
 * 付费分享购买对话框（契约 §5）。
 *
 * 流程：GET /share/info/:id 读取 pay_enabled/price/purchased → 选择支付通道
 * → POST /shop/order {kind:"share"} → pay_url 存在时给出「去支付」入口并轮询
 * GET /shop/order/:orderNo → paid 后回调 onPurchased() 刷新分享页面。
 */
const PaidShareDialog = ({ open, shareId, password, onClose, onPurchased }: PaidShareDialogProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const formatTime = useUnixTime();

  const [info, setInfo] = useState<Share | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [channel, setChannel] = useState<ShopPayChannel>("alipay");
  const [sharePassword, setSharePassword] = useState(password ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [order, setOrder] = useState<ShopOrder | undefined>();
  const [polling, setPolling] = useState(false);

  /**
   * 收银台只列出平台当前真正开通的通道：管理员关掉（或没配齐）的通道不该
   * 出现在买家眼前。后端没下发时退回易支付协议支持的全部通道。
   */
  const channelOptions = useMemo<ShopPayChannel[]>(() => {
    const list = (info?.pay_channels ?? []).filter((item): item is ShopPayChannel =>
      (ShopPayChannels as readonly string[]).includes(item),
    );
    return list.length > 0 ? list : [...ShopPayChannels];
  }, [info?.pay_channels]);

  useEffect(() => {
    if (!channelOptions.includes(channel)) {
      setChannel(channelOptions[0]);
    }
  }, [channelOptions, channel]);

  useEffect(() => {
    if (!open || !shareId) {
      return;
    }
    setLoading(true);
    setLoadError(undefined);
    setOrder(undefined);
    setSubmitError(undefined);
    setSharePassword(password ?? "");
    dispatch(getShareInfo(shareId, password, false, false))
      .then((res) => setInfo(res))
      .catch((e) => setLoadError(e instanceof AppError ? e.message : t("shop.share.loadFailed")))
      .finally(() => setLoading(false));
  }, [dispatch, open, password, shareId, t]);

  const refreshOrder = useCallback(
    async (orderNo: string) => {
      try {
        const res = await dispatch(getShopOrder(orderNo));
        setOrder(res);
        if (res.status !== "pending") {
          setPolling(false);
        }
        return res;
      } catch {
        setPolling(false);
        return undefined;
      }
    },
    [dispatch],
  );

  useEffect(() => {
    if (!polling || !order || order.status !== "pending") {
      return;
    }
    const timer = window.setTimeout(() => {
      refreshOrder(order.order_no);
    }, POLL_INTERVAL);
    return () => window.clearTimeout(timer);
  }, [polling, order, refreshOrder]);

  useEffect(() => {
    if (order?.status === "paid") {
      enqueueSnackbar({
        message: t("shop.share.paid"),
        variant: "success",
        action: DefaultCloseAction,
      });
      onPurchased();
    }
  }, [order?.status, onPurchased, enqueueSnackbar, t]);

  const purchase = () => {
    if (!shareId) {
      return;
    }
    setSubmitting(true);
    setSubmitError(undefined);
    dispatch(
      createShopOrder({
        kind: "share",
        object_id: shareId,
        channel,
        share_password: sharePassword || undefined,
      }),
    )
      .then((res) => {
        setOrder(res);
        setPolling(res.status === "pending");
      })
      .catch((e) => setSubmitError(e instanceof AppError ? e.message : t("shop.checkout.failed")))
      .finally(() => setSubmitting(false));
  };

  return (
    <Dialog open={open} onClose={() => !submitting && onClose()} fullWidth maxWidth={"xs"}>
      <DialogTitle>{t("shop.share.title")}</DialogTitle>
      <DialogContent>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {loadError && (
          <Alert severity={"error"} sx={{ borderRadius: 3 }}>
            {loadError}
          </Alert>
        )}
        {!loading && info && (
          <>
            <Typography variant={"body2"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
              {info.name || info.id}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 2,
                mt: 1,
                mb: 2,
                p: 1.5,
                borderRadius: 2,
                bgcolor: "action.hover",
              }}
            >
              <Typography variant={"body2"}>{t("shop.share.price")}</Typography>
              <Money cents={info.price} bold variant={"h6"} color={"primary.main"} />
            </Box>
            {info.purchased ? (
              <>
                <Alert severity={"success"} variant={"outlined"} sx={{ borderRadius: 3 }}>
                  {t("shop.share.alreadyPurchased")}
                </Alert>
                <Stack direction={"row"} spacing={1} sx={{ mt: 2 }}>
                  <Button variant={"contained"} onClick={onPurchased}>
                    {t("shop.share.refresh")}
                  </Button>
                </Stack>
              </>
            ) : !info.pay_enabled ? (
              <Alert severity={"warning"} variant={"outlined"} sx={{ borderRadius: 3 }}>
                {t("shop.share.notForSale")}
              </Alert>
            ) : order ? (
              <>
                <Stack direction={"row"} spacing={1} alignItems={"center"} sx={{ mb: 1 }}>
                  {order.status === "paid" ? (
                    <CheckmarkCircle sx={{ fontSize: 32, color: "success.main" }} />
                  ) : (
                    <LockClosedKey sx={{ fontSize: 32, color: "warning.main" }} />
                  )}
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant={"body2"} sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                      {t("shop.order.fields.orderNo")}: {order.order_no}
                    </Typography>
                    <Typography variant={"caption"} color={"text.secondary"}>
                      {t("shop.order.fields.expireAt")}: {formatTime(order.expire_at)}
                    </Typography>
                  </Box>
                  <OrderStatusChip status={order.status} />
                </Stack>
                {order.status === "pending" && (
                  <>
                    <Alert severity={"info"} variant={"outlined"} sx={{ borderRadius: 3, mb: 1 }}>
                      {polling ? t("shop.share.polling") : t("shop.share.pollingStopped")}
                    </Alert>
                    <Stack direction={"row"} spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                      {order.pay_url && (
                        <Button
                          variant={"contained"}
                          href={order.pay_url}
                          target={"_blank"}
                          rel={"noreferrer noopener"}
                        >
                          {t("shop.order.goPay")}
                        </Button>
                      )}
                      <Button variant={"outlined"} onClick={() => setPolling((p) => !p)}>
                        {polling ? t("shop.order.stopPolling") : t("shop.order.startPolling")}
                      </Button>
                      <Button variant={"outlined"} onClick={() => refreshOrder(order.order_no)}>
                        {t("shop.order.refresh")}
                      </Button>
                    </Stack>
                  </>
                )}
                {order.status === "paid" && (
                  <Button variant={"contained"} sx={{ mt: 1 }} onClick={onPurchased}>
                    {t("shop.share.refresh")}
                  </Button>
                )}
                {order.status === "closed" && (
                  <Alert severity={"warning"} sx={{ borderRadius: 3 }}>
                    {t("shop.order.closedHint")}
                  </Alert>
                )}
              </>
            ) : (
              <>
                <Typography variant={"body2"} color={"text.secondary"} sx={{ mb: 0.5 }}>
                  {t("shop.checkout.channel")}
                </Typography>
                <RadioGroup
                  row
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as ShopPayChannel)}
                  aria-label={t("shop.checkout.channel")}
                >
                  {channelOptions.map((item) => (
                    <FormControlLabel
                      key={item}
                      value={item}
                      control={<Radio size={"small"} />}
                      label={<Typography variant={"body2"}>{t(`shop.channel.${item}`)}</Typography>}
                    />
                  ))}
                </RadioGroup>
                <DenseFilledTextField
                  fullWidth
                  label={t("shop.share.password")}
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  inputProps={{ maxLength: 32 }}
                  helperText={t("shop.share.passwordHint")}
                  sx={{ mt: 1 }}
                />
                {submitError && (
                  <Alert severity={"error"} sx={{ mt: 2, borderRadius: 3 }}>
                    {submitError}
                  </Alert>
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          {t("shop.checkout.cancel")}
        </Button>
        {!loading && info && info.pay_enabled && !info.purchased && !order && (
          <Button variant={"contained"} onClick={purchase} disabled={submitting}>
            {t("shop.share.purchase")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

/**
 * 文件管理器 / 分享页遇到 `40083`（You need to purchased this share）时的入口面板。
 * 读取分享详情展示价格，并提供「购买此分享」按钮。
 */
export const PaidShareGate = ({
  shareId,
  password,
  onPurchased,
}: {
  shareId: string;
  password?: string;
  onPurchased: () => void;
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [info, setInfo] = useState<Share | undefined>();
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    dispatch(getShareInfo(shareId, password, false, false))
      .then((res) => setInfo(res))
      .catch((e) => setError(e instanceof AppError ? e.message : t("shop.share.loadFailed")))
      .finally(() => setLoading(false));
  }, [dispatch, password, shareId, t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box sx={{ textAlign: "center", maxWidth: 420 }}>
      <CoinStack sx={{ fontSize: 64, color: "action.active" }} />
      <Typography variant={"h6"} sx={{ fontWeight: 600, mt: 1 }}>
        {t("shop.share.gateTitle")}
      </Typography>
      <Typography variant={"body2"} color={"text.secondary"} sx={{ mt: 1, overflowWrap: "anywhere" }}>
        {t("shop.share.gateHint")}
      </Typography>
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      {!loading && error && (
        <Alert severity={"warning"} sx={{ mt: 2, borderRadius: 3, textAlign: "left" }}>
          {error}
        </Alert>
      )}
      {!loading && info && (
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5, alignItems: "center" }}>
          {info.name && (
            <Typography variant={"subtitle1"} sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
              {info.name}
            </Typography>
          )}
          <Money cents={info.price} bold variant={"h5"} color={"primary.main"} />
          <Stack direction={"row"} spacing={1}>
            <Button
              variant={"contained"}
              startIcon={<LockClosedKey sx={{ fontSize: 18 }} />}
              onClick={() => setOpen(true)}
            >
              {t("shop.share.purchase")}
            </Button>
            <Button variant={"outlined"} onClick={load}>
              {t("shop.order.refresh")}
            </Button>
          </Stack>
          <Typography variant={"caption"} color={"text.secondary"}>
            {displayMoney(info.price)} · {info.owner?.nickname}
          </Typography>
        </Box>
      )}
      <PaidShareDialog
        open={open}
        shareId={shareId}
        password={password}
        onClose={() => setOpen(false)}
        onPurchased={() => {
          setOpen(false);
          load();
          onPurchased();
        }}
      />
    </Box>
  );
};

export default PaidShareDialog;
