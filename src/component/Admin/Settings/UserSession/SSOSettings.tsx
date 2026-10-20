import { ExpandMoreRounded } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  styled,
  Switch,
} from "@mui/material";
import MuiAccordionSummary, { AccordionSummaryProps } from "@mui/material/AccordionSummary";
import { useCallback, useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { isTrueVal } from "../../../../session/utils.ts";
import { copyToClipboard } from "../../../../util";
import { DenseFilledTextField, StyledCheckbox } from "../../../Common/StyledComponents.tsx";
import CopyOutlined from "../../../Icons/CopyOutlined";
import { NoMarginHelperText } from "../Settings.tsx";
import { SettingContext } from "../SettingWrapper.tsx";

export const AccordionSummary = styled((props: AccordionSummaryProps) => <MuiAccordionSummary {...props} />)(
  ({ theme }) => ({
    fontSize: theme.typography.body2.fontSize,
    paddingLeft: theme.spacing(4),
    "& .MuiFormControlLabel-label": {
      fontSize: theme.typography.body2.fontSize,
    },
    "& .MuiCheckbox-root": {
      marginRight: theme.spacing(2),
    },
  }),
);

export const StyledAccordion = styled(Accordion)(({ theme }) => ({
  boxShadow: "none",
  border: `1px solid ${theme.palette.divider}`,
  "&::before": {
    display: "none",
  },
}));

export interface SettingSectionProps {}

interface OIDCTextFieldProps {
  settingKey: string;
  label: string;
  helperText?: string;
  type?: string;
}

const OIDCTextField = ({ settingKey, label, helperText, type }: OIDCTextFieldProps) => {
  const { t } = useTranslation("dashboard");
  const { values, setSettings } = useContext(SettingContext);
  return (
    <FormControl fullWidth>
      <DenseFilledTextField
        label={t(label)}
        value={values[settingKey] ?? ""}
        type={type}
        onChange={(e) => setSettings({ [settingKey]: e.target.value })}
      />
      {helperText && <NoMarginHelperText>{t(helperText)}</NoMarginHelperText>}
    </FormControl>
  );
};

interface OIDCSwitchFieldProps {
  settingKey: string;
  label: string;
  helperText?: string;
}

const OIDCSwitchField = ({ settingKey, label, helperText }: OIDCSwitchFieldProps) => {
  const { t } = useTranslation("dashboard");
  const { values, setSettings } = useContext(SettingContext);
  return (
    <FormControl fullWidth>
      <FormControlLabel
        control={
          <Switch
            checked={isTrueVal(values[settingKey] ?? "")}
            onChange={(e) => setSettings({ [settingKey]: e.target.checked ? "1" : "0" })}
          />
        }
        label={t(label)}
      />
      {helperText && <NoMarginHelperText>{t(helperText)}</NoMarginHelperText>}
    </FormControl>
  );
};

// QQ 互联的配置项存放在 qq_login_config 这个 JSON 字符串设置里，
// 这里做一层解析 / 写回，避免在 JSX 里到处 JSON.parse。
interface QQLoginConfig {
  app_id?: string;
  app_secret?: string;
  display_name?: string;
  auto_register?: boolean;
  direct_sign_in?: boolean;
}

const parseQQLoginConfig = (raw?: string): QQLoginConfig => {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as QQLoginConfig) : {};
  } catch {
    // 配置损坏时按默认值展示，保存时会被规范化为合法 JSON。
    return {};
  }
};

interface QQConfigTextFieldProps {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}

const QQConfigTextField = ({ label, value, type, onChange }: QQConfigTextFieldProps) => {
  const { t } = useTranslation("dashboard");
  return (
    <FormControl fullWidth>
      <DenseFilledTextField label={t(label)} value={value} type={type} onChange={(e) => onChange(e.target.value)} />
    </FormControl>
  );
};

interface QQConfigSwitchFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const QQConfigSwitchField = ({ label, checked, onChange }: QQConfigSwitchFieldProps) => {
  const { t } = useTranslation("dashboard");
  return (
    <FormControl fullWidth>
      <FormControlLabel
        control={<Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />}
        label={t(label)}
      />
    </FormControl>
  );
};

