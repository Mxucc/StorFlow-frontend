import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AppError } from "../../../api/request.ts";
import {
  listMyRefunds,
  listShopOrders,
  listShopPurchases,
  requestShopRefund,
  retryShopDelivery,
  ShopConflict,
  ShopEntitlement,
  ShopInvalidParam,
  ShopOrder,
  ShopRefund,
} from "../../../api/shop.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import PageContainer from "../PageContainer.tsx";
import PageHeader from "../PageHeader.tsx";
import { DenseFilledTextField } from "../../Common/StyledComponents.tsx";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar.tsx";
import Folder from "../../Icons/Folder.tsx";
import ArrowClockwise from "../../Icons/ArrowClockwise.tsx";
import CopperCoin from "../../Icons/CopperCoin.tsx";
import {
  EntitlementStatusChip,
  Money,
  OrderStatusChip,
  RefundNote,
  RefundStatusChip,
  ShopEmpty,
  useUnixTime,
} from "./ShopShared.tsx";

const PAGE_SIZE = 50;

const ShopPurchases = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const formatTime = useUnixTime();

  const [purchases, setPurchases] = useState<ShopEntitlement[] | undefined>();
  const [orders, setOrders] = useState<ShopOrder[] | undefined>();
  const [refunds, setRefunds] = useState<ShopRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [retrying, setRetrying] = useState<string | undefined>();

  const [refundTarget, setRefundTarget] = useState<ShopEntitlement | undefined>();
  const [refundReason, setRefundReason] = useState("");
  const [refundError, setRefundError] = useState<string | undefined>();
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    Promise.all([
      dispatch(listShopPurchases({ limit: PAGE_SIZE, offset: 0 })),
      dispatch(listShopOrders({ limit: PAGE_SIZE, offset: 0 })),
      dispatch(listMyRefunds({ limit: PAGE_SIZE, offset: 0 })),
    ])
      .then(([purchaseRes, orderRes, refundRes]) => {
        setPurchases(purchaseRes ?? []);
        setOrders(orderRes ?? []);
        setRefunds(refundRes ?? []);
      })
      .catch((e) => {
        setPurchases([]);
        setOrders([]);
        setRefunds([]);
        setError(e instanceof AppError ? e.message : t("shop.purchase.loadFailed"));
      })
      .finally(() => setLoading(false));
  }, [dispatch, t]);

  useEffect(() => {
    load();
  }, [load]);

  /** 按订单号索引退款申请：一张订单最多一条申请（后端唯一约束）。 */
  const refundByOrder = useMemo(() => {
    const map: Record<string, ShopRefund> = {};
    refunds.forEach((refund) => {
      map[refund.order_no] = refund;
    });
    return map;
  }, [refunds]);

  const retryDelivery = (id: string) => {
    setRetrying(id);
    dispatch(retryShopDelivery(id))
      .then((res) => {
        setPurchases((prev) => prev?.map((item) => (item.id === res.id ? res : item)));
      })
      .finally(() => setRetrying(undefined));
  };

  const openRefund = (item: ShopEntitlement) => {
    setRefundTarget(item);
    setRefundReason("");
    setRefundError(undefined);
  };

  /** 把后端的业务错误翻译成用户能照着做的提示。 */
  const describeRefundError = (e: unknown): string => {
    if (!(e instanceof AppError)) {
      return t("shop.refund.failed");
    }
    if (e.code === ShopConflict) {
      return `${e.message} ${t("shop.refund.conflictHint")}`;
    }
    if (e.code === ShopInvalidParam) {
      return `${e.message} ${t("shop.refund.windowHint")}`;
    }
    return e.message;
  };

  const submitRefund = () => {
    if (!refundTarget) {
      return;
    }
    setRefundSubmitting(true);
    setRefundError(undefined);
    dispatch(requestShopRefund(refundTarget.id, refundReason))
      .then(() => {
        setRefundTarget(undefined);
        enqueueSnackbar({
          message: t("shop.refund.submitted"),
          variant: "success",
          action: DefaultCloseAction,
        });
        load();
      })
      .catch((e) => setRefundError(describeRefundError(e)))
      .finally(() => setRefundSubmitting(false));
  };

  return (
    <PageContainer>
      <Container maxWidth="lg">
        <PageHeader title={t("shop.purchase.title")} onRefresh={load} loading={loading} />

        {loading && !purchases && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Typography color={"error.main"} variant={"body2"} sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {purchases && (
          <>
            <Typography variant={"h6"} sx={{ fontWeight: 600, mb: 1 }}>
              {t("shop.purchase.entitlements")}
            </Typography>
            {purchases.length === 0 ? (
              <ShopEmpty title={t("shop.purchase.empty")} description={t("shop.purchase.emptyHint")} />
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
                <Table size={"small"} sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("shop.purchase.fields.title")}</TableCell>
                      <TableCell width={170}>{t("shop.purchase.fields.status")}</TableCell>
                      <TableCell width={190}>{t("shop.purchase.fields.updatedAt")}</TableCell>
                      <TableCell width={260} align={"right"}>
                        {t("shop.purchase.fields.actions")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {purchases.map((item) => {
                      const refund = refundByOrder[item.order_no];
                      return (
                        <TableRow key={item.id} hover>
                          <TableCell sx={{ maxWidth: 0 }}>
                            <Typography variant={"body2"} sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                              {item.title}
                            </Typography>
                            <Typography variant={"caption"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
                              {item.order_no}
                            </Typography>
                            {refund && <RefundNote refund={refund} />}
                          </TableCell>
                          <TableCell>
                            <Stack direction={"row"} spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                              <EntitlementStatusChip status={item.status} />
                              {refund && <RefundStatusChip status={refund.status} />}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant={"caption"} color={"text.secondary"}>
                              {formatTime(item.updated_at || item.created_at)}
                            </Typography>
                          </TableCell>
                          <TableCell align={"right"}>
                            <Stack
                              direction={"row"}
                              spacing={0.5}
                              justifyContent={"flex-end"}
                              sx={{ flexWrap: "wrap" }}
                            >
                              {item.status === "granted" && item.kind === "product" && (
                                <Button
                                  size={"small"}
                                  startIcon={<Folder sx={{ fontSize: 16 }} />}
                                  onClick={() =>
                                    navigate(`/home?path=${encodeURIComponent(`storflow://my/${item.title}`)}`)
                                  }
                                >
                                  {t("shop.purchase.openFolder")}
                                </Button>
                              )}
                              {item.status === "granted" && item.kind === "share" && (
                                <Button size={"small"} onClick={() => navigate(`/s/${item.object_id}`)}>
                                  {t("shop.purchase.openShare")}
                                </Button>
                              )}
                              {item.status === "pending" && (
                                <Button
                                  size={"small"}
                                  variant={"outlined"}
                                  startIcon={<ArrowClockwise sx={{ fontSize: 16 }} />}
                                  disabled={retrying === item.id}
                                  onClick={() => retryDelivery(item.id)}
                                >
                                  {t("shop.purchase.retryDelivery")}
                                </Button>
                              )}
                              {item.status === "granted" && !refund && (
                                <Button
                                  size={"small"}
                                  startIcon={<CopperCoin sx={{ fontSize: 16 }} />}
                                  onClick={() => openRefund(item)}
                                >
                                  {t("shop.refund.apply")}
                                </Button>
                              )}
                              {item.status === "revoked" && (
                                <Typography variant={"caption"} color={"text.secondary"}>
                                  {t("shop.purchase.revokedHint")}
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}

            <Divider sx={{ my: 4 }} />

            <Typography variant={"h6"} sx={{ fontWeight: 600, mb: 1 }}>
              {t("shop.order.title")}
            </Typography>
            {orders && orders.length === 0 ? (
              <ShopEmpty title={t("shop.order.empty")} description={t("shop.order.emptyHint")} />
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
                <Table size={"small"} sx={{ minWidth: 640 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("shop.order.fields.title")}</TableCell>
                      <TableCell width={120}>{t("shop.order.fields.status")}</TableCell>
                      <TableCell width={120} align={"right"}>
                        {t("shop.order.fields.payable")}
                      </TableCell>
                      <TableCell width={190}>{t("shop.order.fields.createdAt")}</TableCell>
                      <TableCell width={120} align={"right"}>
                        {t("shop.order.fields.actions")}
                      </TableCell>
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
                        </TableCell>
                        <TableCell>
                          <Typography variant={"caption"} color={"text.secondary"}>
                            {formatTime(order.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell align={"right"}>
                          <Stack direction={"row"} spacing={1} justifyContent={"flex-end"}>
                            <Button
                              size={"small"}
                              onClick={() => navigate(`/shop/order/${encodeURIComponent(order.order_no)}`)}
                            >
                              {order.status === "pending" ? t("shop.order.continuePay") : t("shop.order.viewDetail")}
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </>
        )}

        <Dialog
          open={!!refundTarget}
          onClose={() => !refundSubmitting && setRefundTarget(undefined)}
          fullWidth
          maxWidth={"xs"}
        >
          <DialogTitle>{t("shop.refund.dialogTitle")}</DialogTitle>
          <DialogContent>
            <Typography variant={"body2"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
              {refundTarget?.title}
            </Typography>
            <Alert severity={"info"} variant={"outlined"} sx={{ mt: 1, mb: 2, borderRadius: 3 }}>
              {t("shop.refund.dialogHint")}
            </Alert>
            <DenseFilledTextField
              fullWidth
              multiline
              minRows={3}
              label={t("shop.refund.reason")}
              placeholder={t("shop.refund.reasonPlaceholder")}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              inputProps={{ maxLength: 500 }}
              helperText={t("shop.refund.reasonHint", { count: refundReason.length })}
            />
            {refundError && (
              <Alert severity={"error"} sx={{ mt: 2, borderRadius: 3 }}>
                {refundError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setRefundTarget(undefined)} disabled={refundSubmitting}>
              {t("shop.checkout.cancel")}
            </Button>
            <Button variant={"contained"} onClick={submitRefund} disabled={refundSubmitting}>
              {t("shop.refund.submit")}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </PageContainer>
  );
};

export default ShopPurchases;
