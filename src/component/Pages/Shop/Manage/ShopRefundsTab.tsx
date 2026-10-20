import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppError } from "../../../../api/request.ts";
import {
  adminListRefunds,
  adminReviewShopRefund,
  listShopRefunds,
  reviewShopRefund,
  ShopRefundReviewService,
  ShopRefundView,
} from "../../../../api/shop.ts";
import { useAppDispatch } from "../../../../redux/hooks.ts";
import { DenseFilledTextField, SecondaryButton } from "../../../Common/StyledComponents.tsx";
import { DefaultCloseAction } from "../../../Common/Snackbar/snackbar.tsx";
import ArrowClockwise from "../../../Icons/ArrowClockwise.tsx";
import { Money, RefundStatusChip, ShopEmpty, useUnixTime } from "../ShopShared.tsx";

export type RefundPanelVariant = "seller" | "admin";

interface ReviewDialogState {
  refund: ShopRefundView;
  action: "approve" | "reject" | "evidence" | "confirm" | "return";
}

/**
 * 退款审批面板，卖家控制台与后台共用。
 *
 * - `seller`：`GET /shop/refund/received` + `POST /shop/refund/:id`
 * - `admin`：`GET /shop/admin/refund` + `POST /shop/admin/refund/:id`，并显示所属店铺
 *
 * 平台聚合支付的退款：通过后立刻让买家权益失效（门禁生效）、卖家余额扣回。
 * 自配支付渠道的退款：真实退款由商家线下完成，商家通过后提交退款凭证，平台再核验。
 */
