import { Stack } from "@mui/material";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StoragePolicy } from "../../../../../api/dashboard";
import { PolicyType } from "../../../../../api/explorer";
import { DenseFilledTextField } from "../../../../Common/StyledComponents";
import SettingForm from "../../../../Pages/Setting/SettingForm";
import { NoMarginHelperText } from "../../../Settings/Settings";
import { AddWizardProps } from "../../AddWizardDialog";

/**
 * 中国移动云盘（yun139）存储策略向导。
 *
 * 凭据说明：
 * - `访问令牌`：抓包得到的 Authorization，可直接使用；
 * - 用户名 + 密码 / 邮箱 Cookie：令牌过期后由后台任务（cron_yun139_token_refresh）自动续期；
 * - `根目录 ID`：留空表示云盘根目录，之后所有文件都在该目录下的同结构目录树里。
 */
const Yun139Wizard = ({ onSubmit }: AddWizardProps) => {
  const { t } = useTranslation("dashboard");
  const formRef = useRef<HTMLFormElement>(null);
  const [policy, setPolicy] = useState<StoragePolicy>({
    id: 0,
    node_id: 0,
    name: "",
    type: PolicyType.yun139,
    is_private: true,
    dir_name_rule: "uploads/{uid}/{path}",
    file_name_rule: "{uuid}_{originname}",
    settings: {
      custom_proxy: true,
      thumb_exts: ["png", "jpg", "jpeg", "gif", "bmp", "webp"],
      media_meta_exts: ["png", "jpg", "jpeg", "gif", "bmp", "webp"],
      media_meta_generator_proxy: true,
      thumb_generator_proxy: true,
    },
    edges: {},
  });

  const patchSettings = (patch: Partial<typeof policy.settings>) =>
    setPolicy((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));

  const handleSubmit = () => {
    if (!formRef.current?.checkValidity()) {
      formRef.current?.reportValidity();
      return;
    }
    onSubmit(policy);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <SettingForm title={t("policy.name")} lgWidth={12}>
          <DenseFilledTextField
            fullWidth
            required
            value={policy.name}
            onChange={(e) => setPolicy({ ...policy, name: e.target.value })}
          />
          <NoMarginHelperText>{t("policy.policyName")}</NoMarginHelperText>
        </SettingForm>

        <SettingForm title={t("policy.yun139Auth")} lgWidth={12}>
          <DenseFilledTextField
            fullWidth
            value={policy.settings?.yun139_token ?? ""}
            onChange={(e) => patchSettings({ yun139_token: e.target.value || undefined })}
          />
          <NoMarginHelperText>{t("policy.yun139AuthDes")}</NoMarginHelperText>
        </SettingForm>

        <SettingForm title={t("policy.yun139Username")} lgWidth={12}>
          <DenseFilledTextField
            fullWidth
            value={policy.settings?.yun139_username ?? ""}
            onChange={(e) => patchSettings({ yun139_username: e.target.value || undefined })}
          />
          <NoMarginHelperText>{t("policy.yun139UsernameDes")}</NoMarginHelperText>
        </SettingForm>

        <SettingForm title={t("policy.yun139Password")} lgWidth={12}>
          <DenseFilledTextField
            fullWidth
            type="password"
            value={policy.settings?.yun139_password ?? ""}
            onChange={(e) => patchSettings({ yun139_password: e.target.value || undefined })}
          />
          <NoMarginHelperText>{t("policy.yun139PasswordDes")}</NoMarginHelperText>
        </SettingForm>

        <SettingForm title={t("policy.yun139MailCookies")} lgWidth={12}>
          <DenseFilledTextField
            fullWidth
            multiline
            minRows={2}
            value={policy.settings?.yun139_mail_cookies ?? ""}
            onChange={(e) => patchSettings({ yun139_mail_cookies: e.target.value || undefined })}
          />
          <NoMarginHelperText>{t("policy.yun139MailCookiesDes")}</NoMarginHelperText>
        </SettingForm>

        <SettingForm title={t("policy.yun139RootFolder")} lgWidth={12}>
          <DenseFilledTextField
            fullWidth
            value={policy.settings?.yun139_root_folder_id ?? ""}
            onChange={(e) => patchSettings({ yun139_root_folder_id: e.target.value || undefined })}
          />
          <NoMarginHelperText>{t("policy.yun139RootFolderDes")}</NoMarginHelperText>
        </SettingForm>
      </Stack>
    </form>
  );
};

export default Yun139Wizard;
