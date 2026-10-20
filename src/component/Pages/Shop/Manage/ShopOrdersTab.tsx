import { Alert, Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppError } from "../../../../api/request.ts";
import { listShopSold, ShopOrder } from "../../../../api/shop.ts";
import { useAppDispatch } from "../../../../redux/hooks.ts";
import { SecondaryButton } from "../../../Common/StyledComponents.tsx";
import ArrowClockwise from "../../../Icons/ArrowClockwise.tsx";
import { Money, OrderStatusChip, ShopEmpty, useUnixTime } from "../ShopShared.tsx";

/** 我店的收款订单：GET /shop/sold */
const ShopOrdersTab = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const formatTime = useUnixTime();

  const [orders, setOrders] = useState<ShopOrder[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    dispatch(listShopSold({ limit: 100, offset: 0 }))
      .then((res) => setOrders(res ?? []))
      .catch((e) => {
        setOrders([]);
        setError(e instanceof AppError ? e.message : t("shop.manage.orders.loadFailed"));
      })
      .finally(() => setLoading(false));
  }, [dispatch, t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography variant={"body2"} color={"text.secondary"} sx={{ flexGrow: 1 }}>
          {t("shop.manage.orders.hint")}
        </Typography>
        <SecondaryButton
          variant={"outlined"}
          size={"small"}
          startIcon={<ArrowClockwise sx={{ fontSize: 16 }} />}
          onClick={load}
        >
          {t("shop.manage.refresh")}
        </SecondaryButton>
      </Box>

      {error && (
        <Alert severity={"error"} sx={{ mb: 2, borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      {orders && orders.length === 0 && !loading ? (
        <ShopEmpty title={t("shop.manage.orders.empty")} description={t("shop.manage.orders.emptyHint")} />
      ) : (
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            bgcolor: "background.paper",
            overflowX: "auto",
          }}
        >
          <Table size={"small"} sx={{ minWidth: 820 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t("shop.order.fields.title")}</TableCell>
                <TableCell width={120}>{t("shop.order.fields.status")}</TableCell>
                <TableCell width={110} align={"right"}>
                  {t("shop.order.fields.payable")}
                </TableCell>
                <TableCell width={100}>{t("shop.manage.orders.fields.channel")}</TableCell>
                <TableCell width={160}>{t("shop.order.fields.createdAt")}</TableCell>
                <TableCell width={160}>{t("shop.order.fields.paidAt")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders?.map((order) => (
                <TableRow key={order.order_no} hover>
                  <TableCell sx={{ maxWidth: 0 }}>
                    <Typography variant={"body2"} sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                      {order.title}
                    </Typography>
                    <Typography variant={"caption"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
                      {order.order_no} · {t(`shop.order.kind.${order.kind}`)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <OrderStatusChip status={order.status} />
                  </TableCell>
                  <TableCell align={"right"}>
                    <Money cents={order.payable} bold />
                    {order.discount > 0 && (
                      <Typography variant={"caption"} color={"text.secondary"} sx={{ display: "block" }}>
                        {t("shop.manage.orders.discount", { amount: `¥${(order.discount / 100).toFixed(2)}` })}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant={"body2"}>
                      {t(`shop.channel.${order.channel}`, { defaultValue: order.channel })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant={"caption"} color={"text.secondary"}>
                      {formatTime(order.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant={"caption"} color={"text.secondary"}>
                      {order.paid_at ? formatTime(order.paid_at) : "—"}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
      <Box sx={{ mt: 2 }}>
        <Button size={"small"} variant={"text"} onClick={load} disabled={loading}>
          {t("shop.manage.orders.reload")}
        </Button>
      </Box>
    </Box>
  );
};

export default ShopOrdersTab;
