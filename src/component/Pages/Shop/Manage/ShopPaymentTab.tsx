import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppError } from "../../../../api/request.ts";
import {
  createShopDepositOrder,
  displayMoney,
  getShopPaymentSetting,
  saveShopPaymentSetting,
  ShopChannelConfigRequest,
  ShopPayChannel,
  ShopPayChannels,
  ShopPayMode,
  ShopPaymentSetting,
} from "../../../../api/shop.ts";
import { useAppDispatch } from "../../../../redux/hooks.ts";
import { DenseFilledTextField } from "../../../Common/StyledComponents.tsx";
import { DefaultCloseAction } from "../../../Common/Snackbar/snackbar.tsx";

/** 后端用该哨兵值表示「保持已保存的商户密钥不变」。 */
const maskedKey = "********";

const cardSx = {
  bgcolor: "background.paper",
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 3,
  p: 2,
} as const;

/** 一行通道的编辑态。key 为空表示沿用已保存的值，maskedKey 表示不改动。 */
interface ChannelRow {
  channel: ShopPayChannel;
  apiUrl: string;
  pid: string;
  key: string;
  enabled: boolean;
  keySet: boolean;
}

const emptyRows = (): ChannelRow[] =>
  ShopPayChannels.map((channel) => ({ channel, apiUrl: "", pid: "", key: "", enabled: false, keySet: false }));

/**
 * 支付设置。
 *
 * - 平台聚合支付：货款由平台代收，订单完成 + 管理员配置的解冻时长后才可提现，
 *   并且要达到最低提现金额；
 * - 自配支付渠道：商家填自己的易支付配置。易支付服务商通常按通道给出不同的
 *   收银台地址与商户号（有的通道干脆没开），所以这里是**逐通道**配置：
 *   每个通道可以单独填地址 / 商户号 / 密钥，留空则沿用上面的共享凭据。
 */
