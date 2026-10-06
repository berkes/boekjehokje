import React from "react";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useUser } from "../context/index.ts";
import { useNavigate } from "react-router-dom";

/**
 * Main Google authentication button component
 * Uses Dutch text per project plan
 */
export function ProfileMenu(): React.JSX.Element {
  const {
    isLoggedIn,
    profile,
    logout,
  } = useUser();
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(
    null,
  );
  const navigate = useNavigate();

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };
  const handleNavigateToSettings = () => {
    navigate("/settings");
    handleCloseUserMenu();
  };
  const handleLogout = () => {
    logout();
    handleCloseUserMenu();
  };

  if (isLoggedIn) {
    return (
      <Box sx={{ flexGrow: 0 }}>
        <Tooltip title="Open settings">
          <IconButton
            onClick={handleOpenUserMenu}
            sx={{ p: 0 }}
            color="inherit"
          >
            <Typography sx={{ paddingRight: "0.5em" }}>
              Ingelogd als
            </Typography>
            <Typography
              sx={{ paddingRight: "1em", fontWeight: "bold" }}
              color="palette.primary.contrastText"
            >
              {profile?.name || "Unknown"}
            </Typography>
            <Avatar
              alt={profile?.name || "Unknown"}
              src={profile?.picture}
              slotProps={{
                img: {
                  crossOrigin: "anonymous",
                },
              }}
            >
              {profile?.name?.charAt(0).toUpperCase() || "U"}
            </Avatar>
          </IconButton>
        </Tooltip>
        <Menu
          sx={{ mt: "45px" }}
          id="menu-appbar"
          anchorEl={anchorElUser}
          anchorOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          keepMounted
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          open={Boolean(anchorElUser)}
          onClose={handleCloseUserMenu}
        >
          <MenuItem key="account" onClick={handleNavigateToSettings}>
            <Typography sx={{ textAlign: "center" }}>Mijn Account</Typography>
          </MenuItem>
          <MenuItem key="logout" onClick={handleLogout}>
            <Typography sx={{ textAlign: "center" }}>Uitloggen</Typography>
          </MenuItem>
        </Menu>
      </Box>
    );
  } else {
    return (
      <Box sx={{ flexGrow: 0 }}>
        <Typography sx={{ textAlign: "center" }}>Niet ingelogd</Typography>
      </Box>
    );
  }
}
