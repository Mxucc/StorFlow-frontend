import * as React from "react";
import { Alert, Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppError } from "../../../api/request.ts";
import { displayMoney } from "../../../api/shop.ts";
import { notifyVASPointsUpdated, redeemGiftCode, VASGiftCodeReward, VASWallet } from "../../../api/vas.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import { DenseFilledTextField } from "../../Common/StyledComponents.tsx";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar.tsx";
import { productTypeLabel } from "./utils.ts";

interface StoreGiftCodeProps {
  /** 钱包余额与最近流水：卡密兑换会直接改变余额，所以在这张卡片上展示。 */
  wallet?: VASWallet;
  onRedeemed: () => void;
}

/**
 * 卡密充值：输入卡密兑换余额（也可以兑换积分 / 容量 / 会员码），
 * 兑换成功后展示到账内容与兑换后的余额。
 */
const StoreGiftCode = ({ wallet, onRedeemed }: StoreGiftCodeProps) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [reward, setReward] = useState<VASGiftCodeReward | undefined>();

  const submit = () => {
    const value = code.trim();
    if (!value) {
      return;
    }
    setSubmitting(true);
    setError(undefined);
    setReward(undefined);
    dispatch(redeemGiftCode(value))
      .then((res) => {
        if (!res) {
          return;
        }
        setReward(res);
        setCode("");
        enqueueSnackbar({
          message: t("store.giftcode.success"),
          variant: "success",
          action: DefaultCloseAction,
        });
        onRedeemed();
        notifyVASPointsUpdated();
      })
      .catch((e) => setError(e instanceof AppError ? e.message : t("store.giftcode.failed")))
      .finally(() => setSubmitting(false));
  };

  const history = (wallet?.history ?? []).slice(0, 10);

  return (
    <Box sx={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 3 }}>
      <Box
        sx={{
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          p: 2,
        }}
      >
        <Typography variant={"caption"} color={"text.secondary"}>
          {t("store.wallet.balance")}
        </Typography>
        <Typography variant={"h5"} sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          {displayMoney(wallet?.balance ?? 0)}
        </Typography>
        <Typography variant={"caption"} color={"text.secondary"}>
          {t("store.wallet.hint")}
        </Typography>
      </Box>

      <Box>
        <Typography variant={"h6"} sx={{ fontWeight: 600, mb: 1 }}>
          {t("store.giftcode.title")}
        </Typography>
        <Typography variant={"body2"} color={"text.secondary"} sx={{ mb: 2 }}>
          {t("store.giftcode.hint")}
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "flex-start" }}>
          <DenseFilledTextField
            fullWidth
            label={t("store.giftcode.code")}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submit();
              }
            }}
            inputProps={{ maxLength: 64 }}
          />
          <Button variant={"contained"} onClick={submit} disabled={submitting || code.trim() === ""}>
            {t("store.giftcode.redeem")}
          </Button>
        </Stack>

        {reward && (
          <Alert severity={"success"} sx={{ mt: 2, borderRadius: 3 }}>
            {reward.product_type === "balance"
              ? t("store.giftcode.balanceReward", {
                  amount: displayMoney(reward.amount ?? 0),
                  balance: displayMoney(reward.balance ?? 0),
                })
              : t("store.giftcode.reward", {
                  type: productTypeLabel(reward.product_type, t),
                  num: reward.num,
                })}
          </Alert>
        )}

        {error && (
          <Alert severity={"error"} sx={{ mt: 2, borderRadius: 3 }}>
            {error}
          </Alert>
        )}
      </Box>

      <Box>
        <Typography variant={"subtitle1"} sx={{ fontWeight: 600, mb: 1 }}>
          {t("store.wallet.history")}
        </Typography>
        {history.length === 0 ? (
          <Typography variant={"body2"} color={"text.secondary"}>
            {t("store.wallet.noHistory")}
          </Typography>
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
                  <TableCell width={120}>{t("store.wallet.fields.reason")}</TableCell>
                  <TableCell width={120} align={"right"}>
                    {t("store.wallet.fields.delta")}
                  </TableCell>
                  <TableCell width={120} align={"right"}>
                    {t("store.wallet.fields.balance")}
                  </TableCell>
                  <TableCell>{t("store.wallet.fields.note")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((row, index) => (
                  <TableRow key={`${row.created_at}-${index}`} hover>
                    <TableCell>
                      <Typography variant={"caption"}>
                        {t(`store.wallet.reason.${row.reason}`, { defaultValue: row.reason })}
                      </Typography>
                    </TableCell>
                    <TableCell align={"right"}>
                      <Typography
                        variant={"body2"}
                        sx={{
                          fontVariantNumeric: "tabular-nums",
                          color: row.delta < 0 ? "text.secondary" : "success.main",
                        }}
                      >
                        {row.delta > 0 ? "+" : ""}
                        {displayMoney(row.delta)}
                      </Typography>
                    </TableCell>
                    <TableCell align={"right"}>
                      <Typography variant={"body2"} sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {displayMoney(row.balance_after)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 0 }}>
                      <Typography variant={"caption"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
                        {row.note || row.ref || "—"}
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
  );
};

export default StoreGiftCode;
