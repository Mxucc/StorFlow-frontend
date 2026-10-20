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
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getVASProviders, saveVASProviders } from "../../../../api/api";
import { VASProvider, VASProviderType } from "../../../../api/dashboard";
import { useAppDispatch } from "../../../../redux/hooks";
import { confirmOperation } from "../../../../redux/thunks/dialog";
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

/** 各渠道类型必须提供的配置项（见 service/vas/channels.go）。 */
const requiredConfigKeys: Record<string, string[]> = {
  epay: ["gateway_url", "pid", "key"],
  custom: ["gateway_url", "communication_key"],
};

const providerTypes: VASProviderType[] = ["epay", "custom"];

const newProviderID = () => `provider_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

interface ConfigRow {
  key: string;
  value: string;
}

const providerTypeLabel = (type: string, t: (key: string) => string) => {
  switch (type) {
    case "epay":
      return t("vas.providerTypeEpay");
    case "custom":
      return t("vas.providerTypeCustom");
    case "stripe":
      return t("vas.providerTypeStripe");
    default:
      return type;
  }
};

export interface ProviderDialogProps {
  open: boolean;
  onClose: () => void;
  provider?: VASProvider;
  saving?: boolean;
  onSave: (provider: VASProvider) => void;
}

const ProviderDialog = ({ open, onClose, provider, saving, onSave }: ProviderDialogProps) => {
  const { t } = useTranslation("dashboard");
  const { enqueueSnackbar } = useSnackbar();
  const [type, setType] = useState<VASProviderType>(provider?.type ?? "epay");
  const [name, setName] = useState(provider?.name ?? "");
  const [onSale, setOnSale] = useState(provider?.on_sale ?? true);
  const [config, setConfig] = useState<ConfigRow[]>(
    Object.entries(provider?.config ?? {}).map(([key, value]) => ({ key, value })),
  );

  const updateRow = (index: number, patch: Partial<ConfigRow>) => {
    setConfig((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    setConfig((rows) => rows.filter((_, i) => i !== index));
  };
  const addRow = () => {
    setConfig((rows) => [...rows, { key: "", value: "" }]);
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (trimmedName === "") {
      enqueueSnackbar(t("vas.invalidInput"), { variant: "warning" });
      return;
    }

    const configObject: Record<string, string> = {};
    config.forEach((row) => {
      const key = row.key.trim();
      if (key !== "") {
        configObject[key] = row.value;
      }
    });

    const missing = (requiredConfigKeys[type] ?? []).filter((key) => (configObject[key] ?? "").trim() === "");
    if (missing.length > 0) {
      enqueueSnackbar(t("vas.missingConfig", { keys: missing.join(", ") }), { variant: "warning" });
      return;
    }

    onSave({
      id: provider?.id ?? newProviderID(),
      type,
      name: trimmedName,
      on_sale: onSale,
      config: configObject,
    });
  };

  return (
    <DraggableDialog
      onAccept={handleSubmit}
      loading={saving}
      title={provider ? t("vas.editProvider") : t("vas.addProvider")}
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
          <SettingForm title={t("vas.providerType")} lgWidth={12}>
            <FormControl fullWidth>
              <DenseSelect value={type} onChange={(e) => setType(e.target.value as VASProviderType)}>
                {providerTypes.map((value) => (
                  <SquareMenuItem key={value} value={value}>
                    <ListItemText
                      primary={providerTypeLabel(value, t)}
                      slotProps={{
                        primary: {
                          variant: "body2",
                        },
                      }}
                    />
                  </SquareMenuItem>
                ))}
              </DenseSelect>
              <NoMarginHelperText>{t("vas.providerTypeDes")}</NoMarginHelperText>
            </FormControl>
          </SettingForm>

          <SettingForm title={t("settings.displayName")} lgWidth={12}>
            <DenseFilledTextField fullWidth required value={name} onChange={(e) => setName(e.target.value)} />
            <NoMarginHelperText>{t("vas.providerNameDes")}</NoMarginHelperText>
          </SettingForm>

          <SettingForm title={t("vas.config")} lgWidth={12}>
            <Stack spacing={1}>
              {config.map((row, index) => (
                <Stack key={index} direction={"row"} spacing={1} alignItems={"center"}>
                  <DenseFilledTextField
                    fullWidth
                    value={row.key}
                    placeholder={t("vas.configKey")}
                    onChange={(e) => updateRow(index, { key: e.target.value })}
                  />
                  <DenseFilledTextField
                    fullWidth
                    value={row.value}
                    placeholder={t("vas.configValue")}
                    onChange={(e) => updateRow(index, { value: e.target.value })}
                  />
                  <IconButton size="small" onClick={() => removeRow(index)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Box>
                <SecondaryButton variant="contained" startIcon={<Add />} onClick={addRow}>
                  {t("vas.addConfig")}
                </SecondaryButton>
              </Box>
            </Stack>
            <NoMarginHelperText>{t("vas.configDes")}</NoMarginHelperText>
          </SettingForm>

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

const PaymentProviders = () => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<VASProvider[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VASProvider | undefined>(undefined);

  useEffect(() => {
    setLoading(true);
    dispatch(getVASProviders())
      .then((res) => {
        setProviders(res ?? []);
      })
      .catch(() => {
        setProviders([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const persist = async (next: VASProvider[]): Promise<boolean> => {
    setSaving(true);
    try {
      await dispatch(saveVASProviders({ providers: next }));
      setProviders(next);
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

  const handleEdit = (provider: VASProvider) => {
    setEditing(provider);
    setDialogOpen(true);
  };

  const handleDelete = (provider: VASProvider) => {
    dispatch(confirmOperation(t("vas.confirmDeleteProvider", { name: provider.name })))
      .then(() => persist(providers.filter((p) => p.id !== provider.id)))
      .catch(() => undefined);
  };

  const handleToggleOnSale = (provider: VASProvider, onSale: boolean) => {
    persist(providers.map((p) => (p.id === provider.id ? { ...p, on_sale: onSale } : p)));
  };

  const handleSave = (provider: VASProvider) => {
    const exists = providers.some((p) => p.id === provider.id);
    const next = exists ? providers.map((p) => (p.id === provider.id ? provider : p)) : [...providers, provider];
    persist(next).then((ok) => {
      if (ok) {
        setDialogOpen(false);
      }
    });
  };

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <SecondaryButton variant="contained" startIcon={<Add />} onClick={handleAdd} disabled={saving}>
          {t("vas.addProvider")}
        </SecondaryButton>
      </Box>

      <TableContainer component={StyledTableContainerPaper}>
        <Table size="small" sx={{ width: "100%" }}>
          <TableHead>
            <TableRow>
              <NoWrapCell>{t("settings.displayName")}</NoWrapCell>
              <NoWrapCell>{t("vas.providerType")}</NoWrapCell>
              <NoWrapCell>{t("vas.onSale")}</NoWrapCell>
              <NoWrapCell align="right">{t("settings.actions")}</NoWrapCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {providers.map((provider) => (
              <TableRow key={provider.id} hover>
                <NoWrapCell>{provider.name}</NoWrapCell>
                <NoWrapCell>
                  <SquareChip
                    size="small"
                    color={provider.type === "epay" ? "primary" : "info"}
                    label={providerTypeLabel(provider.type, t)}
                  />
                </NoWrapCell>
                <NoWrapCell>
                  <Switch
                    size="small"
                    checked={provider.on_sale}
                    disabled={saving}
                    onChange={(e) => handleToggleOnSale(provider, e.target.checked)}
                  />
                </NoWrapCell>
                <NoWrapCell align="right">
                  <IconButton
                    size="small"
                    title={t("vas.editProvider")}
                    onClick={() => handleEdit(provider)}
                    disabled={saving}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    title={t("vas.deleteProvider")}
                    onClick={() => handleDelete(provider)}
                    disabled={saving}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </NoWrapCell>
              </TableRow>
            ))}
            {!loading && providers.length === 0 && (
              <TableRow>
                <NoWrapCell colSpan={4} align="center">
                  <Typography variant="caption" color="text.secondary">
                    {t("vas.noProviders")}
                  </Typography>
                </NoWrapCell>
              </TableRow>
            )}
            {loading && providers.length === 0 && (
              <TableRow>
                <NoWrapCell colSpan={4} align="center">
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
        <ProviderDialog
          key={editing?.id ?? "new"}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          provider={editing}
          saving={saving}
          onSave={handleSave}
        />
      )}
    </Box>
  );
};

export default PaymentProviders;
