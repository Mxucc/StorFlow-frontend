import { Alert, Box, Button, CircularProgress, Container, Stack, Typography } from "@mui/material";
import { useQueryState } from "nuqs";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppError, Code } from "../../../api/request.ts";
import { createShop, createShopDepositOrder, displayMoney, getMyShop, ShopView } from "../../../api/shop.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import PageContainer from "../PageContainer.tsx";
import PageHeader, { PageTabQuery } from "../PageHeader.tsx";
import { FilledTextField, StyledTabs, StyledTab } from "../../Common/StyledComponents.tsx";
import ShopImageField, { ShopImageShape } from "../../Common/Shop/ShopImageField.tsx";
import { useSnackbar } from "notistack";
import { DefaultCloseAction } from "../../Common/Snackbar/snackbar.tsx";
import { ShopEmpty } from "./ShopShared.tsx";
import ShopProductsTab from "./Manage/ShopProductsTab.tsx";
import ShopProfileTab from "./Manage/ShopProfileTab.tsx";
import ShopOrdersTab from "./Manage/ShopOrdersTab.tsx";
import ShopFinanceTab from "./Manage/ShopFinanceTab.tsx";
import ShopMarketingTab from "./Manage/ShopMarketingTab.tsx";
import ShopRefundsPanel from "./Manage/ShopRefundsTab.tsx";
import ShopPaymentTab from "./Manage/ShopPaymentTab.tsx";

const ManageTab = {
  profile: "profile",
  products: "products",
  orders: "orders",
  refunds: "refunds",
  finance: "finance",
  payment: "payment",
  marketing: "marketing",
} as const;

type ManageTabValue = (typeof ManageTab)[keyof typeof ManageTab];

const tabOrder: ManageTabValue[] = [
  ManageTab.profile,
  ManageTab.products,
  ManageTab.orders,
  ManageTab.refunds,
  ManageTab.finance,
  ManageTab.payment,
  ManageTab.marketing,
];

