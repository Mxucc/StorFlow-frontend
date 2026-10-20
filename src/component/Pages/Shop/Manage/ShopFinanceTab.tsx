import {
  Alert,
  Box,
  Button,
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
import { AppError } from "../../../../api/request.ts";
import {
  createShopDepositOrder,
  displayMoney,
  formatMoney,
  getShopBalance,
  listWithdrawals,
  parseMoney,
  requestWithdraw,
  ShopBalance,
  ShopWithdrawal,
} from "../../../../api/shop.ts";
import { useAppDispatch } from "../../../../redux/hooks.ts";
import { DenseFilledTextField, DenseSelect, SecondaryButton } from "../../../Common/StyledComponents.tsx";
import { SquareMenuItem } from "../../../FileManager/ContextMenu/ContextMenu.tsx";
import { DefaultCloseAction } from "../../../Common/Snackbar/snackbar.tsx";
import ArrowClockwise from "../../../Icons/ArrowClockwise.tsx";
import {
  LedgerKindChip,
  Money,
  ShopEmpty,
  useUnixTime,
  WithdrawAccountText,
  WithdrawStatusChip,
} from "../ShopShared.tsx";

const withdrawChannels = ["alipay", "wxpay", "bank"];

const StatCard = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <Box
    sx={{
      bgcolor: "background.paper",
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 3,
      p: 2,
      minWidth: 0,
    }}
  >
    <Typography variant={"caption"} color={"text.secondary"}>
      {label}
    </Typography>
    <Typography variant={"h6"} sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>
      {value}
    </Typography>
    {hint && (
      <Typography variant={"caption"} color={"text.secondary"}>
        {hint}
      </Typography>
    )}
  </Box>
);

