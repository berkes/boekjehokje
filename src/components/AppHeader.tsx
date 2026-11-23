import HelpIcon from "@mui/icons-material/Help";
import MenuIcon from "@mui/icons-material/Menu";
import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Slide from "@mui/material/Slide";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import useScrollTrigger from "@mui/material/useScrollTrigger";
import React from "react";
import { Link } from "react-router-dom";
import logoUrl from "../assets/logo.svg";
import { ProfileMenu } from "./ProfileMenu.tsx";

/**
 * Responsive application header
 *
 * - Hides on scroll down and reappears on scroll up on every viewport,
 *   via MUI's useScrollTrigger + Slide with a fixed AppBar; the spacer
 *   <Toolbar /> rendered after it keeps the page content below the bar.
 * - Desktop (md and up): logo + title, the Help button and the profile
 *   menu with "Ingelogd als" + avatar.
 * - Mobile (xs): a hamburger on the left and the avatar on the right;
 *   "Ingelogd als" and Help move into the avatar's menu (ProfileMenu).
 *
 * The mobile/desktop switch is pure CSS (sx display breakpoints), so the
 * component itself has no viewport if/else branches.
 */
export function AppHeader(): React.JSX.Element {
  const hideOnScroll = useScrollTrigger();

  return (
    <React.Fragment>
      <Slide appear={false} direction="down" in={!hideOnScroll}>
        <AppBar color="primary" enableColorOnDark>
          <Toolbar>
            <MobileNavMenu />
            <img
              src={logoUrl}
              alt="Logo"
              style={{ width: "40px", height: "40px", marginRight: "12px" }}
            />
            <Typography
              variant="h6"
              component={Link}
              to="/"
              sx={{ flexGrow: 1, textDecoration: "none", color: "inherit" }}
            >
              Boek je Hokje
            </Typography>
            <Button
              component={Link}
              to="/faq"
              color="inherit"
              startIcon={<HelpIcon />}
              sx={{ mr: 1, display: { xs: "none", md: "inline-flex" } }}
            >
              Help
            </Button>
            <ProfileMenu />
          </Toolbar>
        </AppBar>
      </Slide>
      {/* Spacer matching the fixed AppBar's height */}
      <Toolbar />
    </React.Fragment>
  );
}

/**
 * Hamburger menu with the app bar's navigation links, mobile only
 * (hidden on md and up via CSS). The profile-related entries live in
 * the avatar's menu instead — see ProfileMenu.
 */
function MobileNavMenu(): React.JSX.Element {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  return (
    <React.Fragment>
      <IconButton
        aria-label="Menu openen"
        color="inherit"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ mr: 1, display: { xs: "inline-flex", md: "none" } }}
      >
        <MenuIcon />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <MenuItem component={Link} to="/" onClick={() => setAnchorEl(null)}>
          Boek je Hokje
        </MenuItem>
      </Menu>
    </React.Fragment>
  );
}
