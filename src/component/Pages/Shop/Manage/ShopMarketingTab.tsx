import {
  Alert,
  Box,
  Button,
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
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppError } from "../../../../api/request.ts";
import {
  createCoupon,
  displayMoney,
  formatMoney,
  getReferralLink,
  listCoupons,
  listReferrals,
  listShopProducts,
  parseMoney,
  ShopCoupon,
  ShopCouponService,
  ShopProductSummary,
  ShopReferral,
  ShopView,
  updateCoupon,
} from "../../../../api/shop.ts";
import { useAppDispatch } from "../../../../redux/hooks.ts";
import { copyToClipboard } from "../../../../util";
import { DenseFilledTextField, DenseSelect, SecondaryButton } from "../../../Common/StyledComponents.tsx";
import { SquareMenuItem } from "../../../FileManager/ContextMenu/ContextMenu.tsx";
import { DefaultCloseAction } from "../../../Common/Snackbar/snackbar.tsx";
import Add from "../../../Icons/Add.tsx";
import ArrowClockwise from "../../../Icons/ArrowClockwise.tsx";
import Edit from "../../../Icons/Edit.tsx";
import { CouponStatusChip, CopyableText, Money, ShopEmpty, useUnixTime } from "../ShopShared.tsx";

interface CouponForm {
  code: string;
  kind: "percent" | "fixed";
  value: string;
  min_amount: string;
  product_id: string;
  max_uses: string;
  per_user: string;
  status: string;
  start_at: string;
  end_at: string;
}

const emptyCoupon: CouponForm = {
  code: "",
  kind: "percent",
  value: "10",
  min_amount: "",
  product_id: "",
  max_uses: "",
  per_user: "1",
  status: "active",
  start_at: "",
  end_at: "",
};

