import { Alert, Box, Button, CircularProgress, Container, Stack, Typography } from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { AppError, Code } from "../../../api/request.ts";
import { createShopOrder, getShopOrder, ShopOrder as ShopOrderModel } from "../../../api/shop.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import PageContainer from "../PageContainer.tsx";
import PageHeader from "../PageHeader.tsx";
import { DenseFilledTextField } from "../../Common/StyledComponents.tsx";
import CheckmarkCircle from "../../Icons/CheckmarkCircle.tsx";
import ClockFilled from "../../Icons/ClockFilled.tsx";
import DismissCircleFilled from "../../Icons/DismissCircleFilled.tsx";
import Folder from "../../Icons/Folder.tsx";
import Payment from "../../Icons/Payment.tsx";
import { InfoRow, Money, OrderStatusChip, ShopEmpty, useUnixTime } from "./ShopShared.tsx";

const POLL_INTERVAL = 2000;

/**
 * 收银台回跳页。
 *
 * 支付网关不可达时（本地联调就是这种情况）页面必须仍然可用：这里不做
 * `window.location.href = pay_url` 的硬跳转，而是展示订单状态 + 显式的
 * 「去支付」按钮，并持续轮询 `GET /shop/order/:orderNo`。轮询可以手动停止，
 * 订单不再是 pending 时自动停止。
 */
