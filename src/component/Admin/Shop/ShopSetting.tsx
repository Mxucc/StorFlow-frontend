import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useQueryState } from "nuqs";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppError } from "../../../api/request.ts";
import {
  adminListWithdrawals,
  adminReviewWithdrawal,
  displayMoney,
  formatMoney,
  getShopAdminSetting,
  parseMoney,
  saveShopAdminSetting,
  ShopPayChannels,
  ShopWithdrawal,
} from "../../../api/shop.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import PageHeader, { PageTabQuery } from "../../Pages/PageHeader.tsx";
import { DenseFilledTextField, FilledTextField, StyledTab, StyledTabs } from "../../Common/StyledComponents.tsx";
import PageContainer from "../../Pages/PageContainer.tsx";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar.tsx";
import {
  Money,
  ShopEmpty,
  useUnixTime,
  WithdrawAccountText,
  WithdrawStatusChip,
} from "../../Pages/Shop/ShopShared.tsx";
import ShopRefundsPanel from "../../Pages/Shop/Manage/ShopRefundsTab.tsx";

/** 管理端的一行逐通道配置。 */
interface AdminChannelRow {
  channel: string;
  api_url?: string;
  pid?: string;
  key?: string;
  enabled: boolean;
}

const SettingKey = {
  enabled: "enabled",
  apiUrl: "epay_api_url",
  pid: "epay_pid",
  key: "epay_key",
  channels: "epay_channels",
  fee: "fee_percent",
  referral: "referral_percent",
  withdrawFee: "withdraw_fee_percent",
  minWithdraw: "min_withdraw",
  orderTTL: "order_ttl",
  siteURL: "site_url",
  refundWindowDays: "refund_window_days",
  rateLimit: "rate_limit_per_minute",
  depositAmount: "deposit_amount",
  settleDelayHours: "settle_delay_hours",
} as const;

const maskedKey = "********";