const SSOSettings = () => {
  const { t } = useTranslation("dashboard");
  const { values, setSettings } = useContext(SettingContext);
  const [oidcOpen, setOidcOpen] = useState(false);
  const [qqOpen, setQqOpen] = useState(false);

  const oidcCallbackUrl = `${window.location.origin}/api/v4/session/oidc/callback`;
  const qqCallbackUrl = `${window.location.origin}/api/v4/session/qq/callback`;

  const qqConfig = useMemo(() => parseQQLoginConfig(values.qq_login_config), [values.qq_login_config]);
  const updateQQConfig = useCallback(
    (patch: QQLoginConfig) => {
      setSettings({ qq_login_config: JSON.stringify({ ...qqConfig, ...patch }) });
    },
    [qqConfig, setSettings],
  );

  return (
    <>
      <StyledAccordion expanded={oidcOpen} onChange={(_e, expanded) => setOidcOpen(expanded)} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreRounded />}>
          <FormControlLabel
            control={<StyledCheckbox size={"small"} checked={isTrueVal(values.oidc_enabled ?? "")} />}
            label={t("settings.oidc")}
          />
        </AccordionSummary>
        <AccordionDetails sx={{ display: "block" }}>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <DenseFilledTextField
                label={t("settings.oidcCallbackUrl")}
                value={oidcCallbackUrl}
                slotProps={{
                  input: {
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => copyToClipboard(oidcCallbackUrl)}>
                          <CopyOutlined fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <NoMarginHelperText>{t("settings.oidcCallbackUrlDes")}</NoMarginHelperText>
            </FormControl>
            <OIDCSwitchField
              settingKey={"oidc_enabled"}
              label={"settings.oidcEnabled"}
              helperText={"settings.oidcEnabledDes"}
            />
            <OIDCTextField
              settingKey={"oidc_endpoint"}
              label={"settings.oidcEndpoint"}
              helperText={"settings.oidcEndpointDes"}
            />
            <OIDCTextField settingKey={"oidc_client_id"} label={"settings.oidcClientId"} />
            <OIDCTextField settingKey={"oidc_client_secret"} label={"settings.oidcClientSecret"} type={"password"} />
            <OIDCTextField settingKey={"oidc_scopes"} label={"settings.oidcScopes"} />
            <OIDCTextField settingKey={"oidc_display_name"} label={"settings.oidcDisplayName"} />
            <OIDCSwitchField settingKey={"oidc_auto_redirect"} label={"settings.oidcAutoRedirect"} />
            <OIDCSwitchField settingKey={"oidc_password_login_disabled"} label={"settings.oidcPasswordLoginDisabled"} />
            <OIDCSwitchField settingKey={"oidc_auto_register"} label={"settings.oidcAutoRegister"} />
            <OIDCSwitchField settingKey={"oidc_auto_link_email"} label={"settings.oidcAutoLinkEmail"} />
            <OIDCSwitchField settingKey={"oidc_require_email_verified"} label={"settings.oidcRequireEmailVerified"} />
            <OIDCTextField settingKey={"oidc_subject_claim"} label={"settings.oidcSubjectClaim"} />
            <OIDCTextField settingKey={"oidc_email_claim"} label={"settings.oidcEmailClaim"} />
            <OIDCTextField settingKey={"oidc_name_claim"} label={"settings.oidcNameClaim"} />
          </Stack>
        </AccordionDetails>
      </StyledAccordion>
      <StyledAccordion expanded={qqOpen} onChange={(_e, expanded) => setQqOpen(expanded)} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreRounded />}>
          <FormControlLabel
            control={<StyledCheckbox size={"small"} checked={isTrueVal(values.qq_login ?? "")} />}
            label={t("vas.qqConnect")}
          />
        </AccordionSummary>
        <AccordionDetails sx={{ display: "block" }}>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <DenseFilledTextField
                label={t("settings.qqCallbackUrl")}
                value={qqCallbackUrl}
                slotProps={{
                  input: {
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => copyToClipboard(qqCallbackUrl)}>
                          <CopyOutlined fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <NoMarginHelperText>{t("settings.qqCallbackUrlDes")}</NoMarginHelperText>
            </FormControl>
            <OIDCSwitchField
              settingKey={"qq_login"}
              label={"settings.qqLoginEnabled"}
              helperText={"settings.qqLoginEnabledDes"}
            />
            <QQConfigTextField
              label={"settings.qqAppId"}
              value={qqConfig.app_id ?? ""}
              onChange={(value) => updateQQConfig({ app_id: value })}
            />
            <QQConfigTextField
              label={"settings.qqAppSecret"}
              value={qqConfig.app_secret ?? ""}
              type={"password"}
              onChange={(value) => updateQQConfig({ app_secret: value })}
            />
            <QQConfigTextField
              label={"settings.qqDisplayName"}
              value={qqConfig.display_name ?? ""}
              onChange={(value) => updateQQConfig({ display_name: value })}
            />
            <QQConfigSwitchField
              label={"settings.qqAutoRegister"}
              // 后端默认自动注册（auto_register 缺省为 true）。
              checked={qqConfig.auto_register !== false}
              onChange={(checked) => updateQQConfig({ auto_register: checked })}
            />
            <QQConfigSwitchField
              label={"settings.qqDirectSignIn"}
              checked={!!qqConfig.direct_sign_in}
              onChange={(checked) => updateQQConfig({ direct_sign_in: checked })}
            />
          </Stack>
        </AccordionDetails>
      </StyledAccordion>
      <StyledAccordion disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreRounded />}>
          <FormControlLabel
            control={<StyledCheckbox size={"small"} checked={isTrueVal(values.oidc_enabled ?? "")} disabled />}
            label={t("settings.logto")}
          />
        </AccordionSummary>
        <AccordionDetails sx={{ display: "block" }}>
          {/* Logto 是标准 OIDC 提供方，直接用上面的 OIDC 配置即可，无需单独实现。 */}
          <NoMarginHelperText>{t("settings.logtoUseOIDC")}</NoMarginHelperText>
        </AccordionDetails>
      </StyledAccordion>
    </>
  );
};

export default SSOSettings;
