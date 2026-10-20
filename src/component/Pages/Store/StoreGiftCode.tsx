import * as React from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppError } from "../../../api/request.ts";
import { notifyVASPointsUpdated, redeemGiftCode, VASGiftCodeReward } from "../../../api/vas.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import { DenseFilledTextField } from "../../Common/StyledComponents.tsx";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar.tsx";
import { productTypeLabel } from "./utils.ts";

interface StoreGiftCodeProps {
  onRedeemed: () => void;
}

/** 兑换码：兑换成功后按商品类型展示到账内容。 */
const StoreGiftCode = ({ onRedeemed }: StoreGiftCodeProps) => {
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

  return (
    <Box sx={{ maxWidth: 520 }}>
      <Typography variant={"h6"} sx={{ fontWeight: 600, mb: 1 }}>
        {t("store.giftcode.title")}
      </Typography>
      <Typography variant={"body2"} color={"text.secondary"} sx={{ mb: 3 }}>
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
          {t("store.giftcode.reward", {
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
  );
};

export default StoreGiftCode;