/** 开店表单：POST /shop。 */
const ShopCreateForm = ({ onCreated }: { onCreated: (shop: ShopView) => void }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState("");
  const [cover, setCover] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!name.trim()) {
      setError(t("shop.manage.create.nameRequired"));
      return;
    }
    setLoading(true);
    setError(undefined);
    dispatch(
      createShop({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        avatar: avatar.trim() || undefined,
        cover: cover.trim() || undefined,
      }),
    )
      .then((shop) => {
        onCreated(shop);
        enqueueSnackbar({
          message: t("shop.manage.create.success"),
          variant: "success",
          action: DefaultCloseAction,
        });
      })
      .catch((e) => setError(e instanceof AppError ? e.message : t("shop.manage.create.failed")))
      .finally(() => setLoading(false));
  };

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant={"h6"} sx={{ fontWeight: 600, mb: 1 }}>
        {t("shop.manage.create.title")}
      </Typography>
      <Typography variant={"body2"} color={"text.secondary"} sx={{ mb: 3 }}>
        {t("shop.manage.create.description")}
      </Typography>
      <Box component={"form"} onSubmit={submit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <FilledTextField
          variant={"filled"}
          required
          label={t("shop.manage.fields.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          inputProps={{ maxLength: 64 }}
          helperText={t("shop.manage.create.nameHint")}
        />
        <FilledTextField
          variant={"filled"}
          label={t("shop.manage.fields.slug")}
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          inputProps={{ maxLength: 64, pattern: "[a-z0-9-]*" }}
          helperText={t("shop.manage.create.slugHint")}
        />
        <FilledTextField
          variant={"filled"}
          multiline
          minRows={2}
          label={t("shop.manage.fields.description")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          inputProps={{ maxLength: 512 }}
        />
        <ShopImageField
          label={t("shop.manage.fields.avatar")}
          shape={ShopImageShape.square}
          value={avatar}
          onChange={setAvatar}
          helperText={t("shop.manage.fields.imageHint")}
        />
        <ShopImageField
          label={t("shop.manage.fields.cover")}
          shape={ShopImageShape.banner}
          value={cover}
          onChange={setCover}
          helperText={t("shop.manage.fields.imageHint")}
        />
        {error && (
          <Alert severity={"error"} sx={{ borderRadius: 3 }}>
            {error}
          </Alert>
        )}
        <Stack direction={"row"} spacing={1}>
          <Button type={"submit"} variant={"contained"} disabled={loading}>
            {t("shop.manage.create.submit")}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

/**
 * 保证金提示条：管理员在开店之后才设置（或提高）保证金时，店主会在这里看到补交入口。
 * 未缴清期间不能提现，其余功能不受影响。
 */
const DepositNotice = ({ due }: { due: number }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [busy, setBusy] = useState(false);

  if (due <= 0) {
    return null;
  }

  const pay = () => {
    setBusy(true);
    dispatch(createShopDepositOrder())
      .then((order) => {
        if (order.pay_url) {
          window.location.assign(order.pay_url);
          return;
        }
        enqueueSnackbar({
          message: t("shop.manage.payment.depositNoGateway"),
          variant: "warning",
          action: DefaultCloseAction,
        });
      })
      .catch((e) =>
        enqueueSnackbar({
          message: e instanceof AppError ? e.message : t("shop.manage.payment.depositFailed"),
          variant: "error",
          action: DefaultCloseAction,
        }),
      )
      .finally(() => setBusy(false));
  };

  return (
    <Alert
      severity={"warning"}
      sx={{ borderRadius: 3, mb: 3 }}
      action={
        <Button color={"inherit"} size={"small"} onClick={pay} disabled={busy}>
          {t("shop.manage.payment.depositPay")}
        </Button>
      }
    >
      {t("shop.manage.payment.depositDue", { amount: displayMoney(due) })}
    </Alert>
  );
};

const ShopManage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [tab, setTab] = useQueryState(PageTabQuery);

  const [shop, setShop] = useState<ShopView | undefined>();
  const [loading, setLoading] = useState(true);
  const [notCreated, setNotCreated] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const load = useCallback(() => {
    setLoading(true);
    setError(undefined);
    dispatch(getMyShop())
      .then((res) => {
        setShop(res);
        setNotCreated(false);
      })
      .catch((e) => {
        if (e instanceof AppError && e.code === Code.NodeFound) {
          setShop(undefined);
          setNotCreated(true);
        } else {
          setError(e instanceof AppError ? e.message : t("shop.manage.loadFailed"));
        }
      })
      .finally(() => setLoading(false));
  }, [dispatch, t]);

  useEffect(() => {
    load();
  }, [load]);

  const activeTab = (tabOrder.includes(tab as ManageTabValue) ? tab : ManageTab.profile) as ManageTabValue;

  return (
    <PageContainer>
      <Container maxWidth="lg">
        <PageHeader
          title={t("shop.manage.title")}
          onRefresh={load}
          loading={loading}
          secondaryAction={
            shop ? (
              <Stack direction={"row"} spacing={1}>
                <Button
                  variant={"outlined"}
                  size={"small"}
                  // 店铺前台是 Astro 服务端渲染的页面，整页跳转才能拿到完整 meta 与结构化数据。
                  onClick={() => window.location.assign(`/shop/${shop.slug}`)}
                >
                  {t("shop.manage.viewStore")}
                </Button>
              </Stack>
            ) : undefined
          }
        />

        {loading && !shop && !notCreated && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && !loading && (
          <Box>
            <Alert severity={"error"} sx={{ borderRadius: 3 }}>
              {error}
            </Alert>
            <Button sx={{ mt: 2 }} variant={"outlined"} onClick={load}>
              {t("shop.store.retry")}
            </Button>
          </Box>
        )}

        {notCreated && !loading && <ShopCreateForm onCreated={(res) => setShop(res)} />}

        {shop && !loading && (
          <>
            <DepositNotice due={shop.deposit_due ?? 0} />
            <Box sx={{ mb: 3 }}>
              <StyledTabs
                value={activeTab}
                onChange={(_e, value) => setTab(value)}
                variant={"scrollable"}
                scrollButtons={"auto"}
              >
                <StyledTab value={ManageTab.profile} label={t("shop.manage.tabs.profile")} />
                <StyledTab value={ManageTab.products} label={t("shop.manage.tabs.products")} />
                <StyledTab value={ManageTab.orders} label={t("shop.manage.tabs.orders")} />
                <StyledTab value={ManageTab.refunds} label={t("shop.manage.tabs.refunds")} />
                <StyledTab value={ManageTab.finance} label={t("shop.manage.tabs.finance")} />
                <StyledTab value={ManageTab.payment} label={t("shop.manage.tabs.payment")} />
                <StyledTab value={ManageTab.marketing} label={t("shop.manage.tabs.marketing")} />
              </StyledTabs>
            </Box>
            {activeTab === ManageTab.profile && <ShopProfileTab shop={shop} onUpdated={setShop} />}
            {activeTab === ManageTab.products && <ShopProductsTab shop={shop} />}
            {activeTab === ManageTab.orders && <ShopOrdersTab />}
            {activeTab === ManageTab.refunds && <ShopRefundsPanel variant={"seller"} />}
            {activeTab === ManageTab.finance && <ShopFinanceTab />}
            {activeTab === ManageTab.payment && <ShopPaymentTab />}
            {activeTab === ManageTab.marketing && <ShopMarketingTab shop={shop} />}
          </>
        )}

        {!shop && !notCreated && !loading && !error && <ShopEmpty title={t("shop.manage.notFound")} />}
      </Container>
    </PageContainer>
  );
};

export default ShopManage;
