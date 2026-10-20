import { Alert, Box, Button, FormControlLabel, Radio, RadioGroup, Stack, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppError } from "../../../../api/request.ts";
import {
  createShopDepositOrder,
  displayMoney,
  getShopPaymentSetting,
  saveShopPaymentSetting,
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

/**
 * 支付设置。
 *
 * - 平台聚合支付：货款由平台代收，订单完成 + 管理员配置的解冻时长后才可提现，
 *   并且要达到最低提现金额；
 * - 自配支付渠道：商家填自己的易支付地址 / 商户 ID / 密钥，买家直接付给商家，
 *   平台只负责记录订单与交付内容（不计余额、不收手续费、不发返利），
 *   退款由商家线下完成、平台核验凭证。
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

  const save = () => {
    setFormError(undefined);
    if (payMode === "custom") {
      if (!apiUrl.trim() || !pid.trim() || !key.trim()) {
        setFormError(t("shop.manage.payment.customIncomplete"));
        return;
      }
      if (!/^https?:\/\/.+/.test(apiUrl.trim())) {
        setFormError(t("shop.manage.payment.apiUrlInvalid"));
        return;
      }
    }

    setSaving(true);
    dispatch(
      saveShopPaymentSetting({
        pay_mode: payMode,
        epay_api_url: apiUrl.trim(),
        epay_pid: pid.trim(),
        // 哨兵值表示不改动已保存的密钥。
        epay_key: key === maskedKey ? maskedKey : key.trim(),
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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 760 }}>
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