const ShopPaymentTab = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const [setting, setSetting] = useState<ShopPaymentSetting | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const [payMode, setPayMode] = useState<ShopPayMode>("platform");
  const [apiUrl, setApiUrl] = useState("");
  const [pid, setPid] = useState("");
  const [key, setKey] = useState("");
  const [rows, setRows] = useState<ChannelRow[]>(emptyRows);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [depositing, setDepositing] = useState(false);

  const apply = useCallback((res: ShopPaymentSetting) => {
    setSetting(res);
    setPayMode(res.pay_mode);
    setApiUrl(res.epay_api_url ?? "");
    setPid(res.epay_pid ?? "");
    // 已保存的密钥只回显哨兵值，用户不修改就原样提交。
    setKey(res.epay_key_set ? maskedKey : "");

    const byChannel = new Map((res.channel_configs ?? []).map((item) => [item.channel, item]));
    setRows(
      ShopPayChannels.map((channel) => {
        const row = byChannel.get(channel);
        return {
          channel,
          apiUrl: row?.api_url ?? "",
          pid: row?.pid ?? "",
          key: row?.key_set ? maskedKey : "",
          enabled: row?.enabled ?? false,
          keySet: row?.key_set ?? false,
        };
      }),
    );
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    dispatch(getShopPaymentSetting())
      .then((res) => apply(res))
      .catch((e) => setError(e instanceof AppError ? e.message : t("shop.manage.payment.loadFailed")))
      .finally(() => setLoading(false));
  }, [apply, dispatch, t]);

  useEffect(() => {
    load();
  }, [load]);

  const patchRow = (channel: ShopPayChannel, patch: Partial<ChannelRow>) => {
    setRows((prev) => prev.map((row) => (row.channel === channel ? { ...row, ...patch } : row)));
  };

  /** 通道是否配齐：自己的字段优先，留空则用共享凭据。 */
  const readyRows = useMemo(
    () =>
      rows.filter((row) => {
        const url = row.apiUrl.trim() || apiUrl.trim();
        const merchant = row.pid.trim() || pid.trim();
        const secret = row.key.trim() && row.key !== maskedKey ? row.key.trim() : row.keySet || key.trim();
        return row.enabled && url !== "" && merchant !== "" && Boolean(secret);
      }),
    [rows, apiUrl, pid, key],
  );

  const save = () => {
    setFormError(undefined);
    if (payMode === "custom") {
      if (apiUrl.trim() && !/^https?:\/\/.+/.test(apiUrl.trim())) {
        setFormError(t("shop.manage.payment.apiUrlInvalid"));
        return;
      }
      for (const row of rows) {
        if (row.apiUrl.trim() && !/^https?:\/\/.+/.test(row.apiUrl.trim())) {
          setFormError(t("shop.manage.payment.apiUrlInvalid"));
          return;
        }
      }
      if (readyRows.length === 0) {
        setFormError(t("shop.manage.payment.channelsIncomplete"));
        return;
      }
    }

    const channels: ShopChannelConfigRequest[] = rows.map((row) => ({
      channel: row.channel,
      api_url: row.apiUrl.trim(),
      pid: row.pid.trim(),
      // 哨兵值表示沿用该通道已保存的密钥。
      key: row.key.trim(),
      enabled: row.enabled,
    }));

    setSaving(true);
    dispatch(
      saveShopPaymentSetting({
        pay_mode: payMode,
        epay_api_url: apiUrl.trim(),
        epay_pid: pid.trim(),
        // 哨兵值表示不改动已保存的密钥。
        epay_key: key === maskedKey ? maskedKey : key.trim(),
        epay_channels: channels,
      }),
    )
      .then((res) => {
        apply(res);
        enqueueSnackbar({
          message: t("shop.manage.payment.saved"),
          variant: "success",
          action: DefaultCloseAction,
        });
      })
      .catch((e) => setFormError(e instanceof AppError ? e.message : t("shop.manage.payment.saveFailed")))
      .finally(() => setSaving(false));
  };

  const payDeposit = () => {
    setDepositing(true);
    setFormError(undefined);
    dispatch(createShopDepositOrder())
      .then((order) => {
        if (order.pay_url) {
          // 收银台是易支付托管的页面，整页跳转才能带上表单。
          window.location.assign(order.pay_url);
          return;
        }
        setFormError(t("shop.manage.payment.depositNoGateway"));
      })
      .catch((e) => setFormError(e instanceof AppError ? e.message : t("shop.manage.payment.depositFailed")))
      .finally(() => setDepositing(false));
  };

  if (loading && !setting) {
    return (
      <Typography variant={"body2"} color={"text.secondary"}>
        {t("shop.manage.loading")}
      </Typography>
    );
  }

  if (error && !setting) {
    return (
      <Box>
        <Alert severity={"error"} sx={{ borderRadius: 3 }}>
          {error}
        </Alert>
        <Button sx={{ mt: 2 }} variant={"outlined"} onClick={load}>
          {t("shop.store.retry")}
        </Button>
      </Box>
    );
  }

  const depositDue = setting?.deposit_due ?? 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 860 }}>
      {depositDue > 0 && (
        <Alert
          severity={"warning"}
          sx={{ borderRadius: 3 }}
          action={
            <Button color={"inherit"} size={"small"} disabled={depositing} onClick={payDeposit}>
              {t("shop.manage.payment.depositPay")}
            </Button>
          }
        >
          {t("shop.manage.payment.depositDue", { amount: displayMoney(depositDue) })}
        </Alert>
      )}

      <Box sx={cardSx}>
        <Typography variant={"subtitle1"} sx={{ fontWeight: 600 }}>
          {t("shop.manage.payment.title")}
        </Typography>
        <Typography variant={"caption"} color={"text.secondary"}>
          {t("shop.manage.payment.description")}
        </Typography>

        <RadioGroup value={payMode} onChange={(e) => setPayMode(e.target.value as ShopPayMode)} sx={{ mt: 1.5 }}>
          <FormControlLabel
            value={"platform"}
            control={<Radio size={"small"} />}
            label={
              <Box>
                <Typography variant={"body2"} sx={{ fontWeight: 600 }}>
                  {t("shop.manage.payment.modes.platform")}
                </Typography>
                <Typography variant={"caption"} color={"text.secondary"}>
                  {t("shop.manage.payment.modes.platformHint", {
                    hours: setting?.settle_delay_hours ?? 0,
                  })}
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            value={"custom"}
            control={<Radio size={"small"} />}
            label={
              <Box>
                <Typography variant={"body2"} sx={{ fontWeight: 600 }}>
                  {t("shop.manage.payment.modes.custom")}
                </Typography>
                <Typography variant={"caption"} color={"text.secondary"}>
                  {t("shop.manage.payment.modes.customHint")}
                </Typography>
              </Box>
            }
          />
        </RadioGroup>

        {setting && !setting.platform_ready && (
          <Alert severity={"info"} sx={{ mt: 1, borderRadius: 3 }}>
            {t("shop.manage.payment.platformNotReady")}
          </Alert>
        )}

        {payMode === "custom" && (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box>
              <Typography variant={"subtitle2"} sx={{ fontWeight: 600 }}>
                {t("shop.manage.payment.sharedTitle")}
              </Typography>
              <Typography variant={"caption"} color={"text.secondary"}>
                {t("shop.manage.payment.sharedHint")}
              </Typography>
            </Box>
            <DenseFilledTextField
              label={t("shop.manage.payment.apiUrl")}
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder={"https://pay.example.com"}
              helperText={t("shop.manage.payment.apiUrlHint")}
            />
            <DenseFilledTextField
              label={t("shop.manage.payment.pid")}
              value={pid}
              onChange={(e) => setPid(e.target.value)}
              inputProps={{ maxLength: 64 }}
              helperText={t("shop.manage.payment.pidHint")}
            />
            <DenseFilledTextField
              label={t("shop.manage.payment.key")}
              type={"password"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              inputProps={{ maxLength: 128 }}
              autoComplete={"new-password"}
              helperText={key === maskedKey ? t("shop.manage.payment.keyConfigured") : t("shop.manage.payment.keyHint")}
            />

            <Box>
              <Typography variant={"subtitle2"} sx={{ fontWeight: 600 }}>
                {t("shop.manage.payment.channelTable")}
              </Typography>
              <Typography variant={"caption"} color={"text.secondary"}>
                {t("shop.manage.payment.channelTableHint")}
              </Typography>
            </Box>

            <Stack spacing={1.5}>
              {rows.map((row) => (
                <Box
                  key={row.channel}
                  sx={{
                    border: "1px solid",
                    borderColor: row.enabled ? "primary.main" : "divider",
                    borderRadius: 3,
                    p: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                  }}
                >
                  <Stack direction={"row"} spacing={1} alignItems={"center"}>
                    <FormControlLabel
                      sx={{ m: 0, flexGrow: 1 }}
                      control={
                        <Switch
                          size={"small"}
                          checked={row.enabled}
                          onChange={(e) => patchRow(row.channel, { enabled: e.target.checked })}
                        />
                      }
                      label={<Typography variant={"body2"}>{t(`shop.channel.${row.channel}`)}</Typography>}
                    />
                    <Chip
                      size={"small"}
                      color={row.enabled ? "success" : "default"}
                      variant={"outlined"}
                      label={
                        row.enabled ? t("shop.manage.payment.channelReady") : t("shop.manage.payment.channelDisabled")
                      }
                    />
                  </Stack>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1.2fr 0.8fr 1fr" },
                      gap: 1.5,
                    }}
                  >
                    <DenseFilledTextField
                      label={t("shop.manage.payment.channelApiUrl")}
                      value={row.apiUrl}
                      onChange={(e) => patchRow(row.channel, { apiUrl: e.target.value })}
                      placeholder={apiUrl || "https://pay.example.com"}
                      inputProps={{ maxLength: 1024 }}
                    />
                    <DenseFilledTextField
                      label={t("shop.manage.payment.channelPid")}
                      value={row.pid}
                      onChange={(e) => patchRow(row.channel, { pid: e.target.value })}
                      placeholder={pid}
                      inputProps={{ maxLength: 64 }}
                    />
                    <DenseFilledTextField
                      label={t("shop.manage.payment.channelKey")}
                      type={"password"}
                      value={row.key}
                      onChange={(e) => patchRow(row.channel, { key: e.target.value })}
                      placeholder={
                        row.keySet || key === maskedKey
                          ? t("shop.manage.payment.keyConfigured")
                          : t("shop.manage.payment.channelInherit")
                      }
                      inputProps={{ maxLength: 128 }}
                      autoComplete={"new-password"}
                    />
                  </Box>
                  <Typography variant={"caption"} color={"text.secondary"}>
                    {t("shop.manage.payment.channelInheritHint")}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <Alert severity={"warning"} variant={"outlined"} sx={{ borderRadius: 3 }}>
              {t("shop.manage.payment.customRefundNotice")}
            </Alert>
          </Stack>
        )}

        {formError && (
          <Alert severity={"error"} sx={{ mt: 2, borderRadius: 3 }}>
            {formError}
          </Alert>
        )}

        <Stack direction={"row"} spacing={1} sx={{ mt: 2 }}>
          <Button variant={"contained"} onClick={save} disabled={saving}>
            {t("shop.manage.payment.save")}
          </Button>
        </Stack>
      </Box>

      <Box sx={cardSx}>
        <Typography variant={"subtitle1"} sx={{ fontWeight: 600 }}>
          {t("shop.manage.payment.depositTitle")}
        </Typography>
        <Typography variant={"caption"} color={"text.secondary"}>
          {t("shop.manage.payment.depositHint")}
        </Typography>
        <Stack direction={"row"} spacing={3} sx={{ mt: 1.5, flexWrap: "wrap" }}>
          <Box>
            <Typography variant={"caption"} color={"text.secondary"}>
              {t("shop.manage.payment.depositAmount")}
            </Typography>
            <Typography variant={"body1"} sx={{ fontWeight: 600 }}>
              {displayMoney(setting?.deposit_amount ?? 0)}
            </Typography>
          </Box>
          <Box>
            <Typography variant={"caption"} color={"text.secondary"}>
              {t("shop.manage.payment.depositPaid")}
            </Typography>
            <Typography variant={"body1"} sx={{ fontWeight: 600 }}>
              {displayMoney(setting?.deposit_paid ?? 0)}
            </Typography>
          </Box>
          <Box>
            <Typography variant={"caption"} color={"text.secondary"}>
              {t("shop.manage.payment.depositOutstanding")}
            </Typography>
            <Typography
              variant={"body1"}
              sx={{ fontWeight: 600, color: depositDue > 0 ? "warning.main" : "success.main" }}
            >
              {displayMoney(depositDue)}
            </Typography>
          </Box>
        </Stack>
        {depositDue > 0 && (
          <Button sx={{ mt: 2 }} variant={"contained"} onClick={payDeposit} disabled={depositing}>
            {t("shop.manage.payment.depositPay")}
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default ShopPaymentTab;
