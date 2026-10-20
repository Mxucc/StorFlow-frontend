import { Alert, Box, Link, Stack } from "@mui/material";
import { useContext } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { PolicyType } from "../../../../api/explorer";
import {
  BasicInfoSection,
  DownloadSection,
  EncryptionSection,
  LoadBalanceSection,
  MediaMetadataSection,
  StorageAndUploadSection,
  ThumbnailsSection,
} from "./FormSections";
import { StoragePolicySettingContext } from "./StoragePolicySettingWrapper";

const StoragePolicyForm = () => {
  const { t } = useTranslation("dashboard");
  const { formRef, values } = useContext(StoragePolicySettingContext);

  // 负载均衡策略没有自己的存储驱动，只有名称与子策略列表是可配置的，
  // 其余区块（目录/文件名规则、下载、缩略图、媒体元数据、加密）都由子策略决定。
  const isLoadBalance = values.type === PolicyType.load_balance;

  return (
    <Box component={"form"} ref={formRef} onSubmit={(e) => e.preventDefault()}>
      {!values.edges?.groups?.length && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Trans
            i18nKey="policy.noBindedGroupWarning"
            ns="dashboard"
            components={[<Link component={RouterLink} to="/admin/group" />]}
          />
        </Alert>
      )}
      <Stack spacing={5}>
        <BasicInfoSection />
        {isLoadBalance && <LoadBalanceSection />}
        {!isLoadBalance && (
          <>
            <StorageAndUploadSection />
            <DownloadSection />
            <ThumbnailsSection />
            <MediaMetadataSection />
            <EncryptionSection />
          </>
        )}
      </Stack>
    </Box>
  );
};

export default StoragePolicyForm;