const ShopRefundsPanel = ({ variant, onReviewed }: { variant: RefundPanelVariant; onReviewed?: () => void }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const formatTime = useUnixTime();
  const isAdmin = variant === "admin";

  const [refunds, setRefunds] = useState<ShopRefundView[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const [dialog, setDialog] = useState<ReviewDialogState | undefined>();
  const [remark, setRemark] = useState("");
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | undefined>();

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    const request = isAdmin ? adminListRefunds({ limit: 100, offset: 0 }) : listShopRefunds({ limit: 100, offset: 0 });
    dispatch(request)
      .then((res) => setRefunds(res ?? []))
      .catch((e) => {
        setRefunds([]);
        setError(e instanceof AppError ? e.message : t("shop.manage.refunds.loadFailed"));
      })
      .finally(() => setLoading(false));
  }, [dispatch, isAdmin, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openReview = (refund: ShopRefundView, action: ReviewDialogState["action"]) => {
    setDialog({ refund, action });
    setRemark("");
    setEvidence("");
    setDialogError(undefined);
  };

  const submitReview = () => {
    if (!dialog) {
      return;
    }
    const action = dialog.action;
    const payload: ShopRefundReviewService = {
      action,
      remark: remark.trim() || undefined,
      evidence: evidence.trim() || undefined,
    };
    setSubmitting(true);
    setDialogError(undefined);
    dispatch(isAdmin ? adminReviewShopRefund(dialog.refund.id, payload) : reviewShopRefund(dialog.refund.id, payload))
      .then(() => {
        setDialog(undefined);
        enqueueSnackbar({
          message: t(`shop.manage.refunds.done.${action}`),
          variant: "success",
          action: DefaultCloseAction,
        });
        load();
        onReviewed?.();
      })
      .catch((e) => setDialogError(e instanceof AppError ? e.message : t("shop.manage.refunds.reviewFailed")))
      .finally(() => setSubmitting(false));
  };

  const pendingCount = (refunds ?? []).filter((item) => item.status === "pending").length;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <Typography variant={"body2"} color={"text.secondary"} sx={{ flexGrow: 1 }}>
          {isAdmin ? t("dashboard:shop.refunds.hint") : t("shop.manage.refunds.hint")}
        </Typography>
        <SecondaryButton
          variant={"outlined"}
          size={"small"}
          startIcon={<ArrowClockwise sx={{ fontSize: 16 }} />}
          onClick={load}
          disabled={loading}
        >
          {t("shop.manage.refresh")}
        </SecondaryButton>
      </Box>

      {pendingCount > 0 && (
        <Alert severity={"warning"} variant={"outlined"} sx={{ mb: 2, borderRadius: 3 }}>
          {t("shop.manage.refunds.pendingNotice", { count: pendingCount })}
        </Alert>
      )}

      {error && (
        <Alert severity={"error"} sx={{ mb: 2, borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      {refunds && refunds.length === 0 && !loading ? (
        <ShopEmpty title={t("shop.manage.refunds.empty")} description={t("shop.manage.refunds.emptyHint")} />
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
          <Table size={"small"} sx={{ minWidth: isAdmin ? 1060 : 940 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t("shop.manage.refunds.fields.title")}</TableCell>
                <TableCell width={150}>{t("shop.manage.refunds.fields.buyer")}</TableCell>
                {isAdmin && <TableCell width={170}>{t("dashboard:shop.refunds.shop")}</TableCell>}
                <TableCell width={110} align={"right"}>
                  {t("shop.manage.refunds.fields.amount")}
                </TableCell>
                <TableCell>{t("shop.manage.refunds.fields.reason")}</TableCell>
                <TableCell width={130}>{t("shop.manage.refunds.fields.status")}</TableCell>
                <TableCell width={170}>{t("shop.manage.refunds.fields.time")}</TableCell>
                <TableCell width={210} align={"right"}>
                  {t("shop.manage.refunds.fields.actions")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {refunds?.map((refund) => {
                const canReview = refund.status === "pending";
                // 自配渠道的退款由商家线下完成：通过后商家提交凭证，平台再核验。
                const canSubmitEvidence = refund.status === "approved" && refund.pay_mode === "custom" && !isAdmin;
                const canVerify = refund.status === "refunded" && isAdmin;
                const isIdle = !canReview && !canSubmitEvidence && !canVerify;

                return (
                  <TableRow key={refund.id} hover>
                    <TableCell sx={{ maxWidth: 0 }}>
                      <Typography variant={"body2"} sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                        {refund.title || "—"}
                      </Typography>
                      <Typography variant={"caption"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
                        {refund.order_no}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 0 }}>
                      <Typography variant={"body2"} sx={{ overflowWrap: "anywhere" }}>
                        {refund.buyer_nickname || refund.uid}
                      </Typography>
                    </TableCell>
                    {isAdmin && (
                      <TableCell sx={{ maxWidth: 0 }}>
                        <Typography variant={"caption"} sx={{ fontFamily: "monospace", overflowWrap: "anywhere" }}>
                          {refund.shop_id || "—"}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell align={"right"}>
                      <Money cents={refund.amount} bold />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 0 }}>
                      <Typography variant={"body2"} sx={{ overflowWrap: "anywhere" }}>
                        {refund.reason || t("shop.manage.refunds.noReason")}
                      </Typography>
                      {refund.remark && (
                        <Typography
                          variant={"caption"}
                          color={refund.status === "rejected" ? "error.main" : "text.secondary"}
                          sx={{ overflowWrap: "anywhere" }}
                        >
                          {t("shop.refund.remarkLabel")}: {refund.remark}
                        </Typography>
                      )}
                      {refund.evidence && (
                        <Typography variant={"caption"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
                          {t("shop.manage.refunds.evidenceLabel")}: {refund.evidence}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <RefundStatusChip status={refund.status} />
                    </TableCell>
                    <TableCell>
                      <Typography variant={"caption"} color={"text.secondary"}>
                        {formatTime(refund.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align={"right"}>
                      <Stack direction={"row"} spacing={0.5} justifyContent={"flex-end"} sx={{ flexWrap: "wrap" }}>
                        {canReview && (
                          <>
                            <Button size={"small"} onClick={() => openReview(refund, "approve")}>
                              {t("shop.manage.refunds.approve")}
                            </Button>
                            <Button size={"small"} color={"error"} onClick={() => openReview(refund, "reject")}>
                              {t("shop.manage.refunds.reject")}
                            </Button>
                          </>
                        )}
                        {canSubmitEvidence && (
                          <Button size={"small"} variant={"outlined"} onClick={() => openReview(refund, "evidence")}>
                            {t("shop.manage.refunds.submitEvidence")}
                          </Button>
                        )}
                        {canVerify && (
                          <>
                            <Button size={"small"} variant={"contained"} onClick={() => openReview(refund, "confirm")}>
                              {t("shop.manage.refunds.confirmEvidence")}
                            </Button>
                            <Button size={"small"} color={"error"} onClick={() => openReview(refund, "return")}>
                              {t("shop.manage.refunds.returnEvidence")}
                            </Button>
                          </>
                        )}
                        {isIdle && (
                          <Typography variant={"caption"} color={"text.secondary"}>
                            {t("shop.manage.refunds.reviewedAt")} {formatTime(refund.updated_at)}
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

      <Dialog open={!!dialog} onClose={() => !submitting && setDialog(undefined)} fullWidth maxWidth={"xs"}>
        <DialogTitle>{dialog ? t(`shop.manage.refunds.actions.${dialog.action}`) : ""}</DialogTitle>
        <DialogContent>
          {dialog && (
            <>
              <Typography variant={"body2"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
                {t("shop.manage.refunds.dialogSummary", {
                  title: dialog.refund.title || dialog.refund.order_no,
                  amount: `¥${((dialog.refund.amount ?? 0) / 100).toFixed(2)}`,
                })}
              </Typography>
              <Alert
                severity={dialog.action === "reject" || dialog.action === "return" ? "info" : "warning"}
                variant={"outlined"}
                sx={{ mt: 1, mb: 1, borderRadius: 3 }}
              >
                {t(`shop.manage.refunds.hints.${dialog.action}`)}
              </Alert>
              {dialog.action === "evidence" ? (
                <DenseFilledTextField
                  fullWidth
                  multiline
                  minRows={3}
                  label={t("shop.manage.refunds.evidence")}
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  inputProps={{ maxLength: 500 }}
                  helperText={t("shop.manage.refunds.evidenceHint")}
                />
              ) : (
                <DenseFilledTextField
                  fullWidth
                  multiline
                  minRows={2}
                  label={t("shop.manage.refunds.remark")}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  inputProps={{ maxLength: 500 }}
                  helperText={t("shop.manage.refunds.remarkHint")}
                />
              )}
            </>
          )}
          {dialogError && (
            <Alert severity={"error"} sx={{ mt: 2, borderRadius: 3 }}>
              {dialogError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(undefined)} disabled={submitting}>
            {t("shop.checkout.cancel")}
          </Button>
          <Button variant={"contained"} onClick={submitReview} disabled={submitting}>
            {t("shop.manage.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShopRefundsPanel;
