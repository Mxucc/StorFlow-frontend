import * as React from "react";
import { Alert, Box, Button, Chip, CircularProgress, Container, Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppError } from "../../../api/request.ts";
import { displayMoney } from "../../../api/shop.ts";
import { getVASPaymentStatus, notifyVASPointsUpdated, VASPaymentResponse } from "../../../api/vas.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import PageContainer from "../PageContainer.tsx";
import PageHeader from "../PageHeader.tsx";
import { paymentStatusColor, paymentStatusLabel } from "./utils.ts";

/**
 * 收银台回跳页。
 *
 * 后端下单时把 return_url 指到 `/vas/payment/status/:orderNo?channel=&ticket=`，
 * 支付完成后买家会被带回这里：本页轮询订单状态，直到支付成功或超时。
 */
const StorePaymentStatus = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { orderNo = "" } = useParams();
  const [searchParams] = useSearchParams();
  const channel = searchParams.get("channel") ?? "epay";
  const ticket = searchParams.get("ticket") ?? undefined;

  const [order, setOrder] = useState<VASPaymentResponse | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const settled = order?.status === "fulfilled" || order?.status === "paid";

  const poll = useCallback(() => {
    if (!orderNo) {
      setError(t("store.payment.loadFailed"));
      setLoading(false);
      return;
    }
    dispatch(getVASPaymentStatus(orderNo, channel, ticket))
      .then((res) => {
        setOrder(res);
        if (res && (res.status === "fulfilled" || res.status === "paid")) {
          notifyVASPointsUpdated();
        }
      })
      .catch((e) => setError(e instanceof AppError ? e.message : t("store.payment.loadFailed")))
      .finally(() => setLoading(false));
  }, [channel, dispatch, orderNo, t, ticket]);

  useEffect(() => {
    poll();
  }, [poll]);

  useEffect(() => {
    if (settled || error) {
      return;
    }
    const timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, [error, poll, settled]);

  const severity = () => {
    switch (order?.status) {
      case "fulfilled":
        return "success" as const;
      case "fulfill_failed":
        return "error" as const;
      case "paid":
        return "info" as const;
      default:
        return "warning" as const;
    }
  };

  const headline = () => {
    switch (order?.status) {
      case "fulfilled":
        return t("store.payment.success");
      case "paid":
        return t("store.payment.paidPending");
      case "fulfill_failed":
        return t("store.payment.failed");
      default:
        return t("store.payment.pending");
    }
  };

  return (
    <PageContainer>
      <Container maxWidth="lg">
        <PageHeader title={t("store.payment.title")} />

        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            bgcolor: "background.paper",
            p: 3,
            maxWidth: 640,
          }}
        >
          {loading && !order && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity={"error"} sx={{ borderRadius: 3 }}>
              {error}
            </Alert>
          )}

          {order && (
            <Stack spacing={1.5}>
              <Alert severity={severity()} sx={{ borderRadius: 3 }}>
                {headline()}
              </Alert>
              <Stack direction={"row"} spacing={1} alignItems={"center"} sx={{ flexWrap: "wrap" }}>
                <Chip
                  size={"small"}
                  variant={"outlined"}
                  color={paymentStatusColor(order.status)}
                  label={paymentStatusLabel(order.status, t)}
                />
                <Typography variant={"body2"} color={"text.secondary"}>
                  {t("store.pay.orderNo", { order: order.order_no })}
                </Typography>
              </Stack>
              {order.amount > 0 && (
                <Typography variant={"body2"} color={"text.secondary"}>
                  {t("store.pay.amount", { amount: displayMoney(order.amount) })}
                </Typography>
              )}
            </Stack>
          )}

          <Stack direction={"row"} spacing={1} sx={{ mt: 3, flexWrap: "wrap" }}>
            <Button variant={"contained"} onClick={() => navigate("/store")}>
              {t("store.payment.backToStore")}
            </Button>
            <Button variant={"outlined"} onClick={() => navigate("/store?tab=orders")}>
              {t("store.payment.myOrders")}
            </Button>
            {!settled && !error && (
              <Button variant={"outlined"} onClick={poll}>
                {t("store.pay.checkStatus")}
              </Button>
            )}
          </Stack>
        </Box>
      </Container>
    </PageContainer>
  );
};

export default StorePaymentStatus;
