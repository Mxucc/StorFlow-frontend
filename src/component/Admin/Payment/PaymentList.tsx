import {
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  ListItemText,
  SelectChangeEvent,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useQueryState } from "nuqs";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { batchDeletePayments, getPaymentList } from "../../../api/api";
import { AdminListService, Payment } from "../../../api/dashboard";
import { useAppDispatch } from "../../../redux/hooks";
import { confirmOperation } from "../../../redux/thunks/dialog";
import {
  DenseSelect,
  NoWrapTableCell,
  NoWrapTypography,
  SecondaryButton,
  SquareChip,
  StyledTableContainerPaper,
} from "../../Common/StyledComponents";
import TimeBadge from "../../Common/TimeBadge";
import { SquareMenuItem } from "../../FileManager/ContextMenu/ContextMenu";
import ArrowSync from "../../Icons/ArrowSync";
import Delete from "../../Icons/Delete";
import PageContainer from "../../Pages/PageContainer";
import PageHeader from "../../Pages/PageHeader";
import TablePagination from "../Common/TablePagination";
import { PageQuery, PageSizeQuery } from "../StoragePolicy/StoragePolicySetting";

export const PaymentStatusQuery = "status";

export type PaymentStatus = "unpaid" | "paid" | "fulfilled" | "fulfill_failed";

const paymentStatusOptions: PaymentStatus[] = ["unpaid", "paid", "fulfilled", "fulfill_failed"];

const statusLabel = (status: string, t: (key: string) => string): string => {
  switch (status) {
    case "unpaid":
      return t("vas.unpaid");
    case "paid":
      return t("vas.paid");
    case "fulfilled":
      return t("payment.fulfilled");
    case "fulfill_failed":
      return t("payment.fulfillFailed");
    default:
      return status;
  }
};

const PaymentStatusChip = ({ status }: { status: string }) => {
  const { t } = useTranslation("dashboard");
  let color: "warning" | "info" | "success" | "error" | "default" = "default";
  switch (status) {
    case "unpaid":
      color = "warning";
      break;
    case "paid":
      color = "info";
      break;
    case "fulfilled":
      color = "success";
      break;
    case "fulfill_failed":
      color = "error";
      break;
  }
  return <SquareChip size="small" color={color} label={statusLabel(status, t)} />;
};

interface PaymentRowProps {
  payment?: Payment;
  loading?: boolean;
  deleting?: boolean;
  selected?: boolean;
  onSelect?: (id: number) => void;
}

const PaymentRow = ({ payment, loading, deleting, selected, onSelect }: PaymentRowProps) => {
  const onSelectClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect?.(payment?.id ?? 0);
  };

  if (loading) {
    return (
      <TableRow sx={{ height: "43px" }}>
        <TableCell padding="checkbox">
          <Skeleton variant="circular" width={24} height={24} />
        </TableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={30} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={140} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={140} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={80} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={40} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={70} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={70} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={60} />
        </NoWrapTableCell>
        <NoWrapTableCell>
          <Skeleton variant="text" width={110} />
        </NoWrapTableCell>
      </TableRow>
    );
  }

  const owner = payment?.user?.email || payment?.email;
  const amount = ((payment?.amount ?? 0) / 100).toFixed(2);

  return (
    <TableRow hover selected={selected}>
      <TableCell padding="checkbox">
        <Checkbox
          disabled={deleting}
          size="small"
          disableRipple
          color="primary"
          onClick={onSelectClick}
          checked={selected}
        />
      </TableCell>
      <NoWrapTableCell>
        <NoWrapTypography variant="inherit">{payment?.id}</NoWrapTypography>
      </NoWrapTableCell>
      <NoWrapTableCell>
        <NoWrapTypography variant="inherit" sx={{ fontFamily: "monospace" }}>
          {payment?.order_no || "-"}
        </NoWrapTypography>
      </NoWrapTableCell>
      <NoWrapTableCell>
        <NoWrapTypography variant="inherit">{owner || "-"}</NoWrapTypography>
      </NoWrapTableCell>
      <NoWrapTableCell>
        <NoWrapTypography variant="inherit">{payment?.product_type || payment?.sku_name || "-"}</NoWrapTypography>
      </NoWrapTableCell>
      <NoWrapTableCell>
        <NoWrapTypography variant="inherit">{payment?.quantity ?? 0}</NoWrapTypography>
      </NoWrapTableCell>
      <NoWrapTableCell>
        <NoWrapTypography variant="inherit" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {`¥${amount}`}
        </NoWrapTypography>
      </NoWrapTableCell>
      <NoWrapTableCell>
        <NoWrapTypography variant="inherit">{payment?.channel || "-"}</NoWrapTypography>
      </NoWrapTableCell>
      <NoWrapTableCell>
        <PaymentStatusChip status={payment?.status ?? ""} />
      </NoWrapTableCell>
      <NoWrapTableCell>
        <TimeBadge datetime={payment?.created_at ?? ""} variant="inherit" timeAgoThreshold={0} />
      </NoWrapTableCell>
    </TableRow>
  );
};

