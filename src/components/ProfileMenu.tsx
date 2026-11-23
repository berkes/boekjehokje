import React from "react";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useSession } from "../hooks/useSession.tsx";
import { Link, useNavigate } from "react-router-dom";

/**
 * Profile menu in the app bar: the avatar button with "Ingelogd als
 * <name>" on desktop; on mobile just the avatar, and "Ingelogd als" and
 * Help appear as (mobile-only) items in this menu instead — the
 * visibility switch is pure CSS, no viewport if/else (see AppHeader).
 * Uses Dutch text per project plan
 */
export function ProfileMenu(): React.JSX.Element {
  const {
    isLoggedIn,
    user,
    logout,
  } = useSession();
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
        <Tooltip title="Instellingen openen">
          <IconButton
            onClick={handleOpenUserMenu}
            sx={{ p: 0 }}
            color="inherit"
          >
            <Box
              component="span"
              sx={{ display: { xs: "none", md: "inline" } }}
            >
              <Typography sx={{ paddingRight: "0.5em" }}>
                Ingelogd als
              </Typography>
              <Typography
                sx={{ paddingRight: "1em", fontWeight: "bold" }}
                color="palette.primary.contrastText"
              >
                {user?.name || "Onbekend"}
              </Typography>
            </Box>
            <Avatar
              alt={user?.name || "Onbekend"}
              src={user?.picture}
              slotProps={{
                img: {
                  crossOrigin: "anonymous",
                },
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || "U"}
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
          <MenuItem
            key="logged-in-as"
            disabled
            sx={{ display: { xs: "flex", md: "none" } }}
          >
            <Typography sx={{ textAlign: "center" }}>
              Ingelogd als {user?.name || "Onbekend"}
            </Typography>
          </MenuItem>
          <MenuItem
            key="help"
            component={Link}
            to="/faq"
            onClick={handleCloseUserMenu}
            sx={{ display: { xs: "flex", md: "none" } }}
          >
            <Typography sx={{ textAlign: "center" }}>Help</Typography>
          </MenuItem>
          <MenuItem key="account" onClick={handleNavigateToSettings}>
            <Typography sx={{ textAlign: "center" }}>Mijn account</Typography>
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
        <Typography
          sx={{ textAlign: "center", display: { xs: "none", md: "block" } }}
        >
          Niet ingelogd
        </Typography>
      </Box>
    );
  }
}
