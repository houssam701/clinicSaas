import type { IconType } from "react-icons";
import {
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineCog6Tooth,
  HiOutlineSquares2X2,
  HiOutlineUserCircle,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineWallet,
} from "react-icons/hi2";
import type { NavIconName } from "@/types/navigation";

/** The icon for each sidebar link (react-icons, Heroicons v2). */
const NAV_ICONS: Record<NavIconName, IconType> = {
  dashboard: HiOutlineSquares2X2,
  appointments: HiOutlineCalendarDays,
  patients: HiOutlineUsers,
  finances: HiOutlineWallet,
  reports: HiOutlineChartBar,
  clinics: HiOutlineBuildingOffice2,
  team: HiOutlineUserGroup,
  settings: HiOutlineCog6Tooth,
  account: HiOutlineUserCircle,
};

/** A sidebar link's icon by name (decorative: the link carries the label). */
export function NavIcon({ name, className = "w-5 h-5" }: { name: NavIconName; className?: string }) {
  const Icon = NAV_ICONS[name];
  return <Icon aria-hidden="true" className={className} />;
}