const ShopSetting = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const formatTime = useUnixTime();
  const [tab, setTab] = useQueryState(PageTabQuery);

  const [values, setValues] = useState<Record<string, string> | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  const [withdrawals, setWithdrawals] = useState<ShopWithdrawal[] | undefined>();
  const [withdrawLoading, setWithdrawLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<ShopWithdrawal | undefined>();
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | "paid">("approve");
  const [reviewRemark, setReviewRemark] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | undefined>();

  const activeTab = tab === "withdraw" ? "withdraw" : tab === "refund" ? "refund" : "setting";

  const loadSetting = useCallback(() => {
    setLoading(true);
    setError(undefined);
    dispatch(getShopAdminSetting())
      .then((res) => setValues(res ?? {}))
      .catch((e) => setError(e instanceof AppError ? e.message : t("dashboard:shop.loadFailed")))
      .finally(() => setLoading(false));
  }, [dispatch, t]);

  const loadWithdrawals = useCallback(() => {
    setWithdrawLoading(true);
    dispatch(adminListWithdrawals({ limit: 100, offset: 0 }))
      .then((res) => setWithdrawals(res ?? []))
      .catch(() => setWithdrawals([]))
      .finally(() => setWithdrawLoading(false));
  }, [dispatch]);

  useEffect(() => {
    loadSetting();
    loadWithdrawals();
  }, [loadSetting, loadWithdrawals]);

  const patch = (key: string, value: string) => {
    setValues((prev) => ({ ...(prev ?? {}), [key]: value }));
    setSaved(false);
  };

  /**
   * 逐通道配置。存的是 JSON 数组；空值表示「所有通道共用上面的共享凭据」，
   * 此时三条通道都按启用展示，与后端实际行为一致。
   */
  const channelRows = useMemo<AdminChannelRow[]>(() => {
    const raw = (values?.[SettingKey.channels] ?? "").trim();
    let parsed: AdminChannelRow[] = [];
    if (raw.startsWith("[")) {
      try {
        parsed = JSON.parse(raw) as AdminChannelRow[];
      } catch {
        parsed = [];
      }
    }
    const byChannel = new Map(parsed.map((item) => [item.channel, item]));
    return ShopPayChannels.map((channel) => {
      const row = byChannel.get(channel);
      return {
        channel,
        api_url: row?.api_url ?? "",
        pid: row?.pid ?? "",
        key: row?.key ?? "",
        enabled: row ? Boolean(row.enabled) : raw === "",
      };
    });
  }, [values?.[SettingKey.channels]]);

  const patchChannel = (channel: string, next: Partial<AdminChannelRow>) => {
    const rows = channelRows.map((row) => (row.channel === channel ? { ...row, ...next } : row));
    patch(
      SettingKey.channels,
      JSON.stringify(
        rows.map((row) => ({
          channel: row.channel,
          api_url: row.api_url ?? "",
          pid: row.pid,
          key: row.key,
          enabled: row.enabled,
        })),
      ),
    );
  };

  const save = () => {
    if (!values) {
      return;
    }
    const basisPointKeys = [SettingKey.fee, SettingKey.referral, SettingKey.withdrawFee];
    for (const key of basisPointKeys) {
      const raw = values[key] ?? "";
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 0 || value > 10000) {
        setError(t("dashboard:shop.basisPointInvalid"));
        return;
      }
    }
    const minWithdraw = parseMoney(formatMoney(Number(values[SettingKey.minWithdraw] ?? "0")));
    if (Number.isNaN(minWithdraw)) {
      setError(t("dashboard:shop.minWithdrawInvalid"));
      return;
    }
    const ttl = Number(values[SettingKey.orderTTL] ?? "");
    if (!Number.isInteger(ttl) || ttl < 60 || ttl > 86400) {
      setError(t("dashboard:shop.ttlInvalid"));
      return;
    }
    const refundWindowDays = Number(values[SettingKey.refundWindowDays] ?? "");
    if (!Number.isInteger(refundWindowDays) || refundWindowDays < 0 || refundWindowDays > 3650) {
      setError(t("dashboard:shop.refundWindowInvalid"));
      return;
    }
    const depositAmount = parseMoney(formatMoney(Number(values[SettingKey.depositAmount] ?? "0")));
    if (Number.isNaN(depositAmount) || depositAmount < 0) {
      setError(t("dashboard:shop.depositInvalid"));
      return;
    }
    const settleDelayHours = Number(values[SettingKey.settleDelayHours] ?? "");
    if (!Number.isInteger(settleDelayHours) || settleDelayHours < 0 || settleDelayHours > 8760) {
      setError(t("dashboard:shop.settleDelayInvalid"));
      return;
    }
    const rateLimit = Number(values[SettingKey.rateLimit] ?? "");
    if (!Number.isInteger(rateLimit) || rateLimit < 0 || rateLimit > 100000) {
      setError(t("dashboard:shop.rateLimitInvalid"));
      return;
    }
    if (values[SettingKey.apiUrl] && !/^https?:\/\/.+/.test(values[SettingKey.apiUrl])) {
      setError(t("dashboard:shop.apiUrlInvalid"));
      return;
    }
    const payload: Record<string, string> = {
      ...values,
      [SettingKey.minWithdraw]: minWithdraw.toString(),
      [SettingKey.orderTTL]: ttl.toString(),
      [SettingKey.refundWindowDays]: refundWindowDays.toString(),
      [SettingKey.rateLimit]: rateLimit.toString(),
      [SettingKey.depositAmount]: depositAmount.toString(),
      [SettingKey.settleDelayHours]: settleDelayHours.toString(),
    };
    // 后端约定：key 为 ******** 表示不修改已保存的商户密钥。
    if (payload[SettingKey.key] === maskedKey) {
      delete payload[SettingKey.key];
    }

    setSaving(true);
    setError(undefined);
    dispatch(saveShopAdminSetting(payload))
      .then((res) => {
        setValues(res ?? payload);
        setSaved(true);
        enqueueSnackbar({
          message: t("dashboard:shop.saved"),
          variant: "success",
          action: DefaultCloseAction,
        });
      })
      .catch((e) => setError(e instanceof AppError ? e.message : t("dashboard:shop.saveFailed")))
      .finally(() => setSaving(false));
  };

  const submitReview = () => {
    if (!reviewTarget) {
      return;
    }
    setReviewing(true);
    setReviewError(undefined);
    dispatch(
      adminReviewWithdrawal(reviewTarget.id, {
        action: reviewAction,
        remark: reviewRemark.trim() || undefined,
      }),
    )
      .then((res) => {
        setWithdrawals((prev) => prev?.map((item) => (item.id === res.id ? res : item)));
        setReviewTarget(undefined);
        setReviewRemark("");
      })
      .catch((e) => setReviewError(e instanceof AppError ? e.message : t("dashboard:shop.reviewFailed")))
      .finally(() => setReviewing(false));
  };

  const pendingCount = (withdrawals ?? []).filter((item) => item.status === "pending").length;

  return (
    <PageContainer>
      <Container maxWidth="xl">
        <PageHeader
          title={t("dashboard:shop.title")}
          onRefresh={activeTab === "setting" ? loadSetting : activeTab === "withdraw" ? loadWithdrawals : loadSetting}
        />
        <Box sx={{ mb: 3 }}>
          <StyledTabs value={activeTab} onChange={(_e, value) => setTab(value)}>
            <StyledTab value={"setting"} label={t("dashboard:shop.tabs.setting")} />
            <StyledTab
              value={"withdraw"}
              label={
                pendingCount > 0
                  ? `${t("dashboard:shop.tabs.withdraw")} (${pendingCount})`
                  : t("dashboard:shop.tabs.withdraw")
              }
            />
            <StyledTab value={"refund"} label={t("dashboard:shop.tabs.refund")} />
          </StyledTabs>
        </Box>

        {error && (
          <Alert severity={"error"} sx={{ mb: 2, borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        {activeTab === "setting" && (
          <Box sx={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 2 }}>
            {values && (
              <>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={values[SettingKey.enabled] === "true"}
                      onChange={(e) => patch(SettingKey.enabled, e.target.checked ? "true" : "false")}
                    />
                  }
                  label={<Typography variant={"body1"}>{t("dashboard:shop.fields.enabled")}</Typography>}
                />
                <FilledTextField
                  variant={"filled"}
                  label={t("dashboard:shop.fields.apiUrl")}
                  value={values[SettingKey.apiUrl] ?? ""}
                  onChange={(e) => patch(SettingKey.apiUrl, e.target.value)}
                  helperText={t("dashboard:shop.fields.apiUrlHint")}
                />
                <FilledTextField
                  variant={"filled"}
                  label={t("dashboard:shop.fields.pid")}
                  value={values[SettingKey.pid] ?? ""}
                  onChange={(e) => patch(SettingKey.pid, e.target.value)}
                />
                <FilledTextField
                  variant={"filled"}
                  type={"password"}
                  label={t("dashboard:shop.fields.key")}
                  value={values[SettingKey.key] ?? ""}
                  onChange={(e) => patch(SettingKey.key, e.target.value)}
                  helperText={
                    values[SettingKey.key] === maskedKey
                      ? t("dashboard:shop.fields.keyConfigured")
                      : t("dashboard:shop.fields.keyHint")
                  }
                  autoComplete={"new-password"}
                />
                <Box>
                  <Typography variant={"body2"} color={"text.secondary"} sx={{ mb: 0.5 }}>
                    {t("dashboard:shop.fields.channels")}
                  </Typography>
                  <Typography variant={"caption"} color={"text.secondary"}>
                    {t("dashboard:shop.fields.channelsHint")}
                  </Typography>
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    {channelRows.map((row) => (
                      <Box
                        key={row.channel}
                        sx={{
                          border: "1px solid",
                          borderColor: row.enabled ? "primary.main" : "divider",
                          borderRadius: 2,
                          p: 1.5,
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", md: "auto 1.2fr 0.7fr 1fr" },
                          gap: 1.5,
                          alignItems: "center",
                        }}
                      >
                        <FormControlLabel
                          sx={{ m: 0 }}
                          control={
                            <Switch
                              size={"small"}
                              checked={row.enabled}
                              onChange={(e) => patchChannel(row.channel, { enabled: e.target.checked })}
                            />
                          }
                          label={<Typography variant={"body2"}>{t(`shop.channel.${row.channel}`)}</Typography>}
                        />
                        <DenseFilledTextField
                          label={t("dashboard:shop.fields.channelApiUrl")}
                          value={row.api_url ?? ""}
                          onChange={(e) => patchChannel(row.channel, { api_url: e.target.value })}
                          placeholder={values[SettingKey.apiUrl] || "https://pay.example.com"}
                          inputProps={{ maxLength: 1024 }}
                        />
                        <DenseFilledTextField
                          label={t("dashboard:shop.fields.channelPid")}
                          value={row.pid}
                          onChange={(e) => patchChannel(row.channel, { pid: e.target.value })}
                          placeholder={values[SettingKey.pid] ?? ""}
                          inputProps={{ maxLength: 64 }}
                        />
                        <DenseFilledTextField
                          label={t("dashboard:shop.fields.channelKey")}
                          type={"password"}
                          value={row.key}
                          onChange={(e) => patchChannel(row.channel, { key: e.target.value })}
                          placeholder={t("dashboard:shop.fields.channelInherit")}
                          inputProps={{ maxLength: 128 }}
                          autoComplete={"new-password"}
                        />
                      </Box>
                    ))}
                  </Stack>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
                  <DenseFilledTextField
                    label={t("dashboard:shop.fields.fee")}
                    value={values[SettingKey.fee] ?? ""}
                    onChange={(e) => patch(SettingKey.fee, e.target.value.replace(/[^\d]/g, ""))}
                    helperText={t("dashboard:shop.fields.basisPointHint", {
                      percent: ((Number(values[SettingKey.fee]) || 0) / 100).toFixed(2),
                    })}
                  />
                  <DenseFilledTextField
                    label={t("dashboard:shop.fields.referral")}
                    value={values[SettingKey.referral] ?? ""}
                    onChange={(e) => patch(SettingKey.referral, e.target.value.replace(/[^\d]/g, ""))}
                    helperText={t("dashboard:shop.fields.basisPointHint", {
                      percent: ((Number(values[SettingKey.referral]) || 0) / 100).toFixed(2),
                    })}
                  />
                  <DenseFilledTextField
                    label={t("dashboard:shop.fields.withdrawFee")}
                    value={values[SettingKey.withdrawFee] ?? ""}
                    onChange={(e) => patch(SettingKey.withdrawFee, e.target.value.replace(/[^\d]/g, ""))}
                    helperText={t("dashboard:shop.fields.basisPointHint", {
                      percent: ((Number(values[SettingKey.withdrawFee]) || 0) / 100).toFixed(2),
                    })}
                  />
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                  <DenseFilledTextField
                    label={t("dashboard:shop.fields.minWithdraw")}
                    value={formatMoney(Number(values[SettingKey.minWithdraw] ?? "0"))}
                    onChange={(e) => {
                      const cents = parseMoney(e.target.value);
                      patch(SettingKey.minWithdraw, Number.isNaN(cents) ? "0" : cents.toString());
                    }}
                    inputProps={{ inputMode: "decimal" }}
                    helperText={t("dashboard:shop.fields.minWithdrawHint")}
                  />
                  <DenseFilledTextField
                    label={t("dashboard:shop.fields.orderTTL")}
                    value={values[SettingKey.orderTTL] ?? ""}
                    onChange={(e) => patch(SettingKey.orderTTL, e.target.value.replace(/[^\d]/g, ""))}
                    inputProps={{ inputMode: "numeric" }}
                    helperText={t("dashboard:shop.fields.orderTTLHint")}
                  />
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                  <DenseFilledTextField
                    label={t("dashboard:shop.fields.depositAmount")}
                    value={formatMoney(Number(values[SettingKey.depositAmount] ?? "0"))}
                    onChange={(e) => {
                      const cents = parseMoney(e.target.value);
                      patch(SettingKey.depositAmount, Number.isNaN(cents) ? "0" : cents.toString());
                    }}
                    inputProps={{ inputMode: "decimal" }}
                    helperText={t("dashboard:shop.fields.depositAmountHint")}
                  />
                  <DenseFilledTextField
                    label={t("dashboard:shop.fields.settleDelayHours")}
                    value={values[SettingKey.settleDelayHours] ?? ""}
                    onChange={(e) => patch(SettingKey.settleDelayHours, e.target.value.replace(/[^\d]/g, ""))}
                    inputProps={{ inputMode: "numeric" }}
                    helperText={t("dashboard:shop.fields.settleDelayHoursHint")}
                  />
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                  <DenseFilledTextField
                    label={t("dashboard:shop.fields.refundWindowDays")}
                    value={values[SettingKey.refundWindowDays] ?? ""}
                    onChange={(e) => patch(SettingKey.refundWindowDays, e.target.value.replace(/[^\d]/g, ""))}
                    inputProps={{ inputMode: "numeric" }}
                    helperText={t("dashboard:shop.fields.refundWindowDaysHint")}
                  />
                  <DenseFilledTextField
                    label={t("dashboard:shop.fields.rateLimit")}
                    value={values[SettingKey.rateLimit] ?? ""}
                    onChange={(e) => patch(SettingKey.rateLimit, e.target.value.replace(/[^\d]/g, ""))}
                    inputProps={{ inputMode: "numeric" }}
                    helperText={t("dashboard:shop.fields.rateLimitHint")}
                  />
                </Box>
                <FilledTextField
                  variant={"filled"}
                  label={t("dashboard:shop.fields.siteUrl")}
                  value={values[SettingKey.siteURL] ?? ""}
                  onChange={(e) => patch(SettingKey.siteURL, e.target.value)}
                  helperText={t("dashboard:shop.fields.siteUrlHint")}
                />
                <Stack direction={"row"} spacing={1} alignItems={"center"}>
                  <Button variant={"contained"} onClick={save} disabled={saving || loading}>
                    {t("dashboard:shop.save")}
                  </Button>
                  {saved && (
                    <Typography variant={"caption"} color={"success.main"}>
                      {t("dashboard:shop.saved")}
                    </Typography>
                  )}
                </Stack>
              </>
            )}
            {loading && !values && (
              <Typography variant={"body2"} color={"text.secondary"}>
                {t("dashboard:shop.loading")}
              </Typography>
            )}
          </Box>
        )}

        {activeTab === "refund" && <ShopRefundsPanel variant={"admin"} />}

        {activeTab === "withdraw" && (
          <Box>
            {withdrawals && withdrawals.length === 0 && !withdrawLoading ? (
              <ShopEmpty title={t("dashboard:shop.noWithdraw")} />
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
                <Table size={"small"} sx={{ minWidth: 900 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell width={120} align={"right"}>
                        {t("shop.manage.finance.fields.amount")}
                      </TableCell>
                      <TableCell width={120} align={"right"}>
                        {t("shop.manage.finance.fields.actual")}
                      </TableCell>
                      <TableCell>{t("shop.manage.finance.fields.payee")}</TableCell>
                      <TableCell width={110}>{t("shop.manage.finance.fields.status")}</TableCell>
                      <TableCell width={160}>{t("shop.manage.finance.fields.time")}</TableCell>
                      <TableCell width={280} align={"right"}>
                        {t("shop.manage.marketing.fields.actions")}
                      </TableCell>
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
                        <TableCell align={"right"}>
                          <Stack direction={"row"} spacing={0.5} justifyContent={"flex-end"} sx={{ flexWrap: "wrap" }}>
                            {row.status === "pending" && (
                              <>
                                <Button
                                  size={"small"}
                                  onClick={() => {
                                    setReviewTarget(row);
                                    setReviewAction("approve");
                                    setReviewRemark("");
                                    setReviewError(undefined);
                                  }}
                                >
                                  {t("dashboard:shop.actions.approve")}
                                </Button>
                                <Button
                                  size={"small"}
                                  color={"error"}
                                  onClick={() => {
                                    setReviewTarget(row);
                                    setReviewAction("reject");
                                    setReviewRemark("");
                                    setReviewError(undefined);
                                  }}
                                >
                                  {t("dashboard:shop.actions.reject")}
                                </Button>
                              </>
                            )}
                            {row.status === "approved" && (
                              <Button
                                size={"small"}
                                variant={"contained"}
                                onClick={() => {
                                  setReviewTarget(row);
                                  setReviewAction("paid");
                                  setReviewRemark("");
                                  setReviewError(undefined);
                                }}
                              >
                                {t("dashboard:shop.actions.markPaid")}
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        )}

        <Dialog
          open={!!reviewTarget}
          onClose={() => !reviewing && setReviewTarget(undefined)}
          fullWidth
          maxWidth={"xs"}
        >
          <DialogTitle>{t(`dashboard:shop.actions.${reviewAction}`)}</DialogTitle>
          <DialogContent>
            {reviewTarget && (
              <>
                <Typography variant={"body2"} color={"text.secondary"} sx={{ mb: 1 }}>
                  {t("dashboard:shop.reviewSummary", {
                    amount: displayMoney(reviewTarget.amount),
                    payee: `${reviewTarget.account.name} · ${reviewTarget.account.account}`,
                  })}
                </Typography>
                <DenseFilledTextField
                  fullWidth
                  label={t("dashboard:shop.remark")}
                  value={reviewRemark}
                  onChange={(e) => setReviewRemark(e.target.value)}
                  inputProps={{ maxLength: 200 }}
                  helperText={t("dashboard:shop.remarkHint")}
                />
              </>
            )}
            {reviewError && (
              <Alert severity={"error"} sx={{ mt: 2, borderRadius: 3 }}>
                {reviewError}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setReviewTarget(undefined)} disabled={reviewing}>
              {t("shop.checkout.cancel")}
            </Button>
            <Button variant={"contained"} onClick={submitReview} disabled={reviewing}>
              {t("dashboard:shop.confirm")}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </PageContainer>
  );
};

export default ShopSetting;
