import { Box, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { NoMarginHelperText, SettingSection, SettingSectionContent } from "../Settings";
import GiftCodes from "./GiftCodes";
import PaymentProviders from "./PaymentProviders";
import Products from "./Products";

const VAS = () => {
  const { t } = useTranslation("dashboard");

  return (
    <Box>
      <Stack spacing={5}>
        <SettingSection>
          <Typography variant="h6" gutterBottom>
            {t("vas.products")}
          </Typography>
          <SettingSectionContent>
            <Products />
            <NoMarginHelperText>{t("vas.productsDes")}</NoMarginHelperText>
          </SettingSectionContent>
        </SettingSection>

        <SettingSection>
          <Typography variant="h6" gutterBottom>
            {t("settings.paymentSettings")}
          </Typography>
          <SettingSectionContent>
            <PaymentProviders />
            <NoMarginHelperText>{t("vas.providersDes")}</NoMarginHelperText>
          </SettingSectionContent>
        </SettingSection>

        <SettingSection>
          <Typography variant="h6" gutterBottom>
            {t("vas.giftCodes")}
          </Typography>
          <SettingSectionContent>
            <GiftCodes />
            <NoMarginHelperText>{t("vas.giftCodesDes")}</NoMarginHelperText>
          </SettingSectionContent>
        </SettingSection>
      </Stack>
    </Box>
  );
};

export default VAS;