const ShopFinanceTab = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const formatTime = useUnixTime();

  const [balance, setBalance] = useState<ShopBalance | undefined>();
  const [withdrawals, setWithdrawals] = useState<ShopWithdrawal[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const [amount, setAmount] = useState("");
  const [channel, setChannel] = useState("alipay");
  const [payeeName, setPayeeName] = useState("");
  const [account, setAccount] = useState("");
  const [bank, setBank] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    Promise.all([dispatch(getShopBalance()), dispatch(listWithdrawals({ limit: 50, offset: 0 }))])
      .then(([balanceRes, withdrawRes]) => {
        setBalance(balanceRes);
        setWithdrawals(withdrawRes ?? []);
      })
      .catch((e) => {
        setBalance(undefined);
        setWithdrawals([]);
        setError(e instanceof AppError ? e.message : t("shop.manage.finance.loadFailed"));
      })
      .finally(() => setLoading(false));
  }, [dispatch, t]);

  useEffect(() => {
    load();
  }, [load]);

  const amountCents = useMemo(() => parseMoney(amount), [amount]);
  const depositDue = balance?.deposit_due ?? 0;

  const submit = () => {
    setFormError(undefined);
    // 保证金未缴清时平台不允许提现，这里先给出明确原因。
    if (depositDue > 0) {
      setFormError(t("shop.manage.payment.depositWithdrawBlocked", { amount: displayMoney(depositDue) }));
      return;
    }
    if (Number.isNaN(amountCents) || amountCents < 1) {
      setFormError(t("shop.manage.finance.amountInvalid"));
      return;
    }
    if (balance && amountCents > balance.available) {
      setFormError(t("shop.manage.finance.amountExceeds"));
      return;
    }
    if (!payeeName.trim() || !account.trim()) {
      setFormError(t("shop.manage.finance.payeeRequired"));
      return;
    }
    if (channel === "bank" && !bank.trim()) {
      setFormError(t("shop.manage.finance.bankRequired"));
      return;
    }
    setSubmitting(true);
    dispatch(
      requestWithdraw({
        amount: amountCents,
        account: {
          channel,
          name: payeeName.trim(),
          account: account.trim(),
          bank: channel === "bank" ? bank.trim() : undefined,
          remark: remark.trim() || undefined,
        },
      }),
    )
      .then((res) => {
        setWithdrawals((prev) => [res, ...(prev ?? [])]);
        setAmount("");
        setRemark("");
        enqueueSnackbar({
          message: t("shop.manage.finance.submitted"),
          variant: "success",
          action: DefaultCloseAction,
        });
        load();
      })
      .catch((e) => setFormError(e instanceof AppError ? e.message : t("shop.manage.finance.submitFailed")))
      .finally(() => setSubmitting(false));
  };

  /** 缴纳 / 补交保证金：创建平台支付订单后整页跳到易支付收银台。 */
  const payDeposit = () => {
    setDepositing(true);
    setFormError(undefined);
    dispatch(createShopDepositOrder())
      .then((order) => {
        if (order.pay_url) {
          window.location.assign(order.pay_url);
          return;
        }
        setFormError(t("shop.manage.payment.depositNoGateway"));
      })
      .catch((e) => setFormError(e instanceof AppError ? e.message : t("shop.manage.payment.depositFailed")))
      .finally(() => setDepositing(false));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {error && (
        <Alert severity={"error"} sx={{ borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        <StatCard
          label={t("shop.manage.finance.available")}
          value={displayMoney(balance?.available)}
          hint={t("shop.manage.finance.availableHint")}
        />
        <StatCard
          label={t("shop.manage.finance.pending")}
          value={displayMoney(balance?.pending)}
          hint={t("shop.manage.finance.pendingHint", { hours: balance?.settle_delay_hours ?? 0 })}
        />
        <StatCard label={t("shop.manage.finance.frozen")} value={displayMoney(balance?.frozen)} />
        <StatCard label={t("shop.manage.finance.totalIncome")} value={displayMoney(balance?.total_income)} />
        <StatCard label={t("shop.manage.finance.totalWithdraw")} value={displayMoney(balance?.total_withdraw)} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 380px) minmax(0, 1fr)" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Box
          sx={{
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          {depositDue > 0 && (
            <Alert
              severity={"warning"}
              sx={{ borderRadius: 3 }}
              action={
                <Button color={"inherit"} size={"small"} onClick={payDeposit} disabled={depositing}>
                  {t("shop.manage.payment.depositPay")}
                </Button>
              }
            >
              {t("shop.manage.payment.depositWithdrawBlocked", { amount: displayMoney(depositDue) })}
            </Alert>
          )}
          <Typography variant={"subtitle1"} sx={{ fontWeight: 600 }}>
            {t("shop.manage.finance.withdrawTitle")}
          </Typography>
          <DenseFilledTextField
            label={t("shop.manage.finance.amount")}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputProps={{ inputMode: "decimal" }}
            helperText={t("shop.manage.finance.amountHint", { available: displayMoney(balance?.available) })}
            error={amount !== "" && Number.isNaN(amountCents)}
          />
          <Stack direction={"row"} spacing={1}>
            <Button size={"small"} onClick={() => setAmount(formatMoney(balance?.available))}>
              {t("shop.manage.finance.all")}
            </Button>
          </Stack>
          <DenseSelect value={channel} onChange={(e) => setChannel(e.target.value as string)} size={"small"}>
            {withdrawChannels.map((item) => (
              <SquareMenuItem key={item} value={item}>
                {t(`shop.manage.finance.channels.${item}`)}
              </SquareMenuItem>
            ))}
          </DenseSelect>
          <DenseFilledTextField
            label={t("shop.manage.finance.payeeName")}
            value={payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
            inputProps={{ maxLength: 64 }}
          />
          <DenseFilledTextField
            label={t("shop.manage.finance.account")}
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            inputProps={{ maxLength: 128 }}
            helperText={t("shop.manage.finance.accountHint")}
          />
          {channel === "bank" && (
            <DenseFilledTextField
              label={t("shop.manage.finance.bank")}
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              inputProps={{ maxLength: 64 }}
              required
            />
          )}
          <DenseFilledTextField
            label={t("shop.manage.finance.remark")}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            inputProps={{ maxLength: 200 }}
          />
          {formError && (
            <Alert severity={"error"} sx={{ borderRadius: 3 }}>
              {formError}
            </Alert>
          )}
          <Button variant={"contained"} onClick={submit} disabled={submitting || depositDue > 0}>
            {t("shop.manage.finance.submit")}
          </Button>
          <Typography variant={"caption"} color={"text.secondary"}>
            {t("shop.manage.finance.withdrawHint")}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant={"subtitle1"} sx={{ fontWeight: 600, flexGrow: 1 }}>
                {t("shop.manage.finance.ledger")}
              </Typography>
              <SecondaryButton
                size={"small"}
                variant={"outlined"}
                startIcon={<ArrowClockwise sx={{ fontSize: 16 }} />}
                onClick={load}
                disabled={loading}
              >
                {t("shop.manage.refresh")}
              </SecondaryButton>
            </Box>
            {balance && balance.ledger.length === 0 ? (
              <ShopEmpty title={t("shop.manage.finance.noLedger")} />
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
                <Table size={"small"} sx={{ minWidth: 520 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell width={140}>{t("shop.manage.finance.fields.kind")}</TableCell>
                      <TableCell width={120} align={"right"}>
                        {t("shop.manage.finance.fields.amount")}
                      </TableCell>
                      <TableCell width={120} align={"right"}>
                        {t("shop.manage.finance.fields.balance")}
                      </TableCell>
                      <TableCell>{t("shop.manage.finance.fields.remark")}</TableCell>
                      <TableCell width={160}>{t("shop.manage.finance.fields.time")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {balance?.ledger.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>
                          <LedgerKindChip kind={row.kind} />
                        </TableCell>
                        <TableCell align={"right"}>
                          <Money cents={row.amount} bold color={row.amount < 0 ? "text.secondary" : "success.main"} />
                        </TableCell>
                        <TableCell align={"right"}>
                          <Money cents={row.balance} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 0 }}>
                          <Typography variant={"caption"} sx={{ overflowWrap: "anywhere" }}>
                            {row.remark || row.ref_id || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant={"caption"} color={"text.secondary"}>
                            {formatTime(row.created_at)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>

          <Box>
            <Typography variant={"subtitle1"} sx={{ fontWeight: 600, mb: 1 }}>
              {t("shop.manage.finance.withdrawHistory")}
            </Typography>
            {withdrawals && withdrawals.length === 0 ? (
              <ShopEmpty title={t("shop.manage.finance.noWithdraw")} />
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
                <Table size={"small"} sx={{ minWidth: 620 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell width={110} align={"right"}>
                        {t("shop.manage.finance.fields.amount")}
                      </TableCell>
                      <TableCell width={110} align={"right"}>
                        {t("shop.manage.finance.fields.actual")}
                      </TableCell>
                      <TableCell>{t("shop.manage.finance.fields.payee")}</TableCell>
                      <TableCell width={110}>{t("shop.manage.finance.fields.status")}</TableCell>
                      <TableCell width={160}>{t("shop.manage.finance.fields.time")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {withdrawals?.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell align={"right"}>
                          <Money cents={row.amount} bold />
                        </TableCell>
                        <TableCell align={"right"}>
                          <Money cents={row.actual} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 0 }}>
                          <WithdrawAccountText withdrawal={row} />
                          {row.remark && (
                            <Typography variant={"caption"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
                              {row.remark}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <WithdrawStatusChip status={row.status} />
                        </TableCell>
                        <TableCell>
                          <Typography variant={"caption"} color={"text.secondary"}>
                            {formatTime(row.created_at)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      <Divider />
      <Typography variant={"caption"} color={"text.secondary"}>
        {t("shop.manage.finance.footnote")}
      </Typography>
      <Typography variant={"caption"} color={"text.secondary"}>
        {t("shop.manage.finance.settleFootnote", { hours: balance?.settle_delay_hours ?? 0 })}
      </Typography>
    </Box>
  );
};

export default ShopFinanceTab;
