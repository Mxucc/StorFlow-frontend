import * as React from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppError } from "../../../api/request.ts";
import { displayMoney } from "../../../api/shop.ts";
import { listMyPayments, VASPayment } from "../../../api/vas.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import { paymentStatusColor, paymentStatusLabel, productTypeLabel } from "./utils.ts";

const pageSize = 20;

/** 我的订单：增值服务（套餐 / 积分）购买记录。 */
const StoreOrders = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [orders, setOrders] = useState<VASPayment[] | undefined>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(
    (target: number) => {
      setLoading(true);
      setError(undefined);
      dispatch(listMyPayments(target, pageSize))
        .then((res) => {
          setOrders(res ?? []);
          setPage(target);
        })
        .catch((e) => setError(e instanceof AppError ? e.message : t("store.order.loadFailed")))
        .finally(() => setLoading(false));
    },
    [dispatch, t],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const hasNext = (orders?.length ?? 0) >= pageSize;

  return (
    <Box>
      <Stack direction={"row"} spacing={1} alignItems={"center"} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant={"outlined"} size={"small"} onClick={() => load(page)} disabled={loading}>
          {t("store.refresh")}
        </Button>
      </Stack>

      {loading && !orders && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && !loading && (
        <Typography color={"error.main"} variant={"body2"} sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {!loading && orders && orders.length === 0 && (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Typography variant={"body2"} color={"text.secondary"}>
            {t("store.order.empty")}
          </Typography>
        </Box>
      )}

      {orders && orders.length > 0 && (
        <>
          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              bgcolor: "background.paper",
              overflowX: "auto",
            }}
          >
            <Table size={"small"} sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t("store.order.fields.orderNo")}</TableCell>
                  <TableCell>{t("store.order.fields.product")}</TableCell>
                  <TableCell width={140} align={"right"}>
                    {t("store.order.fields.amount")}
                  </TableCell>
                  <TableCell width={110}>{t("store.order.fields.status")}</TableCell>
                  <TableCell width={190}>{t("store.order.fields.time")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell sx={{ maxWidth: 0 }}>
                      <Typography variant={"body2"} sx={{ overflowWrap: "anywhere" }}>
                        {order.order_no}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 0 }}>
                      <Typography variant={"body2"}>{order.sku_name}</Typography>
                      <Typography variant={"caption"} color={"text.secondary"}>
                        {productTypeLabel(order.product_type, t)}
                      </Typography>
                    </TableCell>
                    <TableCell align={"right"}>
                      {order.points_used > 0 ? (
                        <Typography variant={"body2"} color={"info.main"}>
                          {t("store.order.pointsUsed", { points: order.points_used })}
                        </Typography>
                      ) : (
                        <Typography variant={"body2"}>{displayMoney(order.amount)}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size={"small"}
                        color={paymentStatusColor(order.status)}
                        variant={"outlined"}
                        label={paymentStatusLabel(order.status, t)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant={"caption"} color={"text.secondary"}>
                        {order.created_at}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Stack direction={"row"} spacing={1} alignItems={"center"} justifyContent={"flex-end"} sx={{ mt: 2 }}>
            <Button size={"small"} disabled={page <= 1 || loading} onClick={() => load(page - 1)}>
              {t("store.order.prev")}
            </Button>
            <Typography variant={"body2"}>{page}</Typography>
            <Button size={"small"} disabled={!hasNext || loading} onClick={() => load(page + 1)}>
              {t("store.order.next")}
            </Button>
          </Stack>
        </>
      )}
    </Box>
  );
};

export default StoreOrders;
