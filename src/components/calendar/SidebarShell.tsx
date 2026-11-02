/**
 * Sidebar shell
 *
 * The calendar view's single sidebar surface (ADR-0002): on desktop a
 * panel next to the board, on mobile a drawer over it. The shell owns
 * the responsive placement, the close button and the title; the content
 * (booking details, booking form) renders inside it.
 */
import { Close } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import React from "react";

/**
 * Width of the sidebar on desktop
 */
export const SIDEBAR_WIDTH = 320;

/**
 * Props for SidebarShell component
 */
export interface SidebarShellProps {
  /** Whether the sidebar is open */
  open: boolean;
  /** Title shown in the sidebar header */
  title: string;
  /** Close the sidebar */
  onClose: () => void;
  /** Sidebar content */
  children: React.ReactNode;
}

/**
 * Sidebar shell component
 * Renders its content in a side panel on desktop and in a drawer on
 * mobile; renders nothing on desktop while closed
 */
export function SidebarShell(
  { open, title, onClose, children }: SidebarShellProps,
): React.JSX.Element | null {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const content = (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <IconButton
          size="small"
          aria-label="Sluiten"
          onClick={onClose}
          sx={{ p: 0 }}
        >
          <Close />
        </IconButton>
        <Typography variant="h6">{title}</Typography>
      </Stack>
      {children}
    </Stack>
  );

  if (isDesktop) {
    if (!open) return null;
    return (
      <Box
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          p: 2,
          borderTop: 1,
          borderLeft: 1,
          borderBottom: 1,
          borderColor: "divider",
          borderRadius: (theme) =>
            `${theme.shape.borderRadius}px 0 0 ${theme.shape.borderRadius}px`,
        }}
      >
        {content}
      </Box>
    );
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ p: 2, width: SIDEBAR_WIDTH, maxWidth: "100vw" }}>
        {content}
      </Box>
    </Drawer>
  );
}
