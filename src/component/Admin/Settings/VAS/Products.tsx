import {
  Box,
  DialogContent,
  FormControl,
  FormControlLabel,
  IconButton,
  ListItemText,
  Stack,
  Switch,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getGroupList, getVASSKUs, saveVASSKUs } from "../../../../api/api";
import { GroupEnt, VASProductType, VASSKU } from "../../../../api/dashboard";
import { useAppDispatch } from "../../../../redux/hooks";
import { confirmOperation } from "../../../../redux/thunks/dialog";
import { sizeToString } from "../../../../util";
import {
  DenseFilledTextField,
  DenseSelect,
  NoWrapCell,
  SecondaryButton,
  SquareChip,
  StyledTableContainerPaper,
} from "../../../Common/StyledComponents";
import DraggableDialog from "../../../Dialogs/DraggableDialog";
import { SquareMenuItem } from "../../../FileManager/ContextMenu/ContextMenu";
import Add from "../../../Icons/Add";
import Delete from "../../../Icons/Delete";
import Edit from "../../../Icons/Edit";
import SettingForm from "../../../Pages/Setting/SettingForm";
import { NoMarginHelperText } from "../Settings";
import { bytesToInput, productTypes, sizeUnits, typeColor, typeLabel } from "./utils";

const AnonymousGroupID = 3;
const newSKUID = () => `sku_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  sku?: VASSKU;
  groups: GroupEnt[];
  saving?: boolean;
  onSave: (sku: VASSKU) => void;
}

const ProductDialog = ({ open, onClose, sku, groups, saving, onSave }: ProductDialogProps) => {
  const { t } = useTranslation("dashboard");
  const { enqueueSnackbar } = useSnackbar();
  const initialSize = useMemo(() => bytesToInput(sku?.type === "storage" ? sku.num : 0), [sku]);

  const [type, setType] = useState<VASProductType>(sku?.type ?? "storage");
  const [name, setName] = useState(sku?.name ?? "");
  const [price, setPrice] = useState(((sku?.price ?? 0) / 100).toFixed(2));
  const [pointsPrice, setPointsPrice] = useState(String(sku?.points_price ?? 0));
  const [numValue, setNumValue] = useState(
    sku === undefined || sku.type === "storage" ? initialSize.value : String(sku.num),
  );
  const [sizeUnit, setSizeUnit] = useState(initialSize.unit);
  const [durationDays, setDurationDays] = useState(String(sku?.duration_days ?? 0));
  const [onSale, setOnSale] = useState(sku?.on_sale ?? true);

  const [description, setDescription] = useState(sku?.description ?? "");
  const handleTypeChange = (next: VASProductType) => {
    setType(next);
    if (next === "storage") {
      setNumValue("0");
      setSizeUnit(1024 ** 3);
    } else if (next === "group") {
      setNumValue(groups.length > 0 ? String(groups[0].id) : "0");
    } else {
      setNumValue("0");
    }
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const cents = Math.round((parseFloat(price) || 0) * 100);
    const pointsPriceNum = Math.max(0, Math.round(parseFloat(pointsPrice) || 0));
    if (trimmedName === "" || cents < 0) {
      enqueueSnackbar(t("vas.invalidInput"), { variant: "warning" });
      return;
    }
    if (cents === 0 && pointsPriceNum === 0) {
      enqueueSnackbar(t("vas.priceRequired"), { variant: "warning" });
      return;
    }

    let num = 0;
    if (type === "storage") {
      num = Math.round((parseFloat(numValue) || 0) * sizeUnit);
    } else {
      num = Math.round(parseFloat(numValue) || 0);
    }
    if (num <= 0 || (type === "group" && !groups.some((g) => g.id === num))) {
      enqueueSnackbar(t("vas.invalidNum"), { variant: "warning" });
      return;
    }

    onSave({
      id: sku?.id ?? newSKUID(),
      type,
      name: trimmedName,
      price: cents,
      ...(sku?.currency ? { currency: sku.currency } : {}),
      points_price: pointsPriceNum,
      num,
      ...(type === "group" ? { duration_days: Math.max(0, Math.round(parseFloat(durationDays) || 0)) } : {}),
      on_sale: onSale,
      ...(description.trim() ? { description: description.trim() } : {}),
    });
  };

  return (
    <DraggableDialog
      onAccept={handleSubmit}
      loading={saving}
      title={sku ? t("vas.editProduct") : t("vas.addProduct")}
      showActions
      showCancel
      dialogProps={{
        open,
        onClose,
        fullWidth: true,
        maxWidth: "sm",
      }}
    >
      <DialogContent>
        <Stack spacing={2}>
          <SettingForm title={t("vas.productType")} lgWidth={12}>
            <FormControl fullWidth>
              <DenseSelect value={type} onChange={(e) => handleTypeChange(e.target.value as VASProductType)}>
                {productTypes.map((value) => (
                  <SquareMenuItem key={value} value={value}>
                    <ListItemText
                      primary={typeLabel(value, t)}
                      slotProps={{
                        primary: {
                          variant: "body2",
                        },
                      }}
                    />
                  </SquareMenuItem>
                ))}
              </DenseSelect>
            </FormControl>
          </SettingForm>

          <SettingForm title={t("settings.displayName")} lgWidth={12}>
            <DenseFilledTextField fullWidth required value={name} onChange={(e) => setName(e.target.value)} />
            <NoMarginHelperText>{t("vas.productNameDes")}</NoMarginHelperText>
          </SettingForm>

          <SettingForm title={t("vas.productDescription")} lgWidth={12}>
            <DenseFilledTextField
              fullWidth
              multiline
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 512 } }}
            />
            <NoMarginHelperText>{t("vas.productDescriptionDes")}</NoMarginHelperText>
          </SettingForm>

          <SettingForm title={t("vas.priceYuan")} lgWidth={12}>
            <DenseFilledTextField
              fullWidth
              type="number"
              value={price}
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              onChange={(e) => setPrice(e.target.value)}
            />
            <NoMarginHelperText>{t("vas.priceDes")}</NoMarginHelperText>
          </SettingForm>

          <SettingForm title={t("vas.pointsPrice")} lgWidth={12}>
            <DenseFilledTextField
              fullWidth
              type="number"
              value={pointsPrice}
              slotProps={{ htmlInput: { min: 0, step: 1 } }}
              onChange={(e) => setPointsPrice(e.target.value)}
            />
            <NoMarginHelperText>{t("vas.pointsPriceDes")}</NoMarginHelperText>
          </SettingForm>

          {type === "storage" && (
            <SettingForm title={t("settings.storageSize")} lgWidth={12}>
              <Stack direction={"row"} spacing={1}>
                <DenseFilledTextField
                  fullWidth
                  type="number"
                  value={numValue}
                  slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  onChange={(e) => setNumValue(e.target.value)}
                />
                <FormControl sx={{ minWidth: 110 }}>
                  <DenseSelect value={String(sizeUnit)} onChange={(e) => setSizeUnit(Number(e.target.value))}>
                    {sizeUnits.map((unit) => (
                      <SquareMenuItem key={unit} value={String(unit)}>
                        <ListItemText
                          primary={sizeToString(unit)}
                          slotProps={{
                            primary: {
                              variant: "body2",
                            },
                          }}
                        />
                      </SquareMenuItem>
                    ))}
                  </DenseSelect>
                </FormControl>
              </Stack>
              <NoMarginHelperText>
                {t("vas.storageSizeHint", { size: sizeToString(Math.round((parseFloat(numValue) || 0) * sizeUnit)) })}
              </NoMarginHelperText>
            </SettingForm>
          )}

          {type === "group" && (
            <>
              <SettingForm title={t("vas.group")} lgWidth={12}>
                <FormControl fullWidth>
                  <DenseSelect
                    value={numValue}
                    onChange={(e) => setNumValue(e.target.value as string)}
                    required
                    disabled={groups.length === 0}
                  >
                    {groups.map((group) => (
                      <SquareMenuItem key={group.id} value={String(group.id)}>
                        <ListItemText
                          primary={group.name}
                          slotProps={{
                            primary: {
                              variant: "body2",
                            },
                          }}
                        />
                      </SquareMenuItem>
                    ))}
                  </DenseSelect>
                </FormControl>
                <NoMarginHelperText>{t("vas.groupDes")}</NoMarginHelperText>
              </SettingForm>

              <SettingForm title={t("vas.durationDay")} lgWidth={12}>
                <DenseFilledTextField
                  fullWidth
                  type="number"
                  value={durationDays}
                  slotProps={{ htmlInput: { min: 0, step: 1 } }}
                  onChange={(e) => setDurationDays(e.target.value)}
                />
                <NoMarginHelperText>{t("vas.groupDurationDes")}</NoMarginHelperText>
              </SettingForm>
            </>
          )}

          {type === "points" && (
            <SettingForm title={t("vas.pointsAmount")} lgWidth={12}>
              <DenseFilledTextField
                fullWidth
                type="number"
                value={numValue}
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
                onChange={(e) => setNumValue(e.target.value)}
              />
              <NoMarginHelperText>{t("vas.pointsAmountDes")}</NoMarginHelperText>
            </SettingForm>
          )}

          <SettingForm lgWidth={12}>
            <FormControl fullWidth>
              <FormControlLabel
                control={<Switch checked={onSale} onChange={(e) => setOnSale(e.target.checked)} />}
                label={t("vas.onSale")}
              />
              <NoMarginHelperText>{t("vas.onSaleDes")}</NoMarginHelperText>
            </FormControl>
          </SettingForm>
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};

const Products = () => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skus, setSkus] = useState<VASSKU[]>([]);
  const [groups, setGroups] = useState<GroupEnt[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VASSKU | undefined>(undefined);

  useEffect(() => {
    setLoading(true);
    dispatch(getVASSKUs())
      .then((res) => {
        setSkus(res ?? []);
      })
      .catch(() => {
        setSkus([]);
      })
      .finally(() => {
        setLoading(false);
      });
    dispatch(
      getGroupList({
        page: 1,
        page_size: 1000,
        order_by: "id",
        order_direction: "asc",
      }),
    )
      .then((res) => {
        setGroups(res.groups.filter((g) => g.id !== AnonymousGroupID));
      })
      .catch(() => {
        setGroups([]);
      });
  }, []);

  const groupName = (id: number) => groups.find((g) => g.id === id)?.name ?? `#${id}`;

  const persist = async (next: VASSKU[]): Promise<boolean> => {
    setSaving(true);
    try {
      await dispatch(saveVASSKUs({ skus: next }));
      setSkus(next);
      enqueueSnackbar(t("vas.saved"), { variant: "success" });
      return true;
    } catch (e) {
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (sku: VASSKU) => {
    setEditing(sku);
    setDialogOpen(true);
  };

  const handleDelete = (sku: VASSKU) => {
    dispatch(confirmOperation(t("vas.confirmDeleteProduct", { name: sku.name })))
      .then(() => persist(skus.filter((s) => s.id !== sku.id)))
      .catch(() => undefined);
  };

  const handleToggleOnSale = (sku: VASSKU, onSale: boolean) => {
    persist(skus.map((s) => (s.id === sku.id ? { ...s, on_sale: onSale } : s)));
  };

  const handleSave = (sku: VASSKU) => {
    const exists = skus.some((s) => s.id === sku.id);
    const next = exists ? skus.map((s) => (s.id === sku.id ? sku : s)) : [...skus, sku];
    persist(next).then((ok) => {
      if (ok) {
        setDialogOpen(false);
      }
    });
  };

  const renderNum = (sku: VASSKU) => {
    switch (sku.type) {
      case "storage":
        return sizeToString(sku.num);
      case "group":
        return `${groupName(sku.num)}${
          (sku.duration_days ?? 0) > 0 ? ` · ${sku.duration_days} ${t("vas.days")}` : ` · ${t("vas.neverExpire")}`
        }`;
      default:
        return `${sku.num} ${t("vas.credits")}`;
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <SecondaryButton variant="contained" startIcon={<Add />} onClick={handleAdd} disabled={saving}>
          {t("vas.addProduct")}
        </SecondaryButton>
      </Box>

      <TableContainer component={StyledTableContainerPaper}>
        <Table size="small" sx={{ width: "100%" }}>
          <TableHead>
            <TableRow>
              <NoWrapCell>{t("settings.displayName")}</NoWrapCell>
              <NoWrapCell>{t("vas.productType")}</NoWrapCell>
              <NoWrapCell>{t("settings.price")}</NoWrapCell>
              <NoWrapCell>{t("vas.pointsPrice")}</NoWrapCell>
              <NoWrapCell>{t("vas.numAndDuration")}</NoWrapCell>
              <NoWrapCell>{t("vas.onSale")}</NoWrapCell>
              <NoWrapCell align="right">{t("settings.actions")}</NoWrapCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {skus.map((sku) => (
              <TableRow key={sku.id} hover>
                <NoWrapCell>{sku.name}</NoWrapCell>
                <NoWrapCell>
                  <SquareChip size="small" color={typeColor(sku.type)} label={typeLabel(sku.type, t)} />
                </NoWrapCell>
                <NoWrapCell sx={{ fontVariantNumeric: "tabular-nums" }}>{`¥${(sku.price / 100).toFixed(
                  2,
                )}`}</NoWrapCell>
                <NoWrapCell sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {(sku.points_price ?? 0) > 0 ? sku.points_price : "-"}
                </NoWrapCell>
                <NoWrapCell>{renderNum(sku)}</NoWrapCell>
                <NoWrapCell>
                  <Switch
                    size="small"
                    checked={sku.on_sale}
                    disabled={saving}
                    onChange={(e) => handleToggleOnSale(sku, e.target.checked)}
                  />
                </NoWrapCell>
                <NoWrapCell align="right">
                  <IconButton
                    size="small"
                    title={t("vas.editProduct")}
                    onClick={() => handleEdit(sku)}
                    disabled={saving}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    title={t("vas.deleteProduct")}
                    onClick={() => handleDelete(sku)}
                    disabled={saving}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </NoWrapCell>
              </TableRow>
            ))}
            {!loading && skus.length === 0 && (
              <TableRow>
                <NoWrapCell colSpan={7} align="center">
                  <Typography variant="caption" color="text.secondary">
                    {t("vas.noProducts")}
                  </Typography>
                </NoWrapCell>
              </TableRow>
            )}
            {loading && skus.length === 0 && (
              <TableRow>
                <NoWrapCell colSpan={7} align="center">
                  <Typography variant="caption" color="text.secondary">
                    {t("application:setting.listEmpty")}
                  </Typography>
                </NoWrapCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {dialogOpen && (
        <ProductDialog
          key={editing?.id ?? "new"}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          sku={editing}
          groups={groups}
          saving={saving}
          onSave={handleSave}
        />
      )}
    </Box>
  );
};

export default Products;