const ShopOrder = () => {
  const { orderNo = "" } = useParams();
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const formatTime = useUnixTime();

  const [order, setOrder] = useState<ShopOrderModel | undefined>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [polling, setPolling] = useState(true);
  const [polls, setPolls] = useState(0);
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | undefined>();
  const [sharePassword, setSharePassword] = useState("");
  const timer = useRef<number | undefined>(undefined);

  const fetchOrder = useCallback(
    async (showLoading: boolean) => {
      if (showLoading) {
        setLoading(true);
      }
      try {
        const res = await dispatch(getShopOrder(orderNo));
        setOrder(res);
        setNotFound(false);
        return res;
      } catch (e) {
        if (e instanceof AppError && e.code === Code.NodeFound) {
          setNotFound(true);
        }
        return undefined;
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [dispatch, orderNo],
  );

  useEffect(() => {
    fetchOrder(true);
  }, [fetchOrder]);

  useEffect(() => {
    if (!polling || !order || order.status !== "pending") {
      return;
    }
    timer.current = window.setTimeout(() => {
      setPolls((p) => p + 1);
      fetchOrder(false).then((res) => {
        if (!res || res.status !== "pending") {
          setPolling(false);
        }
      });
    }, POLL_INTERVAL);
    return () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
      }
    };
  }, [polling, order, polls, fetchOrder]);

  useEffect(() => {
    if (order && order.status !== "pending") {
      setPolling(false);
    }
  }, [order]);

  const reorder = () => {
    if (!order) {
      return;
    }
    if (order.kind === "deposit") {
      // 保证金订单不能在这里续费：回小店控制台重新发起一笔保证金订单。
      navigate("/shop/manage");
      return;
    }
    setReordering(true);
    setReorderError(undefined);
    dispatch(
      createShopOrder({
        kind: order.kind,
        object_id: order.object_id,
        channel: order.channel,
        share_password: order.kind === "share" && sharePassword ? sharePassword : undefined,
      }),
    )
      .then((res) => navigate(`/shop/order/${encodeURIComponent(res.order_no)}`))
      .catch((e) => setReorderError(e instanceof AppError ? e.message : t("shop.checkout.failed")))
      .finally(() => setReordering(false));
  };

  if (loading && !order) {
    return (
      <PageContainer>
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        </Container>
      </PageContainer>
    );
  }

  if (notFound || !order) {
    return (
      <PageContainer>
        <Container maxWidth="lg">
          <PageHeader title={t("shop.order.pageTitle")} />
          <ShopEmpty title={t("shop.order.notFound")} description={t("shop.order.notFoundHint")} />
          <Stack direction={"row"} spacing={1} sx={{ mt: 2 }}>
            <Button variant={"contained"} onClick={() => navigate("/shop/purchases")}>
              {t("shop.purchase.title")}
            </Button>
            <Button variant={"outlined"} onClick={() => fetchOrder(true)}>
              {t("shop.store.retry")}
            </Button>
          </Stack>
        </Container>
      </PageContainer>
    );
  }

  const statusIcon = () => {
    switch (order.status) {
      case "paid":
        return <CheckmarkCircle sx={{ fontSize: 56, color: "success.main" }} />;
      case "closed":
        return <DismissCircleFilled sx={{ fontSize: 56, color: "text.disabled" }} />;
      default:
        return <ClockFilled sx={{ fontSize: 56, color: "warning.main" }} />;
    }
  };

  return (
    <PageContainer>
      <Container maxWidth="lg">
        <PageHeader title={t("shop.order.pageTitle")} />
        <Box sx={{ maxWidth: 720 }}>
          <Box
            sx={{
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              p: 3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
              {statusIcon()}
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Stack direction={"row"} spacing={1} alignItems={"center"} sx={{ flexWrap: "wrap" }}>
                  <Typography variant={"h6"} sx={{ fontWeight: 600 }}>
                    {t(`shop.order.headline.${order.status}`, { defaultValue: order.status })}
                  </Typography>
                  <OrderStatusChip status={order.status} />
                </Stack>
                <Typography variant={"body2"} color={"text.secondary"} sx={{ mt: 0.5, overflowWrap: "anywhere" }}>
                  {t(`shop.order.hint.${order.status}`, { defaultValue: "" })}
                </Typography>
              </Box>
            </Box>

            <InfoRow label={t("shop.order.fields.orderNo")}>
              <Typography variant={"body2"} sx={{ fontFamily: "monospace", overflowWrap: "anywhere" }}>
                {order.order_no}
              </Typography>
            </InfoRow>
            <InfoRow label={t("shop.order.fields.title")}>
              <Typography variant={"body2"} sx={{ overflowWrap: "anywhere" }}>
                {order.title}
              </Typography>
            </InfoRow>
            <InfoRow label={t("shop.order.fields.kind")}>
              <Typography variant={"body2"}>{t(`shop.order.kind.${order.kind}`)}</Typography>
            </InfoRow>
            <InfoRow label={t("shop.order.fields.amount")}>
              <Money cents={order.amount} />
            </InfoRow>
            {order.discount > 0 && (
              <InfoRow label={t("shop.order.fields.discount")}>
                <Money cents={-order.discount} color={"success.main"} />
              </InfoRow>
            )}
            <InfoRow label={t("shop.order.fields.payable")}>
              <Money cents={order.payable} bold variant={"subtitle1"} />
            </InfoRow>
            {order.paid > 0 && (
              <InfoRow label={t("shop.order.fields.paid")}>
                <Money cents={order.paid} />
              </InfoRow>
            )}
            <InfoRow label={t("shop.order.fields.channel")}>
              <Typography variant={"body2"}>
                {t(`shop.channel.${order.channel}`, { defaultValue: order.channel })}
              </Typography>
            </InfoRow>
            <InfoRow label={t("shop.order.fields.createdAt")}>
              <Typography variant={"body2"}>{formatTime(order.created_at)}</Typography>
            </InfoRow>
            {order.status === "pending" && (
              <InfoRow label={t("shop.order.fields.expireAt")}>
                <Typography variant={"body2"}>{formatTime(order.expire_at)}</Typography>
              </InfoRow>
            )}
            {order.paid_at ? (
              <InfoRow label={t("shop.order.fields.paidAt")}>
                <Typography variant={"body2"}>{formatTime(order.paid_at)}</Typography>
              </InfoRow>
            ) : null}
            {order.trade_no && (
              <InfoRow label={t("shop.order.fields.tradeNo")}>
                <Typography variant={"body2"} sx={{ overflowWrap: "anywhere" }}>
                  {order.trade_no}
                </Typography>
              </InfoRow>
            )}
          </Box>

          <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            {order.status === "pending" && (
              <>
                <Alert severity={"info"} variant={"outlined"} sx={{ borderRadius: 3 }}>
                  {t("shop.order.pollingHint")}
                </Alert>
                <Stack direction={"row"} spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                  {order.pay_url && (
                    <Button
                      variant={"contained"}
                      startIcon={<Payment sx={{ fontSize: 18 }} />}
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
                  <Button
                    variant={"outlined"}
                    onClick={() => {
                      setPolling(true);
                      setPolls((p) => p + 1);
                      fetchOrder(false);
                    }}
                  >
                    {t("shop.order.refresh")}
                  </Button>
                </Stack>
                <Typography variant={"caption"} color={"text.secondary"}>
                  {polling
                    ? t("shop.order.pollingStatus", { seconds: POLL_INTERVAL / 1000, count: polls })
                    : t("shop.order.pollingStopped")}
                </Typography>
                <Box sx={{ maxWidth: 320 }}>
                  <DenseFilledTextField
                    fullWidth
                    label={t("shop.order.sharePassword")}
                    helperText={t("shop.order.sharePasswordHint")}
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                    inputProps={{ maxLength: 32 }}
                  />
                </Box>
              </>
            )}

            {order.status === "paid" && (
              <Alert severity={"success"} sx={{ borderRadius: 3 }}>
                {order.kind === "deposit"
                  ? t("shop.order.depositPaidHint")
                  : order.kind === "product"
                    ? t("shop.order.deliveredHint")
                    : t("shop.order.deliveredHintShare")}
              </Alert>
            )}

            {order.status === "closed" && (
              <Alert severity={"warning"} sx={{ borderRadius: 3 }}>
                {t("shop.order.closedHint")}
              </Alert>
            )}

            {reorderError && (
              <Alert severity={"error"} sx={{ borderRadius: 3 }}>
                {reorderError}
              </Alert>
            )}

            <Stack direction={"row"} spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
              {order.status === "paid" && order.kind === "product" && (
                <Button
                  variant={"contained"}
                  startIcon={<Folder sx={{ fontSize: 18 }} />}
                  onClick={() => navigate(`/home?path=${encodeURIComponent(`storflow://my/${order.title}`)}`)}
                >
                  {t("shop.purchase.openFolder")}
                </Button>
              )}
              {order.status === "paid" && order.kind === "share" && (
                <Button variant={"contained"} onClick={() => navigate(`/s/${order.object_id}`)}>
                  {t("shop.order.backToShare")}
                </Button>
              )}
              {order.status === "paid" && order.kind !== "deposit" && (
                <Button variant={"outlined"} onClick={() => navigate("/shop/purchases")}>
                  {t("shop.purchase.title")}
                </Button>
              )}
              {order.kind === "deposit" && order.status !== "paid" && (
                <Button variant={"contained"} onClick={() => navigate("/shop/manage")}>
                  {t("shop.order.payDeposit")}
                </Button>
              )}
              {(order.status === "closed" || order.status === "refunded") && order.kind !== "deposit" && (
                <Button variant={"contained"} onClick={reorder} disabled={reordering}>
                  {t("shop.order.reorder")}
                </Button>
              )}
              {order.status === "refunded" && (
                <Alert severity={"info"} sx={{ borderRadius: 3, flexGrow: 1 }}>
                  {t("shop.order.refundedHint")}
                </Alert>
              )}
            </Stack>
          </Box>
        </Box>
      </Container>
    </PageContainer>
  );
};

export default ShopOrder;
