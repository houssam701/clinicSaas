import type { IconType } from "react-icons";
import {
  HiOutlineCalendarDays,
  HiOutlineChatBubbleLeftRight,
  HiOutlineComputerDesktop,
  HiOutlineMicrophone,
  HiOutlineMoon,
  HiOutlineSquares2X2,
  HiOutlineStar,
  HiOutlineSun,
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
  doctors: HiOutlineUserGroup,
  messages: HiOutlineChatBubbleLeftRight,
  reviews: HiOutlineStar,
  finances: HiOutlineWallet,
  account: HiOutlineUserCircle,
  team: HiOutlineUserGroup,
  emergency: HiOutlineMicrophone,
  sun: HiOutlineSun,
  moon: HiOutlineMoon,
  monitor: HiOutlineComputerDesktop,
};

/** A sidebar link's icon by name (decorative: the link carries the label). */
export function NavIcon({ name, className = "w-5 h-5" }: { name: NavIconName; className?: string }) {
  const Icon = NAV_ICONS[name];
  return <Icon aria-hidden="true" className={className} />;
}
