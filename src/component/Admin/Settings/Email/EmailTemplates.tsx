import { ExpandMoreRounded } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";
import AccordionDetails from "@mui/material/AccordionDetails";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import SettingForm from "../../../Pages/Setting/SettingForm.tsx";
import { MagicVar } from "../../Common/MagicVarDialog.tsx";
import { SettingContext } from "../SettingWrapper.tsx";
import { SettingSection, SettingSectionContent } from "../Settings.tsx";
import { AccordionSummary, StyledAccordion } from "../UserSession/SSOSettings.tsx";
import EmailTemplateEditor from "./EmailTemplateEditor.tsx";
interface EmailTemplate {
  key: string;
  title: string;
  description: string;
  magicVars: MagicVar[];
}

const commonMagicVars: MagicVar[] = [
  {
    value: "settings.mainTitle",
    name: "{{ .CommonContext.SiteBasic.Name }}",
    example: "StorFlow",
  },
  {
    value: "settings.siteDescription",
    name: "{{ .CommonContext.SiteBasic.Description }}",
    example: "Another StorFlow instance",
  },
  {
    value: "settings.siteID",
    name: "{{ .CommonContext.SiteBasic.ID }}",
    example: "123e4567-e89b-12d3-a456-426614174000",
  },
  {
    value: "settings.logo",
    name: "{{ .CommonContext.Logo.Normal }}",
    example: "/static/img/brand/logo.svg",
  },
  {
    value: "settings.logo",
    name: "{{ .CommonContext.Logo.Light }}",
    example: "/static/img/brand/logo-light.svg",
  },
  {
    value: "settings.siteURL",
    name: "{{ .CommonContext.SiteUrl }}",
    example: "https://example.com",
  },
];

const userMagicVars: MagicVar[] = [
  {
    value: "policy.magicVar.uid",
    name: "{{ .User.ID }}",
    example: "2534",
  },
  {
    value: "application:login.email",
    name: "{{ .User.Email }}",
    example: "noreply@example.com",
  },
  {
    value: "application:setting.nickname",
    name: "{{ .User.Nick }}",
    example: "Aaron Liu",
  },
  {
    value: "user.usedStorage",
    name: "{{ .User.Storage }}",
    example: "123221000",
  },
];

// 回执 / 容量超额邮件正文里按钮指向的地址（订单为账户设置页，超额为容量管理页）。
const actionUrlMagicVar: MagicVar = {
  value: "settings.siteURL",
  name: "{{ .Url }}",
  example: "https://example.com/settings",
};

const EmailTemplates: React.FC = () => {
  const { t } = useTranslation("dashboard");
  const { setSettings, values } = useContext(SettingContext);

  // Template setting keys
  const templateSettings: EmailTemplate[] = [
    {
      key: "mail_receipt_template",
      title: "receiptEmailTemplate",
      description: "receiptEmailTemplateDes",
      magicVars: [...commonMagicVars, ...userMagicVars, actionUrlMagicVar],
    },
    {
      key: "mail_activation_template",
      title: "activationEmailTemplate",
      description: "activationEmailTemplateDes",
      magicVars: [
        ...commonMagicVars,
        ...userMagicVars,
        {
          value: "settings.activateUrl",
          name: "{{ .Url }}",
          example: "https://example.com/activate",
        },
      ],
    },
    {
      key: "mail_exceed_quota_template",
      title: "quotaExceededEmailTemplate",
      description: "quotaExceededEmailTemplateDes",
      magicVars: [...commonMagicVars, ...userMagicVars, actionUrlMagicVar],
    },
    {
      key: "mail_reset_template",
      title: "resetPasswordEmailTemplate",
      description: "resetPasswordEmailTemplateDes",
      magicVars: [
        ...commonMagicVars,
        ...userMagicVars,
        {
          value: "settings.resetUrl",
          name: "{{ .Url }}",
          example: "https://example.com/reset",
        },
      ],
    },
  ];

  return (
    <SettingSection>
      <Typography variant="h6" gutterBottom>
        {t("settings.emailTemplates")}
      </Typography>
      <SettingSectionContent>
        <Box>
          {templateSettings.map((template) => (
            <StyledAccordion disableGutters key={template.key} TransitionProps={{ unmountOnExit: true }}>
              <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                <Typography>{t("settings." + template.title)}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ display: "block" }}>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {t("settings." + template.description)}{" "}
                </Typography>
                <SettingForm noContainer lgWidth={12}>
                  <Box sx={{ width: "100%" }}>
                    <EmailTemplateEditor
                      magicVars={template.magicVars || []}
                      value={values[template.key] || "[]"}
                      onChange={(value) => setSettings({ [template.key]: value })}
                      templateType={template.key}
                    />
                  </Box>
                </SettingForm>
              </AccordionDetails>
            </StyledAccordion>
          ))}
        </Box>
      </SettingSectionContent>
    </SettingSection>
  );
};

export default EmailTemplates;