const toLocalInput = (unix?: number) => {
  if (!unix) {
    return "";
  }
  const date = new Date(unix * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
};

const fromLocalInput = (value: string) => {
  if (!value) {
    return 0;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : Math.floor(time / 1000);
};

/** 优惠券 + 邀请返利：GET/POST /shop/coupon、PATCH /shop/coupon/:id、GET /shop/referral(+/link) */
const ShopMarketingTab = ({ shop }: { shop: ShopView }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const formatTime = useUnixTime();

  const [coupons, setCoupons] = useState<ShopCoupon[] | undefined>();
  const [products, setProducts] = useState<ShopProductSummary[]>([]);
  const [referrals, setReferrals] = useState<ShopReferral[] | undefined>();
  const [referralLink, setReferralLink] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ShopCoupon | undefined>();
  const [form, setForm] = useState<CouponForm>(emptyCoupon);
  const [formError, setFormError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    Promise.all([
      dispatch(listCoupons({ limit: 100, offset: 0 })),
      dispatch(listReferrals()),
      dispatch(getReferralLink()),
      dispatch(listShopProducts({ limit: 100, offset: 0 })),
    ])
      .then(([couponRes, referralRes, linkRes, productRes]) => {
        setCoupons(couponRes ?? []);
        setReferrals(referralRes ?? []);
        setReferralLink(linkRes ?? "");
        setProducts(productRes ?? []);
      })
      .catch((e) => {
        setCoupons([]);
        setReferrals([]);
        setError(e instanceof AppError ? e.message : t("shop.manage.marketing.loadFailed"));
      })
      .finally(() => setLoading(false));
  }, [dispatch, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(undefined);
    setForm(emptyCoupon);
    setFormError(undefined);
    setDialogOpen(true);
  };

  const openEdit = (coupon: ShopCoupon) => {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      kind: coupon.kind,
      value: coupon.kind === "percent" ? coupon.value.toString() : formatMoney(coupon.value),
      min_amount: coupon.min_amount ? formatMoney(coupon.min_amount) : "",
      product_id: coupon.product_id ?? "",
      max_uses: coupon.max_uses ? coupon.max_uses.toString() : "",
      per_user: coupon.per_user ? coupon.per_user.toString() : "",
      status: coupon.status,
      start_at: toLocalInput(coupon.start_at),
      end_at: toLocalInput(coupon.end_at),
    });
    setFormError(undefined);
    setDialogOpen(true);
  };

  const submit = () => {
    setFormError(undefined);
    let value = 0;
    if (form.kind === "percent") {
      value = Number(form.value);
      if (!Number.isInteger(value) || value < 1 || value > 99) {
        setFormError(t("shop.manage.marketing.percentInvalid"));
        return;
      }
    } else {
      value = parseMoney(form.value);
      if (Number.isNaN(value) || value < 1) {
        setFormError(t("shop.manage.marketing.valueInvalid"));
        return;
      }
    }
    const minAmount = form.min_amount ? parseMoney(form.min_amount) : 0;
    if (Number.isNaN(minAmount)) {
      setFormError(t("shop.manage.marketing.minAmountInvalid"));
      return;
    }
    if (form.start_at && form.end_at && fromLocalInput(form.end_at) <= fromLocalInput(form.start_at)) {
      setFormError(t("shop.manage.marketing.timeInvalid"));
      return;
    }

    const payload: ShopCouponService = {
      kind: form.kind,
      value,
      code: form.code.trim() || undefined,
      min_amount: minAmount,
      product_id: form.product_id || undefined,
      max_uses: form.max_uses ? Number(form.max_uses) : 0,
      per_user: form.per_user ? Number(form.per_user) : 0,
      status: form.status,
      start_at: fromLocalInput(form.start_at),
      end_at: fromLocalInput(form.end_at),
    };

    setSubmitting(true);
    const action = editing ? dispatch(updateCoupon(editing.id, payload)) : dispatch(createCoupon(payload));
    action
      .then((res) => {
        setCoupons((prev) =>
          editing ? prev?.map((item) => (item.id === res.id ? res : item)) : [res, ...(prev ?? [])],
        );
        setDialogOpen(false);
        enqueueSnackbar({
          message: editing ? t("shop.manage.marketing.couponUpdated") : t("shop.manage.marketing.couponCreated"),
          variant: "success",
          action: DefaultCloseAction,
        });
      })
      .catch((e) => setFormError(e instanceof AppError ? e.message : t("shop.manage.marketing.saveFailed")))
      .finally(() => setSubmitting(false));
  };

  const toggleCouponStatus = (coupon: ShopCoupon) => {
    const next = coupon.status === "active" ? "stopped" : "active";
    dispatch(updateCoupon(coupon.id, { kind: coupon.kind, value: coupon.value, status: next }))
      .then((res) => setCoupons((prev) => prev?.map((item) => (item.id === res.id ? res : item))))
      .catch(() => undefined);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {error && (
        <Alert severity={"error"} sx={{ borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <Typography variant={"subtitle1"} sx={{ fontWeight: 600, flexGrow: 1 }}>
            {t("shop.manage.marketing.coupons")}
          </Typography>
          <SecondaryButton
            size={"small"}
            variant={"outlined"}
            startIcon={<ArrowClockwise sx={{ fontSize: 16 }} />}
            onClick={load}
          >
            {t("shop.manage.refresh")}
          </SecondaryButton>
          <Button size={"small"} variant={"contained"} startIcon={<Add sx={{ fontSize: 16 }} />} onClick={openCreate}>
            {t("shop.manage.marketing.createCoupon")}
          </Button>
        </Box>
        {coupons && coupons.length === 0 && !loading ? (
          <ShopEmpty
            title={t("shop.manage.marketing.noCoupons")}
            description={t("shop.manage.marketing.noCouponsHint")}
          />
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
            <Table size={"small"} sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t("shop.manage.marketing.fields.code")}</TableCell>
                  <TableCell width={150}>{t("shop.manage.marketing.fields.discount")}</TableCell>
                  <TableCell width={130} align={"right"}>
                    {t("shop.manage.marketing.fields.minAmount")}
                  </TableCell>
                  <TableCell width={110} align={"right"}>
                    {t("shop.manage.marketing.fields.used")}
                  </TableCell>
                  <TableCell width={180}>{t("shop.manage.marketing.fields.validity")}</TableCell>
                  <TableCell width={100}>{t("shop.manage.marketing.fields.status")}</TableCell>
                  <TableCell width={160} align={"right"}>
                    {t("shop.manage.marketing.fields.actions")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {coupons?.map((coupon) => (
                  <TableRow key={coupon.id} hover>
                    <TableCell sx={{ maxWidth: 0 }}>
                      <Typography
                        variant={"body2"}
                        sx={{ fontWeight: 600, fontFamily: "monospace", overflowWrap: "anywhere" }}
                      >
                        {coupon.code}
                      </Typography>
                      {coupon.product_id && (
                        <Typography variant={"caption"} color={"text.secondary"}>
                          {t("shop.manage.marketing.productOnly", {
                            name:
                              products.find((product) => product.id === coupon.product_id)?.name ?? coupon.product_id,
                          })}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant={"body2"}>
                        {coupon.kind === "percent"
                          ? t("shop.manage.marketing.percentOff", { percent: coupon.value })
                          : t("shop.manage.marketing.fixedOff", { amount: displayMoney(coupon.value) })}
                      </Typography>
                    </TableCell>
                    <TableCell align={"right"}>
                      <Money cents={coupon.min_amount} />
                    </TableCell>
                    <TableCell align={"right"}>
                      <Typography variant={"body2"} sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {coupon.used}
                        {coupon.max_uses > 0 ? ` / ${coupon.max_uses}` : ""}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant={"caption"} color={"text.secondary"}>
                        {coupon.start_at || coupon.end_at
                          ? `${coupon.start_at ? formatTime(coupon.start_at) : "—"} ~ ${
                              coupon.end_at ? formatTime(coupon.end_at) : "—"
                            }`
                          : t("shop.manage.marketing.alwaysValid")}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <CouponStatusChip coupon={coupon} />
                    </TableCell>
                    <TableCell align={"right"}>
                      <Stack direction={"row"} spacing={0.5} justifyContent={"flex-end"}>
                        <Button
                          size={"small"}
                          startIcon={<Edit sx={{ fontSize: 16 }} />}
                          onClick={() => openEdit(coupon)}
                        >
                          {t("shop.manage.products.edit")}
                        </Button>
                        <Button size={"small"} onClick={() => toggleCouponStatus(coupon)}>
                          {coupon.status === "active"
                            ? t("shop.manage.marketing.stop")
                            : t("shop.manage.marketing.activate")}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Box>

      <Divider />

      <Box>
        <Typography variant={"subtitle1"} sx={{ fontWeight: 600, mb: 1 }}>
          {t("shop.manage.marketing.referral")}
        </Typography>
        <Typography variant={"body2"} color={"text.secondary"} sx={{ mb: 1.5 }}>
          {t("shop.manage.marketing.referralHint", {
            rate: ((shop.referrer_rate ?? 0) / 100).toFixed(2),
          })}
        </Typography>
        {referralLink ? (
          <CopyableText
            text={referralLink}
            onCopy={() => copyToClipboard(referralLink)}
            copyLabel={t("shop.manage.marketing.copyReferral")}
            copiedLabel={t("shop.manage.profile.copied")}
          />
        ) : (
          <Typography variant={"caption"} color={"text.secondary"}>
            {t("shop.manage.marketing.noReferralLink")}
          </Typography>
        )}

        <Box sx={{ mt: 2 }}>
          {referrals && referrals.length === 0 ? (
            <ShopEmpty title={t("shop.manage.marketing.noReferrals")} />
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
                    <TableCell>{t("shop.manage.marketing.fields.invitee")}</TableCell>
                    <TableCell width={120} align={"right"}>
                      {t("shop.manage.marketing.fields.rate")}
                    </TableCell>
                    <TableCell width={140} align={"right"}>
                      {t("shop.manage.marketing.fields.rebate")}
                    </TableCell>
                    <TableCell width={160}>{t("shop.manage.marketing.fields.time")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {referrals?.map((row) => (
                    <TableRow key={`${row.invitee_uid}-${row.created_at}`} hover>
                      <TableCell sx={{ maxWidth: 0 }}>
                        <Typography variant={"body2"} sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                          {row.nickname || row.invitee_uid}
                        </Typography>
                        <Typography variant={"caption"} color={"text.secondary"} sx={{ overflowWrap: "anywhere" }}>
                          {row.invitee_uid}
                          {row.source ? ` · ${row.source}` : ""}
                        </Typography>
                      </TableCell>
                      <TableCell align={"right"}>
                        <Typography variant={"body2"} sx={{ fontVariantNumeric: "tabular-nums" }}>
                          {(row.rate / 100).toFixed(2)}%
                        </Typography>
                      </TableCell>
                      <TableCell align={"right"}>
                        <Money cents={row.total_rebate} bold />
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

      <Dialog open={dialogOpen} onClose={() => !submitting && setDialogOpen(false)} fullWidth maxWidth={"sm"}>
        <DialogTitle>
          {editing ? t("shop.manage.marketing.editCoupon") : t("shop.manage.marketing.createCoupon")}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1 }}>
            <DenseFilledTextField
              label={t("shop.manage.marketing.fields.code")}
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
              inputProps={{ maxLength: 32 }}
              helperText={t("shop.manage.marketing.codeHint")}
              disabled={!!editing}
            />
            <DenseSelect
              value={form.kind}
              size={"small"}
              onChange={(e) => setForm((prev) => ({ ...prev, kind: e.target.value as "percent" | "fixed" }))}
              sx={{ mt: 1 }}
            >
              <SquareMenuItem value={"percent"}>{t("shop.manage.marketing.kindPercent")}</SquareMenuItem>
              <SquareMenuItem value={"fixed"}>{t("shop.manage.marketing.kindFixed")}</SquareMenuItem>
            </DenseSelect>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, mt: 1 }}>
            <DenseFilledTextField
              label={
                form.kind === "percent"
                  ? t("shop.manage.marketing.fields.percent")
                  : t("shop.manage.marketing.fields.amount")
              }
              value={form.value}
              onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
              inputProps={{ inputMode: "decimal" }}
              helperText={form.kind === "percent" ? t("shop.manage.marketing.percentHint") : undefined}
            />
            <DenseFilledTextField
              label={t("shop.manage.marketing.fields.minAmount")}
              value={form.min_amount}
              onChange={(e) => setForm((prev) => ({ ...prev, min_amount: e.target.value }))}
              inputProps={{ inputMode: "decimal" }}
              helperText={t("shop.manage.marketing.minAmountHint")}
            />
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 1, mt: 1 }}>
            <DenseFilledTextField
              label={t("shop.manage.marketing.fields.maxUses")}
              value={form.max_uses}
              onChange={(e) => setForm((prev) => ({ ...prev, max_uses: e.target.value.replace(/[^\d]/g, "") }))}
              inputProps={{ inputMode: "numeric" }}
              helperText={t("shop.manage.marketing.maxUsesHint")}
            />
            <DenseFilledTextField
              label={t("shop.manage.marketing.fields.perUser")}
              value={form.per_user}
              onChange={(e) => setForm((prev) => ({ ...prev, per_user: e.target.value.replace(/[^\d]/g, "") }))}
              inputProps={{ inputMode: "numeric" }}
              helperText={t("shop.manage.marketing.perUserHint")}
            />
            <DenseSelect
              value={form.status}
              size={"small"}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as string }))}
              sx={{ mt: 1 }}
            >
              <SquareMenuItem value={"active"}>{t("shop.coupon.status.active")}</SquareMenuItem>
              <SquareMenuItem value={"stopped"}>{t("shop.coupon.status.stopped")}</SquareMenuItem>
            </DenseSelect>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, mt: 1 }}>
            <DenseFilledTextField
              type={"datetime-local"}
              label={t("shop.manage.marketing.fields.startAt")}
              value={form.start_at}
              onChange={(e) => setForm((prev) => ({ ...prev, start_at: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <DenseFilledTextField
              type={"datetime-local"}
              label={t("shop.manage.marketing.fields.endAt")}
              value={form.end_at}
              onChange={(e) => setForm((prev) => ({ ...prev, end_at: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <DenseSelect
            value={form.product_id}
            size={"small"}
            fullWidth
            onChange={(e) => setForm((prev) => ({ ...prev, product_id: e.target.value as string }))}
            sx={{ mt: 2 }}
          >
            <SquareMenuItem value={""}>{t("shop.manage.marketing.allProducts")}</SquareMenuItem>
            {products.map((product) => (
              <SquareMenuItem key={product.id} value={product.id}>
                {product.name}
              </SquareMenuItem>
            ))}
          </DenseSelect>
          {formError && (
            <Alert severity={"error"} sx={{ mt: 2, borderRadius: 3 }}>
              {formError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            {t("shop.checkout.cancel")}
          </Button>
          <Button variant={"contained"} onClick={submit} disabled={submitting}>
            {editing ? t("shop.manage.profile.save") : t("shop.manage.marketing.createCoupon")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShopMarketingTab;
