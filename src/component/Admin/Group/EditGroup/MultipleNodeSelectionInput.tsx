import { Alert, Box, ListItemText, Typography } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getNodeList } from "../../../../api/api";
import { GroupEnt, Node, NodeStatus } from "../../../../api/dashboard";
import { useAppDispatch } from "../../../../redux/hooks";
import { DenseSelect } from "../../../Common/StyledComponents";
import { SquareMenuItem } from "../../../FileManager/ContextMenu/ContextMenu";
import { NodeStatusCondition } from "../../Common/NodeSelectionInput";
import { GroupSettingContext } from "./GroupSettingWrapper";

const MultipleNodeSelectionInput = () => {
  const { t } = useTranslation("dashboard");
  const dispatch = useAppDispatch();
  const { values, setGroup } = useContext(GroupSettingContext);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    setLoading(true);
    dispatch(
      getNodeList({
        page_size: 1000,
        page: 1,
        order_by: "id",
        order_direction: "asc",
        conditions: {
          [NodeStatusCondition]: NodeStatus.active,
        },
      }),
    )
      .then((res) => {
        setNodes(res.nodes);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dispatch]);

  const selected = values.settings?.allowed_nodes ?? [];

  if (!loading && nodes.length == 0) {
    return <Alert severity="warning">{t("settings.noNodes")}</Alert>;
  }

  return (
    <DenseSelect
      multiple
      displayEmpty
      disabled={loading}
      value={selected}
      sx={{
        minHeight: 39,
      }}
      MenuProps={{
        PaperProps: { sx: { maxWidth: 230 } },
        MenuListProps: {
          sx: {
            "& .MuiMenuItem-root": {
              whiteSpace: "normal",
            },
          },
        },
      }}
      onChange={(e) => {
        const ids = (Array.isArray(e.target.value) ? e.target.value : [e.target.value]) as number[];
        setGroup((p: GroupEnt) => ({
          ...p,
          settings: {
            ...p.settings,
            allowed_nodes: ids.length > 0 ? ids : undefined,
          },
        }));
      }}
      renderValue={(value) => {
        const ids = (value as number[]) ?? [];
        if (ids.length === 0) {
          return (
            <ListItemText
              primary={<em>{t("group.allNodes")}</em>}
              slotProps={{
                primary: { color: "textSecondary", variant: "body2" },
              }}
            />
          );
        }
        return (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            <Typography variant="body2" noWrap>
              {ids.map((id) => nodes.find((n) => n.id == id)?.name ?? `#${id}`).join(", ")}
            </Typography>
          </Box>
        );
      }}
    >
      {nodes.map((g) => (
        <SquareMenuItem key={g.id} value={g.id}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography variant={"body2"} fontWeight={600}>
              {g.name}
            </Typography>
            <Typography variant={"caption"} color={"textSecondary"}>
              {g.server}
            </Typography>
          </Box>
        </SquareMenuItem>
      ))}
    </DenseSelect>
  );
};

export default MultipleNodeSelectionInput;
