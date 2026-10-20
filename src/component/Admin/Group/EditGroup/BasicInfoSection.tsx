import { Alert, FormControl, FormControlLabel, Switch, Typography } from "@mui/material";
import { useCallback, useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GroupEnt, StoragePolicy } from "../../../../api/dashboard";
import { GroupPermission } from "../../../../api/user";
import Boolset from "../../../../util/boolset";
import SizeInput from "../../../Common/SizeInput";
import { DenseFilledTextField } from "../../../Common/StyledComponents";
import InPrivate from "../../../Icons/InPrivate";
import SettingForm from "../../../Pages/Setting/SettingForm";
import { NoMarginHelperText, SettingSection, SettingSectionContent } from "../../Settings/Settings";
import { AnonymousGroupID } from "../GroupRow";
import { GroupSettingContext } from "./GroupSettingWrapper";
import PolicySelectionInput from "./PolicySelectionInput";
const BasicInfoSection = () => {
  const { t } = useTranslation("dashboard");
  const { values, setGroup } = useContext(GroupSettingContext);

  const permission = useMemo(() => {
    return new Boolset(values.permissions ?? "");
  }, [values.permissions]);

  const onNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setGroup((p: GroupEnt) => ({ ...p, name: e.target.value }));
    },
    [setGroup],
  );

  // 可用存储策略：优先使用用户组配置的多选白名单，未配置时退回为绑定的单一策略。
  const availablePolicies = useMemo(() => {
    const configured = values.settings?.available_policies;
    if (configured && configured.length > 0) {
      return configured;
    }
    return values.edges.storage_policies?.id ? [values.edges.storage_policies.id] : [];
  }, [values.settings?.available_policies, values.edges.storage_policies?.id]);

  const onPolicyChange = useCallback(
    (value: number[]) => {
      setGroup((p: GroupEnt) => ({
        ...p,
        // 第一个策略作为用户组的默认策略，整份列表写入可用策略白名单。
        edges: value.length
          ? { ...p.edges, storage_policies: { id: value[0] } as StoragePolicy }
          : { ...p.edges, storage_policies: undefined },
        settings: { ...p.settings, available_policies: value.length ? value : undefined },
      }));
    },
    [setGroup],
  );

  const onMaxStorageChange = useCallback(
    (size: number) => {
      setGroup((p: GroupEnt) => ({
        ...p,
        max_storage: size ? size : undefined,
      }));
    },
    [setGroup],
  );

  const onIsAdminChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setGroup((p: GroupEnt) => ({
        ...p,
        permissions: new Boolset(p.permissions).set(GroupPermission.is_admin, e.target.checked).toString(),
      }));
    },
    [setGroup],
  );

  return (
    <SettingSection>
      <Typography variant="h6" gutterBottom>
        {t("policy.basicInfo")}
      </Typography>
      <SettingSectionContent>
        {values?.id == AnonymousGroupID && (
          <SettingForm lgWidth={5}>
            <Alert icon={<InPrivate fontSize="inherit" />} severity="info">
              {t("group.anonymousHint")}
            </Alert>
          </SettingForm>
        )}
        <SettingForm title={t("group.nameOfGroup")} lgWidth={5}>
          <FormControl fullWidth>
            <DenseFilledTextField required value={values.name} onChange={onNameChange} />
            <NoMarginHelperText>{t("group.nameOfGroupDes")}</NoMarginHelperText>
          </FormControl>
        </SettingForm>
        {values?.id != AnonymousGroupID && (
          <>
            <SettingForm title={t("group.availablePolicies")} lgWidth={5}>
              <PolicySelectionInput value={availablePolicies} onChange={onPolicyChange} />
              <NoMarginHelperText>{t("group.availablePoliciesDes")}</NoMarginHelperText>
              <NoMarginHelperText>{t("group.availablePolicyDesPro")}</NoMarginHelperText>
            </SettingForm>
            <SettingForm title={t("group.initialStorageQuota")} lgWidth={5}>
              <FormControl fullWidth>
                <SizeInput
                  variant={"outlined"}
                  required
                  value={values.max_storage ?? 0}
                  onChange={onMaxStorageChange}
                />
                <NoMarginHelperText>{t("group.initialStorageQuotaDes")}</NoMarginHelperText>
              </FormControl>
            </SettingForm>
            <SettingForm lgWidth={5}>
              <FormControl fullWidth>
                <FormControlLabel
                  disabled={values.id == 1}
                  control={<Switch checked={permission.enabled(GroupPermission.is_admin)} onChange={onIsAdminChange} />}
                  label={t("group.isAdmin")}
                />
                <NoMarginHelperText>{t("group.isAdminDes")}</NoMarginHelperText>
              </FormControl>
            </SettingForm>
          </>
        )}
      </SettingSectionContent>
    </SettingSection>
  );
};

export default BasicInfoSection;