const PaymentList = () => {
  const { t } = useTranslation("dashboard");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [page, setPage] = useQueryState(PageQuery, { defaultValue: "1" });
  const [pageSize, setPageSize] = useQueryState(PageSizeQuery, {
    defaultValue: "10",
  });
  const [status, setStatus] = useQueryState(PaymentStatusQuery, { defaultValue: "" });

  const [count, setCount] = useState(0);
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Backend requires page >= 1 and 10 <= page_size <= 100
  const pageInt = Math.max(1, parseInt(page) || 1);
  const pageSizeInt = Math.min(100, Math.max(10, parseInt(pageSize) || 10));

  useEffect(() => {
    fetchPayments();
  }, [page, pageSize, status]);

  const fetchPayments = () => {
    setLoading(true);
    setSelected([]);
    setLoadFailed(false);

    const params: AdminListService = {
      page: pageInt,
      page_size: pageSizeInt,
      order_by: "",
      order_direction: "desc",
    };

    dispatch(getPaymentList(params, status))
      .then((res) => {
        setPayments(res.payments);
        setPageSize(res.pagination.page_size.toString());
        setCount(res.pagination.total_items ?? 0);
      })
      .catch(() => {
        setPayments([]);
        setCount(0);
        setLoadFailed(true);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleDelete = () => {
    setDeleteLoading(true);
    dispatch(confirmOperation(t("payment.deleteXPayments", { num: selected.length })))
      .then(() => {
        dispatch(batchDeletePayments({ ids: Array.from(selected) }))
          .then(() => {
            fetchPayments();
          })
          .catch(() => undefined)
          .finally(() => {
            setDeleteLoading(false);
          });
      })
      .catch(() => {
        setDeleteLoading(false);
      });
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = payments.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleSelect = useCallback(
    (id: number) => {
      const selectedIndex = selected.indexOf(id);
      let newSelected: readonly number[] = [];

      if (selectedIndex === -1) {
        newSelected = newSelected.concat(selected, id);
      } else if (selectedIndex === 0) {
        newSelected = newSelected.concat(selected.slice(1));
      } else if (selectedIndex === selected.length - 1) {
        newSelected = newSelected.concat(selected.slice(0, -1));
      } else if (selectedIndex > 0) {
        newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
      }
      setSelected(newSelected);
    },
    [selected],
  );

  return (
    <PageContainer>
      <Container maxWidth="xl">
        <PageHeader title={t("dashboard:vas.orders")} />
        <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "center" }}>
          <SecondaryButton onClick={fetchPayments} disabled={loading} variant={"contained"} startIcon={<ArrowSync />}>
            {t("node.refresh")}
          </SecondaryButton>

          <DenseSelect
            displayEmpty
            value={status == "" ? " " : status}
            onChange={(e: SelectChangeEvent<unknown>) =>
              setStatus(e.target.value === " " ? "" : (e.target.value as string))
            }
            sx={{ minWidth: 160 }}
          >
            <SquareMenuItem value={" "}>
              <ListItemText
                primary={<em>{t("payment.allStatus")}</em>}
                slotProps={{
                  primary: {
                    variant: "body2",
                  },
                }}
              />
            </SquareMenuItem>
            {paymentStatusOptions.map((value) => (
              <SquareMenuItem key={value} value={value}>
                <ListItemText
                  primary={statusLabel(value, t)}
                  slotProps={{
                    primary: {
                      variant: "body2",
                    },
                  }}
                />
              </SquareMenuItem>
            ))}
          </DenseSelect>

          {selected.length > 0 && !isMobile && (
            <>
              <Divider orientation="vertical" flexItem />
              <Button
                startIcon={<Delete />}
                variant="contained"
                color="error"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {t("payment.deleteXPayments", { num: selected.length })}
              </Button>
            </>
          )}
        </Stack>
        {isMobile && selected.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              startIcon={<Delete />}
              variant="contained"
              color="error"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {t("payment.deleteXPayments", { num: selected.length })}
            </Button>
          </Stack>
        )}
        {loadFailed && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            {t("payment.loadFailed")}
          </Typography>
        )}
        <TableContainer component={StyledTableContainerPaper} sx={{ mt: 2 }}>
          <Table size="small" stickyHeader sx={{ width: "100%", tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ width: "36px!important" }} width={50}>
                  <Checkbox
                    size="small"
                    indeterminate={selected.length > 0 && selected.length < payments.length}
                    checked={payments.length > 0 && selected.length === payments.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
                <NoWrapTableCell width={80}>{t("group.#")}</NoWrapTableCell>
                <NoWrapTableCell width={180}>{t("payment.tradeNo")}</NoWrapTableCell>
                <NoWrapTableCell width={160}>{t("vas.orderOwner")}</NoWrapTableCell>
                <NoWrapTableCell width={110}>{t("payment.productType")}</NoWrapTableCell>
                <NoWrapTableCell width={70}>{t("payment.quantity")}</NoWrapTableCell>
                <NoWrapTableCell width={110}>{t("vas.amount")}</NoWrapTableCell>
                <NoWrapTableCell width={100}>{t("vas.paidBy")}</NoWrapTableCell>
                <NoWrapTableCell width={100}>{t("payment.status")}</NoWrapTableCell>
                <NoWrapTableCell width={170}>{t("payment.createdAt")}</NoWrapTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading &&
                payments.map((payment) => (
                  <PaymentRow
                    deleting={deleteLoading}
                    key={payment.id}
                    payment={payment}
                    selected={selected.indexOf(payment.id) !== -1}
                    onSelect={handleSelect}
                  />
                ))}
              {loading &&
                payments.length > 0 &&
                payments.slice(0, 10).map((payment) => <PaymentRow key={`loading-${payment.id}`} loading={true} />)}
              {loading &&
                payments.length === 0 &&
                Array.from(Array(10)).map((_, index) => <PaymentRow key={`loading-${index}`} loading={true} />)}
              {!loading && !loadFailed && payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t("payment.empty")}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {count > 0 && (
          <Box sx={{ mt: 1 }}>
            <TablePagination
              page={pageInt}
              totalItems={count}
              rowsPerPage={pageSizeInt}
              rowsPerPageOptions={[10, 25, 50, 100]}
              onRowsPerPageChange={(value) => setPageSize(value.toString())}
              onChange={(_, value) => setPage(value.toString())}
            />
          </Box>
        )}
      </Container>
    </PageContainer>
  );
};

export default PaymentList;
