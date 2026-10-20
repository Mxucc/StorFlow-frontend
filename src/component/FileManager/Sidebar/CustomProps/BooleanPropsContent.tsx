import { Box, FormControlLabel } from "@mui/material";
import { isTrueVal } from "../../../../session/utils.ts";
import { StyledCheckbox } from "../../../Common/StyledComponents.tsx";
import { PropsContentProps } from "./CustomPropsItem.tsx";
import { translatePropName } from "./translatePropName.ts";

const BooleanPropsItem = ({ prop, onChange, loading, readOnly, fullSize }: PropsContentProps) => {
  const handleChange = (_: any, checked: boolean) => {
    onChange(checked.toString());
  };

  return (
    <Box sx={{ pl: "10px" }}>
      <FormControlLabel
        slotProps={{
          typography: {
            variant: "inherit",
            pl: 1,
          },
        }}
        control={<StyledCheckbox size={"small"} checked={isTrueVal(prop.value)} onChange={handleChange} />}
        label={fullSize ? translatePropName(prop.props.name) : undefined}
        disabled={readOnly || loading}
      />
    </Box>
  );
};

export default BooleanPropsItem;
